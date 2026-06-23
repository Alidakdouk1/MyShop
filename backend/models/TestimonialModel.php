<?php
declare(strict_types=1);

class TestimonialModel extends BaseModel
{
    protected string $table = 'testimonials';

    /** Public-facing list — only active testimonials, sorted. */
    public function forPublic(): array
    {
        return $this->query(
            "SELECT id, name, location, photo_url, rating, body
             FROM testimonials
             WHERE is_active = 1
             ORDER BY sort_order ASC, id DESC"
        )->fetchAll();
    }

    /** Admin list — everything, newest-or-pinned first. */
    public function allAdmin(): array
    {
        return $this->query(
            "SELECT * FROM testimonials ORDER BY sort_order ASC, id DESC"
        )->fetchAll();
    }

    public function create(array $d): int
    {
        $this->query(
            "INSERT INTO testimonials
              (name, location, photo_url, rating, body, source_review_id, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (string) $d['name'],
                $d['location']         ?? null,
                $d['photo_url']        ?? null,
                max(1, min(5, (int) ($d['rating'] ?? 5))),
                (string) $d['body'],
                isset($d['source_review_id']) ? (int) $d['source_review_id'] : null,
                empty($d['is_active']) ? 0 : 1,
                (int) ($d['sort_order'] ?? 0),
            ]
        );
        return $this->lastId();
    }

    public function update(int $id, array $d): bool
    {
        $fields = [];
        $params = [];
        foreach (['name','location','photo_url','rating','body','is_active','sort_order'] as $f) {
            if (array_key_exists($f, $d)) {
                $val = $d[$f];
                if ($f === 'rating')     $val = max(1, min(5, (int) $val));
                if ($f === 'is_active')  $val = empty($val) ? 0 : 1;
                if ($f === 'sort_order') $val = (int) $val;
                $fields[] = "`{$f}` = ?";
                $params[] = $val;
            }
        }
        if (!$fields) return false;
        $params[] = $id;
        return $this->query(
            "UPDATE testimonials SET " . implode(', ', $fields) . " WHERE id = ?",
            $params
        )->rowCount() >= 0;
    }
}
