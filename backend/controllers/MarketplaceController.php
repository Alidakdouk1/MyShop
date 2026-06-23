<?php
declare(strict_types=1);

class MarketplaceController
{
    private MarketplaceModel $ads;

    public function __construct()
    {
        $this->ads = new MarketplaceModel();
    }

    // ── Settings ────────────────────────────────────────────────────────

    private const SETTINGS_KEY = 'marketplace_settings';
    private const SETTINGS_DEFAULTS = [
        'enabled'          => 1,    // master switch
        'require_approval' => 1,    // 0 = ads go live instantly
        'require_phone'    => 1,    // contact_phone mandatory
        'max_images'       => 6,    // per ad (1–10)
        'max_ads_per_user' => 20,   // active ads cap (0 = unlimited)
        'price_max'        => 0,    // reject prices above this (0 = no cap)
        'ad_expiry_days'   => 30,   // ads expire this many days after approval (0 = never)
        'categories'       => [
            'Phones & Tablets','Electronics','Computers','Fashion','Home & Garden',
            'Vehicles','Furniture','Sports & Hobbies','Baby & Kids','Jobs','Services','Other',
        ],
        'guidelines'       => 'Keep it honest. No prohibited items, no spam. Ads are reviewed before going live.',
    ];

    private function settings(): array
    {
        $row = getDB()->query(
            "SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::SETTINGS_KEY)
        )->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        $merged = array_merge(self::SETTINGS_DEFAULTS, $stored);
        // categories must always be a non-empty array
        if (empty($merged['categories']) || !is_array($merged['categories'])) {
            $merged['categories'] = self::SETTINGS_DEFAULTS['categories'];
        }
        return $merged;
    }

    /** GET /api/marketplace/settings — public; storefront configures itself. */
    public function getSettings(): never
    {
        method('GET');
        success($this->settings());
    }

    /** GET/PUT /api/admin/marketplace/settings */
    public function adminSettings(): never
    {
        method('GET', 'PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
            success($this->settings());
        }

        $in    = getBody();
        $cats  = $in['categories'] ?? [];
        if (is_string($cats)) {
            // accept comma/newline separated string too
            $cats = preg_split('/[\n,]+/', $cats);
        }
        $cats = array_values(array_filter(array_map(
            fn($c) => sanitize(trim((string) $c)),
            is_array($cats) ? $cats : []
        )));
        if (!$cats) $cats = self::SETTINGS_DEFAULTS['categories'];

        $clean = [
            'enabled'          => empty($in['enabled']) ? 0 : 1,
            'require_approval' => empty($in['require_approval']) ? 0 : 1,
            'require_phone'    => empty($in['require_phone']) ? 0 : 1,
            'max_images'       => max(1, min((int) ($in['max_images'] ?? 6), 10)),
            'max_ads_per_user' => max(0, min((int) ($in['max_ads_per_user'] ?? 20), 200)),
            'price_max'        => max(0, (float) ($in['price_max'] ?? 0)),
            'ad_expiry_days'   => max(0, min((int) ($in['ad_expiry_days'] ?? 30), 365)),
            'categories'       => array_slice($cats, 0, 40),
            'guidelines'       => sanitize((string) ($in['guidelines'] ?? '')),
        ];

        getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        )->execute([self::SETTINGS_KEY, json_encode($clean)]);

        success($this->settings(), 'Marketplace settings saved.');
    }

    /** GET /api/marketplace — public browse, approved only. */
    public function index(): never
    {
        method('GET');
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = max(1, min((int) ($_GET['limit'] ?? 20), 48));
        $offset = ($page - 1) * $limit;

        $filters = [
            'search'    => trim((string) ($_GET['search']    ?? '')),
            'category'  => trim((string) ($_GET['category']  ?? '')),
            'price_min' => $_GET['price_min'] ?? '',
            'price_max' => $_GET['price_max'] ?? '',
        ];

        $items = $this->ads->browse($filters, $limit, $offset);
        $total = $this->ads->countBrowse($filters);

        success([
            'ads'  => $items,
            'meta' => [
                'total'      => $total,
                'page'       => $page,
                'last_page'  => max(1, (int) ceil($total / $limit)),
            ],
        ]);
    }

    /** GET /api/marketplace/{id} — public if approved, owner/admin otherwise. */
    public function show(int $id): never
    {
        method('GET');
        $ad = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);

        if ($ad['status'] !== 'approved') {
            // Only the owner or an admin can preview a non-approved ad.
            $auth = AuthMiddleware::optional();
            $isOwner = $auth && (int) $auth['sub'] === (int) $ad['user_id'];
            $isAdmin = $auth && ($auth['role'] ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) error('Ad not found.', 404);
        } else {
            $this->ads->incrementViews($id);
        }
        success($ad);
    }

    /** POST /api/marketplace — create a new ad (auth required). */
    public function store(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        $cfg  = $this->settings();
        if (!$cfg['enabled']) error('The marketplace is currently closed.', 403);

        RateLimiter::check('marketplace_post', 8, 3600); // max 8 new ads/hour
        $data = getBody();

        $title = trim((string) ($data['title'] ?? ''));
        if (mb_strlen($title) < 3)   error('Title must be at least 3 characters.', 422);
        if (mb_strlen($title) > 160) error('Title is too long.', 422);

        $phone = isset($data['contact_phone']) ? trim((string) $data['contact_phone']) : '';
        if ($cfg['require_phone'] && $phone === '') {
            error('A contact phone number is required.', 422);
        }

        $price = is_numeric($data['price'] ?? null) ? (float) $data['price'] : null;
        if ($cfg['price_max'] > 0 && $price !== null && $price > $cfg['price_max']) {
            error('Price exceeds the marketplace maximum of $' . number_format($cfg['price_max'], 0) . '.', 422);
        }

        // Per-user active-ad cap (pending + approved count; sold/rejected don't).
        if ($cfg['max_ads_per_user'] > 0) {
            $active = $this->ads->countActiveForUser((int) $auth['sub']);
            if ($active >= $cfg['max_ads_per_user']) {
                error("You've reached the limit of {$cfg['max_ads_per_user']} active ads.", 422);
            }
        }

        $clean = [
            'title'         => sanitize($title),
            'description'   => isset($data['description']) ? sanitize((string) $data['description']) : null,
            'price'         => $price,
            'category'      => isset($data['category']) ? sanitize((string) $data['category']) : null,
            'condition'     => $data['condition'] ?? 'good',
            'location'      => isset($data['location']) ? sanitize((string) $data['location']) : null,
            'contact_phone' => sanitize($phone),
            'images'        => [],
        ];
        // Auto-approve when admin has turned off the review requirement.
        $autoApprove = !$cfg['require_approval'];
        $id = $this->ads->create((int) $auth['sub'], $clean, $autoApprove);
        if ($autoApprove) {
            // Stamp expiry now since it's already live.
            $this->ads->approveWithExpiry($id, (int) $cfg['ad_expiry_days']);
        }

        // Alert the admin so pending ads get reviewed quickly. Skip when the ad
        // auto-published (nothing to review). MailHelper is a no-op if mail is off.
        if (!$autoApprove) {
            $adminEmail = env('ADMIN_NOTIFY_EMAIL', env('MAIL_FROM_ADDRESS', ''));
            if ($adminEmail) {
                $seller = getDB()->prepare("SELECT name FROM users WHERE id = ?");
                $seller->execute([(int) $auth['sub']]);
                MailHelper::marketplaceNewAd($adminEmail, array_merge($clean, ['id' => $id]), (string) $seller->fetchColumn());
            }
        }

        success(
            ['id' => $id],
            $autoApprove ? 'Ad published!' : 'Ad submitted — pending review.',
            201
        );
    }

    /** POST /api/marketplace/{id}/image — upload one image to an ad (owner only). */
    public function uploadImage(int $id): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        $ad   = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        if ((int) $ad['user_id'] !== (int) $auth['sub']) error('Not allowed.', 403);
        $maxImg = (int) $this->settings()['max_images'];
        if (count($ad['images']) >= $maxImg) error("Maximum {$maxImg} images per ad.", 422);
        if (empty($_FILES['image']['tmp_name'])) error('No image uploaded.', 422);

        $path = UploadHelper::saveImage($_FILES['image'], "marketplace/{$id}");
        $images = [...$ad['images'], $path];
        $this->ads->setImages($id, $images);
        success(['images' => $images], 'Image added.');
    }

    /** PUT /api/marketplace/{id} — owner edit (re-enters pending review). */
    public function update(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        $ad   = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        if ((int) $ad['user_id'] !== (int) $auth['sub']) error('Not allowed.', 403);

        $data  = getBody();
        $title = trim((string) ($data['title'] ?? ''));
        if (mb_strlen($title) < 3) error('Title must be at least 3 characters.', 422);

        $this->ads->update($id, [
            'title'         => sanitize($title),
            'description'   => isset($data['description']) ? sanitize((string) $data['description']) : null,
            'price'         => is_numeric($data['price'] ?? null) ? (float) $data['price'] : null,
            'category'      => isset($data['category']) ? sanitize((string) $data['category']) : null,
            'condition'     => $data['condition'] ?? 'good',
            'location'      => isset($data['location']) ? sanitize((string) $data['location']) : null,
            'contact_phone' => isset($data['contact_phone']) ? sanitize((string) $data['contact_phone']) : null,
        ]);
        success(null, 'Ad updated — pending review.');
    }

    /** Owner marks their ad sold. */
    public function markSold(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        $ad   = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        if ((int) $ad['user_id'] !== (int) $auth['sub']) error('Not allowed.', 403);
        $this->ads->setStatus($id, 'sold');
        success(null, 'Marked as sold.');
    }

    /** PUT /api/marketplace/{id}/renew — owner pushes the expiry out again. */
    public function renew(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        $ad   = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        if ((int) $ad['user_id'] !== (int) $auth['sub']) error('Not allowed.', 403);
        // Rejected ads can't be self-renewed — they need a fresh review.
        if ($ad['status'] === 'rejected') error('This ad was rejected and cannot be renewed.', 422);
        $this->ads->renew($id, (int) $this->settings()['ad_expiry_days']);
        success(null, 'Ad renewed.');
    }

    /** DELETE /api/marketplace/{id} — owner or admin. */
    public function destroy(int $id): never
    {
        method('DELETE');
        $auth = AuthMiddleware::require();
        $ad   = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        $isAdmin = ($auth['role'] ?? '') === 'admin';
        if (!$isAdmin && (int) $ad['user_id'] !== (int) $auth['sub']) error('Not allowed.', 403);
        $this->ads->delete($id);
        success(null, 'Ad deleted.');
    }

    /** POST /api/marketplace/{id}/report  body: { reason, note? } — auth required. */
    public function report(int $id): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        RateLimiter::check('marketplace_report', 15, 3600);
        $ad = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        if ((int) $ad['user_id'] === (int) $auth['sub']) error("You can't report your own ad.", 422);

        $allowed = ['spam','scam','prohibited','offensive','wrong_category','other'];
        $reason  = (string) (getBody()['reason'] ?? '');
        if (!in_array($reason, $allowed, true)) error('Please pick a valid reason.', 422);
        $note = isset(getBody()['note']) ? sanitize(mb_substr((string) getBody()['note'], 0, 300)) : null;

        // Idempotent per (ad, user): re-reporting just refreshes reason/note.
        getDB()->prepare(
            "INSERT INTO marketplace_ad_reports (ad_id, user_id, reason, note)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = VALUES(reason), note = VALUES(note), created_at = CURRENT_TIMESTAMP"
        )->execute([$id, (int) $auth['sub'], $reason, $note]);

        success(null, 'Thanks — our team will review this listing.', 201);
    }

    /** GET /api/marketplace/mine — the caller's own ads (any status). */
    public function mine(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        success(['ads' => $this->ads->forUser((int) $auth['sub'])]);
    }

    // ── Admin ───────────────────────────────────────────────────────────

    /** GET /api/admin/marketplace?status=pending */
    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        success(['ads' => $this->ads->adminAll(trim((string) ($_GET['status'] ?? '')))]);
    }

    /** PUT /api/admin/marketplace/{id}/status  body: { status, reason? } */
    public function adminSetStatus(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data   = getBody();
        $status = $data['status'] ?? '';
        if (!in_array($status, ['pending','approved','rejected','sold'], true)) {
            error('Invalid status.', 422);
        }
        $ad = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        if ($status === 'approved') {
            // Approving sets/refreshes the expiry clock.
            $this->ads->approveWithExpiry($id, (int) $this->settings()['ad_expiry_days']);
        } else {
            $this->ads->setStatus($id, $status, isset($data['reason']) ? sanitize((string) $data['reason']) : null);
        }
        success(null, 'Status updated.');
    }

    /** PUT /api/admin/marketplace/{id}/feature  body: { featured: bool } */
    public function adminSetFeatured(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $ad = $this->ads->find($id);
        if (!$ad) error('Ad not found.', 404);
        $featured = !empty(getBody()['featured']);
        $this->ads->setFeatured($id, $featured);
        success(null, $featured ? 'Ad featured.' : 'Ad unfeatured.');
    }
}
