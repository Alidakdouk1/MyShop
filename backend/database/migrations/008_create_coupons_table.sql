-- Migration 008: coupons
CREATE TABLE IF NOT EXISTS `coupons` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `code`        VARCHAR(50)    NOT NULL,
  `type`        ENUM('percent','fixed') NOT NULL,
  `value`       DECIMAL(10,2)  NOT NULL,
  `min_order`   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `usage_limit` INT UNSIGNED   DEFAULT NULL,
  `used_count`  INT UNSIGNED   NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1)     NOT NULL DEFAULT 1,
  `expires_at`  DATETIME       DEFAULT NULL,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupons_code`     (`code`),
  KEY `idx_coupons_is_active`      (`is_active`),
  KEY `idx_coupons_expires_at`     (`expires_at`),
  KEY `idx_coupons_active_expires` (`is_active`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
