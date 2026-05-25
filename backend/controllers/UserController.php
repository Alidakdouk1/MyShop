<?php
declare(strict_types=1);

class UserController
{
    private UserModel $users;

    public function __construct()
    {
        $this->users = new UserModel();
    }

    public function profile(): never
    {
        $auth = AuthMiddleware::require();
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $user = $this->users->findById((int) $auth['sub']);
            if (!$user) error('User not found.', 404);
            success($this->users->safe($user));
        }
        method('GET', 'PUT');
        $data   = getBody();
        $fields = ['name', 'phone', 'avatar_url'];
        $update = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $data)) $update[$f] = sanitize((string) $data[$f]);
        }
        if (!empty($data['password']) && strlen($data['password']) >= 8) {
            $update['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        if (!empty($update)) $this->users->update((int) $auth['sub'], $update);
        $user = $this->users->findById((int) $auth['sub']);
        success($this->users->safe($user), 'Profile updated.');
    }

    public function addresses(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        $stmt = getDB()->prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC");
        $stmt->execute([(int) $auth['sub']]);
        success($stmt->fetchAll());
    }

    public function storeAddress(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        $data = getBody();

        $street  = sanitize($data['street'] ?? '');
        $city    = sanitize($data['city']   ?? '');
        $country = sanitize($data['country'] ?? '');
        if (!$street || !$city || !$country) error('Street, city, and country are required.', 422);

        $isDefault = (int) ($data['is_default'] ?? 0);
        if ($isDefault) {
            getDB()->prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?")->execute([(int) $auth['sub']]);
        }

        $stmt = getDB()->prepare(
            "INSERT INTO addresses (user_id, label, recipient_name, phone, street, city, state, country, zip, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            (int) $auth['sub'], sanitize($data['label'] ?? 'Home'),
            sanitize($data['recipient_name'] ?? ''), sanitize($data['phone'] ?? ''),
            $street, $city, sanitize($data['state'] ?? ''), $country,
            sanitize($data['zip'] ?? ''), $isDefault,
        ]);
        $id    = (int) getDB()->lastInsertId();
        $stmt2 = getDB()->prepare("SELECT * FROM addresses WHERE id = ?");
        $stmt2->execute([$id]);
        success($stmt2->fetch(), 'Address added.', 201);
    }

    public function updateAddress(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        $stmt = getDB()->prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, (int) $auth['sub']]);
        if (!$stmt->fetch()) error('Address not found.', 404);

        $data      = getBody();
        $isDefault = (int) ($data['is_default'] ?? 0);
        if ($isDefault) {
            getDB()->prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?")->execute([(int) $auth['sub']]);
        }
        getDB()->prepare(
            "UPDATE addresses SET label=?, recipient_name=?, phone=?, street=?, city=?, state=?, country=?, zip=?, is_default=? WHERE id=? AND user_id=?"
        )->execute([
            sanitize($data['label'] ?? 'Home'), sanitize($data['recipient_name'] ?? ''),
            sanitize($data['phone'] ?? ''), sanitize($data['street'] ?? ''),
            sanitize($data['city'] ?? ''), sanitize($data['state'] ?? ''),
            sanitize($data['country'] ?? ''), sanitize($data['zip'] ?? ''),
            $isDefault, $id, (int) $auth['sub'],
        ]);
        success(null, 'Address updated.');
    }

    public function deleteAddress(int $id): never
    {
        method('DELETE');
        $auth = AuthMiddleware::require();
        $stmt = getDB()->prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, (int) $auth['sub']]);
        if (!$stmt->rowCount()) error('Address not found.', 404);
        success(null, 'Address deleted.');
    }
}
