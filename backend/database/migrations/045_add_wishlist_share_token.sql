-- Migration 045: public wishlist sharing.
-- Each user gets a stable, URL-safe token when they first enable sharing.
-- NULL means sharing is OFF (the default). The unique index doubles as a
-- fast lookup for the public /api/wishlists/shared/{token} endpoint.
ALTER TABLE `users`
  ADD COLUMN `wishlist_share_token` VARCHAR(32) NULL DEFAULT NULL AFTER `vip_level`,
  ADD UNIQUE KEY `uq_users_wishlist_token` (`wishlist_share_token`);
