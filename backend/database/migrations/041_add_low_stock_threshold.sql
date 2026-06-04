-- Migration 041: per-product low-stock alert threshold.
-- Default 5 keeps existing behavior (the dashboard previously used a hard-coded 5).
-- Admins can override per product on the edit form.
ALTER TABLE `products`
  ADD COLUMN `low_stock_threshold` INT UNSIGNED NOT NULL DEFAULT 5 AFTER `stock_qty`;
