-- Migration 017: add has_sizes flag to categories
-- Clothing/shoe categories show size selectors while electronics/accessories do not.
ALTER TABLE `categories`
  ADD COLUMN `has_sizes` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
  AFTER `image_url`;
