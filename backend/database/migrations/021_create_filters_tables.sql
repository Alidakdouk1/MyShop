-- Migration 021: dynamic product filters
--   `filters`               — filter definitions (Size, Color, Material, Price, …)
--   `filter_options`        — the selectable values inside a filter (S, M, L, Red, …)
--   `product_filter_values` — which filter values are attached to each product

CREATE TABLE IF NOT EXISTS `filters` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(120) NOT NULL,
  `type`          ENUM('single','multi','range') NOT NULL DEFAULT 'multi',
  `unit`          VARCHAR(20)  DEFAULT NULL,
  `is_required`   TINYINT(1)   NOT NULL DEFAULT 0,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `display_order` INT          NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_filters_name`        (`name`),
  KEY        `idx_filters_is_active`  (`is_active`),
  KEY        `idx_filters_display`    (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `filter_options` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `filter_id`     INT UNSIGNED NOT NULL,
  `value`         VARCHAR(120) NOT NULL,
  `display_order` INT          NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_filter_options_filter_value` (`filter_id`, `value`),
  KEY        `idx_filter_options_filter`      (`filter_id`),
  KEY        `idx_filter_options_display`     (`display_order`),
  CONSTRAINT `fk_filter_options_filter`
    FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_filter_values` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`        INT UNSIGNED NOT NULL,
  `filter_id`         INT UNSIGNED NOT NULL,
  `filter_option_id`  INT UNSIGNED DEFAULT NULL,
  `min_value`         DECIMAL(12,2) DEFAULT NULL,
  `max_value`         DECIMAL(12,2) DEFAULT NULL,
  `is_visible`        TINYINT(1)   NOT NULL DEFAULT 1,
  `quantity`          INT          DEFAULT NULL,
  `hover_text`        VARCHAR(255) DEFAULT NULL,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pfv_product`        (`product_id`),
  KEY `idx_pfv_filter`         (`filter_id`),
  KEY `idx_pfv_option`         (`filter_option_id`),
  KEY `idx_pfv_product_filter` (`product_id`, `filter_id`),
  CONSTRAINT `fk_pfv_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pfv_filter`
    FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pfv_option`
    FOREIGN KEY (`filter_option_id`) REFERENCES `filter_options` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
