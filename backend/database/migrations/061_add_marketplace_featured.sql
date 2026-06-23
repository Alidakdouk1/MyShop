-- Migration 061: featured / promoted marketplace ads.
-- Admin flags an ad as featured; it pins to the top of the public marketplace
-- with a gold badge. featured_at lets newer features rank above older ones.
ALTER TABLE `marketplace_ads`
  ADD COLUMN `is_featured`  TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`,
  ADD COLUMN `featured_at`  DATETIME   DEFAULT NULL        AFTER `is_featured`,
  ADD KEY `idx_mp_featured` (`is_featured`, `featured_at`);
