-- Migration 012: order_items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`                    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `order_id`              INT UNSIGNED   NOT NULL,
  `product_id`            INT UNSIGNED   NOT NULL,
  `variant_id`            INT UNSIGNED   DEFAULT NULL,
  `quantity`              SMALLINT UNSIGNED NOT NULL,
  `unit_price`            DECIMAL(10,2)  NOT NULL,
  `total_price`           DECIMAL(10,2)  NOT NULL,
  `product_name_snapshot` VARCHAR(255)   NOT NULL,
  `sku_snapshot`          VARCHAR(100)   DEFAULT NULL,
  `created_at`            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id`   (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
