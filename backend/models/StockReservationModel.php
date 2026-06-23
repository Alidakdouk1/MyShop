<?php
declare(strict_types=1);

/**
 * Short-lived holds on inventory while items sit in a cart.
 *
 * Effective stock anywhere in the app is:
 *   stock_qty - SUM(reservations where expires_at > NOW() AND cart_id <> me)
 *
 * Reservations for the caller's OWN cart are excluded so the user sees the
 * units they've already added to their cart as "available to bump quantity."
 *
 * We never run a cleanup cron — expired rows are filtered at read time and
 * overwritten on the next reservation for the same (cart, product, variant).
 */
class StockReservationModel extends BaseModel
{
    protected string $table = 'stock_reservations';

    private const TTL_MINUTES = 15;

    /**
     * Reserve $qty units of $productId (optionally a variant) for $cartId.
     * Refreshes the TTL; safe to call repeatedly. Doesn't validate against
     * stock — callers should check availableStock() first.
     */
    public function reserve(int $cartId, int $productId, ?int $variantId, int $qty): void
    {
        if ($qty <= 0) {
            $this->release($cartId, $productId, $variantId);
            return;
        }
        $expires = date('Y-m-d H:i:s', time() + self::TTL_MINUTES * 60);
        $this->query(
            "INSERT INTO stock_reservations (cart_id, product_id, variant_id, quantity, expires_at)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), expires_at = VALUES(expires_at)",
            [$cartId, $productId, $variantId, $qty, $expires]
        );
    }

    /** Drop a single reservation row (e.g. when an item is removed from the cart). */
    public function release(int $cartId, int $productId, ?int $variantId): void
    {
        if ($variantId === null) {
            $this->query(
                "DELETE FROM stock_reservations WHERE cart_id = ? AND product_id = ? AND variant_id IS NULL",
                [$cartId, $productId]
            );
        } else {
            $this->query(
                "DELETE FROM stock_reservations WHERE cart_id = ? AND product_id = ? AND variant_id = ?",
                [$cartId, $productId, $variantId]
            );
        }
    }

    /** Drop every reservation for a cart — used right after checkout completes. */
    public function releaseCart(int $cartId): void
    {
        $this->query("DELETE FROM stock_reservations WHERE cart_id = ?", [$cartId]);
    }

    /**
     * Total units currently held for a product, EXCLUDING the caller's own
     * cart so a shopper sees their in-cart units as still buyable.
     * Pass $excludeCartId = 0 for a "system-wide" view (admin dashboards).
     */
    public function heldForProduct(int $productId, int $excludeCartId = 0): int
    {
        return (int) $this->query(
            "SELECT COALESCE(SUM(quantity), 0)
               FROM stock_reservations
              WHERE product_id = ? AND variant_id IS NULL
                AND expires_at > NOW()
                AND cart_id <> ?",
            [$productId, $excludeCartId]
        )->fetchColumn();
    }

    public function heldForVariant(int $variantId, int $excludeCartId = 0): int
    {
        return (int) $this->query(
            "SELECT COALESCE(SUM(quantity), 0)
               FROM stock_reservations
              WHERE variant_id = ?
                AND expires_at > NOW()
                AND cart_id <> ?",
            [$variantId, $excludeCartId]
        )->fetchColumn();
    }

    /**
     * Effective stock a shopper can actually buy right now.
     * Subtracts ACTIVE reservations from other carts only.
     */
    public function availableForProduct(int $productId, int $rawStock, int $excludeCartId = 0): int
    {
        return max(0, $rawStock - $this->heldForProduct($productId, $excludeCartId));
    }

    public function availableForVariant(int $variantId, int $rawStock, int $excludeCartId = 0): int
    {
        return max(0, $rawStock - $this->heldForVariant($variantId, $excludeCartId));
    }
}
