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
            // Decode the JSON notification_prefs so the frontend gets a real object,
            // not a string. Fall back to sane defaults when nothing's set yet.
            if (isset($user['notification_prefs']) && is_string($user['notification_prefs'])) {
                $user['notification_prefs'] = json_decode($user['notification_prefs'], true) ?: [];
            }
            $user['notification_prefs'] = array_merge([
                'email_order'       => 1,
                'email_marketing'   => 0,
                'whatsapp_order'    => 0,
                'sms_order'         => 0,
            ], (array) ($user['notification_prefs'] ?? []));
            success($this->users->safe($user));
        }
        method('GET', 'PUT');
        $data   = getBody();
        // Plain text fields admin can update from the profile page.
        $textFields = ['name', 'phone', 'avatar_url', 'preferred_language', 'preferred_currency'];
        $update = [];
        foreach ($textFields as $f) {
            if (array_key_exists($f, $data)) {
                $update[$f] = $data[$f] === null ? null : sanitize((string) $data[$f]);
            }
        }
        // Birthday — accept YYYY-MM-DD or null.
        if (array_key_exists('birthday', $data)) {
            $update['birthday'] = $data['birthday']
                ? substr((string) $data['birthday'], 0, 10)
                : null;
        }
        // Gender — strict enum.
        if (array_key_exists('gender', $data)) {
            $g = (string) ($data['gender'] ?? '');
            $update['gender'] = in_array($g, ['male','female','other','prefer_not_say'], true) ? $g : null;
        }
        // Notification preferences — accept full object, JSON-encode for storage.
        if (array_key_exists('notification_prefs', $data) && is_array($data['notification_prefs'])) {
            $allowed = ['email_order','email_marketing','whatsapp_order','sms_order'];
            $clean = [];
            foreach ($allowed as $k) {
                $clean[$k] = !empty($data['notification_prefs'][$k]) ? 1 : 0;
            }
            $update['notification_prefs'] = json_encode($clean);
        }
        // Password change — same minimum rule as before.
        if (!empty($data['password']) && strlen($data['password']) >= 8) {
            $update['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        if (!empty($update)) $this->users->update((int) $auth['sub'], $update);

        // Return decoded prefs so the form re-binds correctly.
        $user = $this->users->findById((int) $auth['sub']);
        if (isset($user['notification_prefs']) && is_string($user['notification_prefs'])) {
            $user['notification_prefs'] = json_decode($user['notification_prefs'], true) ?: [];
        }
        success($this->users->safe($user), 'Profile updated.');
    }

    /**
     * Customer-side stats for the profile dashboard header.
     * Includes order count, lifetime value, reviews written, member-since date.
     */
    public function stats(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        $uid  = (int) $auth['sub'];
        $db   = getDB();

        $row = $db->prepare(
            "SELECT u.created_at AS member_since,
                    u.last_login_at,
                    (SELECT COUNT(*) FROM orders WHERE user_id = ?) AS total_orders,
                    (SELECT COALESCE(SUM(total), 0) FROM orders
                     WHERE user_id = ? AND status NOT IN ('cancelled','refunded')) AS lifetime_value,
                    (SELECT COUNT(*) FROM reviews WHERE user_id = ?)   AS reviews_written,
                    (SELECT COUNT(*) FROM wishlists WHERE user_id = ?) AS wishlist_count,
                    (SELECT COUNT(*) FROM addresses WHERE user_id = ?) AS addresses_count
             FROM users u WHERE u.id = ?"
        );
        $row->execute([$uid, $uid, $uid, $uid, $uid, $uid]);
        $data = $row->fetch();
        if (!$data) error('User not found.', 404);

        $data['total_orders']   = (int)   $data['total_orders'];
        $data['lifetime_value'] = (float) $data['lifetime_value'];
        $data['reviews_written']= (int)   $data['reviews_written'];
        $data['wishlist_count'] = (int)   $data['wishlist_count'];
        $data['addresses_count']= (int)   $data['addresses_count'];

        success($data);
    }

    /**
     * Avatar upload. Multipart with field "avatar". Reuses the project's
     * existing UploadHelper so the file ends up under uploads/avatars/.
     * Returns the new avatar_url so the frontend can re-render immediately.
     */
    public function uploadAvatar(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        if (empty($_FILES['avatar']['tmp_name']) || !is_uploaded_file($_FILES['avatar']['tmp_name'])) {
            error('Please attach an image in the "avatar" field.', 422);
        }
        // Reuse the upload helper — it validates mime + size and returns a relative URL.
        $relativeUrl = UploadHelper::saveImage($_FILES['avatar'], 'avatars');
        if (!$relativeUrl) error('Could not save avatar.', 500);

        $this->users->update((int) $auth['sub'], ['avatar_url' => $relativeUrl]);
        $user = $this->users->findById((int) $auth['sub']);
        success(['avatar_url' => $relativeUrl, 'user' => $this->users->safe($user)], 'Avatar updated.');
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
