<?php
declare(strict_types=1);

class StockNotificationModel extends BaseModel
{
    protected string $table = 'stock_notifications';

    /** Register an email for a product's restock. Idempotent. */
    public function subscribe(int $productId, string $email): array
    {
        $existing = $this->query(
            "SELECT id FROM stock_notifications WHERE product_id = ? AND email = ?",
            [$productId, $email]
        )->fetch();
        if ($existing) return ['already' => true];

        $this->query(
            "INSERT INTO stock_notifications (product_id, email) VALUES (?, ?)",
            [$productId, $email]
        );
        return ['already' => false, 'id' => $this->lastId()];
    }

    /**
     * Register a push subscription endpoint for a product's restock. Idempotent.
     * Stored alongside email subscribers so the fan-out at restock time is a
     * single SELECT.
     */
    public function subscribePush(int $productId, string $endpoint): array
    {
        $existing = $this->query(
            "SELECT id FROM stock_notifications WHERE product_id = ? AND push_endpoint = ?",
            [$productId, $endpoint]
        )->fetch();
        if ($existing) return ['already' => true];

        $this->query(
            "INSERT INTO stock_notifications (product_id, email, push_endpoint) VALUES (?, NULL, ?)",
            [$productId, $endpoint]
        );
        return ['already' => false, 'id' => $this->lastId()];
    }

    /** Pending (un-notified) requests for a product — used when restocking. */
    public function pendingForProduct(int $productId): array
    {
        return $this->query(
            "SELECT * FROM stock_notifications WHERE product_id = ? AND is_notified = 0",
            [$productId]
        )->fetchAll();
    }

    /** Mark a batch of rows as notified so we don't double-fire on the next restock. */
    public function markNotified(array $ids): void
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return;
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $this->query("UPDATE stock_notifications SET is_notified = 1 WHERE id IN ({$ph})", $ids);
    }
}
