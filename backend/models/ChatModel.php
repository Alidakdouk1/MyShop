<?php
declare(strict_types=1);

class ChatModel extends BaseModel
{
    protected string $table = 'chat_conversations';

    /** Every user has exactly one support conversation — create it on first use. */
    public function getOrCreateForUser(int $userId): array
    {
        $row = $this->query("SELECT * FROM chat_conversations WHERE user_id = ?", [$userId])->fetch();
        if ($row) return $row;
        $this->query(
            "INSERT INTO chat_conversations (user_id, last_message_at) VALUES (?, NOW())",
            [$userId]
        );
        return $this->findById($this->lastId());
    }

    public function findConversation(int $id): ?array
    {
        $row = $this->query(
            "SELECT c.*, u.name AS user_name, u.email AS user_email
             FROM chat_conversations c JOIN users u ON u.id = c.user_id
             WHERE c.id = ?",
            [$id]
        )->fetch();
        return $row ?: null;
    }

    /** Messages in a conversation, optionally only those newer than $afterId (polling). */
    public function messages(int $conversationId, int $afterId = 0): array
    {
        return $this->query(
            "SELECT id, conversation_id, sender_id, sender_role, body, is_read, created_at
             FROM chat_messages
             WHERE conversation_id = ? AND id > ?
             ORDER BY id ASC",
            [$conversationId, $afterId]
        )->fetchAll();
    }

    public function addMessage(int $conversationId, int $senderId, string $role, string $body): int
    {
        $this->query(
            "INSERT INTO chat_messages (conversation_id, sender_id, sender_role, body) VALUES (?, ?, ?, ?)",
            [$conversationId, $senderId, $role, $body]
        );
        $id = $this->lastId();
        // Bump activity time; a new message reopens a closed conversation.
        $this->query(
            "UPDATE chat_conversations
             SET last_message_at = NOW(), status = IF(status = 'closed', 'open', status)
             WHERE id = ?",
            [$conversationId]
        );
        return $id;
    }

    /** Mark the OTHER party's messages as read (the reader just opened the thread). */
    public function markRead(int $conversationId, string $readerRole): void
    {
        $otherRole = $readerRole === 'admin' ? 'user' : 'admin';
        $this->query(
            "UPDATE chat_messages SET is_read = 1
             WHERE conversation_id = ? AND sender_role = ? AND is_read = 0",
            [$conversationId, $otherRole]
        );
    }

    /** Admin messages the user hasn't read yet (for the customer's badge). */
    public function userUnreadCount(int $conversationId): int
    {
        return (int) $this->query(
            "SELECT COUNT(*) FROM chat_messages
             WHERE conversation_id = ? AND sender_role = 'admin' AND is_read = 0",
            [$conversationId]
        )->fetchColumn();
    }

    /** Admin inbox: every conversation with last message + unread count. */
    public function allConversations(): array
    {
        return $this->query(
            "SELECT c.id, c.user_id, c.status, c.last_message_at, c.created_at,
                    u.name AS user_name, u.email AS user_email,
                    (SELECT body        FROM chat_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_body,
                    (SELECT sender_role FROM chat_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_role,
                    (SELECT COUNT(*)    FROM chat_messages WHERE conversation_id = c.id AND sender_role = 'user' AND is_read = 0) AS unread
             FROM chat_conversations c
             JOIN users u ON u.id = c.user_id
             WHERE EXISTS (SELECT 1 FROM chat_messages WHERE conversation_id = c.id)
             ORDER BY c.last_message_at DESC, c.id DESC"
        )->fetchAll();
    }

    /** Total unread customer messages across all conversations (admin nav badge). */
    public function adminUnreadTotal(): int
    {
        return (int) $this->query(
            "SELECT COUNT(*) FROM chat_messages WHERE sender_role = 'user' AND is_read = 0"
        )->fetchColumn();
    }

    public function setStatus(int $id, string $status): void
    {
        $this->query("UPDATE chat_conversations SET status = ? WHERE id = ?", [$status, $id]);
    }
}
