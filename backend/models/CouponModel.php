<?php
declare(strict_types=1);

class CouponModel extends BaseModel
{
    protected string $table = 'coupons';

    public function findByCode(string $code): ?array
    {
        $row = $this->query(
            "SELECT * FROM coupons WHERE code = ? AND is_active = 1
             AND (expires_at IS NULL OR expires_at > NOW())
             AND (usage_limit IS NULL OR used_count < usage_limit)",
            [strtoupper($code)]
        )->fetch();
        return $row ?: null;
    }

    public function apply(array $coupon, float $subtotal): float
    {
        if ($subtotal < (float) $coupon['min_order']) return 0.0;
        if ($coupon['type'] === 'percent') {
            return round($subtotal * ((float) $coupon['value'] / 100), 2);
        }
        return min((float) $coupon['value'], $subtotal);
    }

    public function incrementUsage(int $id): void
    {
        $this->query("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [$id]);
    }

    public function all(int $limit, int $offset): array
    {
        return $this->query(
            "SELECT * FROM coupons ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [$limit, $offset]
        )->fetchAll();
    }

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO coupons (code, type, value, min_order, usage_limit, is_active, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                strtoupper($data['code']), $data['type'], $data['value'],
                $data['min_order'] ?? 0, $data['usage_limit'] ?? null,
                $data['is_active'] ?? 1, $data['expires_at'] ?? null,
            ]
        );
        return $this->lastId();
    }
}
