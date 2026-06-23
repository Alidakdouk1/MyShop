-- Migration 059: comments on reels (which are product_images rows with a video).
-- FK on reel_id → product_images.id ensures comments cascade-delete with the
-- video. user_id can go NULL if the commenter is later deleted, so we keep
-- the conversation history readable.
CREATE TABLE IF NOT EXISTS `reel_comments` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reel_id`    INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `body`       TEXT         NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reel_comments_reel` (`reel_id`, `created_at`),
  KEY `idx_reel_comments_user` (`user_id`),
  CONSTRAINT `fk_reel_comments_reel`
    FOREIGN KEY (`reel_id`) REFERENCES `product_images` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reel_comments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
