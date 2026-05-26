<?php
declare(strict_types=1);

class FilterModel extends BaseModel
{
    protected string $table = 'filters';

    /** All filters (admin) with their options. */
    public function allWithOptions(bool $activeOnly = false): array
    {
        $where = $activeOnly ? "WHERE is_active = 1" : "";
        $filters = $this->query(
            "SELECT * FROM filters {$where} ORDER BY display_order ASC, id ASC"
        )->fetchAll();
        if (!$filters) return [];

        $ids = array_column($filters, 'id');
        $ph  = implode(',', array_fill(0, count($ids), '?'));
        $opts = $this->query(
            "SELECT * FROM filter_options WHERE filter_id IN ({$ph})
             ORDER BY display_order ASC, id ASC",
            $ids
        )->fetchAll();

        $grouped = [];
        foreach ($opts as $o) {
            $grouped[(int) $o['filter_id']][] = $o;
        }
        foreach ($filters as &$f) {
            $f['options'] = $grouped[(int) $f['id']] ?? [];
        }
        unset($f);
        return $this->attachCounts($filters);
    }

    /**
     * Filters shown for a category — ONLY its own direct assignments.
     * Sub-categories get a copy of the parent's filters when they're created,
     * but stay independent afterwards (editing the parent does not change them).
     * Falls back to all active filters when the category has no assignment at all.
     */
    public function forCategory(int $categoryId, bool $activeOnly = true): array
    {
        $filterIds = $this->query(
            "SELECT filter_id FROM category_filters WHERE category_id = ?",
            [$categoryId]
        )->fetchAll(\PDO::FETCH_COLUMN);

        // No assignment for this category → show everything (safe fallback).
        if (!$filterIds) return $this->allWithOptions($activeOnly);

        $where = $activeOnly ? "AND is_active = 1" : "";
        $fph   = implode(',', array_fill(0, count($filterIds), '?'));
        $filters = $this->query(
            "SELECT * FROM filters WHERE id IN ({$fph}) {$where}
             ORDER BY display_order ASC, id ASC",
            $filterIds
        )->fetchAll();
        if (!$filters) return [];

        $fids = array_column($filters, 'id');
        $oph  = implode(',', array_fill(0, count($fids), '?'));
        $opts = $this->query(
            "SELECT * FROM filter_options WHERE filter_id IN ({$oph})
             ORDER BY display_order ASC, id ASC",
            $fids
        )->fetchAll();

        $grouped = [];
        foreach ($opts as $o) {
            $grouped[(int) $o['filter_id']][] = $o;
        }
        foreach ($filters as &$f) {
            $f['options'] = $grouped[(int) $f['id']] ?? [];
        }
        unset($f);
        return $this->attachCounts($filters);
    }

    /** [option_id => # of active products tagged with that option]. */
    private function optionCounts(array $optionIds): array
    {
        $optionIds = array_values(array_filter(array_map('intval', $optionIds)));
        if (!$optionIds) return [];
        $ph   = implode(',', array_fill(0, count($optionIds), '?'));
        $rows = $this->query(
            "SELECT pfv.filter_option_id AS oid, COUNT(DISTINCT pfv.product_id) AS c
             FROM product_filter_values pfv
             JOIN products p ON p.id = pfv.product_id AND p.status = 'active'
             WHERE pfv.filter_option_id IN ({$ph})
             GROUP BY pfv.filter_option_id",
            $optionIds
        )->fetchAll();
        $out = [];
        foreach ($rows as $r) $out[(int) $r['oid']] = (int) $r['c'];
        return $out;
    }

    /** Adds product_count to every option (index-based to avoid foreach-ref bugs). */
    private function attachCounts(array $filters): array
    {
        $ids = [];
        foreach ($filters as $f) {
            foreach ($f['options'] ?? [] as $o) $ids[] = (int) $o['id'];
        }
        $counts = $this->optionCounts($ids);
        foreach ($filters as $fi => $f) {
            foreach (($f['options'] ?? []) as $oi => $o) {
                $filters[$fi]['options'][$oi]['product_count'] = $counts[(int) $o['id']] ?? 0;
            }
        }
        return $filters;
    }

    /** Direct (non-inherited) filter ids assigned to a category — for the admin UI. */
    public function filterIdsForCategory(int $categoryId): array
    {
        return array_map('intval', $this->query(
            "SELECT filter_id FROM category_filters WHERE category_id = ? ORDER BY filter_id",
            [$categoryId]
        )->fetchAll(\PDO::FETCH_COLUMN));
    }

    /** Replace a category's filter assignments. */
    public function setCategoryFilters(int $categoryId, array $filterIds): void
    {
        $filterIds = array_values(array_unique(array_filter(array_map('intval', $filterIds))));
        $this->db->beginTransaction();
        try {
            $this->query("DELETE FROM category_filters WHERE category_id = ?", [$categoryId]);
            foreach ($filterIds as $fid) {
                $this->query(
                    "INSERT IGNORE INTO category_filters (category_id, filter_id) VALUES (?, ?)",
                    [$categoryId, $fid]
                );
            }
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $data['name'],
                $data['type'] ?? 'multi',
                $data['unit'] ?? null,
                (int) ($data['is_required'] ?? 0),
                (int) ($data['is_active']   ?? 1),
                (int) ($data['display_order'] ?? 0),
            ]
        );
        return $this->lastId();
    }

    public function update(int $id, array $data): bool
    {
        $sets = []; $params = [];
        foreach (['name','type','unit','is_required','is_active','display_order'] as $f) {
            if (array_key_exists($f, $data)) {
                $sets[]   = "`{$f}` = ?";
                $params[] = $data[$f];
            }
        }
        if (empty($sets)) return false;
        $params[] = $id;
        return $this->query(
            "UPDATE filters SET " . implode(', ', $sets) . " WHERE id = ?",
            $params
        )->rowCount() > 0;
    }

    // ── Options ────────────────────────────────────────────────────────────

    public function findOption(int $id): ?array
    {
        $row = $this->query("SELECT * FROM filter_options WHERE id = ?", [$id])->fetch();
        return $row ?: null;
    }

    public function createOption(int $filterId, array $data): int
    {
        $this->query(
            "INSERT INTO filter_options (filter_id, value, display_order) VALUES (?, ?, ?)",
            [$filterId, $data['value'], (int) ($data['display_order'] ?? 0)]
        );
        return $this->lastId();
    }

    public function updateOption(int $id, array $data): bool
    {
        $sets = []; $params = [];
        foreach (['value', 'display_order'] as $f) {
            if (array_key_exists($f, $data)) {
                $sets[]   = "`{$f}` = ?";
                $params[] = $data[$f];
            }
        }
        if (empty($sets)) return false;
        $params[] = $id;
        return $this->query(
            "UPDATE filter_options SET " . implode(', ', $sets) . " WHERE id = ?",
            $params
        )->rowCount() > 0;
    }

    public function deleteOption(int $id): bool
    {
        return $this->query("DELETE FROM filter_options WHERE id = ?", [$id])->rowCount() > 0;
    }

    // ── Product ↔ filter values ────────────────────────────────────────────

    /** Replace all of a product's filter selections atomically. */
    public function saveProductFilters(int $productId, array $selections): void
    {
        $this->db->beginTransaction();
        try {
            $this->query("DELETE FROM product_filter_values WHERE product_id = ?", [$productId]);
            foreach ($selections as $sel) {
                $filterId = (int) ($sel['filter_id'] ?? 0);
                if (!$filterId) continue;

                // Default visible unless explicitly hidden
                $visible = array_key_exists('is_visible', $sel) ? (int) (bool) $sel['is_visible'] : 1;

                // Range filter — at least one bound required
                if (array_key_exists('min_value', $sel) || array_key_exists('max_value', $sel)) {
                    $min = isset($sel['min_value']) && $sel['min_value'] !== '' ? (float) $sel['min_value'] : null;
                    $max = isset($sel['max_value']) && $sel['max_value'] !== '' ? (float) $sel['max_value'] : null;
                    if ($min === null && $max === null) continue;
                    $this->query(
                        "INSERT INTO product_filter_values (product_id, filter_id, min_value, max_value, is_visible)
                         VALUES (?, ?, ?, ?, ?)",
                        [$productId, $filterId, $min, $max, $visible]
                    );
                    continue;
                }

                // Single / multi-select — array of option ids (with optional per-option quantities + hover text)
                $optionIds  = $sel['option_ids'] ?? (isset($sel['filter_option_id']) ? [$sel['filter_option_id']] : []);
                $quantities = is_array($sel['quantities'] ?? null) ? $sel['quantities'] : [];
                $hovers     = is_array($sel['hover_texts'] ?? null) ? $sel['hover_texts'] : [];
                foreach ((array) $optionIds as $oid) {
                    $oid = (int) $oid;
                    if (!$oid) continue;
                    $qRaw = $quantities[$oid] ?? $quantities[(string) $oid] ?? null;
                    $q    = ($qRaw === null || $qRaw === '') ? null : (int) $qRaw;
                    $hRaw = $hovers[$oid] ?? $hovers[(string) $oid] ?? null;
                    $h    = ($hRaw === null || $hRaw === '') ? null : sanitize((string) $hRaw);
                    $this->query(
                        "INSERT INTO product_filter_values (product_id, filter_id, filter_option_id, is_visible, quantity, hover_text)
                         VALUES (?, ?, ?, ?, ?, ?)",
                        [$productId, $filterId, $oid, $visible, $q, $h]
                    );
                }
            }
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Look up per-option quantities for a product. Returns [option_id => qty].
     * Options with NULL quantity are omitted (no per-option stock tracking).
     */
    public function optionQuantities(int $productId, array $optionIds): array
    {
        $optionIds = array_values(array_filter(array_map('intval', $optionIds)));
        if (empty($optionIds)) return [];
        $ph   = implode(',', array_fill(0, count($optionIds), '?'));
        $rows = $this->query(
            "SELECT filter_option_id, quantity
             FROM product_filter_values
             WHERE product_id = ?
               AND filter_option_id IN ({$ph})
               AND quantity IS NOT NULL",
            array_merge([$productId], $optionIds)
        )->fetchAll();

        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['filter_option_id']] = (int) $r['quantity'];
        }
        return $out;
    }

    /**
     * Sum every per-option quantity for the product and write it to products.stock_qty.
     * Rows with NULL quantity are ignored (so attribute-only filters like Color
     * don't reset stock to 0).
     */
    public function recomputeProductStock(int $productId): int
    {
        $total = (int) $this->query(
            "SELECT COALESCE(SUM(quantity), 0)
             FROM product_filter_values
             WHERE product_id = ? AND quantity IS NOT NULL",
            [$productId]
        )->fetchColumn();

        $this->query(
            "UPDATE products SET stock_qty = ? WHERE id = ?",
            [$total, $productId]
        );
        return $total;
    }

    /**
     * Atomically take stock from one picked filter option at checkout.
     * Returns:
     *   'ok'          — option tracks stock and was decremented
     *   'untracked'   — option has no stock pool (NULL quantity), nothing to do
     *   'insufficient'— option tracks stock but not enough is left (caller rolls back)
     * The "AND quantity >= ?" guard prevents overselling under concurrent orders.
     */
    public function decrementOptionStock(int $productId, int $optionId, int $qty): string
    {
        $row = $this->query(
            "SELECT quantity FROM product_filter_values WHERE product_id = ? AND filter_option_id = ?",
            [$productId, $optionId]
        )->fetch();
        if (!$row || $row['quantity'] === null) return 'untracked';

        $ok = $this->query(
            "UPDATE product_filter_values SET quantity = quantity - ?
             WHERE product_id = ? AND filter_option_id = ? AND quantity IS NOT NULL AND quantity >= ?",
            [$qty, $productId, $optionId, $qty]
        )->rowCount() > 0;
        return $ok ? 'ok' : 'insufficient';
    }

    /** Give option stock back (used when an order is cancelled/refunded). */
    public function incrementOptionStock(int $productId, int $optionId, int $qty): void
    {
        $this->query(
            "UPDATE product_filter_values SET quantity = quantity + ?
             WHERE product_id = ? AND filter_option_id = ? AND quantity IS NOT NULL",
            [$qty, $productId, $optionId]
        );
    }

    /** Does this option carry its own stock pool? (NULL quantity = attribute only.) */
    public function optionTracksStock(int $productId, int $optionId): bool
    {
        $row = $this->query(
            "SELECT quantity FROM product_filter_values WHERE product_id = ? AND filter_option_id = ?",
            [$productId, $optionId]
        )->fetch();
        return $row && $row['quantity'] !== null;
    }

    /** Get a product's current filter selections, grouped by filter. */
    public function forProduct(int $productId): array
    {
        $rows = $this->query(
            "SELECT pfv.*,
                    f.name AS filter_name, f.type AS filter_type, f.unit AS filter_unit,
                    fo.value AS option_value
             FROM product_filter_values pfv
             JOIN filters f ON f.id = pfv.filter_id
             LEFT JOIN filter_options fo ON fo.id = pfv.filter_option_id
             WHERE pfv.product_id = ?
             ORDER BY f.display_order ASC, fo.display_order ASC",
            [$productId]
        )->fetchAll();

        $grouped = [];
        foreach ($rows as $r) {
            $fid = (int) $r['filter_id'];
            if (!isset($grouped[$fid])) {
                $grouped[$fid] = [
                    'filter_id'   => $fid,
                    'filter_name' => $r['filter_name'],
                    'filter_type' => $r['filter_type'],
                    'filter_unit' => $r['filter_unit'],
                    'is_visible'  => (int) $r['is_visible'],
                    'option_ids'  => [],
                    'options'     => [],
                    'quantities'  => [],
                    'hover_texts' => [],
                    'min_value'   => null,
                    'max_value'   => null,
                ];
            }
            if ($r['filter_option_id'] !== null) {
                $oid   = (int) $r['filter_option_id'];
                $qty   = $r['quantity']   === null ? null : (int) $r['quantity'];
                $hover = $r['hover_text'] === null ? null : (string) $r['hover_text'];
                $grouped[$fid]['option_ids'][] = $oid;
                $grouped[$fid]['options'][]    = [
                    'id'         => $oid,
                    'value'      => $r['option_value'],
                    'quantity'   => $qty,
                    'hover_text' => $hover,
                ];
                $grouped[$fid]['quantities'][$oid]  = $qty;
                $grouped[$fid]['hover_texts'][$oid] = $hover;
            }
            if ($r['min_value'] !== null) $grouped[$fid]['min_value'] = $r['min_value'];
            if ($r['max_value'] !== null) $grouped[$fid]['max_value'] = $r['max_value'];
        }
        return array_values($grouped);
    }
}
