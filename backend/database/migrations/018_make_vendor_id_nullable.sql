-- Migration 018: make products.vendor_id nullable (vendor role removed)
ALTER TABLE `products`
  MODIFY `vendor_id` INT UNSIGNED NULL DEFAULT NULL;
