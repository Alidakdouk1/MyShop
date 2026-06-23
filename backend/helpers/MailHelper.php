<?php
declare(strict_types=1);

class MailHelper
{
    public static function send(string $to, string $subject, string $htmlBody): bool
    {
        // Safe no-op until MAIL_ENABLED=true so XAMPP without sendmail doesn't
        // emit warnings that bleed into the JSON response.
        if (env('MAIL_ENABLED', 'false') !== 'true') {
            return false;
        }

        $from     = env('MAIL_FROM_ADDRESS', 'noreply@pickgolb.com');
        $fromName = env('MAIL_FROM_NAME', 'Pick&Go LB');
        $host     = env('MAIL_HOST', '');
        $user     = env('MAIL_USERNAME', '');
        $pass     = env('MAIL_PASSWORD', '');

        // If SMTP credentials are configured, use the native SMTP client so we
        // can actually authenticate against Brevo / Mailgun / Gmail / etc.
        // Otherwise fall back to the local mail() function for XAMPP setups
        // with sendmail wired up.
        if ($host && $user && $pass) {
            return self::smtpSend(
                $host, (int) env('MAIL_PORT', 587),
                $user, $pass,
                $from, $fromName,
                $to, $subject, $htmlBody,
            );
        }

        $headers = implode("\r\n", [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            "From: {$fromName} <{$from}>",
            "Reply-To: {$from}",
            'X-Mailer: PHP/' . phpversion(),
        ]);
        try {
            return @mail($to, $subject, $htmlBody, $headers);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Minimal SMTP client — STARTTLS on 587, implicit TLS on 465, plain on 25.
     * AUTH LOGIN is the most widely supported; covers Brevo, Mailgun, Gmail,
     * ZeptoMail, Mailtrap, basically everyone.
     */
    private static function smtpSend(
        string $host, int $port,
        string $user, string $pass,
        string $from, string $fromName,
        string $to, string $subject, string $htmlBody
    ): bool {
        $scheme = $port === 465 ? 'ssl://' : 'tcp://';
        $socket = @stream_socket_client("{$scheme}{$host}:{$port}", $errno, $errstr, 15);
        if (!$socket) return false;

        $expect = function (int $code) use (&$socket): bool {
            $line = '';
            while (($l = fgets($socket, 1024)) !== false) {
                $line = $l;
                if (isset($l[3]) && $l[3] === ' ') break; // last line of multi-line reply
            }
            return (int) substr($line, 0, 3) === $code;
        };
        $cmd = function (string $c) use (&$socket): void { fwrite($socket, $c . "\r\n"); };
        $domain = $_SERVER['SERVER_NAME'] ?? 'pickgolb.local';

        try {
            if (!$expect(220)) throw new \RuntimeException('No SMTP greeting');
            $cmd("EHLO {$domain}");
            if (!$expect(250)) throw new \RuntimeException('EHLO failed');

            if ($port === 587) {
                $cmd('STARTTLS');
                if (!$expect(220)) throw new \RuntimeException('STARTTLS rejected');
                if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('TLS negotiation failed');
                }
                $cmd("EHLO {$domain}");
                if (!$expect(250)) throw new \RuntimeException('Post-TLS EHLO failed');
            }

            $cmd('AUTH LOGIN');
            if (!$expect(334)) throw new \RuntimeException('AUTH LOGIN refused');
            $cmd(base64_encode($user));
            if (!$expect(334)) throw new \RuntimeException('Username refused');
            $cmd(base64_encode($pass));
            if (!$expect(235)) throw new \RuntimeException('Password refused');

            $cmd("MAIL FROM:<{$from}>");
            if (!$expect(250)) throw new \RuntimeException('MAIL FROM rejected');
            $cmd("RCPT TO:<{$to}>");
            if (!$expect(250) && !$expect(251)) throw new \RuntimeException('RCPT TO rejected');

            $cmd('DATA');
            if (!$expect(354)) throw new \RuntimeException('DATA refused');

            $date    = date('r');
            $msgId   = '<' . bin2hex(random_bytes(8)) . '@' . $domain . '>';
            // Dot-stuffing: lines beginning with "." must be escaped per RFC 5321.
            $body    = preg_replace('/^\./m', '..', $htmlBody);
            $payload = "From: " . self::encodeHeaderName($fromName) . " <{$from}>\r\n"
                     . "To: <{$to}>\r\n"
                     . "Subject: " . self::encodeHeaderText($subject) . "\r\n"
                     . "Message-ID: {$msgId}\r\n"
                     . "Date: {$date}\r\n"
                     . "MIME-Version: 1.0\r\n"
                     . "Content-Type: text/html; charset=UTF-8\r\n"
                     . "Content-Transfer-Encoding: 8bit\r\n"
                     . "\r\n"
                     . $body
                     . "\r\n.";
            $cmd($payload);
            if (!$expect(250)) throw new \RuntimeException('Message rejected');

            $cmd('QUIT');
            fclose($socket);
            return true;
        } catch (\Throwable $e) {
            // Don't leak SMTP errors to the response; just signal failure.
            @fclose($socket);
            error_log('SMTP send failed: ' . $e->getMessage());
            return false;
        }
    }

    /** RFC 2047 encode a name when it contains non-ASCII (e.g. "Pick&Go LB"). */
    private static function encodeHeaderName(string $name): string
    {
        return preg_match('/[^\x20-\x7E]/', $name)
            ? '=?UTF-8?B?' . base64_encode($name) . '?='
            : '"' . str_replace('"', '\\"', $name) . '"';
    }

    private static function encodeHeaderText(string $text): string
    {
        return preg_match('/[^\x20-\x7E]/', $text)
            ? '=?UTF-8?B?' . base64_encode($text) . '?='
            : $text;
    }

    public static function welcome(string $to, string $name, string $token): bool
    {
        $url  = env('FRONTEND_URL', 'http://localhost:5173');
        $link = "{$url}/verify-email?token={$token}";
        $html = self::layout("Welcome to Pick&Go LB, {$name}!", "
            <p>Hi {$name},</p>
            <p>Thanks for registering. Please verify your email address to get started.</p>
            <p style='text-align:center;margin:30px 0'>
                <a href='{$link}' style='background:#ef4444;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold'>Verify Email</a>
            </p>
            <p>Or copy this link: <a href='{$link}'>{$link}</a></p>
        ");
        return self::send($to, 'Verify your Pick&Go LB email', $html);
    }

    public static function passwordReset(string $to, string $name, string $token): bool
    {
        $url  = env('FRONTEND_URL', 'http://localhost:5173');
        $link = "{$url}/reset-password?token={$token}";
        $html = self::layout('Reset your password', "
            <p>Hi {$name},</p>
            <p>We received a request to reset your password. This link expires in 1 hour.</p>
            <p style='text-align:center;margin:30px 0'>
                <a href='{$link}' style='background:#ef4444;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold'>Reset Password</a>
            </p>
            <p>If you didn't request this, ignore this email.</p>
        ");
        return self::send($to, 'Reset your Pick&Go LB password', $html);
    }

    public static function orderConfirmation(string $to, string $name, array $order, array $items): bool
    {
        $url        = env('FRONTEND_URL', 'http://localhost:5173');
        $trackUrl   = "{$url}/account/orders/{$order['id']}";
        $imgPrefix  = env('BACKEND_URL', $url . '/MyShop/backend');
        $rows       = self::orderItemRows($items, $imgPrefix);
        $totalsHtml = self::orderTotalsTable($order);
        $ref        = "MS-{$order['id']}";

        $html = self::layout("Thanks for your order, {$name}!", "
            <p style='font-size:15px;color:#3F3D3B;margin:0 0 6px'>Order <strong style='font-family:monospace'>{$ref}</strong> is in. We'll let you know when it ships.</p>
            <p style='color:#9C9894;font-size:13px;margin:0 0 24px'>You can track it any time using the link below.</p>

            <table width='100%' cellpadding='0' cellspacing='0' style='margin:8px 0 16px'>
                {$rows}
            </table>

            {$totalsHtml}

            <p style='text-align:center;margin:32px 0 8px'>
                <a href='{$trackUrl}' style='background:#0F172A;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;letter-spacing:0.05em'>Track your order</a>
            </p>
            <p style='text-align:center;color:#9C9894;font-size:12px;margin:0'>Or paste into your browser: {$trackUrl}</p>
        ");
        return self::send($to, "Order {$ref} confirmed - Pick&Go LB", $html);
    }

    /**
     * Admin notification when a new order lands. Plain summary, no marketing —
     * meant to wake whoever is running the shop.
     */
    public static function adminNewOrderAlert(string $adminEmail, array $order, array $items, ?string $customerName): bool
    {
        $url        = env('FRONTEND_URL', 'http://localhost:5173');
        $adminUrl   = "{$url}/admin/orders";
        $imgPrefix  = env('BACKEND_URL', $url . '/MyShop/backend');
        $rows       = self::orderItemRows($items, $imgPrefix);
        $totalsHtml = self::orderTotalsTable($order);
        $ref        = "MS-{$order['id']}";
        $method     = strtoupper(str_replace('_', ' ', (string) ($order['payment_method'] ?? 'cod')));
        $custName   = htmlspecialchars($customerName ?: 'Customer', ENT_QUOTES);

        $html = self::layout("New order {$ref}", "
            <p style='font-size:15px;color:#3F3D3B;margin:0 0 14px'>
                <strong>{$custName}</strong> just placed an order via <strong>{$method}</strong>.
            </p>
            <table width='100%' cellpadding='0' cellspacing='0' style='margin:8px 0 16px'>
                {$rows}
            </table>
            {$totalsHtml}
            <p style='text-align:center;margin:24px 0 0'>
                <a href='{$adminUrl}' style='background:#0F172A;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;letter-spacing:0.05em'>Open admin orders</a>
            </p>
        ");
        return self::send($adminEmail, "[Pick&Go LB] New order {$ref} - \${$order['total']}", $html);
    }

    /**
     * Admin alert — a user posted a marketplace ad that needs review.
     */
    public static function marketplaceNewAd(string $adminEmail, array $ad, ?string $sellerName): bool
    {
        $url      = env('FRONTEND_URL', 'http://localhost:5173');
        $adminUrl = "{$url}/admin/marketplace";
        $title    = htmlspecialchars((string) ($ad['title'] ?? 'Untitled'), ENT_QUOTES);
        $seller   = htmlspecialchars($sellerName ?: 'A user', ENT_QUOTES);
        $price    = isset($ad['price']) && $ad['price'] !== null
            ? '$' . number_format((float) $ad['price'], 2)
            : 'Negotiable';
        $cat      = htmlspecialchars((string) ($ad['category'] ?? '—'), ENT_QUOTES);
        $loc      = htmlspecialchars((string) ($ad['location'] ?? '—'), ENT_QUOTES);
        $desc     = htmlspecialchars(mb_substr((string) ($ad['description'] ?? ''), 0, 280), ENT_QUOTES);

        $html = self::layout('New marketplace ad needs review', "
            <p style='font-size:15px;color:#3F3D3B;margin:0 0 14px'>
                <strong>{$seller}</strong> just posted an ad waiting for your approval.
            </p>
            <div style='background:#FAFAFC;border:1px solid #E5E2DA;border-radius:12px;padding:16px 18px;margin:0 0 16px'>
                <p style='margin:0 0 6px;font-size:16px;font-weight:700;color:#0F172A'>{$title}</p>
                <p style='margin:0 0 4px;font-size:15px;font-weight:700;color:#0AAFA3'>{$price}</p>
                <p style='margin:0;font-size:12px;color:#9C9894'>{$cat} &middot; {$loc}</p>
                " . ($desc ? "<p style='margin:10px 0 0;font-size:13px;color:#5C5854;line-height:1.5'>{$desc}</p>" : '') . "
            </div>
            <p style='text-align:center;margin:22px 0 0'>
                <a href='{$adminUrl}' style='background:#0F172A;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;letter-spacing:0.05em'>Review in admin</a>
            </p>
        ");
        return self::send($adminEmail, "[Pick&Go LB] New ad to review: {$title}", $html);
    }

    /**
     * Customer "your order shipped" — fires when admin moves status to shipped.
     * Carrier + tracking link are included whenever the admin has set them.
     */
    public static function orderShipped(
        string $to,
        string $name,
        array  $order,
        ?string $carrierName = null,
        ?string $trackingNumber = null,
        ?string $trackingUrl = null
    ): bool {
        $url      = env('FRONTEND_URL', 'http://localhost:5173');
        $orderUrl = "{$url}/account/orders/{$order['id']}";
        $ref      = "MS-{$order['id']}";

        $trackingBlock = '';
        if ($trackingNumber || $trackingUrl) {
            $trackingUrl = $trackingUrl ?: $orderUrl;
            $trackingBlock = "
                <div style='background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;padding:18px 20px;margin:20px 0'>
                    <p style='margin:0 0 4px;color:#5B21B6;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700'>Shipped" . ($carrierName ? " via {$carrierName}" : '') . "</p>
                    " . ($trackingNumber ? "<p style='margin:0;font-family:monospace;font-size:14px;color:#6D28D9'>Tracking #: <strong>{$trackingNumber}</strong></p>" : '') . "
                    <p style='text-align:center;margin:16px 0 0'>
                        <a href='{$trackingUrl}' style='background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:13px;letter-spacing:0.05em'>Track shipment</a>
                    </p>
                </div>
            ";
        }

        $html = self::layout("Your order is on the way", "
            <p style='font-size:15px;color:#3F3D3B;margin:0 0 6px'>Hi {$name},</p>
            <p style='color:#3F3D3B;margin:0 0 14px'>Great news — order <strong style='font-family:monospace'>{$ref}</strong> just left the warehouse.</p>
            {$trackingBlock}
            <p style='text-align:center;margin:24px 0 0'>
                <a href='{$orderUrl}' style='background:#0F172A;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;letter-spacing:0.05em'>View order details</a>
            </p>
        ");
        return self::send($to, "Order {$ref} has shipped - Pick&Go LB", $html);
    }

    /**
     * Customer "your order arrived" — fires when admin marks order delivered.
     * Bundles a review request CTA since that's the moment customers are most
     * willing to leave feedback.
     */
    public static function orderDelivered(string $to, string $name, array $order): bool
    {
        $url      = env('FRONTEND_URL', 'http://localhost:5173');
        $orderUrl = "{$url}/account/orders/{$order['id']}";
        $ref      = "MS-{$order['id']}";

        $html = self::layout("Order delivered - enjoy!", "
            <p style='font-size:15px;color:#3F3D3B;margin:0 0 6px'>Hi {$name},</p>
            <p style='color:#3F3D3B;margin:0 0 18px'>Order <strong style='font-family:monospace'>{$ref}</strong> shows as delivered. Hope you love it.</p>
            <div style='background:linear-gradient(135deg,rgba(0,209,193,0.10),rgba(163,255,18,0.10));border:1px solid rgba(0,209,193,0.30);border-radius:14px;padding:20px;margin:20px 0;text-align:center'>
                <p style='margin:0 0 6px;color:#0AAFA3;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700'>Quick favor?</p>
                <p style='margin:0 0 14px;color:#0F172A;font-weight:600'>Tell us how it went</p>
                <a href='{$orderUrl}' style='background:#0F172A;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;font-size:13px;letter-spacing:0.05em'>Leave a review</a>
            </div>
            <p style='color:#9C9894;font-size:13px;margin:18px 0 0'>If something went wrong, just reply to this email or message us on WhatsApp. We're here to help.</p>
        ");
        return self::send($to, "Order {$ref} delivered - Pick&Go LB", $html);
    }

    /** Render the line-item table for any order email. */
    private static function orderItemRows(array $items, string $imgPrefix): string
    {
        $rows = '';
        foreach ($items as $it) {
            $img = $it['main_image'] ?? $it['primary_image'] ?? '';
            if ($img && !str_starts_with($img, 'http')) {
                $img = "{$imgPrefix}/{$img}";
            }
            $imgTag = $img
                ? "<img src='{$img}' width='56' height='56' style='border-radius:8px;object-fit:cover;background:#F2F0EB' alt=''>"
                : "<div style='width:56px;height:56px;border-radius:8px;background:#F2F0EB'></div>";
            $name = htmlspecialchars($it['product_name_snapshot'] ?? $it['name'] ?? 'Item', ENT_QUOTES);
            $qty  = (int) ($it['quantity'] ?? 1);
            $total = number_format((float) ($it['total_price'] ?? ($it['price_snapshot'] ?? 0) * $qty), 2);
            $rows .= "<tr>
                <td width='70' style='padding:10px 0;border-bottom:1px solid #F2F0EB;vertical-align:top'>{$imgTag}</td>
                <td style='padding:10px 14px;border-bottom:1px solid #F2F0EB;vertical-align:top;color:#0F172A'>
                    <div style='font-weight:600;line-height:1.35'>{$name}</div>
                    <div style='color:#9C9894;font-size:12px;margin-top:2px'>Qty: {$qty}</div>
                </td>
                <td style='padding:10px 0;border-bottom:1px solid #F2F0EB;vertical-align:top;text-align:right;color:#0F172A;font-weight:700;white-space:nowrap'>\${$total}</td>
            </tr>";
        }
        return $rows;
    }

    /** Render the right-aligned totals block (subtotal / shipping / discount / total). */
    private static function orderTotalsTable(array $order): string
    {
        $sub  = number_format((float) ($order['subtotal']     ?? 0), 2);
        $ship = number_format((float) ($order['shipping_fee'] ?? 0), 2);
        $disc = number_format((float) ($order['discount']     ?? 0), 2);
        $tax  = number_format((float) ($order['tax']          ?? 0), 2);
        $tot  = number_format((float) ($order['total']        ?? 0), 2);
        $discountRow = ((float) ($order['discount'] ?? 0)) > 0
            ? "<tr><td style='padding:4px 0;color:#16A34A;font-size:13px'>Discount</td><td style='padding:4px 0;color:#16A34A;font-size:13px;text-align:right'>-\${$disc}</td></tr>"
            : '';
        $taxRow = ((float) ($order['tax'] ?? 0)) > 0
            ? "<tr><td style='padding:4px 0;color:#5C5854;font-size:13px'>Tax</td><td style='padding:4px 0;color:#5C5854;font-size:13px;text-align:right'>\${$tax}</td></tr>"
            : '';
        return "
            <table width='100%' cellpadding='0' cellspacing='0' style='margin:8px 0'>
                <tr><td style='padding:4px 0;color:#5C5854;font-size:13px'>Subtotal</td><td style='padding:4px 0;color:#5C5854;font-size:13px;text-align:right'>\${$sub}</td></tr>
                <tr><td style='padding:4px 0;color:#5C5854;font-size:13px'>Shipping</td><td style='padding:4px 0;color:#5C5854;font-size:13px;text-align:right'>\${$ship}</td></tr>
                {$discountRow}
                {$taxRow}
                <tr><td colspan='2' style='border-top:1.5px solid #E4E1D9;padding-top:8px'></td></tr>
                <tr><td style='padding:8px 0;color:#0F172A;font-size:16px;font-weight:700'>Total</td><td style='padding:8px 0;color:#0F172A;font-size:16px;font-weight:700;text-align:right'>\${$tot}</td></tr>
            </table>
        ";
    }

    /**
     * "You left these behind" reminder with a discount code.
     *
     * @param array<int,array<string,mixed>> $items Cart items: name, quantity, image
     */
    public static function abandonedCartRecovery(
        string $to,
        string $name,
        array  $items,
        string $couponCode,
        int    $discountPercent,
        int    $expiryDays
    ): bool {
        $url       = env('FRONTEND_URL', 'http://localhost:5173');
        $cartLink  = "{$url}/cart";
        $imgPrefix = env('BACKEND_URL', $url . '/MyShop/backend');

        $rows = '';
        foreach ($items as $it) {
            $img = $it['main_image'] ?? '';
            if ($img && !str_starts_with($img, 'http')) {
                $img = "{$imgPrefix}/{$img}";
            }
            $imgTag = $img
                ? "<img src='{$img}' width='60' height='60' style='border-radius:6px;object-fit:cover;background:#f4f4f4' alt=''>"
                : "<div style='width:60px;height:60px;border-radius:6px;background:#f4f4f4'></div>";
            $qty  = (int) ($it['quantity'] ?? 1);
            $itemName = htmlspecialchars($it['name'] ?? 'Item', ENT_QUOTES);
            $rows .= "<tr>
                <td style='padding:10px 0;border-bottom:1px solid #eee' width='70'>{$imgTag}</td>
                <td style='padding:10px;border-bottom:1px solid #eee;color:#333'>
                    <div style='font-weight:bold'>{$itemName}</div>
                    <div style='color:#999;font-size:12px'>Qty: {$qty}</div>
                </td>
            </tr>";
        }

        $html = self::layout("You left something behind, {$name}!", "
            <p>Hi {$name},</p>
            <p>We noticed you didn't finish checking out — your cart is still waiting for you.</p>
            <table width='100%' cellpadding='0' cellspacing='0' style='margin:20px 0'>
                {$rows}
            </table>
            <div style='background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:20px;margin:24px 0;text-align:center'>
                <p style='margin:0 0 8px;color:#92400E;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:bold'>
                    Here's {$discountPercent}% off to come back
                </p>
                <p style='margin:0;font-size:24px;font-family:monospace;font-weight:bold;color:#0F0F0F;letter-spacing:2px'>
                    {$couponCode}
                </p>
                <p style='margin:8px 0 0;color:#92400E;font-size:11px'>
                    Use at checkout · expires in {$expiryDays} days
                </p>
            </div>
            <p style='text-align:center;margin:30px 0'>
                <a href='{$cartLink}' style='background:#0F0F0F;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block'>Return to Cart</a>
            </p>
            <p style='color:#999;font-size:13px'>If you've already ordered or no longer want these items, you can ignore this email.</p>
        ");
        return self::send($to, "Your cart is waiting — {$discountPercent}% off inside", $html);
    }

    /**
     * Newsletter campaign blast. Body is the admin-authored HTML (lightly
     * sanitized — only safe tags allowed via strip_tags upstream). CTA is
     * optional; render a button when both text + URL are present.
     */
    public static function newsletterCampaign(
        string $to,
        string $subject,
        string $bodyHtml,
        ?string $ctaText,
        ?string $ctaUrl
    ): bool {
        $cta = '';
        if (!empty($ctaText) && !empty($ctaUrl)) {
            $url   = htmlspecialchars($ctaUrl, ENT_QUOTES);
            $text  = htmlspecialchars($ctaText, ENT_QUOTES);
            $cta = "<p style='text-align:center;margin:32px 0'>
                <a href='{$url}' style='background:#0F0F0F;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block'>{$text}</a>
            </p>";
        }
        $html = self::layout($subject, $bodyHtml . $cta);
        return self::send($to, $subject, $html);
    }

    private static function layout(string $title, string $body): string
    {
        $year = date('Y');
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>{$title}</title></head>
        <body style="font-family:'Poppins','Inter','Helvetica Neue',Arial,sans-serif;background:#FAFAF8;margin:0;padding:0;color:#0F172A">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8">
                <tr><td align="center" style="padding:40px 20px">
                    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06)">
                        <tr><td style="background:#0F172A;padding:28px 24px;text-align:center">
                            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.02em">Pick<span style="color:#A3FF12">&amp;Go</span><span style="color:#00D1C1">LB</span></h1>
                        </td></tr>
                        <tr><td style="height:3px;background:linear-gradient(90deg,#00D1C1 0%,#A3FF12 100%);font-size:0;line-height:0">&nbsp;</td></tr>
                        <tr><td style="padding:36px 36px 32px;color:#3F3D3B;line-height:1.6">
                            <h2 style="margin:0 0 18px;color:#0F172A;font-size:22px;font-weight:700;letter-spacing:-0.01em">{$title}</h2>
                            {$body}
                        </td></tr>
                        <tr><td style="background:#FAFAF8;border-top:1px solid #F2F0EB;padding:20px 24px;text-align:center;color:#9C9894;font-size:12px;line-height:1.6">
                            <p style="margin:0 0 4px">Premium commerce in Lebanon. Pick smart. Go further.</p>
                            <p style="margin:0">&copy; {$year} Pick&amp;Go LB &middot; <a href="#" style="color:#9C9894;text-decoration:underline">Unsubscribe</a></p>
                        </td></tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>
        HTML;
    }
}
