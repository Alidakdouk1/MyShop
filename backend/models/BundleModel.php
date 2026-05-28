<?php
declare(strict_types=1);

class BundleModel extends BaseModel
{
    protected string $table = 'bundles';

    public function create(string $title, float $price, ?string $imageUrl, bool $isActive = true): int
    {
        $this->query(
            "INSERT INTO bundles (title, bundle_price, image_url, is_active) VALUES (?, ?, ?, ?)",
            [$title, $price, $imageUrl, $isActive ? 1 : 0]
        );
        return $this->lastId();
    }

    public function update(int $id, array $data): bool
    {
        $cols = ['title', 'bundle_price', 'image_url', 'is_active'];
        $sets = []; $params = [];
        foreach ($cols as $c) {
            if (array_key_exists($c, $data)) { $sets[] = "`{$c}` = ?"; $params[] = $data[$c]; }
        }
        if (!$sets) return false;
        $params[] = $id;
        return $this->query("UPDATE bundles SET " . implode(', ', $sets) . " WHERE id = ?", $params)->rowCount() >= 0;
    }

    public function setItems(int $bundleId, array $productIds): void
    {
        $this->query("DELETE FROM bundle_items WHERE bundle_id = ?", [$bundleId]);
        foreach (array_unique(array_filter(array_map('intval', $productIds))) as $pid) {
            $this->query(
                "INSERT IGNORE INTO bundle_items (bundle_id, product_id) VALUES (?, ?)",
                [$bundleId, $pid]
            );
        }
    }

    /** Bundle row with its items (each carrying full product card data). */
    public function findWithItems(int $id): ?array
    {
        $bundle = $this->findById($id);
        if (!$bundle) return null;
        $bundle['items'] = $this->itemsForBundle($id);
        return $bundle;
    }

    public function adminAll(): array
    {
        return $this->query(
            "SELECT b.*,
                    (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) AS item_count
             FROM bundles b
             ORDER BY b.is_active DESC, b.created_at DESC"
        )->fetchAll();
    }

    public function productIds(int $bundleId): array
    {
        return array_map(
            fn($r) => (int) $r['product_id'],
            $this->query("SELECT product_id FROM bundle_items WHERE bundle_id = ?", [$bundleId])->fetchAll()
        );
    }

    /** Items in a bundle with the product fields needed by BundleCard. */
    public function itemsForBundle(int $bundleId): array
    {
        return $this->query(
            "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
                    (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count
             FROM bundle_items bi
             JOIN products p ON p.id = bi.product_id
             WHERE bi.bundle_id = ?
             ORDER BY p.name ASC",
            [$bundleId]
        )->fetchAll();
    }

    /** Active bundles that contain this product, each with its full items list. */
    public function forProduct(int $productId): array
    {
        $rows = $this->query(
            "SELECT DISTINCT b.id
             FROM bundles b
             JOIN bundle_items bi ON bi.bundle_id = b.id
             WHERE b.is_active = 1 AND bi.product_id = ?",
            [$productId]
        )->fetchAll();

        $out = [];
        foreach ($rows as $r) {
            $b = $this->findWithItems((int) $r['id']);
            if ($b && count($b['items']) >= 2) $out[] = $b;
        }
        return $out;
    }
}
