-- Migration 027: cart line options (the schema CartModel was written against but
-- that was never created — its absence made every cart add/read throw a fatal
-- "Unknown column 'option_signature'" error, so carts always appeared empty).

-- 1) Per-line signature of the picked filter options ("5,12,18"), so identical
--    picks merge into one cart row.
ALTER TABLE `cart_items`
  ADD COLUMN `option_signature` VARCHAR(255) DEFAULT NULL AFTER `variant_id`;

-- 2) The picked filter options attached to each cart line.
CREATE TABLE IF NOT EXISTS `cart_item_options` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_item_id`     INT UNSIGNED NOT NULL,
  `filter_option_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cart_item_option` (`cart_item_id`, `filter_option_id`),
  KEY `idx_cio_item` (`cart_item_id`),
  CONSTRAINT `fk_cio_item`   FOREIGN KEY (`cart_item_id`)     REFERENCES `cart_items` (`id`)     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cio_option` FOREIGN KEY (`filter_option_id`) REFERENCES `filter_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
