-- Migration 046: structured product specifications.
--
-- Stored as a JSON array of {label, value} objects so the admin form keeps
-- row order and we don't need a side table for what's essentially per-product
-- presentation data. Filtering still happens through the filter system; specs
-- are purely a buyer-confidence spec sheet on the PDP.
ALTER TABLE `products`
  ADD COLUMN `specs` JSON NULL DEFAULT NULL AFTER `description`;
