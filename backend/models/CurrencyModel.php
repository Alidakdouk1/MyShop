<?php
declare(strict_types=1);

class CurrencyModel extends BaseModel
{
    protected string $table = 'currencies';

    public function enabled(): array
    {
        return $this->query(
            "SELECT id, code, name, symbol, rate, is_default
             FROM currencies WHERE is_enabled = 1 ORDER BY sort_order ASC, code ASC"
        )->fetchAll();
    }

    public function adminAll(): array
    {
        return $this->query("SELECT * FROM currencies ORDER BY sort_order ASC, code ASC")->fetchAll();
    }

    public function findByCode(string $code): ?array
    {
        $row = $this->query("SELECT * FROM currencies WHERE code = ?", [$code])->fetch();
        return $row ?: null;
    }

    public function create(array $d): int
    {
        $this->query(
            "INSERT INTO currencies (code, name, symbol, rate, is_default, is_enabled, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [$d['code'], $d['name'], $d['symbol'], $d['rate'],
             $d['is_default'] ?? 0, $d['is_enabled'] ?? 1, $d['sort_order'] ?? 0]
        );
        return $this->lastId();
    }

    public function update(int $id, array $data): bool
    {
        $cols = ['name', 'symbol', 'rate', 'is_default', 'is_enabled', 'sort_order'];
        $sets = []; $params = [];
        foreach ($cols as $c) {
            if (array_key_exists($c, $data)) { $sets[] = "`{$c}` = ?"; $params[] = $data[$c]; }
        }
        if (!$sets) return false;
        $params[] = $id;
        return $this->query("UPDATE currencies SET " . implode(', ', $sets) . " WHERE id = ?", $params)->rowCount() >= 0;
    }

    /** Make exactly one currency the default. */
    public function setDefault(int $id): void
    {
        $this->query("UPDATE currencies SET is_default = 0");
        $this->query("UPDATE currencies SET is_default = 1, is_enabled = 1 WHERE id = ?", [$id]);
    }
}
