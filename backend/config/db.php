<?php
declare(strict_types=1);

function getDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $host   = env('DB_HOST', 'localhost');
    $port   = env('DB_PORT', '3306');
    $name   = env('DB_NAME', 'myshop');
    $user   = env('DB_USER', 'root');
    $pass   = env('DB_PASS', '');

    try {
        $pdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit;
    }

    return $pdo;
}
