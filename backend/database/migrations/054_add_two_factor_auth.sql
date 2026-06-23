-- Migration 054: TOTP two-factor authentication.
-- Secret is the base32-encoded shared key the user's authenticator app uses
-- to generate codes; backup_codes is a JSON array of one-time recovery codes
-- shown to the user when they enable 2FA (in case they lose their phone).
ALTER TABLE `users`
  ADD COLUMN `two_factor_secret`       VARCHAR(64)  DEFAULT NULL AFTER `password_hash`,
  ADD COLUMN `two_factor_enabled`      TINYINT(1)   NOT NULL DEFAULT 0 AFTER `two_factor_secret`,
  ADD COLUMN `two_factor_backup_codes` TEXT         DEFAULT NULL AFTER `two_factor_enabled`,
  ADD COLUMN `two_factor_enabled_at`   DATETIME     DEFAULT NULL AFTER `two_factor_backup_codes`;
