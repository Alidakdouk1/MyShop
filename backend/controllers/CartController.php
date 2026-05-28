<?php
declare(strict_types=1);

class CartController
{
    private CartModel $carts;

    public function __construct()
    {
        $this->carts = new CartModel();
    }

    private function getCart(): array
    {
        $auth      = AuthMiddleware::optional();
        $userId    = $auth ? (int) $auth['sub'] : null;
        $sessionId = $userId ? null : (session_id() ?: session_start() . session_id());
        return $this->carts->getOrCreate($userId, $sessionId);
    }

    public function index(): never
    {
        method('GET');
        $cart  = $this->getCart();
        $items = $this->carts->items((int) $cart['id']);
        $total = array_sum(array_map(fn($i) => $i['price_snapshot'] * $i['quantity'], $items));
        success(['cart_id' => $cart['id'], 'items' => $items, 'total' => round($total, 2)]);
    }

    public function addItem(): never
    {
        method('POST');
        $cart = $this->getCart();
        $data = getBody();

        $productId        = (int) ($data['product_id'] ?? 0);
        $variantId        = isset($data['variant_id']) ? (int) $data['variant_id'] : null;
        $qty              = max(1, (int) ($data['quantity'] ?? 1));
        $selectedOptionIds = isset($data['selected_option_ids']) && is_array($data['selected_option_ids'])
            ? array_values(array_filter(array_map('intval', $data['selected_option_ids'])))
            : [];

        if (!$productId) error('product_id is required.', 422);

        $products = new ProductModel();
        $product  = $products->findById($productId);
        if (!$product || $product['status'] !== 'active') error('Product not available.', 404);

        // Honour an active flash sale: the discounted price is what we snapshot
        // into the cart, so checkout charges the deal — not the regular price.
        $flashSale  = (new FlashSaleModel())->activeForProduct($productId);
        $flashPrice = FlashSaleModel::priceFor($product, $flashSale);
        $price = $flashPrice ?? (float) ($product['sale_price'] ?: $product['base_price']);

        if ($variantId) {
            $allVariants = $products->variants($productId);
            $variant     = current(array_filter($allVariants, fn($v) => $v['id'] == $variantId)) ?: null;
            if (!$variant) error('Variant not found.', 404);
            $inCart   = $this->carts->getItemQuantity((int) $cart['id'], $productId, $variantId);
            $totalQty = $inCart + $qty;
            if ((int) $variant['stock_qty'] < $totalQty) error('Not enough stock.', 422);
            $price += (float) $variant['price_modifier'];
        } elseif (!empty($selectedOptionIds)) {
            // Each picked filter option has its OWN independent stock pool.
            // For each option: (qty already in cart tied to that option) + new qty
            // must not exceed the option's stock. Different option picks for the
            // same product are separate cart rows, so their stocks don't blend.
            $stocks = (new FilterModel())->optionQuantities($productId, $selectedOptionIds);
            foreach ($selectedOptionIds as $oid) {
                if (!isset($stocks[$oid])) continue; // option without stock tracking
                $stock     = $stocks[$oid];
                $inCartOpt = $this->carts->qtyInCartForOption((int) $cart['id'], $productId, $oid);
                if ($stock < ($inCartOpt + $qty)) {
                    $remaining = max(0, $stock - $inCartOpt);
                    error("Only {$remaining} left for the selected option.", 422);
                }
            }
        } else {
            $inCart   = $this->carts->getItemQuantity((int) $cart['id'], $productId, $variantId);
            $totalQty = $inCart + $qty;
            if ((int) $product['stock_qty'] < $totalQty) error('Not enough stock.', 422);
        }

        $this->carts->addItem((int) $cart['id'], $productId, $variantId, $qty, $price, $selectedOptionIds);
        $items = $this->carts->items((int) $cart['id']);
        $total = array_sum(array_map(fn($i) => $i['price_snapshot'] * $i['quantity'], $items));
        success(['cart_id' => $cart['id'], 'items' => $items, 'total' => round($total, 2)], 'Item added to cart.', 201);
    }

    /**
     * Add every product in a bundle to the cart at proportionally-adjusted
     * prices so the line totals add up to the bundle price. The discount flows
     * through to checkout via the snapshot price.
     */
    public function addBundle(int $bundleId): never
    {
        method('POST');
        $cart    = $this->getCart();
        $bundles = new BundleModel();
        $bundle  = $bundles->findById($bundleId);
        if (!$bundle || (int) $bundle['is_active'] !== 1) error('Bundle not found.', 404);

        $items = $bundles->itemsForBundle($bundleId);
        if (count($items) < 2) error('This bundle is incomplete.', 422);

        // Only simple, in-stock products are eligible for one-click bundle add.
        foreach ($items as $it) {
            if ((int) $it['variant_count'] > 0) error("\"{$it['name']}\" has variants and can't be added via the bundle button.", 422);
            if ((int) $it['stock_qty']     <= 0) error("\"{$it['name']}\" is out of stock.", 422);
        }

        // Effective regular price per item (honour active flash sale).
        $flashModel = new FlashSaleModel();
        $regularTotal = 0.0;
        $perItem      = [];
        foreach ($items as $it) {
            $sale  = $flashModel->activeForProduct((int) $it['id']);
            $flash = FlashSaleModel::priceFor($it, $sale);
            $eff   = $flash !== null ? $flash : (float) ($it['sale_price'] ?: $it['base_price']);
            $perItem[] = ['id' => (int) $it['id'], 'name' => $it['name'], 'eff' => $eff];
            $regularTotal += $eff;
        }

        $bundlePrice = (float) $bundle['bundle_price'];
        // Don't let the "bundle" cost more than buying the items normally.
        $bundlePrice = min($bundlePrice, $regularTotal);
        $ratio       = $regularTotal > 0 ? $bundlePrice / $regularTotal : 1.0;

        // Compute per-item snapshot prices, then absorb the rounding remainder
        // into the last line so the sum is exactly the bundle price.
        $snapshots = [];
        $accum     = 0.0;
        $n = count($perItem);
        foreach ($perItem as $i => $pi) {
            $snap = ($i === $n - 1)
                ? round($bundlePrice - $accum, 2)
                : round($pi['eff'] * $ratio, 2);
            $snapshots[] = $snap;
            $accum      += $snap;
        }

        $products = new ProductModel();
        $this->carts->begin();
        try {
            foreach ($perItem as $i => $pi) {
                // Match CartController::addItem stock rule for non-variant simple adds.
                $inCart   = $this->carts->getItemQuantity((int) $cart['id'], $pi['id'], null);
                $product  = $products->findById($pi['id']);
                if ((int) $product['stock_qty'] < $inCart + 1) {
                    throw new RuntimeException("Sorry, \"{$pi['name']}\" just went out of stock.");
                }
                $this->carts->addItem((int) $cart['id'], $pi['id'], null, 1, $snapshots[$i], []);
            }
            $this->carts->commit();
        } catch (\Throwable $e) {
            $this->carts->rollback();
            error($e->getMessage(), 409);
        }

        $items = $this->carts->items((int) $cart['id']);
        $total = array_sum(array_map(fn($i) => $i['price_snapshot'] * $i['quantity'], $items));
        success(['cart_id' => $cart['id'], 'items' => $items, 'total' => round($total, 2)], 'Bundle added to cart.', 201);
    }

    public function updateItem(int $itemId): never
    {
        method('PUT');
        $cart = $this->getCart();
        $data = getBody();
        $qty  = max(1, (int) ($data['quantity'] ?? 1));

        $item = $this->carts->findItem($itemId, (int) $cart['id']);
        if (!$item) error('Item not found in cart.', 404);

        $products = new ProductModel();
        $product  = $products->findById((int) $item['product_id']);
        if (!$product || $product['status'] !== 'active') error('Product not available.', 404);

        if ($item['variant_id']) {
            $allVariants = $products->variants((int) $item['product_id']);
            $variant     = current(array_filter($allVariants, fn($v) => $v['id'] == $item['variant_id'])) ?: null;
            if ($variant && (int) $variant['stock_qty'] < $qty) error('Not enough stock.', 422);
        } else {
            $itemOptionIds = $this->carts->itemOptionIds($itemId);
            if (!empty($itemOptionIds)) {
                $stocks = (new FilterModel())->optionQuantities((int) $item['product_id'], $itemOptionIds);
                foreach ($itemOptionIds as $oid) {
                    if (!isset($stocks[$oid])) continue;
                    $stock     = $stocks[$oid];
                    // Other rows in this cart may also consume this option (different
                    // pick combos for the same product) — count those too, but exclude
                    // the row we're updating since $qty is its NEW value.
                    $otherInCart = $this->carts->qtyInCartForOption(
                        (int) $cart['id'], (int) $item['product_id'], $oid, $itemId
                    );
                    if ($stock < ($otherInCart + $qty)) {
                        $remaining = max(0, $stock - $otherInCart);
                        error("Only {$remaining} left for the selected option.", 422);
                    }
                }
            } elseif ((int) $product['stock_qty'] < $qty) {
                error('Not enough stock.', 422);
            }
        }

        if (!$this->carts->updateItem($itemId, (int) $cart['id'], $qty)) {
            error('Item not found in cart.', 404);
        }
        $items = $this->carts->items((int) $cart['id']);
        $total = array_sum(array_map(fn($i) => $i['price_snapshot'] * $i['quantity'], $items));
        success(['cart_id' => $cart['id'], 'items' => $items, 'total' => round($total, 2)], 'Cart updated.');
    }

    public function removeItem(int $itemId): never
    {
        method('DELETE');
        $cart = $this->getCart();
        if (!$this->carts->removeItem($itemId, (int) $cart['id'])) {
            error('Item not found.', 404);
        }
        success(null, 'Item removed.');
    }

    public function clear(): never
    {
        method('DELETE');
        $cart = $this->getCart();
        $this->carts->clear((int) $cart['id']);
        success(null, 'Cart cleared.');
    }

    public function merge(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        $data = getBody();
        $sid  = $data['session_id'] ?? '';
        if ($sid) $this->carts->mergeGuestCart($sid, (int) $auth['sub']);
        success(null, 'Cart merged.');
    }
}
