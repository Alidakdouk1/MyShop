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

        // 2FA gate — if enabled, return a short-lived challenge token instead
        // of issuing access. Client must call /api/auth/2fa/verify-login with
        // a 6-digit code (or a backup code) using this challenge.
        if (!empty($user['two_factor_enabled']) && !empty($user['two_factor_secret'])) {
            $challenge = JWTHelper::encode([
                'sub'  => $user['id'],
                'type' => '2fa_challenge',
                'iat'  => time(),
                'exp'  => time() + 300, // 5 min window
            ]);
            success([
                'two_factor_required' => true,
                'challenge'           => $challenge,
            ], 'Two-factor authentication required.');
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

    /**
     * POST /api/auth/2fa/verify-login — second step of login when 2FA is on.
     * Body: { challenge, code }. Code is either a 6-digit TOTP from their app
     * or a single-use backup code. Returns full tokens on success.
     */
    public function verifyTwoFactorLogin(): never
    {
        method('POST');
        RateLimiter::check('2fa_verify', 10, 60);
        $data      = getBody();
        $challenge = (string) ($data['challenge'] ?? '');
        $code      = trim((string) ($data['code'] ?? ''));
        if (!$challenge || !$code) error('Challenge and code are required.', 422);

        $payload = JWTHelper::decode($challenge);
        if (!$payload || ($payload['type'] ?? '') !== '2fa_challenge') {
            error('Challenge expired. Please log in again.', 401);
        }

        $user = $this->users->findById((int) $payload['sub']);
        if (!$user || empty($user['two_factor_enabled']) || empty($user['two_factor_secret'])) {
            error('Two-factor is not enabled for this account.', 400);
        }

        $valid = false;
        $usedBackup = null;

        // Try TOTP first; fall back to backup codes.
        if (TOTPHelper::verify($user['two_factor_secret'], $code)) {
            $valid = true;
        } else {
            $backups = $user['two_factor_backup_codes']
                ? (json_decode($user['two_factor_backup_codes'], true) ?: [])
                : [];
            $idx = TOTPHelper::verifyBackup($backups, $code);
            if ($idx !== null) {
                $valid = true;
                $usedBackup = $idx;
                array_splice($backups, $idx, 1); // single-use: remove it
            }
        }

        if (!$valid) error('Invalid two-factor code.', 401);

        $accessToken  = JWTHelper::accessToken($user);
        $refreshToken = JWTHelper::refreshToken($user);

        $update = [
            'refresh_token_hash' => password_hash($refreshToken, PASSWORD_BCRYPT),
            'last_login_at'      => date('Y-m-d H:i:s'),
        ];
        if ($usedBackup !== null) {
            $update['two_factor_backup_codes'] = json_encode($backups);
        }
        $this->users->update($user['id'], $update);

        AuthMiddleware::setRefreshCookie($refreshToken);
        success([
            'access_token' => $accessToken,
            'user'         => $this->users->safe($user),
            'backup_used'  => $usedBackup !== null,
        ], 'Login successful.');
    }

    /**
     * GET /api/auth/2fa/setup — start 2FA enrollment. Generates a fresh secret
     * (stored unverified) and returns the otpauth:// URI for the QR code.
     * Frontend renders the QR, user scans it, then POSTs /enable with the
     * first generated code to confirm the app is configured correctly.
     */
    public function setupTwoFactor(): never
    {
        method('GET');
        $auth   = AuthMiddleware::require();
        $user   = $this->users->findById((int) $auth['sub']);
        if (!$user) error('User not found.', 404);

        $secret = TOTPHelper::generateSecret();
        // Stage the secret. enabled stays 0 until /enable confirms.
        $this->users->update($user['id'], [
            'two_factor_secret'  => $secret,
            'two_factor_enabled' => 0,
        ]);

        $uri = TOTPHelper::provisioningUri(
            $secret,
            $user['email'],
            env('APP_NAME', 'Pick&Go LB')
        );

        success(['secret' => $secret, 'otpauth_uri' => $uri]);
    }

    /**
     * POST /api/auth/2fa/enable — confirm the user's app is set up by
     * verifying a code they generated from it. Returns one-time backup codes.
     */
    public function enableTwoFactor(): never
    {
        method('POST');
        $auth   = AuthMiddleware::require();
        $code   = trim((string) (getBody()['code'] ?? ''));
        if (!$code) error('Code is required.', 422);

        $user = $this->users->findById((int) $auth['sub']);
        if (!$user || empty($user['two_factor_secret'])) {
            error('Run /2fa/setup first to generate a secret.', 400);
        }
        if (!TOTPHelper::verify($user['two_factor_secret'], $code)) {
            error('Invalid code. Make sure your phone clock is accurate.', 422);
        }

        $backupCodes = TOTPHelper::generateBackupCodes();
        $this->users->update($user['id'], [
            'two_factor_enabled'      => 1,
            'two_factor_backup_codes' => json_encode($backupCodes),
            'two_factor_enabled_at'   => date('Y-m-d H:i:s'),
        ]);

        success(['backup_codes' => $backupCodes], 'Two-factor authentication is now active.');
    }

    /**
     * POST /api/auth/2fa/disable — turn 2FA off. Requires the current password
     * (so a stolen access token alone can't disable it).
     */
    public function disableTwoFactor(): never
    {
        method('POST');
        $auth     = AuthMiddleware::require();
        $password = (string) (getBody()['password'] ?? '');
        if (!$password) error('Password is required.', 422);

        $user = $this->users->findById((int) $auth['sub']);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            error('Incorrect password.', 401);
        }

        $this->users->update($user['id'], [
            'two_factor_enabled'      => 0,
            'two_factor_secret'       => null,
            'two_factor_backup_codes' => null,
            'two_factor_enabled_at'   => null,
        ]);

        success(null, 'Two-factor authentication disabled.');
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
