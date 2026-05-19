-- Migration 004: vendor_profiles
CREATE TABLE IF NOT EXISTS `vendor_profiles` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED   NOT NULL,
  `store_name`  VARCHAR(150)   NOT NULL,
  `store_slug`  VARCHAR(160)   NOT NULL,
  `bio`         TEXT           DEFAULT NULL,
  `logo_url`    VARCHAR(500)   DEFAULT NULL,
  `banner_url`  VARCHAR(500)   DEFAULT NULL,
  `rating_avg`  DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
  `total_sales` INT UNSIGNED   NOT NULL DEFAULT 0,
  `is_approved` TINYINT(1)     NOT NULL DEFAULT 0,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendor_profiles_user_id`    (`user_id`),
  UNIQUE KEY `uq_vendor_profiles_store_slug` (`store_slug`),
  KEY `idx_vendor_profiles_rating`           (`rating_avg`),
  KEY `idx_vendor_profiles_is_approved`      (`is_approved`),
  CONSTRAINT `fk_vendor_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
