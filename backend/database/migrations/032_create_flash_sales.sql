-- Migration 032: flash_sales + flash_sale_items
-- Time-limited promotions. A sale applies a percentage discount to its
-- assigned products while NOW() is within [starts_at, ends_at). The price
-- reverts automatically once the window passes (computed at read time —
-- no cron needed).
CREATE TABLE IF NOT EXISTS `flash_sales` (
  `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `title`            VARCHAR(150)  NOT NULL,
  `discount_percent` DECIMAL(5,2)  NOT NULL,
  `starts_at`        DATETIME      NOT NULL,
  `ends_at`          DATETIME      NOT NULL,
  `created_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_flash_window` (`starts_at`, `ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `flash_sale_items` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `flash_sale_id` INT UNSIGNED NOT NULL,
  `product_id`    INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fsi` (`flash_sale_id`, `product_id`),
  KEY `idx_fsi_product` (`product_id`),
  CONSTRAINT `fk_fsi_sale`
    FOREIGN KEY (`flash_sale_id`) REFERENCES `flash_sales` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fsi_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
