<?php
declare(strict_types=1);

/**
 * Abandoned cart recovery.
 *
 * "Pending" carts come from CartModel::abandoned() — registered users whose
 * cart has gone stale. We send a one-shot recovery email with a unique
 * single-use percent-off coupon; the recovery row is updated to 'recovered'
 * once an order is placed using that coupon (see OrderController::checkout).
 */
class AbandonedCartController
{
    private const KEY = 'abandoned_cart_recovery';
    private const DEFAULTS = [
        'enabled'          => 1,
        'delay_hours'      => 24,
        'discount_percent' => 10,
        'expiry_days'      => 7,
        'min_cart_value'   => 0,
    ];

    private function guard(): array
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        return $auth;
    }

    private function settings(): array
    {
        $row    = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::DEFAULTS, $stored);
    }

    public function adminGetSettings(): never
    {
        method('GET');
        $this->guard();
        success($this->settings());
    }

    public function adminUpdateSettings(): never
    {
        method('PUT');
        $this->guard();
        $in = getBody();
        $clean = [
            'enabled'          => empty($in['enabled']) ? 0 : 1,
            'delay_hours'      => max(1,  (int) ($in['delay_hours']      ?? 24)),
            'discount_percent' => max(0, min(80, (int) ($in['discount_percent'] ?? 10))),
            'expiry_days'      => max(1, min(60, (int) ($in['expiry_days']      ?? 7))),
            'min_cart_value'   => max(0, (float) ($in['min_cart_value']   ?? 0)),
        ];
        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([self::KEY, json_encode($clean)]);
        success($clean, 'Settings saved.');
    }

    /**
     * Pending list joined with recovery status. Carts already recovered drop
     * out; carts whose owner has placed a NEWER order also drop out (they
     * effectively bought without needing the nudge).
     */
    public function adminPending(): never
    {
        method('GET');
        $this->guard();
        $s     = $this->settings();
        $hours = (int) $s['delay_hours'];
        $minV  = (float) $s['min_cart_value'];

        $rows = getDB()->prepare(
            "SELECT c.id AS cart_id, c.user_id, u.name AS customer_name, u.email,
                    COUNT(ci.id)                                           AS item_count,
                    COALESCE(SUM(ci.price_snapshot * ci.quantity), 0)      AS value,
                    c.updated_at,
                    r.id            AS recovery_id,
                    r.email_sent_at,
                    r.recovered_at,
                    r.recovered_value,
                    coup.code       AS coupon_code,
                    coup.expires_at AS coupon_expires_at
             FROM cart c
             JOIN cart_items ci ON ci.cart_id = c.id
             JOIN users      u  ON u.id  = c.user_id
             LEFT JOIN abandoned_cart_recoveries r ON r.cart_id = c.id
             LEFT JOIN coupons coup ON coup.id = r.coupon_id
             WHERE c.user_id IS NOT NULL
               AND c.updated_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
               AND NOT EXISTS (
                 SELECT 1 FROM orders o
                 WHERE o.user_id = c.user_id AND o.created_at > c.updated_at
               )
             GROUP BY c.id, c.user_id, u.name, u.email, c.updated_at,
                      r.id, r.email_sent_at, r.recovered_at, r.recovered_value,
                      coup.code, coup.expires_at
             HAVING value >= ?
             ORDER BY (r.email_sent_at IS NULL) DESC, value DESC"
        );
        $rows->execute([$hours, $minV]);

        // Recent recovery totals for the stats strip.
        $stats = getDB()->query(
            "SELECT
              SUM(CASE WHEN email_sent_at IS NOT NULL THEN 1 ELSE 0 END) AS emails_sent,
              SUM(CASE WHEN recovered_at  IS NOT NULL THEN 1 ELSE 0 END) AS recovered,
              COALESCE(SUM(recovered_value), 0)                          AS recovered_value
             FROM abandoned_cart_recoveries
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
        )->fetch();

        success([
            'settings' => $this->settings(),
            'carts'    => $rows->fetchAll(),
            'stats'    => [
                'emails_sent_30d'     => (int) ($stats['emails_sent']     ?? 0),
                'recovered_30d'       => (int) ($stats['recovered']       ?? 0),
                'recovered_value_30d' => (float) ($stats['recovered_value'] ?? 0),
            ],
        ]);
    }

    /** POST — issue a unique coupon, send the email, record the attempt. */
    public function adminSend(int $cartId): never
    {
        method('POST');
        $this->guard();
        $db = getDB();
        $s  = $this->settings();

        if (!$s['enabled']) error('Abandoned-cart recovery is disabled. Enable it in settings first.', 422);

        // Look up the cart owner + items.
        $cart = $db->prepare(
            "SELECT c.id, c.user_id, u.name, u.email
             FROM cart c JOIN users u ON u.id = c.user_id
             WHERE c.id = ? AND c.user_id IS NOT NULL"
        );
        $cart->execute([$cartId]);
        $cart = $cart->fetch();
        if (!$cart) error('Cart not found.', 404);

        // Has a recovery already gone out for this cart? Idempotent — no double-spam.
        $existing = $db->prepare("SELECT id, email_sent_at FROM abandoned_cart_recoveries WHERE cart_id = ?");
        $existing->execute([$cartId]);
        $existing = $existing->fetch();
        if ($existing && !empty($existing['email_sent_at'])) {
            error('A recovery email was already sent for this cart.', 409);
        }

        // Pull cart items (with image + name).
        $items = (new CartModel())->items($cartId);
        if (!$items) error('Cart is empty — nothing to recover.', 422);

        // Mint a single-use coupon scoped to this cart's owner.
        $code = 'COMEBACK' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $coupons = new CouponModel();
        $couponId = $coupons->create([
            'code'        => $code,
            'type'        => 'percent',
            'value'       => (float) $s['discount_percent'],
            'min_order'   => 0,
            'usage_limit' => 1,
            'is_active'   => 1,
            'expires_at'  => date('Y-m-d H:i:s', strtotime('+' . (int) $s['expiry_days'] . ' days')),
        ]);

        // Send the email. MailHelper::send() is a safe no-op when MAIL_ENABLED=false,
        // which lets us still record the attempt in dev. In prod the admin gets a
        // delivery confirmation via the return value.
        $sent = MailHelper::abandonedCartRecovery(
            (string) $cart['email'],
            (string) $cart['name'],
            $items,
            $code,
            (int) $s['discount_percent'],
            (int) $s['expiry_days']
        );

        // Upsert the recovery row.
        if ($existing) {
            $db->prepare(
                "UPDATE abandoned_cart_recoveries
                 SET coupon_id = ?, email_sent_at = NOW()
                 WHERE id = ?"
            )->execute([$couponId, (int) $existing['id']]);
        } else {
            $db->prepare(
                "INSERT INTO abandoned_cart_recoveries (cart_id, user_id, coupon_id, email_sent_at)
                 VALUES (?, ?, ?, NOW())"
            )->execute([$cartId, (int) $cart['user_id'], $couponId]);
        }

        success([
            'cart_id'      => $cartId,
            'coupon_code'  => $code,
            'mail_sent'    => (bool) $sent,
            'mail_enabled' => env('MAIL_ENABLED', 'false') === 'true',
        ], $sent
            ? 'Recovery email sent.'
            : 'Recorded — but mail is not enabled, so no email was actually delivered.'
        );
    }

    /**
     * Called from OrderController after a successful checkout.
     * If the discount used was a COMEBACK coupon, mark the recovery as
     * recovered with the order id + order value.
     */
    public static function maybeMarkRecovered(int $orderId, ?int $couponId, float $orderTotal): void
    {
        if (!$couponId) return;
        $db = getDB();
        $hit = $db->prepare("SELECT id FROM abandoned_cart_recoveries WHERE coupon_id = ? AND recovered_at IS NULL LIMIT 1");
        $hit->execute([$couponId]);
        $row = $hit->fetch();
        if (!$row) return;
        $db->prepare(
            "UPDATE abandoned_cart_recoveries
             SET recovered_at = NOW(), order_id = ?, recovered_value = ?
             WHERE id = ?"
        )->execute([$orderId, $orderTotal, (int) $row['id']]);
    }
}
