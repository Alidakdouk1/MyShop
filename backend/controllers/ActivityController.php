<?php
declare(strict_types=1);

class ActivityController
{
    private const KEY      = 'activity_ticker';
    private const DEFAULTS = [
        'enabled'           => 1,
        'max_age_hours'     => 72,
        'max_items'         => 20,
        'show_city'         => 1,
        'show_duration_sec' => 7,
        'gap_sec'           => 2,
        'first_delay_sec'   => 3,
    ];

    /** Read settings (merged with defaults so missing fields don't break the UI). */
    private function settings(): array
    {
        $row = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::DEFAULTS, $stored);
    }

    private function save(array $s): void
    {
        // Coerce + clamp every field to sane ranges so a bad PUT can't break the ticker.
        $clean = [
            'enabled'           => empty($s['enabled']) ? 0 : 1,
            'max_age_hours'     => max(1,  min(720, (int) ($s['max_age_hours']     ?? 72))),
            'max_items'         => max(1,  min(50,  (int) ($s['max_items']         ?? 20))),
            'show_city'         => empty($s['show_city']) ? 0 : 1,
            'show_duration_sec' => max(2,  min(30,  (int) ($s['show_duration_sec'] ?? 7))),
            'gap_sec'           => max(1,  min(20,  (int) ($s['gap_sec']           ?? 2))),
            'first_delay_sec'   => max(0,  min(30,  (int) ($s['first_delay_sec']   ?? 3))),
        ];
        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([self::KEY, json_encode($clean)]);
    }

    /**
     * Recent purchases for the live storefront ticker. Returns first-name +
     * city only — no email, no totals, no last name — safe to expose publicly.
     */
    public function recent(): never
    {
        method('GET');
        $s = $this->settings();

        // Disabled → return the settings so the frontend hides itself.
        if (empty($s['enabled'])) {
            success(['settings' => $s, 'items' => []]);
        }

        $rows = getDB()->query(
            "SELECT o.id, o.created_at,
                    u.name AS customer_name,
                    a.city AS customer_city,
                    (SELECT product_name_snapshot FROM order_items WHERE order_id = o.id ORDER BY id ASC LIMIT 1) AS product_name,
                    (SELECT p.slug FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1) AS product_slug,
                    (SELECT pi.image_url
                     FROM order_items oi
                     LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = 1
                     WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1) AS product_image
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN addresses a ON a.id = o.address_id
             WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL " . (int) $s['max_age_hours'] . " HOUR)
               AND o.status <> 'cancelled'
             ORDER BY o.created_at DESC
             LIMIT " . (int) $s['max_items']
        )->fetchAll();

        // First name only; city gated by setting.
        foreach ($rows as &$r) {
            $first = trim(strtok((string) $r['customer_name'], ' '));
            $r['customer_name'] = $first !== '' ? $first : 'Someone';
            if (empty($s['show_city'])) $r['customer_city'] = null;
        }
        success(['settings' => $s, 'items' => $rows]);
    }

    public function adminGet(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        success($this->settings());
    }

    public function adminUpdate(): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $this->save(getBody());
        success($this->settings(), 'Activity ticker settings saved.');
    }
}
