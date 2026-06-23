<?php
declare(strict_types=1);

class PaymentController
{
    private const KEY      = 'bank_transfer';
    private const DEFAULTS = [
        'enabled'        => 0,
        'bank_name'      => '',
        'account_name'   => '',
        'account_number' => '',
        'iban'           => '',
        'swift'          => '',
        'currency_note'  => 'USD',
        'instructions'   => 'Please include the order reference in the transfer description, then send a screenshot to our WhatsApp to speed up confirmation.',
    ];

    private function settings(): array
    {
        $row    = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::DEFAULTS, $stored);
    }

    private function save(array $s): void
    {
        $clean = [
            'enabled'        => empty($s['enabled']) ? 0 : 1,
            'bank_name'      => trim(sanitize((string) ($s['bank_name']      ?? ''))),
            'account_name'   => trim(sanitize((string) ($s['account_name']   ?? ''))),
            'account_number' => trim(sanitize((string) ($s['account_number'] ?? ''))),
            'iban'           => trim(sanitize((string) ($s['iban']           ?? ''))),
            'swift'          => trim(sanitize((string) ($s['swift']          ?? ''))),
            'currency_note'  => trim(sanitize((string) ($s['currency_note']  ?? 'USD'))),
            'instructions'   => trim(sanitize((string) ($s['instructions']   ?? ''))),
        ];
        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([self::KEY, json_encode($clean)]);
    }

    /** Public — checkout shows these details inline when shopper picks bank transfer. */
    public function bankTransferPublic(): never
    {
        method('GET');
        $s = $this->settings();
        success([
            'enabled'        => (int) $s['enabled'],
            'bank_name'      => $s['bank_name'],
            'account_name'   => $s['account_name'],
            'account_number' => $s['account_number'],
            'iban'           => $s['iban'],
            'swift'          => $s['swift'],
            'currency_note'  => $s['currency_note'],
            'instructions'   => $s['instructions'],
        ]);
    }

    public function adminGetBankTransfer(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        success($this->settings());
    }

    public function adminUpdateBankTransfer(): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $this->save(getBody());
        success($this->settings(), 'Bank transfer settings saved.');
    }

    // ── Whish Money ─────────────────────────────────────────────────────────

    private const WHISH_KEY      = 'whish_payment';
    private const WHISH_DEFAULTS = [
        'enabled'        => 0,
        'whish_phone'    => '',
        'whish_name'     => '',
        'currency_note'  => 'USD',
        'instructions'   => "Open the Whish Money app → Send Money → enter the phone number above → enter the amount → in the note field write your order reference (e.g. MS-7), then tap Send. Forward the confirmation screenshot to our WhatsApp so we can match it to your order faster.",
        // Optional deep link the frontend opens after Place Order to launch the
        // Whish app directly. Defaults to the whish:// custom scheme; admin can
        // paste a "Whish For Business" link if Whish provides one.
        'whish_deeplink' => 'whish://',
    ];

    private function whishSettings(): array
    {
        $row    = getDB()->query("SELECT setting_value FROM app_settings WHERE setting_key = " . getDB()->quote(self::WHISH_KEY))->fetch();
        $stored = $row ? json_decode($row['setting_value'], true) : [];
        if (!is_array($stored)) $stored = [];
        return array_merge(self::WHISH_DEFAULTS, $stored);
    }

    private function saveWhish(array $s): void
    {
        $clean = [
            'enabled'        => empty($s['enabled']) ? 0 : 1,
            'whish_phone'    => trim((string) ($s['whish_phone']    ?? '')),
            'whish_name'     => trim(sanitize((string) ($s['whish_name']     ?? ''))),
            'currency_note'  => trim(sanitize((string) ($s['currency_note']  ?? 'USD'))),
            'instructions'   => trim(sanitize((string) ($s['instructions']   ?? ''))),
            'whish_deeplink' => trim((string) ($s['whish_deeplink'] ?? 'whish://')),
        ];
        $stmt = getDB()->prepare(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([self::WHISH_KEY, json_encode($clean)]);
    }

    public function whishPublic(): never
    {
        method('GET');
        success($this->whishSettings());
    }

    public function adminGetWhish(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        success($this->whishSettings());
    }

    public function adminUpdateWhish(): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $this->saveWhish(getBody());
        success($this->whishSettings(), 'Whish settings saved.');
    }

    /** Admin one-click: mark a pending bank-transfer order as paid. */
    public function adminMarkPaid(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $orders = new OrderModel();
        $order  = $orders->findById($id);
        if (!$order) error('Order not found.', 404);
        $orders->updatePayment($id, 'paid', $order['stripe_payment_intent_id'] ?? '');
        success(null, 'Marked as paid.');
    }
}
