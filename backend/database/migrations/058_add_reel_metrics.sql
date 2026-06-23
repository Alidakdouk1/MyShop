-- Migration 058: reel metrics + admin curation columns on product_images.
-- product_images rows with media_type IN ('video','youtube') are reels;
-- these columns let us order the feed by popularity and let admins pin
-- specific reels to the top regardless of organic ordering.
ALTER TABLE `product_images`
  ADD COLUMN `view_count` INT UNSIGNED NOT NULL DEFAULT 0   AFTER `sort_order`,
  ADD COLUMN `is_pinned`  TINYINT(1)   NOT NULL DEFAULT 0   AFTER `view_count`,
  ADD COLUMN `pin_order`  INT UNSIGNED NOT NULL DEFAULT 0   AFTER `is_pinned`,
  ADD KEY `idx_reels_pin` (`is_pinned`, `pin_order`),
  ADD KEY `idx_reels_views` (`view_count`);
