<?php
declare(strict_types=1);

class OrderModel extends BaseModel
{
    protected string $table = 'orders';

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO orders (user_id, address_id, coupon_id, subtotal, shipping_fee,
             discount, tax, total, payment_method, payment_status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $data['user_id'], $data['address_id'] ?? null, $data['coupon_id'] ?? null,
                $data['subtotal'], $data['shipping_fee'] ?? 0, $data['discount'] ?? 0,
                $data['tax'] ?? 0, $data['total'], $data['payment_method'] ?? 'cod',
                'pending',
                $data['notes'] ?? null,
            ]
        );
        $id = $this->lastId();
        $this->addStatusHistory($id, 'pending');
        return $id;
    }

    /** Append a status change to the order's tracking timeline. */
    public function addStatusHistory(int $orderId, string $status, ?string $note = null): void
    {
        $this->query(
            "INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)",
            [$orderId, $status, $note]
        );
    }

    /** Chronological status events for an order's tracking timeline. */
    public function statusHistory(int $orderId): array
    {
        return $this->query(
            "SELECT status, note, created_at FROM order_status_history
             WHERE order_id = ? ORDER BY created_at ASC, id ASC",
            [$orderId]
        )->fetchAll();
    }

    public function addItem(int $orderId, array $item, array $optionIds = []): int
    {
        $this->query(
            "INSERT INTO order_items (order_id, product_id, variant_id, quantity,
             unit_price, total_price, product_name_snapshot, sku_snapshot)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $orderId, $item['product_id'], $item['variant_id'] ?? null,
                $item['quantity'], $item['unit_price'],
                $item['unit_price'] * $item['quantity'],
                $item['product_name_snapshot'], $item['sku_snapshot'] ?? null,
            ]
        );
        $orderItemId = $this->lastId();

        // Remember the stock-bearing options so they can be restored on cancel.
        foreach (array_unique(array_filter(array_map('intval', $optionIds))) as $oid) {
            $this->query(
                "INSERT IGNORE INTO order_item_options (order_item_id, filter_option_id) VALUES (?, ?)",
                [$orderItemId, $oid]
            );
        }
        return $orderItemId;
    }

    public function withItems(int $orderId): ?array
    {
        $order = $this->findById($orderId);
        if (!$order) return null;
        $order['order_number'] = (int) $this->query(
            "SELECT COUNT(*) FROM orders WHERE user_id = ? AND id <= ?",
            [$order['user_id'], $orderId]
        )->fetchColumn();
        $order['items'] = $this->query(
            "SELECT oi.*, p.slug,
                    (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) AS image
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ?",
            [$orderId]
        )->fetchAll();
        $order['status_history'] = $this->statusHistory($orderId);
        return $order;
    }

    public function forUser(int $userId, int $limit, int $offset, string $status = ''): array
    {
        $where  = $status ? "o.user_id = ? AND o.status = ?" : "o.user_id = ?";
        $binds  = $status ? [$userId, $status, $limit, $offset] : [$userId, $limit, $offset];
        return $this->query(
            "SELECT o.*,
                    (SELECT COUNT(*) FROM orders o2 WHERE o2.user_id = o.user_id AND o2.id <= o.id) AS order_number,
                    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
                    (SELECT GROUP_CONCAT(pi.image_url SEPARATOR '|||')
                     FROM order_items oi2
                     LEFT JOIN product_images pi ON pi.product_id = oi2.product_id AND pi.is_primary = 1
                     WHERE oi2.order_id = o.id
                    ) AS preview_images
             FROM orders o
             WHERE {$where}
             ORDER BY o.created_at DESC LIMIT ? OFFSET ?",
            $binds
        )->fetchAll();
    }

    public function countForUser(int $userId, string $status = ''): int
    {
        if ($status) {
            return (int) $this->query(
                "SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = ?",
                [$userId, $status]
            )->fetchColumn();
        }
        return (int) $this->query("SELECT COUNT(*) FROM orders WHERE user_id = ?", [$userId])->fetchColumn();
    }

    public function forVendor(int $vendorId, int $limit, int $offset): array
    {
        return $this->query(
            "SELECT DISTINCT o.*, COUNT(oi.id) AS item_count
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             JOIN products p ON p.id = oi.product_id
             WHERE p.vendor_id = ?
             GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?",
            [$vendorId, $limit, $offset]
        )->fetchAll();
    }

    public function all(int $limit, int $offset, string $status = ''): array
    {
        if ($status) {
            return $this->query(
                "SELECT o.*, u.name AS customer_name, u.email AS customer_email
                 FROM orders o JOIN users u ON u.id = o.user_id
                 WHERE o.status = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?",
                [$status, $limit, $offset]
            )->fetchAll();
        }
        return $this->query(
            "SELECT o.*, u.name AS customer_name, u.email AS customer_email
             FROM orders o JOIN users u ON u.id = o.user_id
             ORDER BY o.created_at DESC LIMIT ? OFFSET ?",
            [$limit, $offset]
        )->fetchAll();
    }

    public function countAll(string $status = ''): int
    {
        if ($status) {
            return (int) $this->query("SELECT COUNT(*) FROM orders WHERE status = ?", [$status])->fetchColumn();
        }
        return (int) $this->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    }

    public function updateStatus(int $id, string $status): bool
    {
        // rowCount > 0 means the value actually changed — only log real transitions.
        $changed = $this->query("UPDATE orders SET status = ? WHERE id = ?", [$status, $id])->rowCount() > 0;
        if ($changed) $this->addStatusHistory($id, $status);
        return $changed;
    }

    /**
     * Change an order's status and keep stock in sync. When an order first enters
     * a "released" state (cancelled/refunded) its reserved stock is returned to
     * the correct pool. Runs in one transaction; the status guard prevents giving
     * stock back twice (e.g. cancelled -> refunded).
     */
    public function setStatusWithStockSync(int $id, string $newStatus): bool
    {
        $order = $this->findById($id);
        if (!$order) return false;

        $released = ['cancelled', 'refunded'];
        $shouldRestore = in_array($newStatus, $released, true)
                      && !in_array($order['status'], $released, true);

        $this->begin();
        try {
            if ($shouldRestore) $this->restoreStock($id);
            $this->query("UPDATE orders SET status = ? WHERE id = ?", [$newStatus, $id]);
            if ($order['status'] !== $newStatus) $this->addStatusHistory($id, $newStatus);
            $this->commit();
        } catch (\Throwable $e) {
            $this->rollback();
            throw $e;
        }
        return true;
    }

    /** Return every order line's quantity to its stock pool (variant > options > base). */
    public function restoreStock(int $orderId): void
    {
        $items = $this->query(
            "SELECT id, product_id, variant_id, quantity FROM order_items WHERE order_id = ?",
            [$orderId]
        )->fetchAll();

        $products = new ProductModel();
        $filters  = new FilterModel();

        foreach ($items as $it) {
            $pid = (int) $it['product_id'];
            $qty = (int) $it['quantity'];

            if ($it['variant_id']) {
                $products->incrementVariantStock((int) $it['variant_id'], $qty);
                continue;
            }

            $optionIds = array_map(
                fn($r) => (int) $r['filter_option_id'],
                $this->query(
                    "SELECT filter_option_id FROM order_item_options WHERE order_item_id = ?",
                    [(int) $it['id']]
                )->fetchAll()
            );

            $restoredAnyOption = false;
            foreach ($optionIds as $oid) {
                if ($filters->optionTracksStock($pid, $oid)) {
                    $filters->incrementOptionStock($pid, $oid, $qty);
                    $restoredAnyOption = true;
                }
            }

            if ($restoredAnyOption) {
                $filters->recomputeProductStock($pid);
            } else {
                $products->incrementStock($pid, $qty);
            }
        }
    }

    public function updatePayment(int $id, string $status, string $intentId): bool
    {
        return $this->query(
            "UPDATE orders SET payment_status = ?, stripe_payment_intent_id = ? WHERE id = ?",
            [$status, $intentId, $id]
        )->rowCount() > 0;
    }

    public function revenueStats(): array
    {
        return $this->query(
            "SELECT
                COUNT(*) AS total_orders,
                SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) AS total_revenue,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS orders_today,
                SUM(CASE WHEN DATE(created_at) = CURDATE() AND payment_status = 'paid' THEN total ELSE 0 END) AS revenue_today
             FROM orders"
        )->fetch();
    }

    public function dailySales(int $days = 30): array
    {
        return $this->query(
            "SELECT DATE(created_at) AS date, COUNT(*) AS orders,
                    SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) AS revenue
             FROM orders
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at) ORDER BY date ASC",
            [$days]
        )->fetchAll();
    }

    // ── Analytics ───────────────────────────────────────────────────────────

    /** Period totals plus the previous period of equal length (for % deltas). */
    public function analyticsSummary(int $days): array
    {
        $cur = $this->query(
            "SELECT COUNT(*) AS orders,
                    SUM(payment_status = 'paid') AS paid_orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS revenue
             FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)",
            [$days]
        )->fetch();

        $prev = $this->query(
            "SELECT COUNT(*) AS orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS revenue
             FROM orders
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
               AND created_at <  DATE_SUB(NOW(), INTERVAL ? DAY)",
            [$days * 2, $days]
        )->fetch();

        $units = (int) $this->query(
            "SELECT COALESCE(SUM(oi.quantity), 0)
             FROM order_items oi JOIN orders o ON o.id = oi.order_id
             WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)",
            [$days]
        )->fetchColumn();

        return [
            'revenue'      => (float) $cur['revenue'],
            'orders'       => (int) $cur['orders'],
            'paid_orders'  => (int) $cur['paid_orders'],
            'units'        => $units,
            'prev_revenue' => (float) $prev['revenue'],
            'prev_orders'  => (int) $prev['orders'],
        ];
    }

    public function topProductsByRevenue(int $days, int $limit = 6): array
    {
        return $this->query(
            "SELECT p.id, p.name, p.slug, SUM(oi.quantity) AS units, SUM(oi.total_price) AS revenue
             FROM order_items oi
             JOIN orders o   ON o.id = oi.order_id
             JOIN products p ON p.id = oi.product_id
             WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY p.id, p.name, p.slug
             ORDER BY revenue DESC
             LIMIT ?",
            [$days, $limit]
        )->fetchAll();
    }

    public function revenueByCategory(int $days, int $limit = 6): array
    {
        return $this->query(
            "SELECT c.name AS category, SUM(oi.total_price) AS revenue
             FROM order_items oi
             JOIN orders o     ON o.id = oi.order_id
             JOIN products p   ON p.id = oi.product_id
             JOIN categories c ON c.id = p.category_id
             WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY c.id, c.name
             ORDER BY revenue DESC
             LIMIT ?",
            [$days, $limit]
        )->fetchAll();
    }

    public function ordersByStatus(int $days): array
    {
        return $this->query(
            "SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
             FROM orders
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY status",
            [$days]
        )->fetchAll();
    }
}
