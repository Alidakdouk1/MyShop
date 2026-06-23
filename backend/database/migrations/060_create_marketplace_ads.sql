-- Migration 060: user classifieds / marketplace (OLX-style).
-- Any logged-in user can post an item for sale. Ads start as 'pending' and an
-- admin approves them before they appear publicly. Images are stored as a JSON
-- array of relative upload paths (same convention as product images).
CREATE TABLE IF NOT EXISTS `marketplace_ads` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT UNSIGNED NOT NULL,
  `title`         VARCHAR(160) NOT NULL,
  `description`   TEXT         DEFAULT NULL,
  `price`         DECIMAL(10,2) DEFAULT NULL,
  `category`      VARCHAR(60)  DEFAULT NULL,
  `condition`     ENUM('new','like_new','good','fair','used') DEFAULT 'good',
  `location`      VARCHAR(120) DEFAULT NULL,
  `contact_phone` VARCHAR(30)  DEFAULT NULL,
  `images`        TEXT         DEFAULT NULL,   -- JSON array of relative paths
  `status`        ENUM('pending','approved','rejected','sold') NOT NULL DEFAULT 'pending',
  `reject_reason` VARCHAR(255) DEFAULT NULL,
  `view_count`    INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mp_status`   (`status`, `created_at`),
  KEY `idx_mp_user`     (`user_id`),
  KEY `idx_mp_category` (`category`, `status`),
  CONSTRAINT `fk_mp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
