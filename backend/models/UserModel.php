<?php
declare(strict_types=1);

class UserModel extends BaseModel
{
    protected string $table = 'users';

    public function findByEmail(string $email): ?array
    {
        $row = $this->query("SELECT * FROM users WHERE email = ?", [$email])->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $this->query(
            "INSERT INTO users (name, email, password_hash, role, phone, email_verification_token)
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $data['name'],
                $data['email'],
                $data['password_hash'],
                $data['role'] ?? 'customer',
                $data['phone'] ?? null,
                $data['email_verification_token'] ?? null,
            ]
        );
        return $this->lastId();
    }

    public function update(int $id, array $data): bool
    {
        $sets   = [];
        $params = [];
        foreach ($data as $col => $val) {
            $sets[]   = "`{$col}` = ?";
            $params[] = $val;
        }
        $params[] = $id;
        return $this->query(
            "UPDATE users SET " . implode(', ', $sets) . " WHERE id = ?",
            $params
        )->rowCount() > 0;
    }

    public function verifyEmail(string $token): ?array
    {
        $row = $this->query(
            "SELECT * FROM users WHERE email_verification_token = ?", [$token]
        )->fetch();
        if (!$row) return null;
        $this->update($row['id'], ['is_verified' => 1, 'email_verification_token' => null]);
        return $row;
    }

    public function findByResetToken(string $token): ?array
    {
        $row = $this->query(
            "SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()",
            [$token]
        )->fetch();
        return $row ?: null;
    }

    public function all(int $limit, int $offset, string $search = '', string $role = ''): array
    {
        $where  = $role ? "WHERE role = ?" : '';
        $params = $role ? [$role] : [];

        if ($search) {
            $where    = $role
                ? "WHERE role = ? AND (name LIKE ? OR email LIKE ?)"
                : "WHERE name LIKE ? OR email LIKE ?";
            $params   = $role
                ? [$role, "%{$search}%", "%{$search}%"]
                : ["%{$search}%", "%{$search}%"];
        }

        $params[] = $limit;
        $params[] = $offset;
        return $this->query(
            "SELECT id, name, email, role, is_verified, created_at FROM users
             {$where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            $params
        )->fetchAll();
    }

    public function count(string $search = '', string $role = ''): int
    {
        if ($search && $role) {
            return (int) $this->query(
                "SELECT COUNT(*) FROM users WHERE role = ? AND (name LIKE ? OR email LIKE ?)",
                [$role, "%{$search}%", "%{$search}%"]
            )->fetchColumn();
        }
        if ($search) {
            return (int) $this->query(
                "SELECT COUNT(*) FROM users WHERE name LIKE ? OR email LIKE ?",
                ["%{$search}%", "%{$search}%"]
            )->fetchColumn();
        }
        if ($role) {
            return (int) $this->query(
                "SELECT COUNT(*) FROM users WHERE role = ?", [$role]
            )->fetchColumn();
        }
        return (int) $this->query("SELECT COUNT(*) FROM users")->fetchColumn();
    }

    public function safe(array $user): array
    {
        unset($user['password_hash'], $user['email_verification_token'],
              $user['password_reset_token'], $user['password_reset_expires'],
              $user['refresh_token_hash']);
        return $user;
    }
}
