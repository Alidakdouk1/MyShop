-- Migration 055: temporary stock holds for items sitting in carts.
-- One row per (cart, product, variant). Expires_at is set 15 min in the
-- future on insert; effective stock = stock_qty - SUM(qty WHERE expires_at > NOW()).
-- We never run a cleanup job — expired rows are filtered out at read time and
-- get overwritten on the next reservation for the same cart+sku, so the table
-- stays small.
CREATE TABLE IF NOT EXISTS `stock_reservations` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_id`    INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `variant_id` INT UNSIGNED DEFAULT NULL,
  `quantity`   INT UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` DATETIME     NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reservation_cart_sku` (`cart_id`, `product_id`, `variant_id`),
  KEY `idx_reservation_product` (`product_id`, `expires_at`),
  KEY `idx_reservation_variant` (`variant_id`, `expires_at`),
  CONSTRAINT `fk_reservation_cart`    FOREIGN KEY (`cart_id`)    REFERENCES `cart`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservation_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
