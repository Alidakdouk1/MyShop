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

    /**
     * Public — POST /api/products/{id}/notify-me/push  { endpoint, p256dh, auth }
     *
     * Same flow as the email path but the customer wants a push notification.
     * We piggy-back on the existing push_subscriptions table: the subscription
     * has to already be registered there (frontend calls /push/subscriptions
     * first) so we can look it up at restock time.
     */
    public function subscribePush(int $productId): never
    {
        method('POST');
        $data     = getBody();
        $endpoint = trim((string) ($data['endpoint'] ?? ''));
        if (!$endpoint) error('Push endpoint is required.', 422);

        $product = (new ProductModel())->findById($productId);
        if (!$product) error('Product not found.', 404);

        // Lazy-store the push subscription so we have the keys when we send.
        // The page hits /api/push/subscriptions first, so this row should
        // already exist — but cover the race just in case.
        if (!empty($data['p256dh']) && !empty($data['auth'])) {
            $auth   = AuthMiddleware::optional();
            $userId = $auth ? (int) $auth['sub'] : null;
            $ua     = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
            getDB()->prepare(
                "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_token, user_agent)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                     user_id      = COALESCE(VALUES(user_id), user_id),
                     p256dh       = VALUES(p256dh),
                     auth_token   = VALUES(auth_token),
                     user_agent   = VALUES(user_agent),
                     last_seen_at = CURRENT_TIMESTAMP"
            )->execute([$userId, $endpoint, trim($data['p256dh']), trim($data['auth']), $ua]);
        }

        $res = (new StockNotificationModel())->subscribePush($productId, $endpoint);
        success(
            null,
            $res['already']
                ? "You're already on the list for this item."
                : "Done — we'll ping you when it's back in stock!",
            201
        );
    }
}
