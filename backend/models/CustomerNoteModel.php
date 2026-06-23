<?php
declare(strict_types=1);

class CustomerNoteModel extends BaseModel
{
    protected string $table = 'customer_notes';

    /** Notes for one customer, pinned first then most recent first. */
    public function forUser(int $userId): array
    {
        return $this->query(
            "SELECT n.id, n.user_id, n.admin_id, n.body, n.pinned,
                    n.created_at, n.updated_at,
                    a.name AS admin_name
             FROM customer_notes n
             LEFT JOIN users a ON a.id = n.admin_id
             WHERE n.user_id = ?
             ORDER BY n.pinned DESC, n.created_at DESC",
            [$userId]
        )->fetchAll();
    }

    public function find(int $id): ?array
    {
        $row = $this->query("SELECT * FROM customer_notes WHERE id = ?", [$id])->fetch();
        return $row ?: null;
    }

    /** Returns the inserted row so the admin UI can render it without a refetch. */
    public function create(int $userId, ?int $adminId, string $body, bool $pinned = false): array
    {
        $this->query(
            "INSERT INTO customer_notes (user_id, admin_id, body, pinned) VALUES (?, ?, ?, ?)",
            [$userId, $adminId, $body, $pinned ? 1 : 0]
        );
        $id = $this->lastId();
        return $this->query(
            "SELECT n.*, a.name AS admin_name
             FROM customer_notes n
             LEFT JOIN users a ON a.id = n.admin_id
             WHERE n.id = ?",
            [$id]
        )->fetch();
    }

    public function update(int $id, array $data): void
    {
        $sets = [];
        $params = [];
        foreach (['body', 'pinned'] as $k) {
            if (array_key_exists($k, $data)) {
                $sets[]   = "{$k} = ?";
                $params[] = $k === 'pinned' ? ($data[$k] ? 1 : 0) : $data[$k];
            }
        }
        if (!$sets) return;
        $params[] = $id;
        $this->query("UPDATE customer_notes SET " . implode(', ', $sets) . " WHERE id = ?", $params);
    }

    // delete(int $id): bool is inherited from BaseModel.

    /** One pinned note per customer keyed by user_id — used by the orders list. */
    public function pinnedForUsers(array $userIds): array
    {
        if (!$userIds) return [];
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $rows = $this->query(
            "SELECT user_id, body
             FROM customer_notes
             WHERE pinned = 1 AND user_id IN ({$placeholders})
             ORDER BY updated_at DESC",
            $userIds
        )->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            // Keep only the most recent pinned note per user.
            if (!isset($out[$r['user_id']])) $out[$r['user_id']] = $r['body'];
        }
        return $out;
    }
}
