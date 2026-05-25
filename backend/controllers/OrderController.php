<?php
declare(strict_types=1);

class OrderController
{
    private OrderModel   $orders;
    private CartModel    $carts;
    private CouponModel  $coupons;

    public function __construct()
    {
        $this->orders  = new OrderModel();
        $this->carts   = new CartModel();
        $this->coupons = new CouponModel();
    }

    public function checkout(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        $data = getBody();
        $userId = (int) $auth['sub'];

        $cart  = $this->carts->getOrCreate($userId, null);
        $items = $this->carts->items((int) $cart['id']);
        if (empty($items)) error('Cart is empty.', 422);

        // Store-wide shipping & tax rules — keep in sync with src/lib/storeConfig.js
        $FREE_SHIPPING_THRESHOLD = 50.00;  // free shipping at/above this subtotal
        $FLAT_SHIPPING_FEE       = 8.00;   // otherwise this flat fee
        $TAX_RATE                = 0.00;   // e.g. 0.08 = 8%; 0 disables tax

        $subtotal = array_sum(array_map(fn($i) => $i['price_snapshot'] * $i['quantity'], $items));
        $discount = 0.0;
        $couponId = null;

        if (!empty($data['coupon_code'])) {
            $coupon = $this->coupons->findByCode($data['coupon_code']);
            if (!$coupon) error('Invalid or expired coupon.', 422);
            $discount = $this->coupons->apply($coupon, $subtotal);
            $couponId = (int) $coupon['id'];
        }

        $shippingFee = $subtotal >= $FREE_SHIPPING_THRESHOLD ? 0.00 : $FLAT_SHIPPING_FEE;
        $tax         = round(max(0, $subtotal - $discount) * $TAX_RATE, 2);
        $total       = round($subtotal - $discount + $shippingFee + $tax, 2);
        $method      = in_array($data['payment_method'] ?? '', ['stripe', 'cod'], true)
                       ? $data['payment_method'] : 'cod';

        $orderId = $this->orders->create([
            'user_id'        => $userId,
            'address_id'     => (int) ($data['address_id'] ?? 0) ?: null,
            'coupon_id'      => $couponId,
            'subtotal'       => $subtotal,
            'shipping_fee'   => $shippingFee,
            'discount'       => $discount,
            'tax'            => $tax,
            'total'          => $total,
            'payment_method' => $method,
            'notes'          => sanitize($data['notes'] ?? ''),
        ]);

        $products = new ProductModel();
        foreach ($items as $item) {
            $p = $products->findById((int) $item['product_id']);
            $this->orders->addItem($orderId, [
                'product_id'            => (int) $item['product_id'],
                'variant_id'            => $item['variant_id'] ? (int) $item['variant_id'] : null,
                'quantity'              => (int) $item['quantity'],
                'unit_price'            => (float) $item['price_snapshot'],
                'product_name_snapshot' => $p['name'] ?? $item['name'],
                'sku_snapshot'          => $p['sku'] ?? null,
            ]);
            $products->update((int) $item['product_id'], [
                'stock_qty' => max(0, (int) $p['stock_qty'] - (int) $item['quantity']),
            ]);
        }

        if ($couponId) $this->coupons->incrementUsage($couponId);
        $this->carts->clear((int) $cart['id']);

        $order = $this->orders->withItems($orderId);
        $user  = (new UserModel())->findById($userId);
        MailHelper::orderConfirmation($user['email'], $user['name'], $order, $order['items']);

        (new NotificationModel())->create(
            $userId, 'order_update', "Order #{$orderId} Confirmed",
            "Your order of \${$total} has been placed successfully.",
            "/orders/{$orderId}"
        );

        success($order, 'Order placed successfully.', 201);
    }

    public function index(): never
    {
        method('GET');
        $auth   = AuthMiddleware::require();
        $status = sanitize($_GET['status'] ?? '');
        [$page, $perPage, $offset] = PaginationHelper::params();
        $orders = $this->orders->forUser((int) $auth['sub'], $perPage, $offset, $status);
        $total  = $this->orders->countForUser((int) $auth['sub'], $status);
        paginated($orders, $total, $page, $perPage);
    }

    public function show(int $id): never
    {
        method('GET');
        $auth  = AuthMiddleware::require();
        $order = $this->orders->withItems($id);
        if (!$order) error('Order not found.', 404);
        if ($auth['role'] !== 'admin' && (int) $order['user_id'] !== (int) $auth['sub']) {
            error('Forbidden.', 403);
        }
        success($order);
    }

    public function cancel(int $id): never
    {
        method('PUT');
        $auth  = AuthMiddleware::require();
        $order = $this->orders->findById($id);
        if (!$order) error('Order not found.', 404);
        if ((int) $order['user_id'] !== (int) $auth['sub']) error('Forbidden.', 403);
        if (!in_array($order['status'], ['pending', 'confirmed'], true)) {
            error('Order cannot be cancelled at this stage.', 422);
        }
        $elapsed = time() - strtotime($order['created_at']);
        if ($elapsed > 5 * 3600) {
            error('Orders can only be cancelled within 5 hours of placing them.', 422);
        }
        $this->orders->updateStatus($id, 'cancelled');
        success(null, 'Order cancelled.');
    }

    public function vendorOrders(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'vendor', 'admin');
        [, $perPage, $offset] = PaginationHelper::params();
        $orders = $this->orders->forVendor((int) $auth['sub'], $perPage, $offset);
        success($orders);
    }

    public function vendorUpdateStatus(int $id): never
    {
        method('PUT');
        $auth   = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'vendor', 'admin');
        $data   = getBody();
        $status = $data['status'] ?? '';
        $allowed = ['confirmed', 'shipped', 'delivered'];
        if (!in_array($status, $allowed, true)) error('Invalid status.', 422);
        $this->orders->updateStatus($id, $status);
        success(null, 'Order status updated.');
    }
}
