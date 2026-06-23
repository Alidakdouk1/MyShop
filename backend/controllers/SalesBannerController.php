<?php
declare(strict_types=1);

/**
 * Site-wide sales banner shown above the navbar. One config row in
 * app_settings — admin tweaks the message, colours, and optional countdown
 * target; the storefront polls /api/sales-banner once on load.
 *
 * `dismissible: 1` lets visitors close the banner; we persist that choice on
 * the client only (sessionStorage), so toggling it back to non-dismissible
 * instantly re-shows it for everyone.
 */
class SalesBannerController
{
    private const KEY = 'sales_banner';
    private const DEFAULTS = [
        'enabled'     => 0,
        'title'       => 'FLASH SALE',
        'message'     => '20% off everything — limited time only!',
        'cta_text'    => 'Shop now',
        'cta_url'     => '/shop?on_sale=1',
        'bg_color'    => '#C0392B',
        'text_color'  => '#FFFFFF',
        'ends_at'     => null,         // ISO datetime; null = no countdown
        'dismissible' => 1,
    ];

    private function settings(): array
    {
        $row    = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::DEFAULTS, $stored);
    }

    /** Public — read by SalesBanner.jsx on every page load. */
    public function publicGet(): never
    {
        method('GET');
        $s = $this->settings();
        // Auto-hide expired banners server-side so the client doesn't render a
        // banner that's already over.
        if (!empty($s['ends_at']) && strtotime((string) $s['ends_at']) < time()) {
            $s['enabled'] = 0;
        }
        success($s);
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
            'enabled'     => empty($in['enabled']) ? 0 : 1,
            'title'       => mb_substr(trim(sanitize((string) ($in['title']    ?? ''))), 0, 80),
            'message'     => mb_substr(trim(sanitize((string) ($in['message']  ?? ''))), 0, 200),
            'cta_text'    => mb_substr(trim(sanitize((string) ($in['cta_text'] ?? ''))), 0, 40),
            'cta_url'     => mb_substr(trim((string) ($in['cta_url']  ?? '')), 0, 500),
            'bg_color'    => self::colorOr((string) ($in['bg_color']   ?? ''), '#C0392B'),
            'text_color'  => self::colorOr((string) ($in['text_color'] ?? ''), '#FFFFFF'),
            'ends_at'     => !empty($in['ends_at']) ? (string) $in['ends_at'] : null,
            'dismissible' => empty($in['dismissible']) ? 0 : 1,
        ];

        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([self::KEY, json_encode($clean)]);
        success($clean, 'Sales banner saved.');
    }

    private static function colorOr(string $c, string $fallback): string
    {
        return preg_match('/^#[0-9a-fA-F]{6}$/', $c) ? $c : $fallback;
    }
}
