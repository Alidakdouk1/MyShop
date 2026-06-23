-- Migration 056: Web Push subscriptions.
-- One row per (user, browser-endpoint). The push service's endpoint URL is
-- the unique key; p256dh + auth are the keys we use to encrypt payloads to
-- this subscriber. user_id is nullable so anonymous "notify when back in stock"
-- subscriptions work for guests who only later create an account.
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `endpoint`   VARCHAR(500) NOT NULL,
  `p256dh`     VARCHAR(200) NOT NULL,
  `auth_token` VARCHAR(50)  NOT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_push_endpoint` (`endpoint`),
  KEY `idx_push_user` (`user_id`),
  CONSTRAINT `fk_push_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
