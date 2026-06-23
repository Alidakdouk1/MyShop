<?php
declare(strict_types=1);

/**
 * WhatsApp order-notification template settings.
 *
 * Stored as a single JSON blob in app_settings.whatsapp_notifications.
 * The frontend builds wa.me click-to-chat URLs from these templates — no
 * paid Business API needed, the admin clicks the link and WhatsApp Web/Desktop
 * opens with the message pre-filled.
 *
 * Supported template variables (substituted client-side too):
 *   {customer_name}  — recipient first name
 *   {order_id}       — order id
 *   {reference}      — MS-{order_id}
 *   {total}          — formatted total with currency
 *   {tracking_url}   — link back to the order page
 *   {store_name}     — Pick&Go LB (or store name)
 */
class WhatsAppNotifyController
{
    private const KEY = 'whatsapp_notifications';
    private const EVENTS = [
        'order_placed',
        'payment_confirmed',
        'shipped',
        'delivered',
        'cancelled',
    ];

    private function settings(): array
    {
        $row    = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        // Backfill any missing event keys with sensible empty defaults so the
        // admin UI never has to guard against undefined.
        if (!isset($stored['enabled']))    $stored['enabled']   = 1;
        if (!isset($stored['templates'])) $stored['templates'] = [];
        foreach (self::EVENTS as $e) {
            if (!isset($stored['templates'][$e])) {
                $stored['templates'][$e] = ['enabled' => 0, 'text' => ''];
            }
        }
        return $stored;
    }

    private function guard(): array
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        return $auth;
    }

    public function adminGet(): never
    {
        method('GET');
        $this->guard();
        success($this->settings());
    }

    public function adminUpdate(): never
    {
        method('PUT');
        $this->guard();

        $in       = getBody();
        $clean    = [
            'enabled'   => empty($in['enabled']) ? 0 : 1,
            'templates' => [],
        ];
        foreach (self::EVENTS as $e) {
            $tpl = $in['templates'][$e] ?? [];
            // Strict 2000-char cap — wa.me click-to-chat tolerates more but
            // long messages truncate awkwardly on the user's screen.
            $clean['templates'][$e] = [
                'enabled' => empty($tpl['enabled']) ? 0 : 1,
                'text'    => mb_substr(trim((string) ($tpl['text'] ?? '')), 0, 2000),
            ];
        }

        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        // JSON_UNESCAPED_UNICODE preserves emojis + accented chars (‎ etc).
        $stmt->execute([self::KEY, json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        success($clean, 'WhatsApp templates saved.');
    }

    /**
     * Public-ish read used by the storefront's WhatsAppButton component if
     * the admin wants to expose the templates somewhere (we don't expose them
     * by default — keep this admin-only).
     */
    public function adminGetEvents(): never
    {
        method('GET');
        $this->guard();
        success(['events' => self::EVENTS]);
    }
}
