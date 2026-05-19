<?php
declare(strict_types=1);

class NotificationModel extends BaseModel
{
    protected string $table = 'notifications';

    public function create(int $userId, string $type, string $title, string $message, ?string $link = null): int
    {
        $this->query(
            "INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)",
            [$userId, $type, $title, $message, $link]
        );
        return $this->lastId();
    }

    public function forUser(int $userId, int $limit, int $offset): array
    {
        return $this->query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [$userId, $limit, $offset]
        )->fetchAll();
    }

    public function unreadCount(int $userId): int
    {
        return (int) $this->query(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", [$userId]
        )->fetchColumn();
    }

    public function markRead(int $userId): void
    {
        $this->query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [$userId]);
    }
}
