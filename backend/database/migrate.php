<?php
/**
 * CLI migration runner
 * Usage:
 *   php migrate.php              — run all pending migrations
 *   php migrate.php --seed       — run migrations + seed files
 *   php migrate.php --rollback   — drop all tables (dev only)
 *   php migrate.php --status     — show migration status
 */

declare(strict_types=1);

// ── Config ──────────────────────────────────────────────────────────────────
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
    }
}

$host   = $_ENV['DB_HOST']   ?? 'localhost';
$dbName = $_ENV['DB_NAME']   ?? 'myshop';
$user   = $_ENV['DB_USER']   ?? 'root';
$pass   = $_ENV['DB_PASS']   ?? '';
$port   = $_ENV['DB_PORT']   ?? '3306';

// ── Bootstrap PDO ────────────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$dbName}`");

    // Create migrations log table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `_migrations` (
        `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
        `filename`   VARCHAR(255) NOT NULL,
        `ran_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uq_migrations_filename` (`filename`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

} catch (PDOException $e) {
    die(red("Database connection failed: " . $e->getMessage()) . PHP_EOL);
}

// ── Parse arguments ──────────────────────────────────────────────────────────
$args     = array_slice($argv, 1);
$doSeed   = in_array('--seed',     $args, true);
$rollback = in_array('--rollback', $args, true);
$status   = in_array('--status',   $args, true);

// ── Helpers ──────────────────────────────────────────────────────────────────
function green(string $s): string { return "\033[32m{$s}\033[0m"; }
function red(string $s):   string { return "\033[31m{$s}\033[0m"; }
function cyan(string $s):  string { return "\033[36m{$s}\033[0m"; }
function yellow(string $s):string { return "\033[33m{$s}\033[0m"; }

function runFile(PDO $pdo, string $filepath, string $label): void
{
    $sql = file_get_contents($filepath);
    if ($sql === false) {
        echo red("  Cannot read: {$filepath}") . PHP_EOL;
        return;
    }
    // Strip comment lines first, then split on semicolons
    $stripped = implode("\n", array_filter(
        explode("\n", $sql),
        fn($line) => !str_starts_with(trim($line), '--')
    ));
    $statements = array_filter(
        array_map('trim', explode(';', $stripped)),
        fn($s) => $s !== ''
    );
    foreach ($statements as $stmt) {
        $pdo->exec($stmt);
    }
    echo green("  ✔ {$label}") . PHP_EOL;
}

// ── Rollback ─────────────────────────────────────────────────────────────────
if ($rollback) {
    echo yellow("⚠  Rolling back all tables (dev only)...") . PHP_EOL;
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        $pdo->exec("DROP TABLE IF EXISTS `{$table}`");
        echo red("  ✖ Dropped: {$table}") . PHP_EOL;
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    echo yellow("Rollback complete.") . PHP_EOL;
    exit(0);
}

// ── Status ───────────────────────────────────────────────────────────────────
if ($status) {
    $ran = $pdo->query("SELECT filename FROM `_migrations` ORDER BY ran_at")
               ->fetchAll(PDO::FETCH_COLUMN);
    $migrationDir = __DIR__ . '/migrations';
    $files = glob("{$migrationDir}/*.sql");
    sort($files);
    echo cyan("Migration status:") . PHP_EOL;
    foreach ($files as $f) {
        $name = basename($f);
        $mark = in_array($name, $ran, true) ? green('  ✔ ran   ') : yellow('  ○ pending');
        echo "{$mark} {$name}" . PHP_EOL;
    }
    exit(0);
}

// ── Run Migrations ───────────────────────────────────────────────────────────
$migrationDir = __DIR__ . '/migrations';
$files = glob("{$migrationDir}/*.sql");
sort($files);

$ran = $pdo->query("SELECT filename FROM `_migrations`")->fetchAll(PDO::FETCH_COLUMN);
$pending = array_filter($files, fn($f) => !in_array(basename($f), $ran, true));

if (empty($pending)) {
    echo cyan("All migrations are up to date.") . PHP_EOL;
} else {
    echo cyan("Running " . count($pending) . " migration(s)...") . PHP_EOL;
    foreach ($pending as $file) {
        $filename = basename($file);
        try {
            runFile($pdo, $file, $filename);
            $stmt = $pdo->prepare("INSERT INTO `_migrations` (filename) VALUES (?)");
            $stmt->execute([$filename]);
        } catch (PDOException $e) {
            die(red("  ✖ Failed [{$filename}]: " . $e->getMessage()) . PHP_EOL);
        }
    }
    echo green("Migrations complete.") . PHP_EOL;
}

// ── Run Seeds ────────────────────────────────────────────────────────────────
if ($doSeed) {
    $seedDir = __DIR__ . '/seeds';
    $seeds   = glob("{$seedDir}/*.sql");
    sort($seeds);
    echo PHP_EOL . cyan("Running " . count($seeds) . " seed file(s)...") . PHP_EOL;
    foreach ($seeds as $file) {
        try {
            runFile($pdo, $file, basename($file));
        } catch (PDOException $e) {
            echo red("  ✖ Seed failed [" . basename($file) . "]: " . $e->getMessage()) . PHP_EOL;
        }
    }
    echo green("Seeding complete.") . PHP_EOL;
}

echo PHP_EOL . green("Done.") . PHP_EOL;
