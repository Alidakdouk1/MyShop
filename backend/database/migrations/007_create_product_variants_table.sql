-- Migration 007: product_variants
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id`             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `product_id`     INT UNSIGNED   NOT NULL,
  `size`           VARCHAR(30)    DEFAULT NULL,
  `color`          VARCHAR(50)    DEFAULT NULL,
  `price_modifier` DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `stock_qty`      INT UNSIGNED   NOT NULL DEFAULT 0,
  `sku`            VARCHAR(100)   NOT NULL,
  `created_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_variants_sku`        (`sku`),
  KEY `idx_product_variants_product_id`       (`product_id`),
  KEY `idx_product_variants_size_color`       (`product_id`, `size`, `color`),
  CONSTRAINT `fk_product_variants_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
