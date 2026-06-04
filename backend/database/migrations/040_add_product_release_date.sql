-- Migration 040: pre-order / coming-soon products.
-- A product with release_date in the future is treated as a pre-order:
--   • storefront shows "Coming on <date>" + "Notify Me" instead of "Add to Cart"
--   • backend blocks cart adds defensively
-- NULL (or a past date) = normal product, no change to behaviour.
ALTER TABLE `products`
  ADD COLUMN `release_date` DATE NULL AFTER `stock_qty`,
  ADD INDEX `idx_products_release_date` (`release_date`);
