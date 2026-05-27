<?php
declare(strict_types=1);

class AuthController
{
    private UserModel $users;

    public function __construct()
    {
        $this->users = new UserModel();
    }

    public function register(): never
    {
        method('POST');
        RateLimiter::check('register', 5, 60);
        $data = getBody();

        $name     = sanitize($data['name'] ?? '');
        $email    = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
        $password = $data['password'] ?? '';
        $role     = 'customer';

        if (!$name || !$email || strlen($password) < 8) {
            error('Name, valid email, and password (min 8 chars) are required.', 422);
        }
        if ($this->users->findByEmail($email)) {
            error('Email already registered.', 409);
        }

        $token  = bin2hex(random_bytes(32));
        $userId = $this->users->create([
            'name'                     => $name,
            'email'                    => $email,
            'password_hash'            => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
            'role'                     => $role,
            'phone'                    => sanitize($data['phone'] ?? ''),
            'email_verification_token' => $token,
        ]);

        $user = $this->users->findById($userId);
        MailHelper::welcome($email, $name, $token);

        if ($role === 'vendor' && !empty($data['store_name'])) {
            $vendor = new VendorModel();
            $slug   = preg_replace('/[^a-z0-9]+/', '-', strtolower($data['store_name']));
            $vendor->create($userId, [
                'store_name' => sanitize($data['store_name']),
                'store_slug' => $slug . '-' . substr(bin2hex(random_bytes(3)), 0, 6),
                'bio'        => sanitize($data['bio'] ?? ''),
            ]);
        }

        $accessToken  = JWTHelper::accessToken($user);
        $refreshToken = JWTHelper::refreshToken($user);

        $this->users->update($userId, [
            'refresh_token_hash' => password_hash($refreshToken, PASSWORD_BCRYPT),
            'last_login_at'      => date('Y-m-d H:i:s'),
        ]);

        AuthMiddleware::setRefreshCookie($refreshToken);
        success([
            'access_token' => $accessToken,
            'user'         => $this->users->safe($user),
        ], 'Registration successful. Please verify your email.', 201);
    }

    public function login(): never
    {
        method('POST');
        RateLimiter::check('login', 10, 60);
        $data = getBody();

        $email    = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
        $password = $data['password'] ?? '';

        if (!$email || !$password) error('Email and password are required.', 422);

        $user = $this->users->findByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            error('Invalid email or password.', 401);
        }

        $accessToken  = JWTHelper::accessToken($user);
        $refreshToken = JWTHelper::refreshToken($user);

        $this->users->update($user['id'], [
            'refresh_token_hash' => password_hash($refreshToken, PASSWORD_BCRYPT),
            'last_login_at'      => date('Y-m-d H:i:s'),
        ]);

        AuthMiddleware::setRefreshCookie($refreshToken);
        success([
            'access_token' => $accessToken,
            'user'         => $this->users->safe($user),
        ], 'Login successful');
    }

    public function googleLogin(): never
    {
        method('POST');
        RateLimiter::check('google_login', 10, 60);
        $data      = getBody();
        $idToken   = trim($data['credential'] ?? '');
        if (!$idToken) error('Google credential is required.', 422);

        $clientId = env('GOOGLE_CLIENT_ID', '');
        if (!$clientId) error('Google login is not configured on this server.', 503);

        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $body     = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!$body || $httpCode !== 200) error('Failed to verify Google token.', 401);

        $payload = json_decode($body, true);
        if (($payload['aud'] ?? '') !== $clientId)    error('Google token audience mismatch.', 401);
        if (($payload['email_verified'] ?? '') !== 'true') error('Google account email not verified.', 401);

        $email   = $payload['email'] ?? '';
        $name    = $payload['name']  ?? explode('@', $email)[0];
        $picture = $payload['picture'] ?? null;
        if (!$email) error('No email returned from Google.', 401);

        $user = $this->users->findByEmail($email);

        if (!$user) {
            $userId = $this->users->create([
                'name'          => $name,
                'email'         => $email,
                'password_hash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT),
                'role'          => 'customer',
            ]);
            $this->users->update($userId, [
                'is_verified' => 1,
                'avatar_url'  => $picture,
            ]);
            $user = $this->users->findById($userId);
        }

        $accessToken  = JWTHelper::accessToken($user);
        $refreshToken = JWTHelper::refreshToken($user);

        $this->users->update($user['id'], [
            'refresh_token_hash' => password_hash($refreshToken, PASSWORD_BCRYPT),
            'last_login_at'      => date('Y-m-d H:i:s'),
        ]);

        AuthMiddleware::setRefreshCookie($refreshToken);
        success([
            'access_token' => $accessToken,
            'user'         => $this->users->safe($user),
        ], 'Login successful');
    }

    public function logout(): never
    {
        method('POST');
        AuthMiddleware::clearRefreshCookie();
        success(null, 'Logged out');
    }

    public function refreshToken(): never
    {
        method('POST');
        $payload = AuthMiddleware::refreshCookie();
        $user    = $this->users->findById((int) $payload['sub']);
        if (!$user) error('User not found.', 401);

        $newAccess  = JWTHelper::accessToken($user);
        $newRefresh = JWTHelper::refreshToken($user);
        $this->users->update($user['id'], [
            'refresh_token_hash' => password_hash($newRefresh, PASSWORD_BCRYPT),
        ]);

        AuthMiddleware::setRefreshCookie($newRefresh);
        success(['access_token' => $newAccess]);
    }

    public function me(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        $user = $this->users->findById((int) $auth['sub']);
        if (!$user) error('User not found.', 404);
        success($this->users->safe($user));
    }

    public function forgotPassword(): never
    {
        method('POST');
        RateLimiter::check('forgot_password', 3, 300);
        $data  = getBody();
        $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
        if (!$email) error('Valid email required.', 422);

        $user = $this->users->findByEmail($email);
        if ($user) {
            $token = bin2hex(random_bytes(32));
            $this->users->update($user['id'], [
                'password_reset_token'   => $token,
                'password_reset_expires' => date('Y-m-d H:i:s', time() + 3600),
            ]);
            MailHelper::passwordReset($email, $user['name'], $token);
        }
        success(null, 'If that email exists, a reset link has been sent.');
    }

    public function resetPassword(): never
    {
        method('POST');
        $data     = getBody();
        $token    = $data['token'] ?? '';
        $password = $data['password'] ?? '';

        if (!$token || strlen($password) < 8) error('Token and password (min 8 chars) required.', 422);

        $user = $this->users->findByResetToken($token);
        if (!$user) error('Invalid or expired reset token.', 400);

        $this->users->update($user['id'], [
            'password_hash'          => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
            'password_reset_token'   => null,
            'password_reset_expires' => null,
        ]);
        success(null, 'Password reset successful.');
    }
}
