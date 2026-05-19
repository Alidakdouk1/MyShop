<?php
declare(strict_types=1);

class RoleMiddleware
{
    public static function require(array $auth, string ...$roles): void
    {
        if (!in_array($auth['role'], $roles, true)) {
            error('Forbidden. Insufficient permissions.', 403);
        }
    }
}
