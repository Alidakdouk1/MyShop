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

    /**
     * Idempotent add: if the row already exists, return that row instead of
     * failing on the UNIQUE constraint. The frontend toggle calls add() in
     * cases where state is stale; this keeps the API friendly.
     */
    public function add(int $userId, int $productId): ?array
    {
        $existing = $this->query(
            "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? LIMIT 1",
            [$userId, $productId]
        )->fetch();

        if ($existing) {
            $id = (int) $existing['id'];
        } else {
            try {
                $this->query("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", [$userId, $productId]);
                $id = $this->lastId();
            } catch (PDOException) {
                // Race with another tab — fall back to re-fetching the existing row.
                $row = $this->query(
                    "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? LIMIT 1",
                    [$userId, $productId]
                )->fetch();
                if (!$row) return null;
                $id = (int) $row['id'];
            }
        }

        return $this->query(
            "SELECT w.id, w.created_at, p.id AS product_id, p.name, p.slug,
                    p.base_price, p.sale_price, p.stock_qty,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image
             FROM wishlists w
             JOIN products p ON p.id = w.product_id
             WHERE w.id = ?",
            [$id]
        )->fetch() ?: null;
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

    // ── Public sharing ────────────────────────────────────────────────────

    /**
     * Generate (or return) a stable share token for this user. Idempotent:
     * tapping Share repeatedly returns the same token so existing links
     * keep working.
     */
    public function ensureShareToken(int $userId): string
    {
        $row = $this->query("SELECT wishlist_share_token FROM users WHERE id = ?", [$userId])->fetch();
        if ($row && !empty($row['wishlist_share_token'])) {
            return (string) $row['wishlist_share_token'];
        }
        // 16 hex chars = 64 bits of entropy. The UNIQUE index catches the
        // astronomically-unlikely collision; we retry a few times just in case.
        for ($i = 0; $i < 5; $i++) {
            $token = bin2hex(random_bytes(8));
            try {
                $this->query("UPDATE users SET wishlist_share_token = ? WHERE id = ?", [$token, $userId]);
                return $token;
            } catch (PDOException) {
                // Collision (or no-op race) — retry.
            }
        }
        throw new RuntimeException('Could not generate share token.');
    }

    public function clearShareToken(int $userId): void
    {
        $this->query("UPDATE users SET wishlist_share_token = NULL WHERE id = ?", [$userId]);
    }

    public function findUserByShareToken(string $token): ?array
    {
        $row = $this->query(
            "SELECT id, name FROM users WHERE wishlist_share_token = ? LIMIT 1",
            [$token]
        )->fetch();
        return $row ?: null;
    }
}
