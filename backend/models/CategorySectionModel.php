<?php
declare(strict_types=1);

class CategorySectionModel extends BaseModel
{
    protected string $table = 'category_sections';

    /** Every section across all categories — used by the admin page and mega-menu. */
    public function all(): array
    {
        return $this->query(
            "SELECT id, category_id, title, sort_order
             FROM category_sections
             ORDER BY category_id ASC, sort_order ASC, id ASC"
        )->fetchAll();
    }

    /** Sections belonging to one category, in display order. */
    public function forCategory(int $categoryId): array
    {
        return $this->query(
            "SELECT id, category_id, title, sort_order
             FROM category_sections
             WHERE category_id = ?
             ORDER BY sort_order ASC, id ASC",
            [$categoryId]
        )->fetchAll();
    }

    public function create(int $categoryId, string $title, int $sortOrder = 0): int
    {
        $this->query(
            "INSERT INTO category_sections (category_id, title, sort_order) VALUES (?, ?, ?)",
            [$categoryId, $title, $sortOrder]
        );
        return $this->lastId();
    }

    public function update(int $id, array $data): bool
    {
        $sets = []; $params = [];
        foreach (['title', 'sort_order'] as $f) {
            if (array_key_exists($f, $data)) {
                $sets[]   = "`{$f}` = ?";
                $params[] = $data[$f];
            }
        }
        if (empty($sets)) return false;
        $params[] = $id;
        return $this->query(
            "UPDATE category_sections SET " . implode(', ', $sets) . " WHERE id = ?",
            $params
        )->rowCount() > 0;
    }
}
