-- Migration 042: abandoned cart recovery tracking.
--
-- One row per cart that we've attempted to recover. The unique key on cart_id
-- prevents double-emailing the same cart even if the admin clicks "Send" twice.
--
-- We deliberately skip hard FKs because the cart row outlives the cart (it gets
-- cleared on checkout, not deleted) and we want recoveries to survive coupon /
-- order deletes for analytics.
CREATE TABLE IF NOT EXISTS `abandoned_cart_recoveries` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_id`        INT UNSIGNED NOT NULL,
  `user_id`        INT UNSIGNED NOT NULL,
  `coupon_id`      INT UNSIGNED DEFAULT NULL,
  `email_sent_at`  DATETIME     DEFAULT NULL,
  `recovered_at`   DATETIME     DEFAULT NULL,
  `order_id`       INT UNSIGNED DEFAULT NULL,
  `recovered_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recoveries_cart` (`cart_id`),
  KEY `idx_recoveries_user`   (`user_id`),
  KEY `idx_recoveries_coupon` (`coupon_id`),
  KEY `idx_recoveries_order`  (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings — admin can change these from the UI.
INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
  ('abandoned_cart_recovery', JSON_OBJECT(
    'enabled',          1,
    'delay_hours',      24,
    'discount_percent', 10,
    'expiry_days',      7,
    'min_cart_value',   0
  ))
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;
