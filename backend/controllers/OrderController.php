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

        $products = new ProductModel();
        $filters  = new FilterModel();

        // Everything that touches stock + the order rows runs in one transaction.
        // If any line can't be reserved we roll the whole order back, so an order
        // is never created for stock that wasn't actually available.
        $orderId = 0;
        $this->orders->begin();
        try {
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

            foreach ($items as $item) {
                $pid       = (int) $item['product_id'];
                $qty       = (int) $item['quantity'];
                $variantId = $item['variant_id'] ? (int) $item['variant_id'] : null;
                $optionIds = array_column($item['picked_options'] ?? [], 'option_id');
                $p         = $products->findById($pid);
                $name      = $p['name'] ?? $item['name'] ?? 'an item';

                $this->orders->addItem($orderId, [
                    'product_id'            => $pid,
                    'variant_id'            => $variantId,
                    'quantity'              => $qty,
                    'unit_price'            => (float) $item['price_snapshot'],
                    'product_name_snapshot' => $name,
                    'sku_snapshot'          => $p['sku'] ?? null,
                ], $optionIds);

                // Reserve stock from the right pool — same priority the cart uses:
                // variant first, then per-option pools, otherwise the base product.
                if ($variantId) {
                    if (!$products->decrementVariantStock($variantId, $qty)) {
                        throw new RuntimeException("Sorry, \"{$name}\" just went out of stock.");
                    }
                } elseif (!empty($optionIds)) {
                    $trackedAny = false;
                    foreach ($optionIds as $oid) {
                        $res = $filters->decrementOptionStock($pid, (int) $oid, $qty);
                        if ($res === 'insufficient') {
                            throw new RuntimeException("Sorry, \"{$name}\" just went out of stock.");
                        }
                        if ($res === 'ok') $trackedAny = true;
                    }
                    if ($trackedAny) {
                        $filters->recomputeProductStock($pid);
                    } elseif (!$products->decrementStock($pid, $qty)) {
                        throw new RuntimeException("Sorry, \"{$name}\" just went out of stock.");
                    }
                } elseif (!$products->decrementStock($pid, $qty)) {
                    throw new RuntimeException("Sorry, \"{$name}\" just went out of stock.");
                }
            }

            if ($couponId) $this->coupons->incrementUsage($couponId);
            $this->carts->clear((int) $cart['id']);

            $this->orders->commit();
        } catch (\Throwable $e) {
            $this->orders->rollback();
            error($e->getMessage(), 409);
        }

        // Confirmation side-effects run only after the order is safely committed.
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
        $this->orders->setStatusWithStockSync($id, 'cancelled');
        success(null, 'Order cancelled.');
    }

    /**
     * Re-add every item from a past order to the current cart. Skips items that
     * are no longer purchasable (deleted, archived, out of stock, missing
     * variant/option) and reports them so the customer knows what wasn't added.
     */
    public function reorder(int $id): never
    {
        method('POST');
        $auth  = AuthMiddleware::require();
        $order = $this->orders->findById($id);
        if (!$order) error('Order not found.', 404);
        if ($auth['role'] !== 'admin' && (int) $order['user_id'] !== (int) $auth['sub']) {
            error('Forbidden.', 403);
        }

        $items    = $this->orders->itemsWithOptions($id);
        if (!$items) error('Order has no items.', 422);

        $products = new ProductModel();
        $filters  = new FilterModel();
        $cart     = $this->carts->getOrCreate((int) $auth['sub'], null);

        $added   = 0;
        $skipped = [];

        foreach ($items as $it) {
            $pid     = (int) $it['product_id'];
            $qty     = (int) $it['quantity'];
            $vid     = $it['variant_id'] ? (int) $it['variant_id'] : null;
            $opts    = $it['option_ids'] ?? [];
            $product = $products->findById($pid);
            $name    = $product['name'] ?? $it['product_name_snapshot'];

            if (!$product || $product['status'] !== 'active') {
                $skipped[] = ['name' => $name, 'reason' => 'no longer available'];
                continue;
            }

            // Today's price (honours active flash sale) — same rule as addItem.
            $flashSale  = (new FlashSaleModel())->activeForProduct($pid);
            $flashPrice = FlashSaleModel::priceFor($product, $flashSale);
            $price      = $flashPrice ?? (float) ($product['sale_price'] ?: $product['base_price']);

            if ($vid) {
                $variant = current(array_filter(
                    $products->variants($pid),
                    fn($v) => (int) $v['id'] === $vid
                )) ?: null;
                if (!$variant) { $skipped[] = ['name' => $name, 'reason' => 'variant no longer exists']; continue; }
                $inCart = $this->carts->getItemQuantity((int) $cart['id'], $pid, $vid);
                if ((int) $variant['stock_qty'] < $inCart + $qty) {
                    $skipped[] = ['name' => $name, 'reason' => 'out of stock']; continue;
                }
                $price += (float) $variant['price_modifier'];
            } elseif (!empty($opts)) {
                $stocks = $filters->optionQuantities($pid, $opts);
                $bad = false;
                foreach ($opts as $oid) {
                    if (!isset($stocks[$oid])) continue;
                    $stock     = $stocks[$oid];
                    $inCartOpt = $this->carts->qtyInCartForOption((int) $cart['id'], $pid, (int) $oid);
                    if ($stock < ($inCartOpt + $qty)) { $bad = true; break; }
                }
                if ($bad) { $skipped[] = ['name' => $name, 'reason' => 'option out of stock']; continue; }
            } else {
                $inCart = $this->carts->getItemQuantity((int) $cart['id'], $pid, null);
                if ((int) $product['stock_qty'] < $inCart + $qty) {
                    $skipped[] = ['name' => $name, 'reason' => 'out of stock']; continue;
                }
            }

            $this->carts->addItem((int) $cart['id'], $pid, $vid, $qty, $price, $opts);
            $added++;
        }

        success(['added' => $added, 'skipped' => $skipped], $added > 0 ? 'Items added to cart.' : 'No items could be re-added.');
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
