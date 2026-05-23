<?php
declare(strict_types=1);

class CategoryModel extends BaseModel
{
    protected string $table = 'categories';

    public function tree(): array
    {
        $all  = $this->query(
            "SELECT * FROM categories ORDER BY sort_order ASC, name ASC"
        )->fetchAll();
        return $this->buildTree($all);
    }

    /** Flat list with parent name prefix — useful for <select> dropdowns. */
    public function flat(): array
    {
        $all = $this->query(
            "SELECT c.id, c.name, c.slug, c.has_sizes, c.parent_id, c.section_id, c.image_url, p.name AS parent_name
             FROM categories c
             LEFT JOIN categories p ON p.id = c.parent_id
             ORDER BY COALESCE(p.sort_order, c.sort_order) ASC, c.sort_order ASC"
        )->fetchAll();
        return $all;
    }

    public function topLevel(): array
    {
        return $this->query(
            "SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC"
        )->fetchAll();
    }

    public function findBySlug(string $slug): ?array
    {
        $row = $this->query("SELECT * FROM categories WHERE slug = ?", [$slug])->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO categories (parent_id, section_id, name, slug, image_url, sort_order, has_sizes)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $data['parent_id']  ?? null,
                $data['section_id'] ?? null,
                $data['name'],
                $data['slug'],
                $data['image_url'] ?? null,
                $data['sort_order'] ?? 0,
                $data['has_sizes'] ?? 0,
            ]
        );
        return $this->lastId();
    }

    public function update(int $id, array $data): bool
    {
        $sets = []; $params = [];
        foreach (['parent_id', 'section_id', 'name', 'slug', 'image_url', 'sort_order', 'has_sizes'] as $f) {
            if (array_key_exists($f, $data)) {
                $sets[]   = "`{$f}` = ?";
                $params[] = $data[$f];
            }
        }
        if (empty($sets)) return false;
        $params[] = $id;
        return $this->query(
            "UPDATE categories SET " . implode(', ', $sets) . " WHERE id = ?",
            $params
        )->rowCount() > 0;
    }

    public function adminList(): array
    {
        return $this->query(
            "SELECT c.*,
                    p.name AS parent_name,
                    (SELECT COUNT(*) FROM products WHERE category_id = c.id) AS product_count,
                    (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) AS child_count
             FROM categories c
             LEFT JOIN categories p ON p.id = c.parent_id
             ORDER BY COALESCE(p.sort_order, c.sort_order) ASC,
                      c.parent_id IS NOT NULL ASC,
                      c.sort_order ASC, c.name ASC"
        )->fetchAll();
    }

    private function buildTree(array $all, ?int $parentId = null): array
    {
        $tree = [];
        foreach ($all as $cat) {
            if ($cat['parent_id'] == $parentId) {
                $cat['children'] = $this->buildTree($all, (int) $cat['id']);
                $tree[] = $cat;
            }
        }
        return $tree;
    }
}
