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

    // ── Campaigns (one-off email blasts) ─────────────────────────────────────

    private function guardAdmin(): array
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        return $auth;
    }

    /** Whitelisted HTML so admins can use light formatting without XSS risk. */
    private function sanitizeBody(string $raw): string
    {
        $allowed = '<p><br><strong><b><em><i><u><a><ul><ol><li><h1><h2><h3><img><blockquote>';
        $clean   = strip_tags($raw, $allowed);
        // Strip inline event handlers and javascript: URLs.
        $clean = preg_replace('/on\w+\s*=\s*"[^"]*"/i', '', $clean);
        $clean = preg_replace('/on\w+\s*=\s*\'[^\']*\'/i', '', $clean);
        $clean = preg_replace('/javascript\s*:/i', '', $clean);
        return $clean;
    }

    public function adminCampaignsIndex(): never
    {
        method('GET');
        $this->guardAdmin();
        $rows = getDB()->query(
            "SELECT id, subject, status, recipient_count, sent_count, failed_count,
                    sent_at, created_at
             FROM newsletter_campaigns ORDER BY id DESC LIMIT 100"
        )->fetchAll();
        $subCount = (int) getDB()->query("SELECT COUNT(*) FROM newsletter_subscribers WHERE is_active = 1")->fetchColumn();
        success(['campaigns' => $rows, 'subscriber_count' => $subCount]);
    }

    public function adminCampaignShow(int $id): never
    {
        method('GET');
        $this->guardAdmin();
        $row = getDB()->prepare("SELECT * FROM newsletter_campaigns WHERE id = ?");
        $row->execute([$id]);
        $r = $row->fetch();
        if (!$r) error('Campaign not found.', 404);
        success($r);
    }

    public function adminCampaignStore(): never
    {
        method('POST');
        $this->guardAdmin();
        $d = getBody();
        $subject = trim(sanitize((string) ($d['subject'] ?? '')));
        $bodyRaw = (string) ($d['body'] ?? '');
        if ($subject === '')          error('Subject is required.', 422);
        if (trim($bodyRaw) === '')    error('Body is required.', 422);

        $stmt = getDB()->prepare(
            "INSERT INTO newsletter_campaigns (subject, body, cta_text, cta_url, status)
             VALUES (?, ?, ?, ?, 'draft')"
        );
        $stmt->execute([
            mb_substr($subject, 0, 200),
            $this->sanitizeBody($bodyRaw),
            !empty($d['cta_text']) ? mb_substr(sanitize((string) $d['cta_text']), 0, 80) : null,
            !empty($d['cta_url'])  ? mb_substr(trim((string) $d['cta_url']), 0, 500)     : null,
        ]);
        $id = (int) getDB()->lastInsertId();
        $row = getDB()->prepare("SELECT * FROM newsletter_campaigns WHERE id = ?");
        $row->execute([$id]);
        success($row->fetch(), 'Draft saved.', 201);
    }

    public function adminCampaignUpdate(int $id): never
    {
        method('PUT');
        $this->guardAdmin();
        $check = getDB()->prepare("SELECT status FROM newsletter_campaigns WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if (!$row)                       error('Campaign not found.', 404);
        if ($row['status'] !== 'draft')  error('Only drafts can be edited.', 409);

        $d = getBody();
        $sets = []; $params = [];
        if (array_key_exists('subject', $d))  { $sets[] = 'subject = ?';  $params[] = mb_substr(sanitize((string) $d['subject']), 0, 200); }
        if (array_key_exists('body', $d))     { $sets[] = 'body = ?';     $params[] = $this->sanitizeBody((string) $d['body']); }
        if (array_key_exists('cta_text', $d)) { $sets[] = 'cta_text = ?'; $params[] = !empty($d['cta_text']) ? mb_substr(sanitize((string) $d['cta_text']), 0, 80) : null; }
        if (array_key_exists('cta_url', $d))  { $sets[] = 'cta_url = ?';  $params[] = !empty($d['cta_url'])  ? mb_substr(trim((string) $d['cta_url']), 0, 500)     : null; }
        if (!$sets) error('Nothing to update.', 422);

        $params[] = $id;
        getDB()->prepare("UPDATE newsletter_campaigns SET " . implode(', ', $sets) . " WHERE id = ?")
            ->execute($params);
        $row = getDB()->prepare("SELECT * FROM newsletter_campaigns WHERE id = ?");
        $row->execute([$id]);
        success($row->fetch(), 'Campaign updated.');
    }

    public function adminCampaignDestroy(int $id): never
    {
        method('DELETE');
        $this->guardAdmin();
        $check = getDB()->prepare("SELECT status FROM newsletter_campaigns WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if (!$row)                       error('Campaign not found.', 404);
        if ($row['status'] !== 'draft')  error('Only drafts can be deleted.', 409);
        getDB()->prepare("DELETE FROM newsletter_campaigns WHERE id = ?")->execute([$id]);
        success(null, 'Campaign deleted.');
    }

    /**
     * Sends the campaign synchronously to every active subscriber.
     * Each send is wrapped so a single failure doesn't abort the batch.
     * Status flow: draft → sending → sent (or failed if zero went out).
     */
    public function adminCampaignSend(int $id): never
    {
        method('POST');
        $this->guardAdmin();
        $row = getDB()->prepare("SELECT * FROM newsletter_campaigns WHERE id = ?");
        $row->execute([$id]);
        $c = $row->fetch();
        if (!$c)                       error('Campaign not found.', 404);
        if ($c['status'] !== 'draft')  error('Campaign already sent or in progress.', 409);

        $recipients = getDB()->query("SELECT email FROM newsletter_subscribers WHERE is_active = 1")->fetchAll();
        $total = count($recipients);
        if ($total === 0) error('No active subscribers to send to.', 422);

        // Flip to "sending" so a parallel hit can't double-send.
        getDB()->prepare("UPDATE newsletter_campaigns SET status = 'sending', recipient_count = ? WHERE id = ?")
            ->execute([$total, $id]);

        // Bump PHP's wall-clock budget for large lists. mail()/SMTP can be slow;
        // give ourselves up to 5 minutes here. Hostinger typically allows this.
        @set_time_limit(300);

        $sent = 0; $failed = 0;
        foreach ($recipients as $r) {
            $ok = MailHelper::newsletterCampaign(
                (string) $r['email'],
                (string) $c['subject'],
                (string) $c['body'],
                $c['cta_text'] ?: null,
                $c['cta_url']  ?: null,
            );
            $ok ? $sent++ : $failed++;
        }

        // If mail is disabled in dev, MailHelper::send() returns false silently.
        // We still mark the campaign 'sent' so the admin can see the recipient
        // count was processed; the UI will note the mail-disabled state.
        $mailEnabled = env('MAIL_ENABLED', 'false') === 'true';
        $finalStatus = ($mailEnabled && $sent === 0) ? 'failed' : 'sent';

        getDB()->prepare(
            "UPDATE newsletter_campaigns
             SET status = ?, sent_count = ?, failed_count = ?, sent_at = NOW()
             WHERE id = ?"
        )->execute([$finalStatus, $sent, $failed, $id]);

        success([
            'sent'         => $sent,
            'failed'       => $failed,
            'total'        => $total,
            'mail_enabled' => $mailEnabled,
            'status'       => $finalStatus,
        ], $mailEnabled
            ? "Sent {$sent} of {$total} email" . ($total === 1 ? '' : 's') . "."
            : 'Recorded — but MAIL_ENABLED is false, so no emails were actually sent.'
        );
    }
}
