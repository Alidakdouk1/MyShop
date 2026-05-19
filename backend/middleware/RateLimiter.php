<?php
declare(strict_types=1);

class RateLimiter
{
    private static string $dir = '';

    private static function storageDir(): string
    {
        if (self::$dir === '') {
            self::$dir = sys_get_temp_dir() . '/myshop_rl/';
            if (!is_dir(self::$dir)) mkdir(self::$dir, 0755, true);
        }
        return self::$dir;
    }

    public static function check(string $key, int $maxRequests = 10, int $windowSeconds = 60): void
    {
        $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $file = self::storageDir() . md5($key . $ip) . '.json';
        $now  = time();

        $data = ['count' => 0, 'reset_at' => $now + $windowSeconds];
        if (file_exists($file)) {
            $stored = json_decode(file_get_contents($file), true);
            if ($stored && $stored['reset_at'] > $now) {
                $data = $stored;
            }
        }

        $data['count']++;
        file_put_contents($file, json_encode($data), LOCK_EX);

        if ($data['count'] > $maxRequests) {
            header('Retry-After: ' . ($data['reset_at'] - $now));
            error('Too many requests. Please try again later.', 429);
        }
    }
}
