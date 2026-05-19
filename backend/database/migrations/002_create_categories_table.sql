-- Migration 002: categories (self-referencing for sub-categories)
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `parent_id`  INT UNSIGNED  DEFAULT NULL,
  `name`       VARCHAR(100)  NOT NULL,
  `slug`       VARCHAR(120)  NOT NULL,
  `image_url`  VARCHAR(500)  DEFAULT NULL,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug`       (`slug`),
  KEY `idx_categories_parent_id`        (`parent_id`),
  KEY `idx_categories_sort_order`       (`sort_order`),
  CONSTRAINT `fk_categories_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
