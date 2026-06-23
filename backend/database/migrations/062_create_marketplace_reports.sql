-- Migration 062: user reports / flags on marketplace ads.
-- One row per (ad, reporter) so a single user can't inflate the count. Reports
-- surface in the admin panel so bad listings get taken down fast.
CREATE TABLE IF NOT EXISTS `marketplace_ad_reports` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ad_id`      INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `reason`     VARCHAR(40)  NOT NULL,
  `note`       VARCHAR(300) DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_report_ad_user` (`ad_id`, `user_id`),
  KEY `idx_report_ad` (`ad_id`),
  CONSTRAINT `fk_report_ad`   FOREIGN KEY (`ad_id`)   REFERENCES `marketplace_ads`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_report_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
