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

        $productId = (int) ($data['product_id'] ?? 0);
        $variantId = isset($data['variant_id']) ? (int) $data['variant_id'] : null;
        $qty       = max(1, (int) ($data['quantity'] ?? 1));

        if (!$productId) error('product_id is required.', 422);

        $products = new ProductModel();
        $product  = $products->findById($productId);
        if (!$product || $product['status'] !== 'active') error('Product not available.', 404);

        $price = (float) ($product['sale_price'] ?: $product['base_price']);

        $inCart   = $this->carts->getItemQuantity((int) $cart['id'], $productId, $variantId);
        $totalQty = $inCart + $qty;

        if ($variantId) {
            $allVariants = $products->variants($productId);
            $variant     = current(array_filter($allVariants, fn($v) => $v['id'] == $variantId)) ?: null;
            if (!$variant) error('Variant not found.', 404);
            if ((int) $variant['stock_qty'] < $totalQty) error('Not enough stock.', 422);
            $price += (float) $variant['price_modifier'];
        } else {
            if ((int) $product['stock_qty'] < $totalQty) error('Not enough stock.', 422);
        }

        $this->carts->addItem((int) $cart['id'], $productId, $variantId, $qty, $price);
        $items = $this->carts->items((int) $cart['id']);
        $total = array_sum(array_map(fn($i) => $i['price_snapshot'] * $i['quantity'], $items));
        success(['cart_id' => $cart['id'], 'items' => $items, 'total' => round($total, 2)], 'Item added to cart.', 201);
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
            if ((int) $product['stock_qty'] < $qty) error('Not enough stock.', 422);
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
