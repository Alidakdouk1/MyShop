-- Migration 024: titled blocks ("others") inside a category's mega-menu.
--   A top-level category can have several named sections (e.g. "New in Curve
--   Clothing", "Officially Licensed Collabs"). Each sub-category may belong to one
--   section via categories.section_id; sub-categories with no section show in the
--   category's own main block.

CREATE TABLE IF NOT EXISTS `category_sections` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `title`       VARCHAR(150) NOT NULL,
  `sort_order`  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cs_category` (`category_id`),
  CONSTRAINT `fk_cs_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link a sub-category to one of its parent's sections (NULL = main block).
ALTER TABLE `categories`
  ADD COLUMN `section_id` INT UNSIGNED DEFAULT NULL AFTER `parent_id`,
  ADD KEY `idx_categories_section` (`section_id`),
  ADD CONSTRAINT `fk_categories_section`
    FOREIGN KEY (`section_id`) REFERENCES `category_sections` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
