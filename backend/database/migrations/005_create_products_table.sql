-- Migration 005: products
CREATE TABLE IF NOT EXISTS `products` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `vendor_id`   INT UNSIGNED    NOT NULL,
  `category_id` INT UNSIGNED    NOT NULL,
  `name`        VARCHAR(255)    NOT NULL,
  `slug`        VARCHAR(280)    NOT NULL,
  `description` TEXT            DEFAULT NULL,
  `base_price`  DECIMAL(10,2)   NOT NULL,
  `sale_price`  DECIMAL(10,2)   DEFAULT NULL,
  `stock_qty`   INT UNSIGNED    NOT NULL DEFAULT 0,
  `sku`         VARCHAR(100)    NOT NULL,
  `status`      ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  `is_featured` TINYINT(1)      NOT NULL DEFAULT 0,
  `views_count` INT UNSIGNED    NOT NULL DEFAULT 0,
  `weight`      DECIMAL(8,2)    DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug`              (`slug`),
  UNIQUE KEY `uq_products_sku`               (`sku`),
  KEY `idx_products_vendor_id`               (`vendor_id`),
  KEY `idx_products_category_id`             (`category_id`),
  KEY `idx_products_status`                  (`status`),
  KEY `idx_products_is_featured`             (`is_featured`),
  KEY `idx_products_created_at`              (`created_at`),
  KEY `idx_products_base_price`              (`base_price`),
  KEY `idx_products_sale_price`              (`sale_price`),
  KEY `idx_products_status_category`         (`status`, `category_id`),
  KEY `idx_products_status_featured`         (`status`, `is_featured`),
  CONSTRAINT `fk_products_vendor`
    FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
