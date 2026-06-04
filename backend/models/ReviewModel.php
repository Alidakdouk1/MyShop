<?php
declare(strict_types=1);

class ReviewModel extends BaseModel
{
    protected string $table = 'reviews';

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, is_verified_purchase)
             VALUES (?, ?, ?, ?, ?, ?, 1)",
            [$data['product_id'], $data['user_id'], $data['order_id'],
             $data['rating'], $data['title'] ?? null, $data['body'] ?? null]
        );
        return $this->lastId();
    }

    public function forProduct(int $productId, int $limit, int $offset): array
    {
        return $this->query(
            "SELECT r.*, u.name AS reviewer_name, u.avatar_url
             FROM reviews r JOIN users u ON u.id = r.user_id
             WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
            [$productId, $limit, $offset]
        )->fetchAll();
    }

    public function countForProduct(int $productId): int
    {
        return (int) $this->query("SELECT COUNT(*) FROM reviews WHERE product_id = ?", [$productId])->fetchColumn();
    }

    public function stats(int $productId): array
    {
        return $this->query(
            "SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total,
                    SUM(rating = 5) AS five, SUM(rating = 4) AS four,
                    SUM(rating = 3) AS three, SUM(rating = 2) AS two, SUM(rating = 1) AS one
             FROM reviews WHERE product_id = ?",
            [$productId]
        )->fetch();
    }

    public function userAlreadyReviewed(int $userId, int $productId, int $orderId): bool
    {
        return (bool) $this->query(
            "SELECT id FROM reviews WHERE user_id = ? AND product_id = ? AND order_id = ?",
            [$userId, $productId, $orderId]
        )->fetchColumn();
    }

    /** Most recent delivered order for this user/product that hasn't been reviewed yet. */
    public function eligibleOrderForReview(int $userId, int $productId): ?int
    {
        $row = $this->query(
            "SELECT o.id FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
               AND NOT EXISTS (
                 SELECT 1 FROM reviews r
                 WHERE r.user_id = o.user_id AND r.product_id = oi.product_id AND r.order_id = o.id
               )
             ORDER BY o.created_at DESC LIMIT 1",
            [$userId, $productId]
        )->fetch();
        return $row ? (int) $row['id'] : null;
    }

    public function hasDeliveredPurchase(int $userId, int $productId): bool
    {
        return (bool) $this->query(
            "SELECT 1 FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered' LIMIT 1",
            [$userId, $productId]
        )->fetchColumn();
    }

    /** Admin list — every review with product + user info. */
    public function adminAll(int $limit, int $offset, string $search = '', int $minRating = 0): array
    {
        $where  = []; $params = [];
        if ($search) {
            $where[]  = "(p.name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)";
            $params[] = "%{$search}%"; $params[] = "%{$search}%"; $params[] = "%{$search}%";
        }
        if ($minRating > 0) { $where[] = "r.rating >= ?"; $params[] = $minRating; }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $params[] = $limit; $params[] = $offset;
        return $this->query(
            "SELECT r.id, r.rating, r.title, r.body, r.created_at,
                    p.id AS product_id, p.name AS product_name, p.slug AS product_slug,
                    u.name AS reviewer_name, u.email AS reviewer_email,
                    (SELECT COUNT(*) FROM review_photos WHERE review_id = r.id) AS photo_count
             FROM reviews r
             JOIN products p ON p.id = r.product_id
             JOIN users u   ON u.id = r.user_id
             {$whereSql}
             ORDER BY r.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        )->fetchAll();
    }

    public function countAdminAll(string $search = '', int $minRating = 0): int
    {
        $where  = []; $params = [];
        if ($search) {
            $where[]  = "(p.name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)";
            $params[] = "%{$search}%"; $params[] = "%{$search}%"; $params[] = "%{$search}%";
        }
        if ($minRating > 0) { $where[] = "r.rating >= ?"; $params[] = $minRating; }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        return (int) $this->query(
            "SELECT COUNT(*) FROM reviews r
             JOIN products p ON p.id = r.product_id
             JOIN users u   ON u.id = r.user_id
             {$whereSql}",
            $params
        )->fetchColumn();
    }

    // ── Review photos ───────────────────────────────────────────────────────

    public function addPhoto(int $reviewId, string $url): int
    {
        $this->query(
            "INSERT INTO review_photos (review_id, image_url) VALUES (?, ?)",
            [$reviewId, $url]
        );
        return $this->lastId();
    }

    /** Map of review_id => [image_url, ...] for the given review ids. */
    public function photosForReviewIds(array $ids): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return [];
        $ph   = implode(',', array_fill(0, count($ids), '?'));
        $rows = $this->query(
            "SELECT review_id, image_url FROM review_photos
             WHERE review_id IN ({$ph}) ORDER BY id ASC",
            $ids
        )->fetchAll();
        $map = [];
        foreach ($rows as $r) { $map[(int) $r['review_id']][] = $r['image_url']; }
        return $map;
    }

    /** Newest customer photos across all reviews for one product. */
    public function recentPhotosForProduct(int $productId, int $limit = 12): array
    {
        return $this->query(
            "SELECT rp.image_url, r.id AS review_id, u.name AS reviewer_name
             FROM review_photos rp
             JOIN reviews r ON r.id = rp.review_id
             JOIN users u   ON u.id = r.user_id
             WHERE r.product_id = ?
             ORDER BY rp.id DESC LIMIT ?",
            [$productId, $limit]
        )->fetchAll();
    }
}
