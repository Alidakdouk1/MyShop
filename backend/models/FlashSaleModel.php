<?php
declare(strict_types=1);

class FlashSaleModel extends BaseModel
{
    protected string $table = 'flash_sales';

    public function create(string $title, float $discountPercent, string $startsAt, string $endsAt): int
    {
        $this->query(
            "INSERT INTO flash_sales (title, discount_percent, starts_at, ends_at) VALUES (?, ?, ?, ?)",
            [$title, $discountPercent, $startsAt, $endsAt]
        );
        return $this->lastId();
    }

    public function addItems(int $saleId, array $productIds): void
    {
        foreach (array_unique(array_filter(array_map('intval', $productIds))) as $pid) {
            $this->query(
                "INSERT IGNORE INTO flash_sale_items (flash_sale_id, product_id) VALUES (?, ?)",
                [$saleId, $pid]
            );
        }
    }

    /** Admin list — every sale with its product count, newest window first. */
    public function adminAll(): array
    {
        return $this->query(
            "SELECT fs.*,
                    (SELECT COUNT(*) FROM flash_sale_items WHERE flash_sale_id = fs.id) AS product_count
             FROM flash_sales fs
             ORDER BY fs.ends_at DESC"
        )->fetchAll();
    }

    /** Product ids attached to a sale. */
    public function productIds(int $saleId): array
    {
        return array_map(
            fn($r) => (int) $r['product_id'],
            $this->query("SELECT product_id FROM flash_sale_items WHERE flash_sale_id = ?", [$saleId])->fetchAll()
        );
    }

    /** Best (highest %) currently-active sale for one product, or null. */
    public function activeForProduct(int $productId): ?array
    {
        $row = $this->query(
            "SELECT fs.id, fs.title, fs.discount_percent, fs.ends_at
             FROM flash_sale_items fsi
             JOIN flash_sales fs ON fs.id = fsi.flash_sale_id
             WHERE fsi.product_id = ? AND fs.starts_at <= NOW() AND fs.ends_at > NOW()
             ORDER BY fs.discount_percent DESC
             LIMIT 1",
            [$productId]
        )->fetch();
        return $row ?: null;
    }

    /**
     * For a set of product ids, the best active sale per product.
     * Returns [product_id => ['discount_percent','ends_at','title']].
     */
    public function activeForProductIds(array $ids): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return [];
        $ph   = implode(',', array_fill(0, count($ids), '?'));
        $rows = $this->query(
            "SELECT fsi.product_id, fs.title, fs.discount_percent, fs.ends_at
             FROM flash_sale_items fsi
             JOIN flash_sales fs ON fs.id = fsi.flash_sale_id
             WHERE fsi.product_id IN ({$ph})
               AND fs.starts_at <= NOW() AND fs.ends_at > NOW()
             ORDER BY fs.discount_percent DESC",
            $ids
        )->fetchAll();

        $map = [];
        foreach ($rows as $r) {
            $pid = (int) $r['product_id'];
            if (isset($map[$pid])) continue; // first row per product = highest discount
            $map[$pid] = [
                'title'            => $r['title'],
                'discount_percent' => (float) $r['discount_percent'],
                'ends_at'          => $r['ends_at'],
            ];
        }
        return $map;
    }

    /**
     * The flash price for a product given the active sale info, never worse than
     * its normal effective price. Returns null when there's no active sale.
     */
    public static function priceFor(array $product, ?array $sale): ?float
    {
        if (!$sale) return null;
        $base   = (float) $product['base_price'];
        $normal = (float) ($product['sale_price'] ?: $product['base_price']);
        $flash  = round($base * (1 - ((float) $sale['discount_percent']) / 100), 2);
        return min($flash, $normal);
    }
}
