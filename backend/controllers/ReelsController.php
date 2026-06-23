<?php
declare(strict_types=1);

/**
 * Reels feed — TikTok-style vertical video discovery built on top of the
 * existing product video uploads. No new table: any product_images row with
 * media_type IN ('video','youtube') is a reel, with its parent product
 * attached so the customer can buy directly from the feed.
 *
 * Ordering: pinned reels first (admin curation), then by view count,
 * then newest product.
 */
class ReelsController
{
    private const SETTINGS_KEY = 'reels_settings';
    private const SETTINGS_DEFAULTS = [
        'enabled'         => 1,   // master switch — hides the Reels tab + page when off
        'autoplay'        => 1,   // play the visible reel automatically
        'default_muted'   => 1,   // start muted (required for autoplay in most browsers)
        'loop'            => 1,   // loop each video
        'show_comments'   => 1,   // show the comment button + drawer
        'show_view_count' => 1,   // show the eye + count chip
        'show_share'      => 1,   // show the share button
        'items_per_load'  => 24,  // how many reels to fetch
    ];

    private function settings(): array
    {
        $row = getDB()->query(
            "SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::SETTINGS_KEY)
        )->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::SETTINGS_DEFAULTS, $stored);
    }

    /** GET /api/reels/settings — public; the storefront reads this to configure playback. */
    public function getSettings(): never
    {
        method('GET');
        success($this->settings());
    }

    /** GET/PUT /api/admin/reels/settings — admin reads + writes the config. */
    public function adminSettings(): never
    {
        method('GET', 'PUT');
        AuthMiddleware::require();
        RoleMiddleware::require(AuthMiddleware::require(), 'admin');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
            success($this->settings());
        }

        $in    = getBody();
        $bools = ['enabled','autoplay','default_muted','loop','show_comments','show_view_count','show_share'];
        $clean = [];
        foreach ($bools as $b) {
            $clean[$b] = empty($in[$b]) ? 0 : 1;
        }
        $clean['items_per_load'] = max(6, min((int) ($in['items_per_load'] ?? 24), 60));

        getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        )->execute([self::SETTINGS_KEY, json_encode($clean)]);

        success($this->settings(), 'Reel settings saved.');
    }

    public function index(): never
    {
        method('GET');
        $limit  = max(1, min((int) ($_GET['limit']  ?? 24), 60));
        $offset = max(0, (int) ($_GET['offset'] ?? 0));

        $rows = getDB()->prepare(
            "SELECT
                pi.id          AS reel_id,
                pi.media_type,
                pi.video_url,
                pi.image_url   AS poster,
                pi.sort_order,
                pi.view_count,
                pi.is_pinned,
                p.id           AS product_id,
                p.name         AS product_name,
                p.slug         AS product_slug,
                p.base_price,
                p.sale_price,
                p.stock_qty,
                p.description,
                c.name         AS category_name,
                (SELECT image_url FROM product_images
                  WHERE product_id = p.id AND is_primary = 1
                  LIMIT 1)     AS main_image,
                (SELECT COUNT(*) FROM reel_comments
                  WHERE reel_id = pi.id) AS comment_count
             FROM product_images pi
             JOIN products p   ON p.id = pi.product_id AND p.status = 'active'
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE pi.media_type IN ('video','youtube')
               AND (pi.video_url IS NOT NULL AND pi.video_url <> '')
             ORDER BY pi.is_pinned DESC, pi.pin_order ASC,
                      pi.view_count DESC, p.created_at DESC, pi.sort_order ASC, pi.id ASC
             LIMIT ? OFFSET ?"
        );
        $rows->bindValue(1, $limit,  PDO::PARAM_INT);
        $rows->bindValue(2, $offset, PDO::PARAM_INT);
        $rows->execute();

        success([
            'reels' => $rows->fetchAll(),
            'limit' => $limit,
            'next_offset' => $offset + $limit,
        ]);
    }

    /**
     * POST /api/reels/{id}/view — bump the view counter. Rate-limited so a
     * single client can't farm views; the frontend only fires this after a
     * reel has been visible >2 seconds, so the cap is just defence in depth.
     */
    public function recordView(int $id): never
    {
        method('POST');
        // Per (reel, IP) rate limit: each IP can register at most 1 view per
        // reel per 30 minutes. Honest viewers don't get blocked; bots do.
        RateLimiter::check("reel_view_{$id}", 1, 1800);

        $stmt = getDB()->prepare(
            "UPDATE product_images
                SET view_count = view_count + 1
              WHERE id = ?
                AND media_type IN ('video','youtube')"
        );
        $stmt->execute([$id]);
        success(null);
    }

    // ── Comments ───────────────────────────────────────────────────────

    /** GET /api/reels/{id}/comments — public list with commenter name + avatar. */
    public function listComments(int $reelId): never
    {
        method('GET');
        $rows = getDB()->prepare(
            "SELECT
                c.id, c.body, c.created_at,
                c.user_id,
                COALESCE(u.name, 'Anonymous') AS user_name,
                u.avatar_url
             FROM reel_comments c
             LEFT JOIN users u ON u.id = c.user_id
             WHERE c.reel_id = ?
             ORDER BY c.created_at DESC
             LIMIT 200"
        );
        $rows->execute([$reelId]);
        success(['comments' => $rows->fetchAll()]);
    }

    /** POST /api/reels/{id}/comments — auth required. Body: { text } */
    public function addComment(int $reelId): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        RateLimiter::check('reel_comment', 10, 60);
        $body = trim((string) (getBody()['text'] ?? ''));
        if ($body === '')      error('Comment cannot be empty.', 422);
        if (strlen($body) > 600) error('Comment is too long (600 chars max).', 422);

        // Sanitize once on the way in so it's safe to render anywhere later.
        $clean = sanitize($body);

        // Validate the reel exists + is actually a video row.
        $exists = getDB()->prepare(
            "SELECT 1 FROM product_images
              WHERE id = ? AND media_type IN ('video','youtube')"
        );
        $exists->execute([$reelId]);
        if (!$exists->fetchColumn()) error('Reel not found.', 404);

        $ins = getDB()->prepare(
            "INSERT INTO reel_comments (reel_id, user_id, body) VALUES (?, ?, ?)"
        );
        $ins->execute([$reelId, (int) $auth['sub'], $clean]);
        $id = (int) getDB()->lastInsertId();

        // Return the freshly-saved row joined with user info so the client can
        // optimistically render without a follow-up GET.
        $row = getDB()->prepare(
            "SELECT c.id, c.body, c.created_at, c.user_id,
                    COALESCE(u.name, 'Anonymous') AS user_name,
                    u.avatar_url
               FROM reel_comments c
               LEFT JOIN users u ON u.id = c.user_id
              WHERE c.id = ?"
        );
        $row->execute([$id]);
        success(['comment' => $row->fetch()], 'Comment posted.', 201);
    }

    /** DELETE /api/reels/comments/{id} — own comment OR admin. */
    public function deleteComment(int $commentId): never
    {
        method('DELETE');
        $auth = AuthMiddleware::require();
        $row  = getDB()->prepare("SELECT user_id FROM reel_comments WHERE id = ?");
        $row->execute([$commentId]);
        $owner = $row->fetchColumn();
        if ($owner === false) error('Comment not found.', 404);

        $isAdmin = ($auth['role'] ?? '') === 'admin';
        if (!$isAdmin && (int) $owner !== (int) $auth['sub']) {
            error('Not allowed.', 403);
        }

        getDB()->prepare("DELETE FROM reel_comments WHERE id = ?")->execute([$commentId]);
        success(null, 'Comment deleted.');
    }

    // ── Admin curation ─────────────────────────────────────────────────

    /** GET /api/admin/reels — every reel + counts + pinned status. */
    public function adminList(): never
    {
        method('GET');
        AuthMiddleware::require();
        RoleMiddleware::require(AuthMiddleware::require(), 'admin');

        $rows = getDB()->query(
            "SELECT
                pi.id          AS reel_id,
                pi.media_type,
                pi.video_url,
                pi.image_url   AS poster,
                pi.view_count,
                pi.is_pinned,
                pi.pin_order,
                pi.created_at,
                p.id           AS product_id,
                p.name         AS product_name,
                p.slug         AS product_slug,
                p.status       AS product_status
             FROM product_images pi
             JOIN products p ON p.id = pi.product_id
             WHERE pi.media_type IN ('video','youtube')
             ORDER BY pi.is_pinned DESC, pi.pin_order ASC,
                      pi.view_count DESC, pi.id DESC"
        )->fetchAll();

        success(['reels' => $rows]);
    }

    /**
     * PUT /api/admin/reels/{id}/pin — toggle pinned + assign next pin_order
     * slot. New pins go to the end of the pinned list; unpin resets order to 0.
     * Reorder within pinned set is handled by /reorder below.
     */
    public function adminPin(int $id): never
    {
        method('PUT');
        AuthMiddleware::require();
        RoleMiddleware::require(AuthMiddleware::require(), 'admin');
        $pin = !empty(getBody()['pinned']);

        if ($pin) {
            // Next slot = max pin_order + 1 among currently pinned rows.
            $next = (int) getDB()->query(
                "SELECT COALESCE(MAX(pin_order), 0) + 1
                   FROM product_images
                  WHERE is_pinned = 1
                    AND media_type IN ('video','youtube')"
            )->fetchColumn();
            getDB()->prepare(
                "UPDATE product_images
                    SET is_pinned = 1, pin_order = ?
                  WHERE id = ?
                    AND media_type IN ('video','youtube')"
            )->execute([$next, $id]);
        } else {
            getDB()->prepare(
                "UPDATE product_images
                    SET is_pinned = 0, pin_order = 0
                  WHERE id = ?"
            )->execute([$id]);
        }
        success(null, $pin ? 'Pinned to top.' : 'Unpinned.');
    }

    /**
     * PUT /api/admin/reels/reorder — accepts {"order": [reelId1, reelId2, ...]}
     * Reassigns pin_order top-down to match the array (1-indexed).
     */
    public function adminReorder(): never
    {
        method('PUT');
        AuthMiddleware::require();
        RoleMiddleware::require(AuthMiddleware::require(), 'admin');
        $order = getBody()['order'] ?? [];
        if (!is_array($order)) error('order must be an array of reel ids.', 422);

        $db   = getDB();
        $stmt = $db->prepare(
            "UPDATE product_images SET pin_order = ?, is_pinned = 1
              WHERE id = ? AND media_type IN ('video','youtube')"
        );
        $db->beginTransaction();
        try {
            foreach ($order as $i => $rid) {
                $stmt->execute([$i + 1, (int) $rid]);
            }
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error('Reorder failed: ' . $e->getMessage(), 500);
        }
        success(null, 'Order saved.');
    }
}
