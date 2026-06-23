-- Migration 052: extend users table with profile personalisation fields.
--   birthday              — for birthday promos, age-restricted products
--   gender                — for personalisation; nullable + 'prefer not to say'
--   preferred_language    — locale code (en, ar) — overrides browser default
--   preferred_currency    — currency code (USD, EUR, LBP)
--   notification_prefs    — JSON: { email_order, email_marketing, whatsapp_order, sms_order }
--   phone_verified_at     — for the verification badge UI
--   newsletter_subscribed — derived from newsletter_subscribers, denormalized
--                           here so the profile UI doesn't need a second join
ALTER TABLE `users`
  ADD COLUMN `birthday`              DATE         DEFAULT NULL AFTER `phone`,
  ADD COLUMN `gender`                ENUM('male','female','other','prefer_not_say') DEFAULT NULL AFTER `birthday`,
  ADD COLUMN `preferred_language`    VARCHAR(8)   DEFAULT NULL AFTER `gender`,
  ADD COLUMN `preferred_currency`    VARCHAR(8)   DEFAULT NULL AFTER `preferred_language`,
  ADD COLUMN `notification_prefs`    JSON         DEFAULT NULL AFTER `preferred_currency`,
  ADD COLUMN `phone_verified_at`     DATETIME     DEFAULT NULL AFTER `notification_prefs`;
