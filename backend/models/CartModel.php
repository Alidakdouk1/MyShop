<?php
declare(strict_types=1);

class CartModel extends BaseModel
{
    protected string $table = 'cart';

    public function getOrCreate(?int $userId, ?string $sessionId): array
    {
        if ($userId) {
            $cart = $this->query("SELECT * FROM cart WHERE user_id = ?", [$userId])->fetch();
            if (!$cart) {
                $this->query("INSERT INTO cart (user_id) VALUES (?)", [$userId]);
                $cart = $this->findById($this->lastId());
            }
        } else {
            $cart = $this->query("SELECT * FROM cart WHERE session_id = ?", [$sessionId])->fetch();
            if (!$cart) {
                $this->query("INSERT INTO cart (session_id) VALUES (?)", [$sessionId]);
                $cart = $this->findById($this->lastId());
            }
        }
        return $cart;
    }

    public function items(int $cartId): array
    {
        return $this->query(
            "SELECT ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity,
                    ci.price_snapshot, ci.price_snapshot AS price,
                    p.name, p.slug, p.stock_qty,
                    COALESCE(p.sale_price, p.base_price) AS current_price,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS main_image,
                    pv.size, pv.color
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             LEFT JOIN product_variants pv ON pv.id = ci.variant_id
             WHERE ci.cart_id = ?",
            [$cartId]
        )->fetchAll();
    }

    public function addItem(int $cartId, int $productId, ?int $variantId, int $qty, float $price): int
    {
        $existing = $this->query(
            "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id <=> ?",
            [$cartId, $productId, $variantId]
        )->fetch();

        if ($existing) {
            $this->query(
                "UPDATE cart_items SET quantity = quantity + ?, price_snapshot = ? WHERE id = ?",
                [$qty, $price, $existing['id']]
            );
            return (int) $existing['id'];
        }
        $this->query(
            "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price_snapshot) VALUES (?, ?, ?, ?, ?)",
            [$cartId, $productId, $variantId, $qty, $price]
        );
        return $this->lastId();
    }

    public function getItemQuantity(int $cartId, int $productId, ?int $variantId): int
    {
        $row = $this->query(
            "SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id <=> ?",
            [$cartId, $productId, $variantId]
        )->fetch();
        return $row ? (int) $row['quantity'] : 0;
    }

    public function findItem(int $itemId, int $cartId): array|false
    {
        return $this->query(
            "SELECT * FROM cart_items WHERE id = ? AND cart_id = ?",
            [$itemId, $cartId]
        )->fetch();
    }

    public function updateItem(int $itemId, int $cartId, int $qty): bool
    {
        return $this->query(
            "UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?",
            [$qty, $itemId, $cartId]
        )->rowCount() > 0;
    }

    public function removeItem(int $itemId, int $cartId): bool
    {
        return $this->query(
            "DELETE FROM cart_items WHERE id = ? AND cart_id = ?",
            [$itemId, $cartId]
        )->rowCount() > 0;
    }

    public function clear(int $cartId): void
    {
        $this->query("DELETE FROM cart_items WHERE cart_id = ?", [$cartId]);
    }

    public function mergeGuestCart(string $sessionId, int $userId): void
    {
        $guest = $this->query("SELECT * FROM cart WHERE session_id = ?", [$sessionId])->fetch();
        if (!$guest) return;

        $userCart = $this->getOrCreate($userId, null);
        $items    = $this->items((int) $guest['id']);

        foreach ($items as $item) {
            $this->addItem(
                (int) $userCart['id'],
                (int) $item['product_id'],
                $item['variant_id'] ? (int) $item['variant_id'] : null,
                (int) $item['quantity'],
                (float) $item['price_snapshot']
            );
        }
        $this->query("DELETE FROM cart WHERE id = ?", [$guest['id']]);
    }
}
