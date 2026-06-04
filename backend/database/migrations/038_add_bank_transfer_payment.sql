-- Migration 038: extend orders.payment_method enum to include bank_transfer.
-- 'stripe' stays in the list for legacy reasons; the storefront UI just
-- doesn't expose it any more.
ALTER TABLE `orders`
  MODIFY COLUMN `payment_method` ENUM('stripe','cod','bank_transfer') NOT NULL DEFAULT 'cod';
