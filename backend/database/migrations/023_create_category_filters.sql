-- Migration 023: which filters appear in the shop sidebar for each category.
--   The admin assigns filters per category (checkboxes on the category form).
--   When a customer opens a category, only that category's filters show.

CREATE TABLE IF NOT EXISTS `category_filters` (
  `category_id` INT UNSIGNED NOT NULL,
  `filter_id`   INT UNSIGNED NOT NULL,
  PRIMARY KEY (`category_id`, `filter_id`),
  KEY `idx_cf_filter` (`filter_id`),
  CONSTRAINT `fk_cf_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cf_filter`
    FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
