-- Migration 010: cart_items
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id`             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `cart_id`        INT UNSIGNED   NOT NULL,
  `product_id`     INT UNSIGNED   NOT NULL,
  `variant_id`     INT UNSIGNED   DEFAULT NULL,
  `quantity`       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `price_snapshot` DECIMAL(10,2)  NOT NULL,
  `created_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cart_items_cart_id`    (`cart_id`),
  KEY `idx_cart_items_product_id` (`product_id`),
  KEY `idx_cart_items_variant_id` (`variant_id`),
  CONSTRAINT `fk_cart_items_cart`
    FOREIGN KEY (`cart_id`) REFERENCES `cart` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_items_variant`
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
