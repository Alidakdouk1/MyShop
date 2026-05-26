-- Migration 028: order_item_options
-- Records which filter options (with their own stock pool) were bought on each
-- order line. Mirrors cart_item_options. Needed so stock can be put back on the
-- correct option pool when an order is cancelled or refunded.
CREATE TABLE IF NOT EXISTS `order_item_options` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_item_id`    INT UNSIGNED NOT NULL,
  `filter_option_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_order_item_option` (`order_item_id`, `filter_option_id`),
  KEY `idx_oio_item` (`order_item_id`),
  CONSTRAINT `fk_oio_item`   FOREIGN KEY (`order_item_id`)    REFERENCES `order_items` (`id`)    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_oio_option` FOREIGN KEY (`filter_option_id`) REFERENCES `filter_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
