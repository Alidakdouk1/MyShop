<?php
declare(strict_types=1);

class WishlistModel extends BaseModel
{
    protected string $table = 'wishlists';

    public function forUser(int $userId): array
    {
        return $this->query(
            "SELECT w.id, w.created_at, p.id AS product_id, p.name, p.slug,
                    p.base_price, p.sale_price, p.stock_qty,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image
             FROM wishlists w
             JOIN products p ON p.id = w.product_id
             WHERE w.user_id = ? ORDER BY w.created_at DESC",
            [$userId]
        )->fetchAll();
    }

    public function add(int $userId, int $productId): ?array
    {
        try {
            $this->query("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", [$userId, $productId]);
            $id = $this->lastId();
            return $this->query(
                "SELECT w.id, w.created_at, p.id AS product_id, p.name, p.slug,
                        p.base_price, p.sale_price, p.stock_qty,
                        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image
                 FROM wishlists w
                 JOIN products p ON p.id = w.product_id
                 WHERE w.id = ?",
                [$id]
            )->fetch() ?: null;
        } catch (PDOException) {
            return null;
        }
    }

    public function remove(int $id, int $userId): bool
    {
        return $this->query(
            "DELETE FROM wishlists WHERE id = ? AND user_id = ?", [$id, $userId]
        )->rowCount() > 0;
    }

    public function exists(int $userId, int $productId): bool
    {
        return (bool) $this->query(
            "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?", [$userId, $productId]
        )->fetchColumn();
    }
}
