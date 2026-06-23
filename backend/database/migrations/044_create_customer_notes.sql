-- Migration 044: customer notes + VIP flag.
--
-- VIP is a three-level enum (regular / vip / gold) so admins can tier the
-- treatment without us hard-coding a single "is_vip" boolean we'd have to
-- re-shape later.
ALTER TABLE `users`
  ADD COLUMN `vip_level` ENUM('regular','vip','gold') NOT NULL DEFAULT 'regular' AFTER `role`,
  ADD INDEX `idx_users_vip_level` (`vip_level`);

-- Notes are admin-only and survive their author being deleted (set null on
-- admin FK). A user being deleted removes their notes (cascade).
CREATE TABLE IF NOT EXISTS `customer_notes` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `admin_id`   INT UNSIGNED DEFAULT NULL,
  `body`       TEXT         NOT NULL,
  `pinned`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notes_user`   (`user_id`),
  KEY `idx_notes_pinned` (`user_id`, `pinned`),
  CONSTRAINT `fk_notes_user`
    FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notes_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
