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
}
