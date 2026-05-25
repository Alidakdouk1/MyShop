-- Migration 023: add a tax column to orders
-- Additive + safe: existing orders default to 0.00. Lets the checkout itemise
-- tax separately so subtotal − discount + shipping + tax === total holds.
ALTER TABLE `orders`
  ADD COLUMN `tax` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `discount`;
