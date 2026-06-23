-- Migration 049: cart-side automatic promotions.
--
-- Two types ship in phase 1:
--   'bogo' — Buy N from {scope}, get M cheapest items at `discount_percent` off.
--             scope_type: 'all' | 'category' | 'products'
--             scope_ids:  JSON array (category_ids or product_ids); ignored for 'all'.
--   'gift' — Spend >= min_subtotal, get `gift_product_id` automatically added at $0.
--             Only applies if the gift product is in stock.
--
-- Both honor optional starts_at / ends_at windows and the is_active flag.
CREATE TABLE IF NOT EXISTS `promotions` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(120)  NOT NULL,
  `type`              ENUM('bogo','gift') NOT NULL,
  `is_active`         TINYINT(1)    NOT NULL DEFAULT 1,
  `starts_at`         DATETIME      DEFAULT NULL,
  `ends_at`           DATETIME      DEFAULT NULL,

  -- BOGO fields
  `buy_quantity`      INT UNSIGNED  DEFAULT NULL,
  `get_quantity`      INT UNSIGNED  DEFAULT NULL,
  `discount_percent`  TINYINT UNSIGNED DEFAULT NULL,
  `scope_type`        ENUM('all','category','products') DEFAULT NULL,
  `scope_ids`         LONGTEXT      DEFAULT NULL,

  -- Free-gift fields
  `min_subtotal`      DECIMAL(10,2) DEFAULT NULL,
  `gift_product_id`   INT UNSIGNED  DEFAULT NULL,

  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_promotions_active` (`is_active`, `starts_at`, `ends_at`),
  CONSTRAINT `fk_promotions_gift`
    FOREIGN KEY (`gift_product_id`) REFERENCES `products` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
