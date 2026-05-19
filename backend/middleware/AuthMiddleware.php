<?php
declare(strict_types=1);

class AuthMiddleware
{
    public static function require(): array
    {
        $token = JWTHelper::fromHeader();
        if (!$token) error('Unauthorized. No token provided.', 401);

        $payload = JWTHelper::decode($token);
        if (!$payload) error('Unauthorized. Invalid or expired token.', 401);

        if (isset($payload['type']) && $payload['type'] === 'refresh') {
            error('Unauthorized. Access token required.', 401);
        }

        return $payload;
    }

    public static function optional(): ?array
    {
        $token = JWTHelper::fromHeader();
        if (!$token) return null;
        return JWTHelper::decode($token);
    }

    public static function refreshCookie(): array
    {
        $token = $_COOKIE['refresh_token'] ?? '';
        if (!$token) error('No refresh token.', 401);

        $payload = JWTHelper::decode($token);
        if (!$payload || ($payload['type'] ?? '') !== 'refresh') {
            error('Invalid or expired refresh token.', 401);
        }

        return $payload;
    }

    public static function setRefreshCookie(string $token): void
    {
        $ttl = (int) env('JWT_REFRESH_TTL', 604800);
        setcookie('refresh_token', $token, [
            'expires'  => time() + $ttl,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Strict',
            'secure'   => env('APP_ENV', 'local') !== 'local',
        ]);
    }

    public static function clearRefreshCookie(): void
    {
        setcookie('refresh_token', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Strict',
            'secure'   => env('APP_ENV', 'local') !== 'local',
        ]);
    }
}
