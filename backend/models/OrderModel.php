<?php
declare(strict_types=1);

class OrderModel extends BaseModel
{
    protected string $table = 'orders';

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO orders (user_id, address_id, coupon_id, subtotal, shipping_fee,
             discount, total, payment_method, payment_status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $data['user_id'], $data['address_id'] ?? null, $data['coupon_id'] ?? null,
                $data['subtotal'], $data['shipping_fee'] ?? 0, $data['discount'] ?? 0,
                $data['total'], $data['payment_method'] ?? 'cod',
                $data['payment_method'] === 'cod' ? 'pending' : 'pending',
                $data['notes'] ?? null,
            ]
        );
        return $this->lastId();
    }

    public function addItem(int $orderId, array $item): void
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
        return $this->query("UPDATE orders SET status = ? WHERE id = ?", [$status, $id])->rowCount() > 0;
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
}
