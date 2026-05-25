<?php
declare(strict_types=1);

class MailHelper
{
    public static function send(string $to, string $subject, string $htmlBody): bool
    {
        // Only attempt delivery when mail is explicitly enabled. On dev setups
        // without an SMTP server, a raw mail() call emits a PHP warning that gets
        // prepended to the JSON response and breaks the client — so this stays a
        // safe no-op until MAIL_ENABLED=true and SMTP is configured.
        if (env('MAIL_ENABLED', 'false') !== 'true') {
            return false;
        }
        $from     = env('MAIL_FROM_ADDRESS', 'noreply@myshop.com');
        $fromName = env('MAIL_FROM_NAME', 'MyShop');
        $headers  = implode("\r\n", [
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "From: {$fromName} <{$from}>",
            "Reply-To: {$from}",
            "X-Mailer: PHP/" . phpversion(),
        ]);
        try {
            return @mail($to, $subject, $htmlBody, $headers);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public static function welcome(string $to, string $name, string $token): bool
    {
        $url  = env('FRONTEND_URL', 'http://localhost:5173');
        $link = "{$url}/verify-email?token={$token}";
        $html = self::layout("Welcome to MyShop, {$name}!", "
            <p>Hi {$name},</p>
            <p>Thanks for registering. Please verify your email address to get started.</p>
            <p style='text-align:center;margin:30px 0'>
                <a href='{$link}' style='background:#ef4444;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold'>Verify Email</a>
            </p>
            <p>Or copy this link: <a href='{$link}'>{$link}</a></p>
        ");
        return self::send($to, 'Verify your MyShop email', $html);
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
        return self::send($to, 'Reset your MyShop password', $html);
    }

    public static function orderConfirmation(string $to, string $name, array $order, array $items): bool
    {
        $rows = '';
        foreach ($items as $item) {
            $rows .= "<tr>
                <td style='padding:8px;border-bottom:1px solid #eee'>{$item['product_name_snapshot']}</td>
                <td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>{$item['quantity']}</td>
                <td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>\${$item['total_price']}</td>
            </tr>";
        }
        $html = self::layout("Order #{$order['id']} Confirmed!", "
            <p>Hi {$name}, your order has been confirmed.</p>
            <table width='100%' cellpadding='0' cellspacing='0' style='margin:20px 0'>
                <tr style='background:#f9f9f9'>
                    <th style='padding:8px;text-align:left'>Item</th>
                    <th style='padding:8px;text-align:center'>Qty</th>
                    <th style='padding:8px;text-align:right'>Total</th>
                </tr>
                {$rows}
            </table>
            <p><strong>Subtotal:</strong> \${$order['subtotal']}</p>
            <p><strong>Shipping:</strong> \${$order['shipping_fee']}</p>
            <p><strong>Discount:</strong> -\${$order['discount']}</p>
            <p style='font-size:18px'><strong>Total: \${$order['total']}</strong></p>
        ");
        return self::send($to, "Order #{$order['id']} Confirmed - MyShop", $html);
    }

    private static function layout(string $title, string $body): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>{$title}</title></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:40px 20px">
                    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
                        <tr><td style="background:#ef4444;padding:24px;text-align:center">
                            <h1 style="color:#fff;margin:0;font-size:24px">MyShop</h1>
                        </td></tr>
                        <tr><td style="padding:32px;color:#333;line-height:1.6">
                            <h2 style="margin-top:0">{$title}</h2>
                            {$body}
                        </td></tr>
                        <tr><td style="background:#f9f9f9;padding:16px;text-align:center;color:#999;font-size:12px">
                            &copy; 2025 MyShop. All rights reserved.
                        </td></tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>
        HTML;
    }
}
