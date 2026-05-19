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
