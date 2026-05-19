-- Migration 013: reviews
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`                   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `product_id`           INT UNSIGNED  NOT NULL,
  `user_id`              INT UNSIGNED  NOT NULL,
  `order_id`             INT UNSIGNED  NOT NULL,
  `rating`               TINYINT UNSIGNED NOT NULL,
  `title`                VARCHAR(150)  DEFAULT NULL,
  `body`                 TEXT          DEFAULT NULL,
  `is_verified_purchase` TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_product_order` (`user_id`, `product_id`, `order_id`),
  KEY `idx_reviews_product_id`  (`product_id`),
  KEY `idx_reviews_user_id`     (`user_id`),
  KEY `idx_reviews_rating`      (`rating`),
  KEY `idx_reviews_created_at`  (`created_at`),
  KEY `idx_reviews_product_rating` (`product_id`, `rating`),
  CONSTRAINT `fk_reviews_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
