-- Migration 031: product_questions
-- Customer questions on a product page, answered by an admin (or staff).
CREATE TABLE IF NOT EXISTS `product_questions` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`  INT UNSIGNED NOT NULL,
  `user_id`     INT UNSIGNED NOT NULL,
  `question`    TEXT         NOT NULL,
  `answer`      TEXT         DEFAULT NULL,
  `answered_by` INT UNSIGNED DEFAULT NULL,
  `answered_at` DATETIME     DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pq_product`  (`product_id`),
  KEY `idx_pq_user`     (`user_id`),
  KEY `idx_pq_unanswered` (`answer`(1)),
  CONSTRAINT `fk_pq_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pq_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pq_answered_by`
    FOREIGN KEY (`answered_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
