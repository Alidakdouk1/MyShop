-- Migration 025: back-in-stock notification requests
CREATE TABLE IF NOT EXISTS `stock_notifications` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`  INT UNSIGNED NOT NULL,
  `email`       VARCHAR(190) NOT NULL,
  `is_notified` TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_stock_notify` (`product_id`, `email`),
  KEY `idx_stock_notify_product` (`product_id`),
  CONSTRAINT `fk_stock_notify_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
