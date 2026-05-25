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

    /** Pending (un-notified) requests for a product — used when restocking. */
    public function pendingForProduct(int $productId): array
    {
        return $this->query(
            "SELECT * FROM stock_notifications WHERE product_id = ? AND is_notified = 0",
            [$productId]
        )->fetchAll();
    }
}
