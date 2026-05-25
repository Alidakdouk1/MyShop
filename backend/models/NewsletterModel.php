<?php
declare(strict_types=1);

class NewsletterModel extends BaseModel
{
    protected string $table = 'newsletter_subscribers';

    public function findByEmail(string $email): ?array
    {
        $row = $this->query(
            "SELECT * FROM newsletter_subscribers WHERE email = ?",
            [$email]
        )->fetch();
        return $row ?: null;
    }

    /** Returns ['already' => bool] — idempotent; re-activates a soft-removed email. */
    public function subscribe(string $email, string $source = 'footer'): array
    {
        $existing = $this->findByEmail($email);
        if ($existing) {
            if (!$existing['is_active']) {
                $this->query("UPDATE newsletter_subscribers SET is_active = 1 WHERE id = ?", [$existing['id']]);
            }
            return ['already' => true];
        }
        $this->query(
            "INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?)",
            [$email, $source]
        );
        return ['already' => false, 'id' => $this->lastId()];
    }

    public function all(int $limit, int $offset): array
    {
        return $this->query(
            "SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT " . (int) $limit . " OFFSET " . (int) $offset
        )->fetchAll();
    }
}
