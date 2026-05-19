-- Migration 011: orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id`                       INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `user_id`                  INT UNSIGNED   NOT NULL,
  `address_id`               INT UNSIGNED   DEFAULT NULL,
  `coupon_id`                INT UNSIGNED   DEFAULT NULL,
  `status`                   ENUM('pending','confirmed','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `subtotal`                 DECIMAL(10,2)  NOT NULL,
  `shipping_fee`             DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `discount`                 DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `total`                    DECIMAL(10,2)  NOT NULL,
  `payment_method`           ENUM('stripe','cod') NOT NULL DEFAULT 'cod',
  `payment_status`           ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `stripe_payment_intent_id` VARCHAR(100)   DEFAULT NULL,
  `tracking_number`          VARCHAR(100)   DEFAULT NULL,
  `notes`                    TEXT           DEFAULT NULL,
  `created_at`               DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id`        (`user_id`),
  KEY `idx_orders_status`         (`status`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_created_at`     (`created_at`),
  KEY `idx_orders_coupon_id`      (`coupon_id`),
  KEY `idx_orders_user_status`    (`user_id`, `status`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_address`
    FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_coupon`
    FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
