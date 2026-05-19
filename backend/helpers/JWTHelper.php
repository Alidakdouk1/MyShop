<?php
declare(strict_types=1);

class JWTHelper
{
    private static function secret(): string
    {
        $s = env('JWT_SECRET', '');
        if (empty($s)) throw new RuntimeException('JWT_SECRET is not set');
        return $s;
    }

    public static function encode(array $payload): string
    {
        $header  = self::b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = self::b64url(json_encode($payload));
        $sig     = self::b64url(hash_hmac('sha256', "{$header}.{$payload}", self::secret(), true));
        return "{$header}.{$payload}.{$sig}";
    }

    public static function decode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $payload, $sig] = $parts;
        $expected = self::b64url(hash_hmac('sha256', "{$header}.{$payload}", self::secret(), true));

        if (!hash_equals($expected, $sig)) return null;

        $data = json_decode(self::b64urlDecode($payload), true);
        if (!is_array($data)) return null;
        if (isset($data['exp']) && $data['exp'] < time()) return null;

        return $data;
    }

    public static function accessToken(array $user): string
    {
        return self::encode([
            'sub'   => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'iat'   => time(),
            'exp'   => time() + (int) env('JWT_ACCESS_TTL', 900),
        ]);
    }

    public static function refreshToken(array $user): string
    {
        return self::encode([
            'sub'  => $user['id'],
            'type' => 'refresh',
            'iat'  => time(),
            'exp'  => time() + (int) env('JWT_REFRESH_TTL', 604800),
        ]);
    }

    public static function fromHeader(): ?string
    {
        $h = $_SERVER['HTTP_AUTHORIZATION']
          ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
          ?? '';

        if (!$h) {
            $headers = function_exists('getallheaders') ? getallheaders() : [];
            $h = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (str_starts_with($h, 'Bearer ')) {
            return substr($h, 7);
        }
        return null;
    }

    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}
