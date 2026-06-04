-- Migration 035: review_photos
-- Customer-uploaded photos attached to a review. Cascades when the review or
-- its parent product/user is removed.
CREATE TABLE IF NOT EXISTS `review_photos` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `review_id`  INT UNSIGNED NOT NULL,
  `image_url`  VARCHAR(500) NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rp_review` (`review_id`),
  CONSTRAINT `fk_rp_review`
    FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
