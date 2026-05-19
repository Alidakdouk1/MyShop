<?php
declare(strict_types=1);

function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function success(mixed $data = null, string $message = 'OK', int $status = 200): never
{
    respond(['success' => true, 'message' => $message, 'data' => $data], $status);
}

function error(string $message, int $status = 400, mixed $errors = null): never
{
    $body = ['success' => false, 'message' => $message];
    if ($errors !== null) $body['errors'] = $errors;
    respond($body, $status);
}

function paginated(array $items, int $total, int $page, int $perPage): never
{
    respond([
        'success' => true,
        'data'    => $items,
        'meta'    => [
            'total'        => $total,
            'per_page'     => $perPage,
            'current_page' => $page,
            'last_page'    => (int) ceil($total / $perPage),
        ],
    ]);
}

function getBody(): array
{
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function sanitize(string $value): string
{
    return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
}

function method(string ...$allowed): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'], $allowed, true)) {
        error('Method not allowed', 405);
    }
}
