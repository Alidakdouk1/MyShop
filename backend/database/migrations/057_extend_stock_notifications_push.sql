-- Migration 057: back-in-stock subscribers can now ask for a push notification
-- instead of (or in addition to) an email.
--
-- A row represents one subscription:
--   email IS NOT NULL, push_endpoint IS NULL    → email subscriber
--   email IS NULL,     push_endpoint IS NOT NULL → push subscriber
--
-- The existing UNIQUE (product_id, email) becomes a partial-style constraint:
-- MySQL treats NULL as distinct in UNIQUE, so many push-only rows with email=NULL
-- coexist fine. We add a matching UNIQUE on (product_id, push_endpoint) for the
-- push side.
ALTER TABLE `stock_notifications`
  MODIFY COLUMN `email`     VARCHAR(190) NULL,
  ADD COLUMN `push_endpoint` VARCHAR(500) NULL AFTER `email`,
  ADD UNIQUE KEY `uq_stock_push` (`product_id`, `push_endpoint`);
