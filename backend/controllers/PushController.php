<?php
declare(strict_types=1);

class PushController
{
    /** GET /api/push/public-key — hand the VAPID public key to the browser. */
    public function publicKey(): never
    {
        method('GET');
        success(['public_key' => env('VAPID_PUBLIC_KEY', '')]);
    }

    /**
     * POST /api/push/subscriptions — store (or refresh) a browser's push
     * subscription. The browser sends back the endpoint + keys it minted with
     * pushManager.subscribe(). Auth is optional so guests can subscribe to
     * back-in-stock alerts before they sign up.
     */
    public function subscribe(): never
    {
        method('POST');
        RateLimiter::check('push_subscribe', 30, 60);

        $auth   = AuthMiddleware::optional();
        $userId = $auth ? (int) $auth['sub'] : null;
        $data   = getBody();
        $endpoint = trim((string) ($data['endpoint'] ?? ''));
        $p256dh   = trim((string) ($data['p256dh']   ?? ''));
        $authKey  = trim((string) ($data['auth']     ?? ''));
        if (!$endpoint || !$p256dh || !$authKey) error('endpoint, p256dh and auth are required.', 422);

        // Upsert by endpoint. Same browser re-subscribing updates the row +
        // user_id (lets guests' subscription bind to their account at login).
        $ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
        getDB()->prepare(
            "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_token, user_agent)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 user_id      = COALESCE(VALUES(user_id), user_id),
                 p256dh       = VALUES(p256dh),
                 auth_token   = VALUES(auth_token),
                 user_agent   = VALUES(user_agent),
                 last_seen_at = CURRENT_TIMESTAMP"
        )->execute([$userId, $endpoint, $p256dh, $authKey, $ua]);

        success(null, 'Subscribed.');
    }

    /** DELETE /api/push/subscriptions — remove this browser's subscription. */
    public function unsubscribe(): never
    {
        method('DELETE');
        $endpoint = trim((string) (getBody()['endpoint'] ?? ''));
        if (!$endpoint) error('endpoint is required.', 422);
        getDB()->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")->execute([$endpoint]);
        success(null, 'Unsubscribed.');
    }
}
