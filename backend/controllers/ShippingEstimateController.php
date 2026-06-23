<?php
declare(strict_types=1);

/**
 * Shipping-estimate settings — drives the "Get it by …" badge shown on
 * product pages. The actual date math runs on the client (so it stays in
 * sync with the shopper's local clock); we just publish the rules.
 */
class ShippingEstimateController
{
    private const KEY = 'shipping_estimate';
    private const DEFAULTS = [
        'enabled'             => 1,
        'processing_days_min' => 1,
        'processing_days_max' => 2,
        'transit_days_min'    => 2,
        'transit_days_max'    => 4,
        'cutoff_hour'         => 14,
        'weekend_skip'        => 1,
    ];

    private function settings(): array
    {
        $row    = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::DEFAULTS, $stored);
    }

    /** Public — every ProductDetail page fetches this once on load. */
    public function publicGet(): never
    {
        method('GET');
        success($this->settings());
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

        $in    = getBody();
        $clean = [
            'enabled'             => empty($in['enabled']) ? 0 : 1,
            'processing_days_min' => max(0, (int) ($in['processing_days_min'] ?? 1)),
            'processing_days_max' => max(0, (int) ($in['processing_days_max'] ?? 2)),
            'transit_days_min'    => max(0, (int) ($in['transit_days_min']    ?? 2)),
            'transit_days_max'    => max(0, (int) ($in['transit_days_max']    ?? 4)),
            'cutoff_hour'         => max(0, min(23, (int) ($in['cutoff_hour'] ?? 14))),
            'weekend_skip'        => empty($in['weekend_skip']) ? 0 : 1,
        ];
        // Normalize: max can never be less than min.
        if ($clean['processing_days_max'] < $clean['processing_days_min']) $clean['processing_days_max'] = $clean['processing_days_min'];
        if ($clean['transit_days_max']    < $clean['transit_days_min'])    $clean['transit_days_max']    = $clean['transit_days_min'];

        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([self::KEY, json_encode($clean)]);
        success($clean, 'Shipping estimate updated.');
    }
}
