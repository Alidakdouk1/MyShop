-- Migration 003: addresses
CREATE TABLE IF NOT EXISTS `addresses` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED  NOT NULL,
  `label`          VARCHAR(50)   NOT NULL DEFAULT 'Home',
  `recipient_name` VARCHAR(100)  DEFAULT NULL,
  `phone`          VARCHAR(30)   DEFAULT NULL,
  `street`         VARCHAR(255)  NOT NULL,
  `city`           VARCHAR(100)  NOT NULL,
  `state`          VARCHAR(100)  DEFAULT NULL,
  `country`        VARCHAR(100)  NOT NULL,
  `zip`            VARCHAR(20)   DEFAULT NULL,
  `is_default`     TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_user_id`    (`user_id`),
  KEY `idx_addresses_is_default` (`user_id`, `is_default`),
  CONSTRAINT `fk_addresses_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
