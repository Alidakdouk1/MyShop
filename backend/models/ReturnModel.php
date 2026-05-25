<?php
declare(strict_types=1);

class ReturnModel extends BaseModel
{
    protected string $table = 'return_requests';

    public function create(array $d): int
    {
        $this->query(
            "INSERT INTO return_requests (order_id, user_id, reason) VALUES (?, ?, ?)",
            [$d['order_id'], $d['user_id'], $d['reason']]
        );
        return $this->lastId();
    }

    public function forUser(int $userId): array
    {
        return $this->query(
            "SELECT rr.*, o.total AS order_total
             FROM return_requests rr JOIN orders o ON o.id = rr.order_id
             WHERE rr.user_id = ? ORDER BY rr.created_at DESC",
            [$userId]
        )->fetchAll();
    }

    public function forOrder(int $orderId): ?array
    {
        $r = $this->query(
            "SELECT * FROM return_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
            [$orderId]
        )->fetch();
        return $r ?: null;
    }

    public function all(int $limit, int $offset): array
    {
        return $this->query(
            "SELECT rr.*, o.total AS order_total, u.name AS customer_name, u.email AS customer_email
             FROM return_requests rr
             JOIN orders o ON o.id = rr.order_id
             JOIN users u ON u.id = rr.user_id
             ORDER BY rr.created_at DESC
             LIMIT " . (int) $limit . " OFFSET " . (int) $offset
        )->fetchAll();
    }

    public function updateStatus(int $id, string $status, ?string $note): void
    {
        $this->query(
            "UPDATE return_requests SET status = ?, admin_note = ? WHERE id = ?",
            [$status, $note, $id]
        );
    }
}
