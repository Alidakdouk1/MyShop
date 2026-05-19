-- Migration 001: users
CREATE TABLE IF NOT EXISTS `users` (
  `id`                       INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `name`                     VARCHAR(100)     NOT NULL,
  `email`                    VARCHAR(191)     NOT NULL,
  `password_hash`            VARCHAR(255)     NOT NULL,
  `role`                     ENUM('customer','vendor','admin') NOT NULL DEFAULT 'customer',
  `avatar_url`               VARCHAR(500)     DEFAULT NULL,
  `phone`                    VARCHAR(30)      DEFAULT NULL,
  `is_verified`              TINYINT(1)       NOT NULL DEFAULT 0,
  `email_verification_token` VARCHAR(100)     DEFAULT NULL,
  `password_reset_token`     VARCHAR(100)     DEFAULT NULL,
  `password_reset_expires`   DATETIME         DEFAULT NULL,
  `refresh_token_hash`       VARCHAR(255)     DEFAULT NULL,
  `last_login_at`            DATETIME         DEFAULT NULL,
  `created_at`               DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role`       (`role`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
