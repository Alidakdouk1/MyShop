-- Migration 019: homepage_settings table
-- Stores all editable homepage content as a single JSON blob.
CREATE TABLE IF NOT EXISTS `homepage_settings` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `settings_json` LONGTEXT NOT NULL,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed with defaults matching the original Home.jsx design
INSERT INTO `homepage_settings` (`settings_json`) VALUES ('{}');
