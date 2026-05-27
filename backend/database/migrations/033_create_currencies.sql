-- Migration 033: currencies
-- Display currencies for the storefront. USD is the base/charge currency
-- (rate = 1). Other rates are "1 USD = rate <currency>" and are admin-editable.
-- Conversion is display-only; orders are still recorded in the base currency.
CREATE TABLE IF NOT EXISTS `currencies` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(3)    NOT NULL,
  `name`       VARCHAR(50)   NOT NULL,
  `symbol`     VARCHAR(8)    NOT NULL,
  `rate`       DECIMAL(14,6) NOT NULL DEFAULT 1.000000,
  `is_default` TINYINT(1)    NOT NULL DEFAULT 0,
  `is_enabled` TINYINT(1)    NOT NULL DEFAULT 1,
  `sort_order` INT           NOT NULL DEFAULT 0,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_currency_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Symbols are inserted via hex code points so the seed is import-encoding-proof
-- (€ = U+20AC, £ = U+00A3 in UTF-8).
INSERT IGNORE INTO `currencies` (`code`, `name`, `symbol`, `rate`, `is_default`, `is_enabled`, `sort_order`) VALUES
  ('USD', 'US Dollar',     '$',                                   1.000000, 1, 1, 0),
  ('EUR', 'Euro',          CONVERT(UNHEX('E282AC') USING utf8mb4), 0.920000, 0, 1, 1),
  ('GBP', 'British Pound', CONVERT(UNHEX('C2A3')   USING utf8mb4), 0.790000, 0, 1, 2);
