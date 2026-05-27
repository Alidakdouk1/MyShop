-- Migration 030: order_status_history
-- Records every status change with a timestamp so the customer-facing order
-- page can render a true tracking timeline (Placed → Confirmed → Shipped → …).
CREATE TABLE IF NOT EXISTS `order_status_history` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`   INT UNSIGNED NOT NULL,
  `status`     ENUM('pending','confirmed','shipped','delivered','cancelled','refunded') NOT NULL,
  `note`       VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_osh_order` (`order_id`),
  CONSTRAINT `fk_osh_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill existing orders so their timelines aren't empty:
--   • a "placed" row at the order's creation time
INSERT INTO `order_status_history` (`order_id`, `status`, `created_at`)
SELECT `id`, 'pending', `created_at` FROM `orders`;

--   • a row for the current status (using updated_at) when it's past "pending"
INSERT INTO `order_status_history` (`order_id`, `status`, `created_at`)
SELECT `id`, `status`, `updated_at` FROM `orders` WHERE `status` <> 'pending';
