<?php
declare(strict_types=1);

class QuestionModel extends BaseModel
{
    protected string $table = 'product_questions';

    public function create(int $productId, int $userId, string $question): int
    {
        $this->query(
            "INSERT INTO product_questions (product_id, user_id, question) VALUES (?, ?, ?)",
            [$productId, $userId, $question]
        );
        return $this->lastId();
    }

    /** Public list for a product page — newest first, with asker + answerer names. */
    public function forProduct(int $productId): array
    {
        return $this->query(
            "SELECT q.id, q.question, q.answer, q.answered_at, q.created_at,
                    u.name AS asker_name, u.avatar_url AS asker_avatar,
                    a.name AS answerer_name
             FROM product_questions q
             JOIN users u ON u.id = q.user_id
             LEFT JOIN users a ON a.id = q.answered_by
             WHERE q.product_id = ?
             ORDER BY q.created_at DESC",
            [$productId]
        )->fetchAll();
    }

    /** Admin list — unanswered float to the top. */
    public function adminAll(int $limit, int $offset, bool $unansweredOnly = false): array
    {
        $where = $unansweredOnly ? "WHERE q.answer IS NULL" : "";
        return $this->query(
            "SELECT q.*, u.name AS asker_name, u.email AS asker_email,
                    p.name AS product_name, p.slug AS product_slug
             FROM product_questions q
             JOIN users u ON u.id = q.user_id
             JOIN products p ON p.id = q.product_id
             {$where}
             ORDER BY (q.answer IS NULL) DESC, q.created_at DESC
             LIMIT ? OFFSET ?",
            [$limit, $offset]
        )->fetchAll();
    }

    public function countAll(bool $unansweredOnly = false): int
    {
        $where = $unansweredOnly ? "WHERE answer IS NULL" : "";
        return (int) $this->query("SELECT COUNT(*) FROM product_questions {$where}")->fetchColumn();
    }

    public function countUnanswered(): int
    {
        return (int) $this->query("SELECT COUNT(*) FROM product_questions WHERE answer IS NULL")->fetchColumn();
    }

    public function answer(int $id, int $adminId, string $answer): bool
    {
        return $this->query(
            "UPDATE product_questions
             SET answer = ?, answered_by = ?, answered_at = NOW()
             WHERE id = ?",
            [$answer, $adminId, $id]
        )->rowCount() > 0;
    }
}
