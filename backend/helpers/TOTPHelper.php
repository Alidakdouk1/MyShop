<?php
declare(strict_types=1);

/**
 * RFC 6238 TOTP — compatible with Google Authenticator, Authy, 1Password,
 * Microsoft Authenticator, Bitwarden, every other TOTP app.
 *
 * No external library, no service dependency. Uses HMAC-SHA1 over the current
 * 30-second window + the user's base32-encoded shared secret.
 */
class TOTPHelper
{
    private const PERIOD   = 30;   // seconds per code window
    private const DIGITS   = 6;
    private const ALGO     = 'sha1';
    private const SECRET_BYTES = 20; // 160-bit secret = 32-char base32

    /** Cryptographically secure 32-character base32 secret. */
    public static function generateSecret(): string
    {
        return self::base32Encode(random_bytes(self::SECRET_BYTES));
    }

    /**
     * Build the otpauth:// URI an authenticator app reads from a QR scan.
     * The frontend renders this URI as a QR image.
     */
    public static function provisioningUri(string $secret, string $accountName, string $issuer): string
    {
        $label  = rawurlencode("{$issuer}:{$accountName}");
        $params = http_build_query([
            'secret'    => $secret,
            'issuer'    => $issuer,
            'algorithm' => 'SHA1',
            'digits'    => self::DIGITS,
            'period'    => self::PERIOD,
        ]);
        return "otpauth://totp/{$label}?{$params}";
    }

    /**
     * Verify a user-entered code. Accepts a small (+/-1) window so clock
     * drift between server and phone doesn't lock anyone out.
     */
    public static function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', $code);
        if (!preg_match('/^\d{6}$/', $code)) return false;

        $now = (int) floor(time() / self::PERIOD);
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals(self::generateAt($secret, $now + $i), $code)) {
                return true;
            }
        }
        return false;
    }

    /** Generate the code for a specific counter — used by verify(). */
    private static function generateAt(string $secret, int $counter): string
    {
        $bin  = self::base32Decode($secret);
        $msg  = pack('N*', 0) . pack('N*', $counter); // 64-bit big-endian counter
        $hash = hash_hmac(self::ALGO, $msg, $bin, true);

        $offset = ord($hash[strlen($hash) - 1]) & 0x0F;
        $bytes  = substr($hash, $offset, 4);
        $val    = unpack('N', $bytes)[1] & 0x7FFFFFFF;
        $code   = $val % (10 ** self::DIGITS);

        return str_pad((string) $code, self::DIGITS, '0', STR_PAD_LEFT);
    }

    /** Backup recovery codes — 8 single-use codes shown when 2FA is enabled. */
    public static function generateBackupCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $raw = strtoupper(bin2hex(random_bytes(5))); // 10 hex chars
            $codes[] = substr($raw, 0, 5) . '-' . substr($raw, 5, 5);
        }
        return $codes;
    }

    /** Constant-time check across a list of remaining backup codes. */
    public static function verifyBackup(array $codes, string $input): ?int
    {
        $normalized = strtoupper(preg_replace('/\s+/', '', $input));
        foreach ($codes as $i => $stored) {
            if (hash_equals(strtoupper($stored), $normalized)) return $i;
        }
        return null;
    }

    // ── Base32 (RFC 4648) — no PHP built-in, so a small inline impl. ──

    private const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function base32Encode(string $bin): string
    {
        $out = '';
        $buf = 0;
        $bufBits = 0;
        for ($i = 0; $i < strlen($bin); $i++) {
            $buf = ($buf << 8) | ord($bin[$i]);
            $bufBits += 8;
            while ($bufBits >= 5) {
                $bufBits -= 5;
                $out .= self::B32_ALPHABET[($buf >> $bufBits) & 0x1F];
            }
        }
        if ($bufBits > 0) {
            $out .= self::B32_ALPHABET[($buf << (5 - $bufBits)) & 0x1F];
        }
        return $out;
    }

    public static function base32Decode(string $b32): string
    {
        $b32 = strtoupper(preg_replace('/=+$/', '', $b32));
        $out = '';
        $buf = 0;
        $bufBits = 0;
        for ($i = 0; $i < strlen($b32); $i++) {
            $idx = strpos(self::B32_ALPHABET, $b32[$i]);
            if ($idx === false) continue;
            $buf = ($buf << 5) | $idx;
            $bufBits += 5;
            if ($bufBits >= 8) {
                $bufBits -= 8;
                $out .= chr(($buf >> $bufBits) & 0xFF);
            }
        }
        return $out;
    }
}
