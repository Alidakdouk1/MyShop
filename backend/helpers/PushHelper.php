<?php
declare(strict_types=1);

/**
 * Native Web Push sender. No composer dependency.
 *
 * Implements:
 *   - VAPID JWT signing (RFC 8292, ES256 over P-256)
 *   - aes128gcm payload encryption (RFC 8188 + RFC 8291)
 *   - HKDF (RFC 5869)
 *
 * Send a notification:
 *   PushHelper::send($subscription, ['title' => 'Hi', 'body' => '...', 'url' => '/orders/42']);
 *
 * $subscription is one row from push_subscriptions: endpoint, p256dh, auth_token.
 */
class PushHelper
{
    private static ?string $opensslConf = null;

    private static function opensslConf(): array
    {
        if (self::$opensslConf === null) {
            foreach ([
                'C:/xampp/php/extras/openssl/openssl.cnf',
                'C:/xampp/php/extras/ssl/openssl.cnf',
                'C:/xampp/apache/conf/openssl.cnf',
                '/etc/ssl/openssl.cnf',
            ] as $c) {
                if (is_file($c)) { self::$opensslConf = $c; break; }
            }
            if (self::$opensslConf === null) self::$opensslConf = '';
        }
        return self::$opensslConf ? ['config' => self::$opensslConf] : [];
    }

    /**
     * Send one push to one subscription. Returns true on 2xx, false on 4xx/5xx.
     * On 404/410 the caller should DELETE the subscription row — the browser
     * has unsubscribed (RFC 8030).
     */
    public static function send(array $subscription, array $payload): bool
    {
        $publicKey  = env('VAPID_PUBLIC_KEY',  '');
        $privateKey = env('VAPID_PRIVATE_KEY', '');
        $subject    = env('VAPID_SUBJECT',     'mailto:admin@example.com');
        if (!$publicKey || !$privateKey) return false;

        $endpoint = (string) ($subscription['endpoint']   ?? '');
        $p256dh   = (string) ($subscription['p256dh']     ?? '');
        $auth     = (string) ($subscription['auth_token'] ?? $subscription['auth'] ?? '');
        if (!$endpoint || !$p256dh || !$auth) return false;

        // Build the encrypted body. Browsers expect a max 4 KiB payload.
        $body = self::encryptPayload(json_encode($payload), $p256dh, $auth);
        if ($body === null) return false;

        // Build the VAPID Authorization header.
        $jwt = self::vapidJwt($endpoint, $subject, $privateKey, $publicKey);
        if (!$jwt) return false;

        $headers = [
            'Authorization: vapid t=' . $jwt . ', k=' . $publicKey,
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: ' . (int) env('PUSH_TTL', 86400),
            'Urgency: normal',
        ];

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($code === 0) {
            error_log("Push transport failed: {$err}");
            return false;
        }
        if ($code === 404 || $code === 410) {
            // Browser unsubscribed — caller should delete the row.
            self::deleteSubscription($endpoint);
            return false;
        }
        return $code >= 200 && $code < 300;
    }

    /** Convenience: hand any user_id + payload, fan out to every subscription on file. */
    public static function sendToUser(int $userId, array $payload): int
    {
        $rows = getDB()->prepare("SELECT * FROM push_subscriptions WHERE user_id = ?");
        $rows->execute([$userId]);
        $sent = 0;
        foreach ($rows->fetchAll() as $s) {
            if (self::send($s, $payload)) $sent++;
        }
        return $sent;
    }

    /** ── VAPID JWT (ES256 over P-256) ────────────────────────────────── */

    private static function vapidJwt(string $endpoint, string $subject, string $privateKeyB64, string $publicKeyB64): ?string
    {
        $aud = self::origin($endpoint);
        if (!$aud) return null;
        $header  = self::b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $payload = self::b64url(json_encode([
            'aud' => $aud,
            'exp' => time() + 12 * 3600,   // RFC 8292 allows up to 24h; pick a safe value
            'sub' => $subject,
        ]));
        $signingInput = "{$header}.{$payload}";

        $pem = self::ecPrivateKeyToPem(self::b64urlDecode($privateKeyB64), self::b64urlDecode($publicKeyB64));
        $pk  = openssl_pkey_get_private($pem);
        if (!$pk) return null;

        $derSig = '';
        if (!openssl_sign($signingInput, $derSig, $pk, OPENSSL_ALGO_SHA256)) return null;

        // openssl returns DER-encoded (r, s); JOSE wants raw r||s, each 32 bytes.
        $rawSig = self::derEcSigToRaw($derSig);
        if ($rawSig === null) return null;

        return $signingInput . '.' . self::b64url($rawSig);
    }

    private static function origin(string $url): ?string
    {
        $p = parse_url($url);
        if (!$p || empty($p['scheme']) || empty($p['host'])) return null;
        $port = isset($p['port']) ? ":{$p['port']}" : '';
        return "{$p['scheme']}://{$p['host']}{$port}";
    }

    /** Wrap a 32-byte raw EC private key + 65-byte uncompressed public into a PEM. */
    private static function ecPrivateKeyToPem(string $rawPriv, string $rawPub): string
    {
        // EC PRIVATE KEY ASN.1 (SEC1):
        //   SEQUENCE {
        //     INTEGER 1
        //     OCTET STRING (privkey)
        //     [0] OBJECT IDENTIFIER 1.2.840.10045.3.1.7  (prime256v1)
        //     [1] BIT STRING (uncompressed pubkey)
        //   }
        $oid     = "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"; // prime256v1
        $version = "\x02\x01\x01";
        $privOct = "\x04" . chr(strlen($rawPriv)) . $rawPriv;
        $oidWrap = "\xa0" . chr(strlen($oid)) . $oid;
        $bitStr  = "\x00" . $rawPub; // BIT STRING with 0 unused bits
        $pubWrap = "\xa1" . self::derLen(strlen($bitStr) + 2) . "\x03" . self::derLen(strlen($bitStr)) . $bitStr;
        $seqBody = $version . $privOct . $oidWrap . $pubWrap;
        $der     = "\x30" . self::derLen(strlen($seqBody)) . $seqBody;
        return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----\n";
    }

    private static function derLen(int $n): string
    {
        if ($n < 0x80) return chr($n);
        $bytes = '';
        $tmp = $n;
        while ($tmp > 0) { $bytes = chr($tmp & 0xFF) . $bytes; $tmp >>= 8; }
        return chr(0x80 | strlen($bytes)) . $bytes;
    }

    /** DER (SEQUENCE { INTEGER r, INTEGER s }) -> raw r||s padded to 32 bytes each. */
    private static function derEcSigToRaw(string $der): ?string
    {
        $i = 0;
        if (($der[$i++] ?? '') !== "\x30") return null;
        // Skip length
        $b = ord($der[$i++]);
        if ($b & 0x80) { $i += ($b & 0x7F); }
        $readInt = function () use (&$der, &$i): ?string {
            if (($der[$i++] ?? '') !== "\x02") return null;
            $len = ord($der[$i++]);
            $val = substr($der, $i, $len); $i += $len;
            // Strip the leading 0x00 sign byte if present (positive int padding)
            if (strlen($val) > 32 && $val[0] === "\x00") $val = substr($val, 1);
            return str_pad($val, 32, "\x00", STR_PAD_LEFT);
        };
        $r = $readInt(); $s = $readInt();
        return ($r !== null && $s !== null) ? ($r . $s) : null;
    }

    /** ── aes128gcm encryption (RFC 8188 + RFC 8291) ──────────────────── */

    private static function encryptPayload(string $plaintext, string $clientP256dhB64, string $clientAuthB64): ?string
    {
        $clientPub  = self::b64urlDecode($clientP256dhB64);   // 65 bytes uncompressed
        $clientAuth = self::b64urlDecode($clientAuthB64);     // 16 bytes
        if (strlen($clientPub) !== 65 || strlen($clientAuth) !== 16) return null;

        // 1) Generate ephemeral server keypair (P-256).
        $serverKey = openssl_pkey_new(array_merge(
            ['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC],
            self::opensslConf()
        ));
        if (!$serverKey) return null;
        $details = openssl_pkey_get_details($serverKey);
        $sx = str_pad($details['ec']['x'] ?? '', 32, "\0", STR_PAD_LEFT);
        $sy = str_pad($details['ec']['y'] ?? '', 32, "\0", STR_PAD_LEFT);
        $serverPub = "\x04" . $sx . $sy;

        // 2) ECDH shared secret. PHP 7.3+ exposes openssl_pkey_derive.
        $clientPubPem = self::ecPublicKeyToPem($clientPub);
        $clientPubKey = openssl_pkey_get_public($clientPubPem);
        if (!$clientPubKey) return null;
        $ecdhSecret = openssl_pkey_derive($clientPubKey, $serverKey, 32);
        if (!$ecdhSecret) return null;

        // 3) Random 16-byte salt.
        $salt = random_bytes(16);

        // 4) Per RFC 8291: PRK_key = HKDF(auth_secret, ecdh_secret, key_info, 32)
        //    key_info = "WebPush: info" || 0x00 || client_pub || server_pub
        $keyInfo = "WebPush: info\x00" . $clientPub . $serverPub;
        $prkKey  = self::hkdf($clientAuth, $ecdhSecret, $keyInfo, 32);

        // 5) CEK = HKDF(salt, PRK_key, "Content-Encoding: aes128gcm\x00", 16)
        //    NONCE = HKDF(salt, PRK_key, "Content-Encoding: nonce\x00", 12)
        $cek   = self::hkdf($salt, $prkKey, "Content-Encoding: aes128gcm\x00", 16);
        $nonce = self::hkdf($salt, $prkKey, "Content-Encoding: nonce\x00",    12);

        // 6) AES-128-GCM. The plaintext is padded with 0x02 0x00... so the
        //    receiver can find the end of the real payload.
        $padded = $plaintext . "\x02";
        $tag    = '';
        $ct     = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($ct === false) return null;

        // 7) Wrap in the aes128gcm body header:
        //    salt(16) || rs(4, big-endian) || idlen(1) || keyid(idlen) || ct||tag
        $rs    = pack('N', 4096);
        $keyId = $serverPub;     // We embed our ephemeral public key as the keyid
        $header = $salt . $rs . chr(strlen($keyId)) . $keyId;
        return $header . $ct . $tag;
    }

    /** Wrap a 65-byte uncompressed EC public key into a SubjectPublicKeyInfo PEM. */
    private static function ecPublicKeyToPem(string $rawPub): string
    {
        $oidEcPublic   = "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01";
        $oidPrime256v1 = "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07";
        $algId         = "\x30" . self::derLen(strlen($oidEcPublic) + strlen($oidPrime256v1)) . $oidEcPublic . $oidPrime256v1;
        $bitStr        = "\x00" . $rawPub;
        $bitWrap       = "\x03" . self::derLen(strlen($bitStr)) . $bitStr;
        $seq           = $algId . $bitWrap;
        $der           = "\x30" . self::derLen(strlen($seq)) . $seq;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    /** HKDF-SHA256. PHP 7.1.2+ has hash_hkdf built-in. */
    private static function hkdf(string $salt, string $ikm, string $info, int $len): string
    {
        return hash_hkdf('sha256', $ikm, $len, $info, $salt);
    }

    /** ── Utilities ───────────────────────────────────────────────────── */

    private static function b64url(string $bin): string
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }

    private static function b64urlDecode(string $b64): string
    {
        return base64_decode(strtr($b64, '-_', '+/') . str_repeat('=', (4 - strlen($b64) % 4) % 4));
    }

    private static function deleteSubscription(string $endpoint): void
    {
        try {
            $stmt = getDB()->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?");
            $stmt->execute([$endpoint]);
        } catch (\Throwable $e) {
            error_log('Push cleanup failed: ' . $e->getMessage());
        }
    }
}
