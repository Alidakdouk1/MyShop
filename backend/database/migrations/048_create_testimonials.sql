-- Migration 048: hand-curated customer testimonials shown on the homepage.
-- Admin can either write a testimonial from scratch or import an existing
-- review (source_review_id is the audit trail back to the original).
CREATE TABLE IF NOT EXISTS `testimonials` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(100)  NOT NULL,
  `location`          VARCHAR(100)  DEFAULT NULL,
  `photo_url`         VARCHAR(500)  DEFAULT NULL,
  `rating`            TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `body`              TEXT          NOT NULL,
  `source_review_id`  INT UNSIGNED  DEFAULT NULL,
  `is_active`         TINYINT(1)    NOT NULL DEFAULT 1,
  `sort_order`        INT UNSIGNED  NOT NULL DEFAULT 0,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
