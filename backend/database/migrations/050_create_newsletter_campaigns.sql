-- Migration 050: one-off email blasts to newsletter subscribers.
-- Status flow: draft → sending → sent (or failed). Recipient counts captured
-- on send so the admin can see "sent to 142 / failed 3" in the list.
CREATE TABLE IF NOT EXISTS `newsletter_campaigns` (
  `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `subject`          VARCHAR(200)  NOT NULL,
  `body`             MEDIUMTEXT    NOT NULL,
  `cta_text`         VARCHAR(80)   DEFAULT NULL,
  `cta_url`          VARCHAR(500)  DEFAULT NULL,
  `status`           ENUM('draft','sending','sent','failed') NOT NULL DEFAULT 'draft',
  `recipient_count`  INT UNSIGNED  NOT NULL DEFAULT 0,
  `sent_count`       INT UNSIGNED  NOT NULL DEFAULT 0,
  `failed_count`     INT UNSIGNED  NOT NULL DEFAULT 0,
  `sent_at`          DATETIME      DEFAULT NULL,
  `created_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaigns_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
