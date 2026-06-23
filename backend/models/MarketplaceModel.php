<?php
declare(strict_types=1);

class MarketplaceModel extends BaseModel
{
    protected string $table = 'marketplace_ads';

    private const CONDITIONS = ['new','like_new','good','fair','used'];

    /** Decode the images JSON column into an array on a single row. */
    private function hydrate(?array $row): ?array
    {
        if (!$row) return null;
        $row['images'] = !empty($row['images'])
            ? (json_decode((string) $row['images'], true) ?: [])
            : [];
        $row['price'] = $row['price'] !== null ? (float) $row['price'] : null;
        return $row;
    }

    public function find(int $id): ?array
    {
        $row = $this->query(
            "SELECT a.*, u.name AS seller_name
               FROM marketplace_ads a
               JOIN users u ON u.id = a.user_id
              WHERE a.id = ?",
            [$id]
        )->fetch();
        return $this->hydrate($row ?: null);
    }

    public function create(int $userId, array $d, bool $autoApprove = false): int
    {
        $cond = in_array($d['condition'] ?? '', self::CONDITIONS, true) ? $d['condition'] : 'good';
        $status = $autoApprove ? 'approved' : 'pending';
        $this->query(
            "INSERT INTO marketplace_ads
               (user_id, title, description, price, category, `condition`, location, contact_phone, images, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $d['title'],
                $d['description'] ?? null,
                $d['price'] !== '' && $d['price'] !== null ? $d['price'] : null,
                $d['category'] ?? null,
                $cond,
                $d['location'] ?? null,
                $d['contact_phone'] ?? null,
                json_encode($d['images'] ?? []),
                $status,
            ]
        );
        return $this->lastId();
    }

    /** Count a user's active (pending + approved) ads — used for the per-user cap. */
    public function countActiveForUser(int $userId): int
    {
        return (int) $this->query(
            "SELECT COUNT(*) FROM marketplace_ads
              WHERE user_id = ? AND status IN ('pending','approved')",
            [$userId]
        )->fetchColumn();
    }

    /** Owner edit. Resets status to pending so changes get re-reviewed. */
    public function update(int $id, array $d): void
    {
        $cond = in_array($d['condition'] ?? '', self::CONDITIONS, true) ? $d['condition'] : 'good';
        $this->query(
            "UPDATE marketplace_ads
                SET title = ?, description = ?, price = ?, category = ?, `condition` = ?,
                    location = ?, contact_phone = ?, status = 'pending', reject_reason = NULL
              WHERE id = ?",
            [
                $d['title'],
                $d['description'] ?? null,
                $d['price'] !== '' && $d['price'] !== null ? $d['price'] : null,
                $d['category'] ?? null,
                $cond,
                $d['location'] ?? null,
                $d['contact_phone'] ?? null,
                $id,
            ]
        );
    }

    public function setImages(int $id, array $images): void
    {
        $this->query("UPDATE marketplace_ads SET images = ? WHERE id = ?", [json_encode($images), $id]);
    }

    public function setStatus(int $id, string $status, ?string $reason = null): void
    {
        $this->query(
            "UPDATE marketplace_ads SET status = ?, reject_reason = ? WHERE id = ?",
            [$status, $reason, $id]
        );
    }

    /**
     * Approve an ad and stamp its expiry. expiryDays = 0 → never expires (NULL).
     * Used both by admin approval and by auto-approve on create.
     */
    public function approveWithExpiry(int $id, int $expiryDays): void
    {
        $expires = $expiryDays > 0 ? date('Y-m-d H:i:s', time() + $expiryDays * 86400) : null;
        $this->query(
            "UPDATE marketplace_ads
                SET status = 'approved', reject_reason = NULL, expires_at = ?
              WHERE id = ?",
            [$expires, $id]
        );
    }

    /** Owner renew: push expiry out and ensure the ad is live again. */
    public function renew(int $id, int $expiryDays): void
    {
        $expires = $expiryDays > 0 ? date('Y-m-d H:i:s', time() + $expiryDays * 86400) : null;
        $this->query(
            "UPDATE marketplace_ads SET status = 'approved', expires_at = ? WHERE id = ?",
            [$expires, $id]
        );
    }

    public function setFeatured(int $id, bool $featured): void
    {
        $this->query(
            "UPDATE marketplace_ads
                SET is_featured = ?, featured_at = ?
              WHERE id = ?",
            [$featured ? 1 : 0, $featured ? date('Y-m-d H:i:s') : null, $id]
        );
    }

    public function incrementViews(int $id): void
    {
        $this->query("UPDATE marketplace_ads SET view_count = view_count + 1 WHERE id = ?", [$id]);
    }

    /** Public browse — approved ads only, with optional filters. */
    public function browse(array $f, int $limit, int $offset): array
    {
        [$where, $params] = $this->buildWhere($f, 'approved');
        $rows = $this->query(
            "SELECT a.*, u.name AS seller_name
               FROM marketplace_ads a
               JOIN users u ON u.id = a.user_id
              {$where}
              ORDER BY a.is_featured DESC, a.featured_at DESC, a.created_at DESC
              LIMIT ? OFFSET ?",
            [...$params, $limit, $offset]
        )->fetchAll();
        return array_map(fn($r) => $this->hydrate($r), $rows);
    }

    public function countBrowse(array $f): int
    {
        [$where, $params] = $this->buildWhere($f, 'approved');
        return (int) $this->query(
            "SELECT COUNT(*) FROM marketplace_ads a {$where}", $params
        )->fetchColumn();
    }

    public function forUser(int $userId): array
    {
        $rows = $this->query(
            "SELECT * FROM marketplace_ads WHERE user_id = ? ORDER BY created_at DESC",
            [$userId]
        )->fetchAll();
        return array_map(fn($r) => $this->hydrate($r), $rows);
    }

    /** Admin list — any status, plus a special 'reported' view. */
    public function adminAll(string $status = ''): array
    {
        $where  = '';
        $having = '';
        $params = [];
        if ($status === 'reported') {
            $having = 'HAVING report_count > 0';
        } elseif ($status && in_array($status, ['pending','approved','rejected','sold'], true)) {
            $where = 'WHERE a.status = ?';
            $params[] = $status;
        }
        $rows = $this->query(
            "SELECT a.*, u.name AS seller_name, u.email AS seller_email,
                    (SELECT COUNT(*) FROM marketplace_ad_reports r WHERE r.ad_id = a.id) AS report_count
               FROM marketplace_ads a
               JOIN users u ON u.id = a.user_id
               {$where}
               {$having}
              ORDER BY report_count DESC, (a.status = 'pending') DESC, a.created_at DESC",
            $params
        )->fetchAll();
        return array_map(fn($r) => $this->hydrate($r), $rows);
    }

    /** Distinct report reasons + count for one ad (admin detail). */
    public function reportsForAd(int $adId): array
    {
        return $this->query(
            "SELECT reason, COUNT(*) AS n
               FROM marketplace_ad_reports
              WHERE ad_id = ?
              GROUP BY reason
              ORDER BY n DESC",
            [$adId]
        )->fetchAll();
    }

    private function buildWhere(array $f, string $forceStatus): array
    {
        // Public browse hides expired ads (expires_at in the past). NULL = never.
        $clauses = ["a.status = ?", "(a.expires_at IS NULL OR a.expires_at > NOW())"];
        $params  = [$forceStatus];
        if (!empty($f['search'])) {
            $clauses[] = "(a.title LIKE ? OR a.description LIKE ?)";
            $params[]  = "%{$f['search']}%";
            $params[]  = "%{$f['search']}%";
        }
        if (!empty($f['category'])) {
            $clauses[] = "a.category = ?";
            $params[]  = $f['category'];
        }
        if (isset($f['price_min']) && $f['price_min'] !== '') {
            $clauses[] = "a.price >= ?";
            $params[]  = (float) $f['price_min'];
        }
        if (isset($f['price_max']) && $f['price_max'] !== '') {
            $clauses[] = "a.price <= ?";
            $params[]  = (float) $f['price_max'];
        }
        return ['WHERE ' . implode(' AND ', $clauses), $params];
    }
}
