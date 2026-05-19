<?php
declare(strict_types=1);

class PaginationHelper
{
    public static function params(int $maxPerPage = 50): array
    {
        $page    = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = min($maxPerPage, max(1, (int) ($_GET['per_page'] ?? 20)));
        $offset  = ($page - 1) * $perPage;
        return [$page, $perPage, $offset];
    }
}
