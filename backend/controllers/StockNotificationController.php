<?php
declare(strict_types=1);

class StockNotificationController
{
    // Public — POST /api/products/{id}/notify-me  { email }
    public function subscribe(int $productId): never
    {
        method('POST');
        $data  = getBody();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error('Please enter a valid email address.', 422);
        }
        $product = (new ProductModel())->findById($productId);
        if (!$product) error('Product not found.', 404);

        $res = (new StockNotificationModel())->subscribe($productId, $email);
        success(
            null,
            $res['already']
                ? "You're already on the list for this item."
                : "Done — we'll email you when it's back in stock!",
            201
        );
    }
}
