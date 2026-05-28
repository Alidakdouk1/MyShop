-- Migration 034: bundles + bundle_items
-- Admin-defined "buy these together for $X" deals. When a shopper adds a
-- bundle via the cart endpoint, the bundle price is distributed across its
-- items as price snapshots, so checkout charges the deal.
CREATE TABLE IF NOT EXISTS `bundles` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `title`        VARCHAR(150)  NOT NULL,
  `bundle_price` DECIMAL(10,2) NOT NULL,
  `image_url`    VARCHAR(500)  DEFAULT NULL,
  `is_active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bundles_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bundle_items` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bundle_id`  INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bi` (`bundle_id`, `product_id`),
  KEY `idx_bi_product` (`product_id`),
  CONSTRAINT `fk_bi_bundle`
    FOREIGN KEY (`bundle_id`) REFERENCES `bundles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bi_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
