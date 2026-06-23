<?php
declare(strict_types=1);

class ProductModel extends BaseModel
{
    protected string $table = 'products';

    /**
     * Override the parent to decode the `specs` JSON column so every caller
     * gets an array (or empty array), never a raw JSON string.
     */
    public function findById(int $id): ?array
    {
        $row = parent::findById($id);
        if ($row && array_key_exists('specs', $row)) {
            $row['specs'] = !empty($row['specs'])
                ? (json_decode((string) $row['specs'], true) ?: [])
                : [];
        }
        return $row;
    }

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
        // Decode JSON specs so the frontend gets a proper array (and a clean
        // empty array when the column is null) instead of a JSON string.
        $product['specs']    = !empty($product['specs'])
            ? (json_decode((string) $product['specs'], true) ?: [])
            : [];

        // Live "available stock" = raw stock - other carts' active reservations.
        // PDP uses this for "Only X left" / "Out of stock" badges; admins still
        // see the raw stock_qty everywhere they manage inventory.
        $res = new StockReservationModel();
        $product['available_stock'] = $res->availableForProduct(
            (int) $product['id'], (int) $product['stock_qty']
        );
        foreach ($product['variants'] as &$v) {
            $v['available_stock'] = $res->availableForVariant(
                (int) $v['id'], (int) $v['stock_qty']
            );
        }
        unset($v);

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
            : "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty, p.low_stock_threshold, p.release_date,
                      p.is_featured, p.views_count, p.status, p.created_at,
                      c.name AS category_name,
                      (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
                      (SELECT video_url  FROM product_images WHERE product_id = p.id AND media_type IN ('youtube','video') ORDER BY sort_order ASC, id ASC LIMIT 1) AS preview_video,
                      (SELECT media_type FROM product_images WHERE product_id = p.id AND media_type IN ('youtube','video') ORDER BY sort_order ASC, id ASC LIMIT 1) AS preview_video_type,
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
            "INSERT INTO product_images (product_id, image_url, media_type, sort_order, is_primary) VALUES (?, ?, 'image', ?, ?)",
            [$productId, $url, $sort, $primary ? 1 : 0]
        );
        return $this->lastId();
    }

    /** Attach a video to a product. `poster` is the image_url thumbnail (used in
     *  the gallery strip). `type` is 'youtube' (video_url = embed URL) or 'video'. */
    public function addVideo(int $productId, string $type, string $videoUrl, ?string $poster, int $sort = 0): int
    {
        $this->query(
            "INSERT INTO product_images (product_id, image_url, media_type, video_url, sort_order, is_primary)
             VALUES (?, ?, ?, ?, ?, 0)",
            [$productId, $poster ?? '', $type, $videoUrl, $sort]
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

    /** Used to compute a dynamic "trending" threshold per request. */
    public function topViewsCount(): int
    {
        return (int) $this->query(
            "SELECT COALESCE(MAX(views_count), 0) FROM products WHERE status = 'active'"
        )->fetchColumn();
    }

    /** Catalogue health snapshot for the AdminProducts stat strip. */
    public function adminStats(): array
    {
        $row = $this->query(
            "SELECT
                COUNT(*)                                                       AS total,
                SUM(CASE WHEN status = 'active'   THEN 1 ELSE 0 END)            AS active,
                SUM(CASE WHEN status = 'draft'    THEN 1 ELSE 0 END)            AS drafts,
                SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END)            AS archived,
                SUM(CASE WHEN status = 'active' AND stock_qty = 0 THEN 1 ELSE 0 END) AS out_of_stock,
                SUM(CASE WHEN status = 'active' AND stock_qty BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS low_stock,
                COALESCE(SUM(stock_qty * COALESCE(sale_price, base_price)), 0)  AS inventory_value
             FROM products"
        )->fetch();
        return [
            'total'           => (int) $row['total'],
            'active'          => (int) $row['active'],
            'drafts'          => (int) $row['drafts'],
            'archived'        => (int) $row['archived'],
            'out_of_stock'    => (int) $row['out_of_stock'],
            'low_stock'       => (int) $row['low_stock'],
            'inventory_value' => (float) $row['inventory_value'],
        ];
    }

    public function bulkUpdateStatus(array $ids, string $status): int
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return 0;
        $ph = implode(',', array_fill(0, count($ids), '?'));
        return $this->query(
            "UPDATE products SET status = ? WHERE id IN ({$ph})",
            [$status, ...$ids]
        )->rowCount();
    }

    public function bulkSetFeatured(array $ids, bool $featured): int
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return 0;
        $ph = implode(',', array_fill(0, count($ids), '?'));
        return $this->query(
            "UPDATE products SET is_featured = ? WHERE id IN ({$ph})",
            [$featured ? 1 : 0, ...$ids]
        )->rowCount();
    }

    public function bulkDelete(array $ids): int
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return 0;
        $ph = implode(',', array_fill(0, count($ids), '?'));
        return $this->query("DELETE FROM products WHERE id IN ({$ph})", $ids)->rowCount();
    }

    /**
     * Adjust both base_price and sale_price by a percentage. Positive bumps
     * prices up, negative discounts them. Rounds to 2 decimals, clamps at 0.
     * Sale_price stays NULL where it was NULL — we don't accidentally invent
     * a sale on products that didn't have one.
     */
    public function bulkAdjustPrice(array $ids, float $percent): int
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return 0;
        $multiplier = 1 + ($percent / 100);
        if ($multiplier < 0) $multiplier = 0;
        $ph = implode(',', array_fill(0, count($ids), '?'));
        return $this->query(
            "UPDATE products
                SET base_price = ROUND(GREATEST(base_price * ?, 0), 2),
                    sale_price = CASE WHEN sale_price IS NULL THEN NULL
                                      ELSE ROUND(GREATEST(sale_price * ?, 0), 2) END
              WHERE id IN ({$ph})",
            [$multiplier, $multiplier, ...$ids]
        )->rowCount();
    }

    public function featured(int $limit = 8): array
    {
        return $this->search(['featured' => true], $limit, 0);
    }

    /**
     * Multi-seed market basket: products bought together with ANY id in $ids,
     * ranked by co-occurrence. Excludes the seeds themselves. Powers the
     * cart-level "Recommended for you" rail.
     */
    public function frequentlyBoughtWithAny(array $ids, int $limit = 6): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return [];
        $ph = implode(',', array_fill(0, count($ids), '?'));
        // params: IN-clause ×2 + LIMIT
        $params = array_merge($ids, $ids, [$limit]);
        return $this->query(
            "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                    p.is_featured, p.views_count, p.status, p.created_at,
                    c.name AS category_name,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
                    (SELECT video_url  FROM product_images WHERE product_id = p.id AND media_type IN ('youtube','video') ORDER BY sort_order ASC, id ASC LIMIT 1) AS preview_video,
                    (SELECT media_type FROM product_images WHERE product_id = p.id AND media_type IN ('youtube','video') ORDER BY sort_order ASC, id ASC LIMIT 1) AS preview_video_type,
                    (SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id = p.id) AS rating_avg,
                    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS review_count,
                    (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count,
                    COUNT(DISTINCT oi2.order_id) AS together_count
             FROM order_items oi1
             JOIN order_items oi2
                  ON oi2.order_id   = oi1.order_id
                 AND oi2.product_id NOT IN ({$ph})
             JOIN products   p ON p.id = oi2.product_id
             JOIN categories c ON c.id = p.category_id
             WHERE oi1.product_id IN ({$ph})
               AND p.status = 'active'
             GROUP BY p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                      p.is_featured, p.views_count, p.status, p.created_at, c.name
             ORDER BY together_count DESC, p.views_count DESC
             LIMIT ?",
            $params
        )->fetchAll();
    }

    /** Distinct category ids for a set of product ids. */
    public function categoryIdsForProducts(array $ids): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return [];
        $ph = implode(',', array_fill(0, count($ids), '?'));
        return array_values(array_unique(array_map(
            fn($r) => (int) $r['category_id'],
            $this->query("SELECT DISTINCT category_id FROM products WHERE id IN ({$ph})", $ids)->fetchAll()
        )));
    }

    /**
     * Cheap, single-click add-ons that fit a budget — for the cart's
     * "Add $X for free shipping" gap-filler suggestions. Simple (non-variant),
     * in-stock products only.
     */
    public function upsellUnderPrice(float $maxPrice, array $excludeIds, int $limit = 4): array
    {
        $excludeIds = array_values(array_filter(array_map('intval', $excludeIds)));
        $excludeSql = '';
        $params     = [];
        if ($excludeIds) {
            $ph         = implode(',', array_fill(0, count($excludeIds), '?'));
            $excludeSql = " AND p.id NOT IN ({$ph})";
            $params     = $excludeIds;
        }
        // Effective price (sale_price OR base_price) <= maxPrice + variant_count = 0 + in stock
        $params[] = $maxPrice;
        $params[] = $limit;
        return $this->query(
            "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
                    (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count
             FROM products p
             WHERE p.status = 'active'
               AND p.stock_qty > 0
               AND (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) = 0
               {$excludeSql}
               AND COALESCE(p.sale_price, p.base_price) <= ?
             ORDER BY COALESCE(p.sale_price, p.base_price) DESC, p.views_count DESC
             LIMIT ?",
            $params
        )->fetchAll();
    }

    /**
     * Market-basket recommendation: products that appear in the same orders as
     * $productId, ranked by how often they were bought alongside it. Returns
     * ProductCard-shaped rows plus a `together_count` (number of shared orders).
     */
    public function frequentlyBoughtTogether(int $productId, int $limit = 6): array
    {
        return $this->query(
            "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                    p.is_featured, p.views_count, p.status, p.created_at,
                    c.name AS category_name,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
                    (SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id = p.id) AS rating_avg,
                    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS review_count,
                    (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count,
                    COUNT(DISTINCT oi2.order_id) AS together_count
             FROM order_items oi1
             JOIN order_items oi2
                  ON oi2.order_id = oi1.order_id
                 AND oi2.product_id <> oi1.product_id
             JOIN products p   ON p.id = oi2.product_id
             JOIN categories c ON c.id = p.category_id
             WHERE oi1.product_id = ?
               AND p.status = 'active'
             GROUP BY p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                      p.is_featured, p.views_count, p.status, p.created_at, c.name
             ORDER BY together_count DESC, p.views_count DESC
             LIMIT ?",
            [$productId, $limit]
        )->fetchAll();
    }

}
