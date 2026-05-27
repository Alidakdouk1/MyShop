<?php
declare(strict_types=1);

class QuestionController
{
    private QuestionModel $questions;

    public function __construct()
    {
        $this->questions = new QuestionModel();
    }

    // ── Customer ────────────────────────────────────────────────────────────

    public function store(): never
    {
        method('POST');
        $auth   = AuthMiddleware::require();
        $data   = getBody();
        $userId = (int) $auth['sub'];

        $productId = (int) ($data['product_id'] ?? 0);
        $question  = trim(sanitize($data['question'] ?? ''));

        if (!$productId)              error('product_id is required.', 422);
        if (mb_strlen($question) < 5) error('Please enter a question (at least 5 characters).', 422);

        if (!(new ProductModel())->findById($productId)) error('Product not found.', 404);

        $id = $this->questions->create($productId, $userId, $question);
        success($this->questions->findById($id), 'Question submitted.', 201);
    }

    public function forProduct(int $productId): never
    {
        method('GET');
        success($this->questions->forProduct($productId));
    }

    public function destroy(int $id): never
    {
        method('DELETE');
        $auth = AuthMiddleware::require();
        $q    = $this->questions->findById($id);
        if (!$q) error('Question not found.', 404);
        if ($auth['role'] !== 'admin' && (int) $q['user_id'] !== (int) $auth['sub']) {
            error('Forbidden.', 403);
        }
        $this->questions->delete($id);
        success(null, 'Question deleted.');
    }

    // ── Admin ───────────────────────────────────────────────────────────────

    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        [$page, $perPage, $offset] = PaginationHelper::params();
        $unanswered = ($_GET['status'] ?? '') === 'unanswered';
        $items = $this->questions->adminAll($perPage, $offset, $unanswered);
        $total = $this->questions->countAll($unanswered);
        paginated($items, $total, $page, $perPage);
    }

    public function adminUnread(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        success(['unread' => $this->questions->countUnanswered()]);
    }

    public function adminAnswer(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data   = getBody();
        $answer = trim(sanitize($data['answer'] ?? ''));
        if (mb_strlen($answer) < 1) error('Answer cannot be empty.', 422);

        $q = $this->questions->findById($id);
        if (!$q) error('Question not found.', 404);

        $this->questions->answer($id, (int) $auth['sub'], $answer);

        // Let the asker know their question was answered.
        (new NotificationModel())->create(
            (int) $q['user_id'], 'qa_answer', 'Your question was answered',
            'A store admin replied to your question.',
            "/products/" . ((new ProductModel())->findById((int) $q['product_id'])['slug'] ?? '')
        );

        success($this->questions->findById($id), 'Answer posted.');
    }
}
