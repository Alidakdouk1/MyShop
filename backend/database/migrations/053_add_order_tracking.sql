-- Migration 053: order shipment tracking (extends the existing tracking_number).
-- Carrier picks the right URL template; tracking_url is an optional override
-- when admin pastes a full link (e.g. for "Other" carriers).
ALTER TABLE `orders`
  ADD COLUMN `carrier`      VARCHAR(50)  DEFAULT NULL AFTER `payment_status`,
  ADD COLUMN `tracking_url` VARCHAR(500) DEFAULT NULL AFTER `tracking_number`;
