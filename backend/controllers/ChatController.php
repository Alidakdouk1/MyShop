<?php
declare(strict_types=1);

class ChatController
{
    private ChatModel $chat;
    private const MAX_LEN = 2000;

    public function __construct()
    {
        $this->chat = new ChatModel();
    }

    private function cleanBody(): string
    {
        $data = getBody();
        $body = trim((string) ($data['body'] ?? ''));
        if ($body === '')               error('Message cannot be empty.', 422);
        if (mb_strlen($body) > self::MAX_LEN) error('Message is too long.', 422);
        return $body;
    }

    private function guardAdmin(): array
    {
        $auth = AuthMiddleware::require();
        if (($auth['role'] ?? '') !== 'admin') error('Forbidden.', 403);
        return $auth;
    }

    // ── Customer ────────────────────────────────────────────────────────────
    /** GET /api/chat — my conversation + full history (marks admin messages read). */
    public function myChat(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        $conv = $this->chat->getOrCreateForUser((int) $auth['sub']);
        $this->chat->markRead((int) $conv['id'], 'user');
        success([
            'conversation' => $conv,
            'messages'     => $this->chat->messages((int) $conv['id']),
        ]);
    }

    /** GET /api/chat/poll?after=ID — new messages since ID (marks admin messages read). */
    public function poll(): never
    {
        method('GET');
        $auth  = AuthMiddleware::require();
        $conv  = $this->chat->getOrCreateForUser((int) $auth['sub']);
        $after = (int) ($_GET['after'] ?? 0);
        $msgs  = $this->chat->messages((int) $conv['id'], $after);
        $this->chat->markRead((int) $conv['id'], 'user');
        success(['messages' => $msgs, 'status' => $conv['status']]);
    }

    /** POST /api/chat/send { body } */
    public function send(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        $body = $this->cleanBody();
        $conv = $this->chat->getOrCreateForUser((int) $auth['sub']);
        $id   = $this->chat->addMessage((int) $conv['id'], (int) $auth['sub'], 'user', $body);
        success(['id' => $id], 'Sent.', 201);
    }

    /** GET /api/chat/unread — admin messages I haven't read (launcher badge). */
    public function unread(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        $conv = $this->chat->getOrCreateForUser((int) $auth['sub']);
        success(['unread' => $this->chat->userUnreadCount((int) $conv['id'])]);
    }

    // ── Admin ───────────────────────────────────────────────────────────────
    /** GET /api/admin/chat/conversations */
    public function adminConversations(): never
    {
        method('GET');
        $this->guardAdmin();
        success($this->chat->allConversations());
    }

    /** GET /api/admin/chat/conversations/{id}/messages?after=ID (marks user messages read). */
    public function adminMessages(int $id): never
    {
        method('GET');
        $this->guardAdmin();
        $conv = $this->chat->findConversation($id);
        if (!$conv) error('Conversation not found.', 404);
        $after = (int) ($_GET['after'] ?? 0);
        $msgs  = $this->chat->messages($id, $after);
        $this->chat->markRead($id, 'admin');
        success(['conversation' => $conv, 'messages' => $msgs]);
    }

    /** POST /api/admin/chat/conversations/{id}/messages { body } */
    public function adminSend(int $id): never
    {
        method('POST');
        $auth = $this->guardAdmin();
        $conv = $this->chat->findConversation($id);
        if (!$conv) error('Conversation not found.', 404);
        $body = $this->cleanBody();
        $mid  = $this->chat->addMessage($id, (int) $auth['sub'], 'admin', $body);
        success(['id' => $mid], 'Sent.', 201);
    }

    /** PUT /api/admin/chat/conversations/{id} { status: open|closed } */
    public function adminSetStatus(int $id): never
    {
        method('PUT');
        $this->guardAdmin();
        $data   = getBody();
        $status = ($data['status'] ?? '') === 'closed' ? 'closed' : 'open';
        $this->chat->setStatus($id, $status);
        success(null, 'Updated.');
    }

    /** GET /api/admin/chat/unread — total unread customer messages (nav badge). */
    public function adminUnread(): never
    {
        method('GET');
        $this->guardAdmin();
        success(['unread' => $this->chat->adminUnreadTotal()]);
    }
}
