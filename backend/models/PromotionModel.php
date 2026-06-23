<?php
declare(strict_types=1);

/**
 * Promotions storage + the cart-evaluation engine.
 *
 * The engine takes the current cart rows and returns:
 *   - savings_total:  numeric $ taken off the subtotal
 *   - adjustments:    one entry per promo that fired, with breakdown for the UI
 *   - free_items:     gift products to auto-add at $0 (admin must pick in-stock ones)
 *
 * Both the cart endpoint and the checkout path call evaluate() with the same
 * input, so customers see the same total before and after placing the order.
 */
class PromotionModel extends BaseModel
{
    protected string $table = 'promotions';

    public function activeNow(): array
    {
        $now = date('Y-m-d H:i:s');
        return $this->query(
            "SELECT * FROM promotions
             WHERE is_active = 1
               AND (starts_at IS NULL OR starts_at <= ?)
               AND (ends_at   IS NULL OR ends_at   >= ?)
             ORDER BY id ASC",
            [$now, $now]
        )->fetchAll();
    }

    public function allAdmin(): array
    {
        return $this->query("SELECT * FROM promotions ORDER BY id DESC")->fetchAll();
    }

    public function findOne(int $id): ?array
    {
        $row = $this->query("SELECT * FROM promotions WHERE id = ?", [$id])->fetch();
        return $row ?: null;
    }

    public function create(array $d): int
    {
        $this->query(
            "INSERT INTO promotions
              (name, type, is_active, starts_at, ends_at,
               buy_quantity, get_quantity, discount_percent, scope_type, scope_ids,
               min_subtotal, gift_product_id)
             VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?)",
            [
                (string) $d['name'],
                in_array($d['type'] ?? '', ['bogo', 'gift'], true) ? $d['type'] : 'bogo',
                empty($d['is_active']) ? 0 : 1,
                $d['starts_at'] ?: null,
                $d['ends_at']   ?: null,
                $d['buy_quantity']     ?? null,
                $d['get_quantity']     ?? null,
                $d['discount_percent'] ?? null,
                $d['scope_type']       ?? null,
                isset($d['scope_ids']) && is_array($d['scope_ids']) ? json_encode($d['scope_ids']) : null,
                $d['min_subtotal']    ?? null,
                $d['gift_product_id'] ?? null,
            ]
        );
        return $this->lastId();
    }

    public function updateOne(int $id, array $d): bool
    {
        $allowed = ['name','type','is_active','starts_at','ends_at',
                    'buy_quantity','get_quantity','discount_percent','scope_type','scope_ids',
                    'min_subtotal','gift_product_id'];
        $sets = []; $params = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $d)) {
                $val = $d[$f];
                if ($f === 'is_active') $val = empty($val) ? 0 : 1;
                if ($f === 'scope_ids' && is_array($val)) $val = json_encode($val);
                if (($f === 'starts_at' || $f === 'ends_at') && $val === '') $val = null;
                $sets[] = "`{$f}` = ?";
                $params[] = $val;
            }
        }
        if (!$sets) return false;
        $params[] = $id;
        return $this->query(
            "UPDATE promotions SET " . implode(', ', $sets) . " WHERE id = ?",
            $params
        )->rowCount() >= 0;
    }

    /**
     * Evaluate all currently-active promotions against a set of cart rows.
     *
     * @param array $items  Cart rows from CartModel::items(); each needs
     *                      id, product_id, quantity, price_snapshot, category_id (optional)
     * @return array {
     *   savings_total: float,
     *   adjustments:   array<int, array{promo_id, name, type, savings, free_product_id?, free_product_name?}>,
     *   free_items:    array<int, array{product_id, name, image, qty}>
     * }
     */
    public function evaluate(array $items): array
    {
        $promos = $this->activeNow();
        if (empty($promos) || empty($items)) {
            return ['savings_total' => 0.0, 'adjustments' => [], 'free_items' => []];
        }

        // Hydrate category_id once for every product in the cart so BOGO scope
        // checks don't trigger N queries per promo.
        $productIds = array_unique(array_map(fn($i) => (int) $i['product_id'], $items));
        if ($productIds) {
            $ph    = implode(',', array_fill(0, count($productIds), '?'));
            $catRows = $this->query(
                "SELECT id, category_id FROM products WHERE id IN ($ph)",
                $productIds
            )->fetchAll();
            $catMap = [];
            foreach ($catRows as $r) $catMap[(int) $r['id']] = (int) $r['category_id'];
        } else {
            $catMap = [];
        }

        $subtotal    = 0.0;
        $expanded    = []; // one row per unit (so we can pick "cheapest M" cleanly)
        foreach ($items as $it) {
            $price = (float) $it['price_snapshot'];
            $pid   = (int) $it['product_id'];
            $cat   = $catMap[$pid] ?? null;
            $qty   = (int) $it['quantity'];
            $subtotal += $price * $qty;
            for ($i = 0; $i < $qty; $i++) {
                $expanded[] = ['product_id' => $pid, 'category_id' => $cat, 'price' => $price];
            }
        }

        $adjustments = [];
        $freeItems   = [];
        $savings     = 0.0;

        foreach ($promos as $p) {
            if ($p['type'] === 'bogo') {
                $adj = $this->applyBogo($p, $expanded);
                if ($adj && $adj['savings'] > 0) {
                    $adjustments[] = $adj;
                    $savings      += $adj['savings'];
                }
            } elseif ($p['type'] === 'gift') {
                $adj = $this->applyGift($p, $subtotal);
                if ($adj) {
                    $adjustments[] = $adj;
                    if (!empty($adj['free_item'])) $freeItems[] = $adj['free_item'];
                }
            }
        }

        return [
            'savings_total' => round($savings, 2),
            'adjustments'   => $adjustments,
            'free_items'    => $freeItems,
        ];
    }

    private function applyBogo(array $p, array $expanded): ?array
    {
        $buy  = (int) ($p['buy_quantity'] ?? 0);
        $get  = (int) ($p['get_quantity'] ?? 0);
        $pct  = (int) ($p['discount_percent'] ?? 100);
        if ($buy <= 0 || $get <= 0 || $pct <= 0) return null;

        $scopeType = $p['scope_type'] ?? 'all';
        $scopeIds  = $p['scope_ids']  ? (json_decode((string) $p['scope_ids'], true) ?: []) : [];
        $scopeIds  = array_map('intval', $scopeIds);

        // Filter cart units that qualify for this promo.
        $eligible = array_values(array_filter($expanded, function ($u) use ($scopeType, $scopeIds) {
            if ($scopeType === 'all')      return true;
            if ($scopeType === 'category') return in_array((int) ($u['category_id'] ?? 0), $scopeIds, true);
            if ($scopeType === 'products') return in_array((int) $u['product_id'],         $scopeIds, true);
            return false;
        }));

        // Need at least (buy + get) eligible units to fire even once.
        $threshold = $buy + $get;
        if (count($eligible) < $threshold) return null;

        // Number of times the promo fires (each fire discounts `get` units).
        $fires = intdiv(count($eligible), $threshold);
        $freeCount = $fires * $get;

        // Discount the cheapest `freeCount` eligible units (best for customer +
        // matches how most major retailers actually advertise BOGO).
        usort($eligible, fn($a, $b) => $a['price'] <=> $b['price']);
        $cheapest = array_slice($eligible, 0, $freeCount);
        $savings  = 0.0;
        foreach ($cheapest as $u) $savings += $u['price'] * ($pct / 100);

        if ($savings <= 0) return null;
        return [
            'promo_id' => (int) $p['id'],
            'name'     => (string) $p['name'],
            'type'     => 'bogo',
            'savings'  => round($savings, 2),
            'detail'   => "Buy {$buy}, get {$get} at {$pct}% off · ×{$fires}",
        ];
    }

    private function applyGift(array $p, float $subtotal): ?array
    {
        $min = (float) ($p['min_subtotal'] ?? 0);
        $gid = (int) ($p['gift_product_id'] ?? 0);
        if ($min <= 0 || $gid <= 0 || $subtotal < $min) return null;

        // Verify the gift product is in stock RIGHT NOW. If not, the promo
        // silently skips rather than promising an undeliverable freebie.
        $row = $this->query(
            "SELECT id, name, stock_qty,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image
             FROM products p WHERE id = ? AND status = 'active'",
            [$gid]
        )->fetch();
        if (!$row || (int) $row['stock_qty'] <= 0) return null;

        return [
            'promo_id'         => (int) $p['id'],
            'name'             => (string) $p['name'],
            'type'             => 'gift',
            'savings'          => 0.0,
            'detail'           => "Free {$row['name']} when you spend $" . number_format($min, 2),
            'free_item'        => [
                'product_id' => (int) $row['id'],
                'name'       => (string) $row['name'],
                'image'      => $row['image'] ?? null,
                'qty'        => 1,
            ],
        ];
    }
}
