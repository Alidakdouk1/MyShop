-- Migration 039: extend orders.payment_method enum to include Whish Money.
-- Whish is the dominant peer-to-peer payment app in Lebanon — customers pay
-- by sending money to the shop owner's phone number from their Whish app.
ALTER TABLE `orders`
  MODIFY COLUMN `payment_method` ENUM('stripe','cod','bank_transfer','whish') NOT NULL DEFAULT 'cod';
