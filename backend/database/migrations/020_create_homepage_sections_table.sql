-- Migration 020: homepage_sections table
-- Stores each homepage section as an individual row with type, order, visibility, and JSON data.
-- This replaces the monolithic settings_json approach with a per-section CMS model.
CREATE TABLE IF NOT EXISTS `homepage_sections` (
  `id`           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  `type`         VARCHAR(50)   NOT NULL,
  `label`        VARCHAR(255)  NOT NULL DEFAULT '',
  `sort_order`   INT           NOT NULL DEFAULT 0,
  `is_visible`   TINYINT(1)   NOT NULL DEFAULT 1,
  `section_data` JSON          NOT NULL,
  `styles`       JSON,
  `created_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
