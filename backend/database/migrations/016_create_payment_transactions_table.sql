-- Migration 016: payment_transactions
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id`             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `order_id`       INT UNSIGNED   NOT NULL,
  `provider`       ENUM('stripe','cod','paypal') NOT NULL,
  `transaction_id` VARCHAR(200)   DEFAULT NULL,
  `amount`         DECIMAL(10,2)  NOT NULL,
  `currency`       VARCHAR(3)     NOT NULL DEFAULT 'USD',
  `status`         ENUM('pending','succeeded','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  `payload`        JSON           DEFAULT NULL,
  `created_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_tx_order_id`      (`order_id`),
  KEY `idx_payment_tx_transaction_id`(`transaction_id`),
  KEY `idx_payment_tx_status`        (`status`),
  KEY `idx_payment_tx_provider`      (`provider`, `status`),
  CONSTRAINT `fk_payment_tx_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
