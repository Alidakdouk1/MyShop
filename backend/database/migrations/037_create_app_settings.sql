-- Migration 037: app_settings
-- Generic key/JSON store for small admin-tunable features (activity ticker,
-- future feature flags, etc.). Each row is one settings group.
CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key`   VARCHAR(64) NOT NULL,
  `setting_value` TEXT        NOT NULL,
  `updated_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed defaults for the live-activity ticker.
INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES (
  'activity_ticker',
  '{"enabled":1,"max_age_hours":72,"max_items":20,"show_city":1,"show_duration_sec":7,"gap_sec":2,"first_delay_sec":3}'
);
