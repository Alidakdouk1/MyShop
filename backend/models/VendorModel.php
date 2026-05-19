<?php
declare(strict_types=1);

class VendorModel extends BaseModel
{
    protected string $table = 'vendor_profiles';

    public function findByUserId(int $userId): ?array
    {
        $row = $this->query("SELECT * FROM vendor_profiles WHERE user_id = ?", [$userId])->fetch();
        return $row ?: null;
    }

    public function findBySlug(string $slug): ?array
    {
        $row = $this->query(
            "SELECT vp.*, u.name, u.email, u.avatar_url
             FROM vendor_profiles vp JOIN users u ON u.id = vp.user_id
             WHERE vp.store_slug = ?",
            [$slug]
        )->fetch();
        return $row ?: null;
    }

    public function create(int $userId, array $data): int
    {
        $this->query(
            "INSERT INTO vendor_profiles (user_id, store_name, store_slug, bio) VALUES (?, ?, ?, ?)",
            [$userId, $data['store_name'], $data['store_slug'], $data['bio'] ?? null]
        );
        return $this->lastId();
    }

    public function update(int $userId, array $data): bool
    {
        $sets = []; $params = [];
        foreach ($data as $col => $val) { $sets[] = "`{$col}` = ?"; $params[] = $val; }
        $params[] = $userId;
        return $this->query(
            "UPDATE vendor_profiles SET " . implode(', ', $sets) . " WHERE user_id = ?", $params
        )->rowCount() > 0;
    }

    public function updateRating(int $vendorUserId): void
    {
        $this->query(
            "UPDATE vendor_profiles vp SET rating_avg = (
                SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                JOIN products p ON p.id = r.product_id WHERE p.vendor_id = vp.user_id
             ) WHERE user_id = ?",
            [$vendorUserId]
        );
    }

    public function incrementSales(int $vendorUserId, int $qty): void
    {
        $this->query(
            "UPDATE vendor_profiles SET total_sales = total_sales + ? WHERE user_id = ?",
            [$qty, $vendorUserId]
        );
    }
}
