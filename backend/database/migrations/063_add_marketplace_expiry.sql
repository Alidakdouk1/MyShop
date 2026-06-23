-- Migration 063: marketplace ad expiry.
-- expires_at is set when an ad is approved (now + ad_expiry_days). The public
-- browse query hides ads past their expiry without deleting them, so owners can
-- renew. NULL = never expires (used when expiry is disabled).
ALTER TABLE `marketplace_ads`
  ADD COLUMN `expires_at` DATETIME DEFAULT NULL AFTER `featured_at`,
  ADD KEY `idx_mp_expires` (`expires_at`);
