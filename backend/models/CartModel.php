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
        $rows = $this->query(
            "SELECT ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.option_signature, ci.quantity,
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
        if (!$rows) return [];

        $ids = array_column($rows, 'id');
        $ph  = implode(',', array_fill(0, count($ids), '?'));
        $opts = $this->query(
            "SELECT cio.cart_item_id, cio.filter_option_id, fo.value AS option_value,
                    f.id AS filter_id, f.name AS filter_name, f.unit AS filter_unit
             FROM cart_item_options cio
             JOIN filter_options fo ON fo.id = cio.filter_option_id
             JOIN filters f         ON f.id  = fo.filter_id
             WHERE cio.cart_item_id IN ({$ph})",
            $ids
        )->fetchAll();

        $grouped = [];
        foreach ($opts as $o) {
            $grouped[(int) $o['cart_item_id']][] = [
                'filter_id'   => (int) $o['filter_id'],
                'filter_name' => $o['filter_name'],
                'filter_unit' => $o['filter_unit'],
                'option_id'   => (int) $o['filter_option_id'],
                'value'       => $o['option_value'],
            ];
        }
        foreach ($rows as &$r) {
            $r['picked_options'] = $grouped[(int) $r['id']] ?? [];
        }
        return $rows;
    }

    /** Sorted "5,12,18" signature so the same picks merge into one cart row. */
    public static function buildOptionSignature(array $optionIds): ?string
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $optionIds))));
        if (!$ids) return null;
        sort($ids, SORT_NUMERIC);
        return implode(',', $ids);
    }

    public function addItem(int $cartId, int $productId, ?int $variantId, int $qty, float $price, array $optionIds = []): int
    {
        $sig = self::buildOptionSignature($optionIds);

        $existing = $this->query(
            "SELECT id, quantity FROM cart_items
             WHERE cart_id = ? AND product_id = ? AND variant_id <=> ? AND option_signature <=> ?",
            [$cartId, $productId, $variantId, $sig]
        )->fetch();

        if ($existing) {
            $this->query(
                "UPDATE cart_items SET quantity = quantity + ?, price_snapshot = ? WHERE id = ?",
                [$qty, $price, $existing['id']]
            );
            return (int) $existing['id'];
        }
        $this->query(
            "INSERT INTO cart_items (cart_id, product_id, variant_id, option_signature, quantity, price_snapshot)
             VALUES (?, ?, ?, ?, ?, ?)",
            [$cartId, $productId, $variantId, $sig, $qty, $price]
        );
        $newId = $this->lastId();

        foreach (array_unique(array_filter(array_map('intval', $optionIds))) as $oid) {
            $this->query(
                "INSERT IGNORE INTO cart_item_options (cart_item_id, filter_option_id) VALUES (?, ?)",
                [$newId, $oid]
            );
        }
        return $newId;
    }

    public function getItemQuantity(int $cartId, int $productId, ?int $variantId, array $optionIds = []): int
    {
        $sig = self::buildOptionSignature($optionIds);
        $row = $this->query(
            "SELECT quantity FROM cart_items
             WHERE cart_id = ? AND product_id = ? AND variant_id <=> ? AND option_signature <=> ?",
            [$cartId, $productId, $variantId, $sig]
        )->fetch();
        return $row ? (int) $row['quantity'] : 0;
    }

    /**
     * Sum the qty already in this cart that's tied to a specific filter option.
     * Used to enforce per-option stock without merging across other picks.
     */
    public function qtyInCartForOption(int $cartId, int $productId, int $optionId, ?int $excludeItemId = null): int
    {
        $sql    = "SELECT COALESCE(SUM(ci.quantity), 0)
                   FROM cart_items ci
                   JOIN cart_item_options cio ON cio.cart_item_id = ci.id
                   WHERE ci.cart_id = ? AND ci.product_id = ? AND cio.filter_option_id = ?";
        $params = [$cartId, $productId, $optionId];
        if ($excludeItemId !== null) {
            $sql      .= " AND ci.id <> ?";
            $params[]  = $excludeItemId;
        }
        return (int) $this->query($sql, $params)->fetchColumn();
    }

    /** Return the picked filter_option_ids attached to a cart item. */
    public function itemOptionIds(int $cartItemId): array
    {
        $rows = $this->query(
            "SELECT filter_option_id FROM cart_item_options WHERE cart_item_id = ?",
            [$cartItemId]
        )->fetchAll();
        return array_map(fn($r) => (int) $r['filter_option_id'], $rows);
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
                (float) $item['price_snapshot'],
                $this->itemOptionIds((int) $item['id'])
            );
        }
        $this->query("DELETE FROM cart WHERE id = ?", [$guest['id']]);
    }
}
