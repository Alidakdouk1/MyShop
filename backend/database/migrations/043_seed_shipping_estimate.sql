-- Migration 043: shipping-estimate defaults.
-- The values seeded here are conservative for Lebanon-domestic shipping:
--   processing 1-2 business days, transit 2-4 business days,
--   orders before 2 PM ship same day, weekends don't count.
-- Admin can tune these from /admin/shipping-estimate.
INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
  ('shipping_estimate', JSON_OBJECT(
    'enabled',             1,
    'processing_days_min', 1,
    'processing_days_max', 2,
    'transit_days_min',    2,
    'transit_days_max',    4,
    'cutoff_hour',         14,
    'weekend_skip',        1
  ))
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;
