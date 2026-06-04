<?php
declare(strict_types=1);

class NewsletterController
{
    private NewsletterModel $subs;

    private const POPUP_KEY      = 'newsletter_popup';
    private const POPUP_DEFAULTS = [
        'enabled'        => 1,
        'delay_sec'      => 10,
        'discount_type'  => 'percent',    // 'percent' | 'fixed'
        'discount_value' => 10,
        'min_order'      => 0,
        'expires_days'   => 30,
        'title'          => 'Get 10% off your first order',
        'subtitle'       => 'Join the newsletter for new arrivals & exclusive deals.',
        'image_url'      => '',
        'cta_label'      => 'Send me my code',
    ];

    public function __construct()
    {
        $this->subs = new NewsletterModel();
    }

    // ── Subscriptions ────────────────────────────────────────────────────────

    public function subscribe(): never
    {
        method('POST');
        $data  = getBody();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error('Please enter a valid email address.', 422);
        }
        $source = sanitize($data['source'] ?? 'footer');
        $res = $this->subs->subscribe($email, $source);
        success(
            null,
            $res['already'] ? "You're already subscribed — thank you!" : 'Thanks for subscribing!',
            201
        );
    }

    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        [, $perPage, $offset] = PaginationHelper::params();
        success($this->subs->all($perPage, $offset));
    }

    // ── Welcome popup ────────────────────────────────────────────────────────

    private function popupSettings(): array
    {
        $row = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::POPUP_KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::POPUP_DEFAULTS, $stored);
    }

    private function savePopupSettings(array $s): void
    {
        $type  = in_array($s['discount_type'] ?? '', ['percent', 'fixed'], true) ? $s['discount_type'] : 'percent';
        $value = max(1, min($type === 'percent' ? 95 : 10000, (int) ($s['discount_value'] ?? 10)));
        $clean = [
            'enabled'        => empty($s['enabled']) ? 0 : 1,
            'delay_sec'      => max(0,  min(120, (int) ($s['delay_sec']    ?? 10))),
            'discount_type'  => $type,
            'discount_value' => $value,
            'min_order'      => max(0,  (int) ($s['min_order']   ?? 0)),
            'expires_days'   => max(1,  min(365, (int) ($s['expires_days'] ?? 30))),
            'title'          => trim(sanitize((string) ($s['title']     ?? self::POPUP_DEFAULTS['title']))),
            'subtitle'       => trim(sanitize((string) ($s['subtitle']  ?? self::POPUP_DEFAULTS['subtitle']))),
            'image_url'      => trim((string) ($s['image_url'] ?? '')),
            'cta_label'      => trim(sanitize((string) ($s['cta_label'] ?? self::POPUP_DEFAULTS['cta_label']))),
        ];
        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([self::POPUP_KEY, json_encode($clean)]);
    }

    /** Public popup config — strips out values the visitor doesn't need to know. */
    public function popupConfig(): never
    {
        method('GET');
        $s = $this->popupSettings();
        // Don't leak min_order / expires_days / discount_value before submit — the
        // visitor sees the marketing copy and gets the actual code only after entering an email.
        success([
            'enabled'   => $s['enabled'],
            'delay_sec' => $s['delay_sec'],
            'title'     => $s['title'],
            'subtitle'  => $s['subtitle'],
            'image_url' => $s['image_url'],
            'cta_label' => $s['cta_label'],
        ]);
    }

    /**
     * Subscribe + issue a unique single-use coupon for this email. Returns the
     * code so the popup can show it immediately.
     */
    public function welcomeDiscount(): never
    {
        method('POST');
        RateLimiter::check('welcome_discount', 5, 60);
        $data  = getBody();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) error('Please enter a valid email address.', 422);

        $s = $this->popupSettings();
        if (!$s['enabled']) error('Welcome offer is not available.', 404);

        $this->subs->subscribe($email, 'welcome_popup');

        // Generate a unique single-use code: WELCOME-XXXXXX
        $coupons = new CouponModel();
        $code    = '';
        for ($i = 0; $i < 5; $i++) {
            $candidate = 'WELCOME-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
            if (!$coupons->findByCode($candidate)) { $code = $candidate; break; }
        }
        if (!$code) error('Could not issue a code right now. Please try again.', 500);

        $coupons->create([
            'code'        => $code,
            'type'        => $s['discount_type'],
            'value'       => (float) $s['discount_value'],
            'min_order'   => (float) $s['min_order'],
            'usage_limit' => 1,
            'is_active'   => 1,
            'expires_at'  => date('Y-m-d H:i:s', time() + (int) $s['expires_days'] * 86400),
        ]);

        success([
            'code'           => $code,
            'discount_type'  => $s['discount_type'],
            'discount_value' => (float) $s['discount_value'],
            'min_order'      => (float) $s['min_order'],
            'expires_days'   => (int) $s['expires_days'],
        ], 'Your discount code is ready!');
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public function adminGetPopup(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        success($this->popupSettings());
    }

    public function adminUpdatePopup(): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $this->savePopupSettings(getBody());
        success($this->popupSettings(), 'Welcome popup saved.');
    }
}
