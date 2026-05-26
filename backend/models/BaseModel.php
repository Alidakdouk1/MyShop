<?php
declare(strict_types=1);

abstract class BaseModel
{
    protected PDO $db;
    protected string $table;

    public function __construct()
    {
        $this->db = getDB();
    }

    protected function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // ── Transactions ─────────────────────────────────────────────
    // All models share one PDO (getDB() singleton), so a transaction
    // started on any model wraps queries run through every model.
    public function begin(): void
    {
        if (!$this->db->inTransaction()) $this->db->beginTransaction();
    }

    public function commit(): void
    {
        if ($this->db->inTransaction()) $this->db->commit();
    }

    public function rollback(): void
    {
        if ($this->db->inTransaction()) $this->db->rollBack();
    }

    public function findById(int $id): ?array
    {
        $row = $this->query("SELECT * FROM `{$this->table}` WHERE id = ?", [$id])->fetch();
        return $row ?: null;
    }

    public function delete(int $id): bool
    {
        return $this->query("DELETE FROM `{$this->table}` WHERE id = ?", [$id])->rowCount() > 0;
    }

    protected function lastId(): int
    {
        return (int) $this->db->lastInsertId();
    }
}
