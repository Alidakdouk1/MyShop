<?php
declare(strict_types=1);

class ProductModel extends BaseModel
{
    protected string $table = 'products';

    public function findBySlug(string $slug): ?array
    {
        $product = $this->query(
            "SELECT p.*,
                    c.name AS category_name, c.slug AS category_slug
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.slug = ? AND p.status = 'active'",
            [$slug]
        )->fetch();
        if (!$product) return null;

        $product['images']   = $this->images((int) $product['id']);
        $product['variants'] = $this->variants((int) $product['id']);
        return $product;
    }

    public function search(array $filters, int $limit, int $offset): array
    {
        [$sql, $params] = $this->buildQuery($filters);
        return $this->query($sql . " LIMIT ? OFFSET ?", [...$params, $limit, $offset])->fetchAll();
    }

    public function countSearch(array $filters): int
    {
        [$sql, $params] = $this->buildQuery($filters, true);
        return (int) $this->query($sql, $params)->fetchColumn();
    }

    /** Admin list — all statuses, all products. */
    public function searchAdmin(array $filters, int $limit, int $offset): array
    {
        [$sql, $params] = $this->buildAdminQuery($filters);
        return $this->query($sql . " LIMIT ? OFFSET ?", [...$params, $limit, $offset])->fetchAll();
    }

    public function countAdmin(array $filters): int
    {
        [$sql, $params] = $this->buildAdminQuery($filters, true);
        return (int) $this->query($sql, $params)->fetchColumn();
    }

    private function buildAdminQuery(array $f, bool $count = false): array
    {
        $select = $count
            ? "SELECT COUNT(*)"
            : "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                      p.is_featured, p.status, p.sku, p.created_at,
                      c.name AS category_name,
                      (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image";

        $sql    = "{$select} FROM products p
                   JOIN categories c ON c.id = p.category_id
                   WHERE 1=1";
        $params = [];

        if (!empty($f['search'])) {
            $sql .= " AND (p.name LIKE ? OR p.sku LIKE ? OR CAST(COALESCE(p.sale_price, p.base_price) AS CHAR) LIKE ?)";
            $params[] = "%{$f['search']}%";
            $params[] = "%{$f['search']}%";
            $params[] = "%{$f['search']}%";
        }
        if (!empty($f['category_id'])) {
            $cid = (int) $f['category_id'];
            $sql .= " AND (
                p.category_id = ?
                OR p.category_id IN (SELECT id FROM categories WHERE parent_id = ?)
                OR p.category_id IN (SELECT id FROM categories WHERE parent_id IN (SELECT id FROM categories WHERE parent_id = ?))
            )";
            $params[] = $cid;
            $params[] = $cid;
            $params[] = $cid;
        }
        if (!$count) {
            $sql .= " ORDER BY p.created_at DESC";
        }
        return [$sql, $params];
    }

    private function buildQuery(array $f, bool $count = false): array
    {
        $select = $count
            ? "SELECT COUNT(*)"
            : "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                      p.is_featured, p.views_count, p.status, p.created_at,
                      c.name AS category_name,
                      (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
                      (SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id = p.id) AS rating_avg,
                      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS review_count,
                      (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count";

        $sql    = "{$select} FROM products p
                   JOIN categories c ON c.id = p.category_id
                   WHERE p.status = 'active'";
        $params = [];

        if (!empty($f['category_id'])) {
            $cid = (int) $f['category_id'];
            $sql .= " AND (
                p.category_id = ?
                OR p.category_id IN (SELECT id FROM categories WHERE parent_id = ?)
                OR p.category_id IN (SELECT id FROM categories WHERE parent_id IN (SELECT id FROM categories WHERE parent_id = ?))
            )";
            $params[] = $cid;
            $params[] = $cid;
            $params[] = $cid;
        }
        if (!empty($f['min_price'])) {
            $sql .= " AND COALESCE(p.sale_price, p.base_price) >= ?";
            $params[] = (float) $f['min_price'];
        }
        if (!empty($f['max_price'])) {
            $sql .= " AND COALESCE(p.sale_price, p.base_price) <= ?";
            $params[] = (float) $f['max_price'];
        }
        if (!empty($f['search'])) {
            $sql .= " AND (p.name LIKE ? OR p.description LIKE ? OR CAST(COALESCE(p.sale_price, p.base_price) AS CHAR) LIKE ?)";
            $params[] = "%{$f['search']}%";
            $params[] = "%{$f['search']}%";
            $params[] = "%{$f['search']}%";
        }
        if (!empty($f['featured'])) {
            $sql .= " AND p.is_featured = 1";
        }
        if (!empty($f['on_sale'])) {
            $sql .= " AND p.sale_price IS NOT NULL AND p.sale_price < p.base_price * 0.99";
        }
        if (!empty($f['in_stock'])) {
            $sql .= " AND p.stock_qty > 0";
        }
        if (!empty($f['filters']) && is_array($f['filters'])) {
            foreach ($f['filters'] as $filterId => $optionIds) {
                $filterId = (int) $filterId;
                $optionIds = array_values(array_filter(array_map('intval', (array) $optionIds)));
                if (!$filterId || !$optionIds) continue;
                $ph = implode(',', array_fill(0, count($optionIds), '?'));
                $sql .= " AND EXISTS (
                    SELECT 1 FROM product_filter_values pfv
                    WHERE pfv.product_id = p.id
                      AND pfv.filter_id = ?
                      AND pfv.filter_option_id IN ({$ph})
                )";
                $params[] = $filterId;
                foreach ($optionIds as $oid) $params[] = $oid;
            }
        }
        if (!empty($f['range_filters']) && is_array($f['range_filters'])) {
            foreach ($f['range_filters'] as $filterId => $bounds) {
                $filterId = (int) $filterId;
                $min = $bounds['min'] ?? null;
                $max = $bounds['max'] ?? null;
                if (!$filterId || ($min === null && $max === null)) continue;
                $sub  = " AND EXISTS (
                    SELECT 1 FROM product_filter_values pfv
                    WHERE pfv.product_id = p.id
                      AND pfv.filter_id = ?";
                $params[] = $filterId;
                if ($min !== null) { $sub .= " AND pfv.max_value >= ?"; $params[] = (float) $min; }
                if ($max !== null) { $sub .= " AND pfv.min_value <= ?"; $params[] = (float) $max; }
                $sub .= ")";
                $sql .= $sub;
            }
        }
        if (!$count) {
            $sort = match ($f['sort'] ?? 'newest') {
                'price_asc'   => 'COALESCE(p.sale_price, p.base_price) ASC',
                'price_desc'  => 'COALESCE(p.sale_price, p.base_price) DESC',
                'popular'     => 'p.views_count DESC',
                'rating'      => 'rating_avg DESC',
                'recommended' => 'p.is_featured DESC, rating_avg DESC, p.views_count DESC',
                default       => 'p.created_at DESC',
            };
            $sql .= " ORDER BY {$sort}";
        }
        return [$sql, $params];
    }

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO products (vendor_id, category_id, name, slug, description,
             base_price, sale_price, stock_qty, sku, status, is_featured, weight)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $data['vendor_id'] ?? null,
                $data['category_id'], $data['name'], $data['slug'],
                $data['description'] ?? null, $data['base_price'], $data['sale_price'] ?? null,
                $data['stock_qty'] ?? 0, $data['sku'], $data['status'] ?? 'draft',
                $data['is_featured'] ?? 0, $data['weight'] ?? null,
            ]
        );
        return $this->lastId();
    }

    public function update(int $id, array $data): bool
    {
        $sets = []; $params = [];
        foreach ($data as $col => $val) { $sets[] = "`{$col}` = ?"; $params[] = $val; }
        $params[] = $id;
        return $this->query("UPDATE products SET " . implode(', ', $sets) . " WHERE id = ?", $params)->rowCount() > 0;
    }

    // ── Stock control (atomic / race-safe) ─────────────────────────────────────
    // The conditional "AND stock_qty >= ?" makes the decrement reject overselling
    // at the database level even under concurrent checkouts. Returns false when
    // there isn't enough stock (caller should roll back the order).
    public function decrementStock(int $productId, int $qty): bool
    {
        return $this->query(
            "UPDATE products SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?",
            [$qty, $productId, $qty]
        )->rowCount() > 0;
    }

    public function incrementStock(int $productId, int $qty): void
    {
        $this->query("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?", [$qty, $productId]);
    }

    public function decrementVariantStock(int $variantId, int $qty): bool
    {
        return $this->query(
            "UPDATE product_variants SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?",
            [$qty, $variantId, $qty]
        )->rowCount() > 0;
    }

    public function incrementVariantStock(int $variantId, int $qty): void
    {
        $this->query("UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ?", [$qty, $variantId]);
    }

    public function addImage(int $productId, string $url, int $sort = 0, bool $primary = false): int
    {
        if ($primary) {
            $this->query("UPDATE product_images SET is_primary = 0 WHERE product_id = ?", [$productId]);
        }
        $this->query(
            "INSERT INTO product_images (product_id, image_url, sort_order, is_primary) VALUES (?, ?, ?, ?)",
            [$productId, $url, $sort, $primary ? 1 : 0]
        );
        return $this->lastId();
    }

    public function images(int $productId): array
    {
        return $this->query(
            "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
            [$productId]
        )->fetchAll();
    }

    public function variants(int $productId): array
    {
        return $this->query(
            "SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC",
            [$productId]
        )->fetchAll();
    }

    public function addVariant(int $productId, array $data): int
    {
        $this->query(
            "INSERT INTO product_variants (product_id, size, color, price_modifier, stock_qty, sku)
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $productId,
                $data['size']           ?? null,
                $data['color']          ?? null,
                (float) ($data['price_modifier'] ?? 0),
                (int)   ($data['stock_qty']      ?? 0),
                $data['sku'],
            ]
        );
        return $this->lastId();
    }

    public function deleteVariant(int $variantId, int $productId): bool
    {
        return $this->query(
            "DELETE FROM product_variants WHERE id = ? AND product_id = ?",
            [$variantId, $productId]
        )->rowCount() > 0;
    }

    public function deleteImage(int $imageId, int $productId): bool
    {
        $row = $this->query(
            "SELECT * FROM product_images WHERE id = ? AND product_id = ?",
            [$imageId, $productId]
        )->fetch();
        if (!$row) return false;
        $this->query("DELETE FROM product_images WHERE id = ?", [$imageId]);
        if ($row['is_primary']) {
            $this->query(
                "UPDATE product_images SET is_primary = 1 WHERE product_id = ? LIMIT 1",
                [$productId]
            );
        }
        return true;
    }

    public function incrementViews(int $id): void
    {
        $this->query("UPDATE products SET views_count = views_count + 1 WHERE id = ?", [$id]);
    }

    public function featured(int $limit = 8): array
    {
        return $this->search(['featured' => true], $limit, 0);
    }

}
