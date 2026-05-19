DROP DATABASE IF EXISTS `myshop`;
CREATE DATABASE `myshop` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `myshop`;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. users
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id`                       INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `name`                     VARCHAR(100)     NOT NULL,
  `email`                    VARCHAR(191)     NOT NULL,
  `password_hash`            VARCHAR(255)     NOT NULL,
  `role`                     ENUM('customer','vendor','admin') NOT NULL DEFAULT 'customer',
  `avatar_url`               VARCHAR(500)     DEFAULT NULL,
  `phone`                    VARCHAR(30)      DEFAULT NULL,
  `is_verified`              TINYINT(1)       NOT NULL DEFAULT 0,
  `email_verification_token` VARCHAR(100)     DEFAULT NULL,
  `password_reset_token`     VARCHAR(100)     DEFAULT NULL,
  `password_reset_expires`   DATETIME         DEFAULT NULL,
  `refresh_token_hash`       VARCHAR(255)     DEFAULT NULL,
  `last_login_at`            DATETIME         DEFAULT NULL,
  `created_at`               DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email`  (`email`),
  KEY `idx_users_role`         (`role`),
  KEY `idx_users_created_at`   (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. categories
-- ------------------------------------------------------------
CREATE TABLE `categories` (
  `id`         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `parent_id`  INT UNSIGNED      DEFAULT NULL,
  `name`       VARCHAR(100)      NOT NULL,
  `slug`       VARCHAR(120)      NOT NULL,
  `image_url`  VARCHAR(500)      DEFAULT NULL,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug`  (`slug`),
  KEY `idx_categories_parent_id`   (`parent_id`),
  KEY `idx_categories_sort_order`  (`sort_order`),
  CONSTRAINT `fk_categories_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. addresses
-- ------------------------------------------------------------
CREATE TABLE `addresses` (
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

-- ------------------------------------------------------------
-- 4. vendor_profiles
-- ------------------------------------------------------------
CREATE TABLE `vendor_profiles` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED  NOT NULL,
  `store_name`  VARCHAR(150)  NOT NULL,
  `store_slug`  VARCHAR(160)  NOT NULL,
  `bio`         TEXT          DEFAULT NULL,
  `logo_url`    VARCHAR(500)  DEFAULT NULL,
  `banner_url`  VARCHAR(500)  DEFAULT NULL,
  `rating_avg`  DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  `total_sales` INT UNSIGNED  NOT NULL DEFAULT 0,
  `is_approved` TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendor_user_id`    (`user_id`),
  UNIQUE KEY `uq_vendor_store_slug` (`store_slug`),
  KEY `idx_vendor_rating`           (`rating_avg`),
  KEY `idx_vendor_is_approved`      (`is_approved`),
  CONSTRAINT `fk_vendor_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. products
-- ------------------------------------------------------------
CREATE TABLE `products` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `vendor_id`   INT UNSIGNED  NOT NULL,
  `category_id` INT UNSIGNED  NOT NULL,
  `name`        VARCHAR(255)  NOT NULL,
  `slug`        VARCHAR(280)  NOT NULL,
  `description` TEXT          DEFAULT NULL,
  `base_price`  DECIMAL(10,2) NOT NULL,
  `sale_price`  DECIMAL(10,2) DEFAULT NULL,
  `stock_qty`   INT UNSIGNED  NOT NULL DEFAULT 0,
  `sku`         VARCHAR(100)  NOT NULL,
  `status`      ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  `is_featured` TINYINT(1)    NOT NULL DEFAULT 0,
  `views_count` INT UNSIGNED  NOT NULL DEFAULT 0,
  `weight`      DECIMAL(8,2)  DEFAULT NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug`         (`slug`),
  UNIQUE KEY `uq_products_sku`          (`sku`),
  KEY `idx_products_vendor_id`          (`vendor_id`),
  KEY `idx_products_category_id`        (`category_id`),
  KEY `idx_products_status`             (`status`),
  KEY `idx_products_is_featured`        (`is_featured`),
  KEY `idx_products_created_at`         (`created_at`),
  KEY `idx_products_base_price`         (`base_price`),
  KEY `idx_products_sale_price`         (`sale_price`),
  KEY `idx_products_status_category`    (`status`, `category_id`),
  KEY `idx_products_status_featured`    (`status`, `is_featured`),
  CONSTRAINT `fk_products_vendor`
    FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. product_images
-- ------------------------------------------------------------
CREATE TABLE `product_images` (
  `id`         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED      NOT NULL,
  `image_url`  VARCHAR(500)      NOT NULL,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_primary` TINYINT(1)        NOT NULL DEFAULT 0,
  `created_at` DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_images_product_id` (`product_id`),
  KEY `idx_product_images_sort`       (`product_id`, `sort_order`),
  CONSTRAINT `fk_product_images_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. product_variants
-- ------------------------------------------------------------
CREATE TABLE `product_variants` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `product_id`     INT UNSIGNED  NOT NULL,
  `size`           VARCHAR(30)   DEFAULT NULL,
  `color`          VARCHAR(50)   DEFAULT NULL,
  `price_modifier` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock_qty`      INT UNSIGNED  NOT NULL DEFAULT 0,
  `sku`            VARCHAR(100)  NOT NULL,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_variants_sku`   (`sku`),
  KEY `idx_product_variants_product_id`  (`product_id`),
  KEY `idx_product_variants_size_color`  (`product_id`, `size`, `color`),
  CONSTRAINT `fk_product_variants_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. coupons
-- ------------------------------------------------------------
CREATE TABLE `coupons` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `code`        VARCHAR(50)   NOT NULL,
  `type`        ENUM('percent','fixed') NOT NULL,
  `value`       DECIMAL(10,2) NOT NULL,
  `min_order`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `usage_limit` INT UNSIGNED  DEFAULT NULL,
  `used_count`  INT UNSIGNED  NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `expires_at`  DATETIME      DEFAULT NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupons_code`     (`code`),
  KEY `idx_coupons_is_active`      (`is_active`),
  KEY `idx_coupons_expires_at`     (`expires_at`),
  KEY `idx_coupons_active_expires` (`is_active`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. cart
-- ------------------------------------------------------------
CREATE TABLE `cart` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED  DEFAULT NULL,
  `session_id` VARCHAR(128)  DEFAULT NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cart_user_id`    (`user_id`),
  KEY `idx_cart_session_id` (`session_id`),
  CONSTRAINT `fk_cart_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. cart_items
-- ------------------------------------------------------------
CREATE TABLE `cart_items` (
  `id`             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `cart_id`        INT UNSIGNED      NOT NULL,
  `product_id`     INT UNSIGNED      NOT NULL,
  `variant_id`     INT UNSIGNED      DEFAULT NULL,
  `quantity`       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `price_snapshot` DECIMAL(10,2)     NOT NULL,
  `created_at`     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cart_items_cart_id`    (`cart_id`),
  KEY `idx_cart_items_product_id` (`product_id`),
  KEY `idx_cart_items_variant_id` (`variant_id`),
  CONSTRAINT `fk_cart_items_cart`
    FOREIGN KEY (`cart_id`) REFERENCES `cart` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_items_variant`
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. orders
-- ------------------------------------------------------------
CREATE TABLE `orders` (
  `id`                       INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`                  INT UNSIGNED  NOT NULL,
  `address_id`               INT UNSIGNED  DEFAULT NULL,
  `coupon_id`                INT UNSIGNED  DEFAULT NULL,
  `status`                   ENUM('pending','confirmed','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `subtotal`                 DECIMAL(10,2) NOT NULL,
  `shipping_fee`             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount`                 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`                    DECIMAL(10,2) NOT NULL,
  `payment_method`           ENUM('stripe','cod') NOT NULL DEFAULT 'cod',
  `payment_status`           ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `stripe_payment_intent_id` VARCHAR(100)  DEFAULT NULL,
  `tracking_number`          VARCHAR(100)  DEFAULT NULL,
  `notes`                    TEXT          DEFAULT NULL,
  `created_at`               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id`        (`user_id`),
  KEY `idx_orders_status`         (`status`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_created_at`     (`created_at`),
  KEY `idx_orders_coupon_id`      (`coupon_id`),
  KEY `idx_orders_user_status`    (`user_id`, `status`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_address`
    FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_coupon`
    FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 12. order_items
-- ------------------------------------------------------------
CREATE TABLE `order_items` (
  `id`                    INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `order_id`              INT UNSIGNED      NOT NULL,
  `product_id`            INT UNSIGNED      NOT NULL,
  `variant_id`            INT UNSIGNED      DEFAULT NULL,
  `quantity`              SMALLINT UNSIGNED NOT NULL,
  `unit_price`            DECIMAL(10,2)     NOT NULL,
  `total_price`           DECIMAL(10,2)     NOT NULL,
  `product_name_snapshot` VARCHAR(255)      NOT NULL,
  `sku_snapshot`          VARCHAR(100)      DEFAULT NULL,
  `created_at`            DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id`   (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 13. reviews
-- ------------------------------------------------------------
CREATE TABLE `reviews` (
  `id`                   INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `product_id`           INT UNSIGNED     NOT NULL,
  `user_id`              INT UNSIGNED     NOT NULL,
  `order_id`             INT UNSIGNED     NOT NULL,
  `rating`               TINYINT UNSIGNED NOT NULL,
  `title`                VARCHAR(150)     DEFAULT NULL,
  `body`                 TEXT             DEFAULT NULL,
  `is_verified_purchase` TINYINT(1)       NOT NULL DEFAULT 1,
  `created_at`           DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_product_order` (`user_id`, `product_id`, `order_id`),
  KEY `idx_reviews_product_id`     (`product_id`),
  KEY `idx_reviews_user_id`        (`user_id`),
  KEY `idx_reviews_rating`         (`rating`),
  KEY `idx_reviews_created_at`     (`created_at`),
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

-- ------------------------------------------------------------
-- 14. wishlists
-- ------------------------------------------------------------
CREATE TABLE `wishlists` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED  NOT NULL,
  `product_id` INT UNSIGNED  NOT NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlists_user_product` (`user_id`, `product_id`),
  KEY `idx_wishlists_user_id`    (`user_id`),
  KEY `idx_wishlists_product_id` (`product_id`),
  CONSTRAINT `fk_wishlists_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wishlists_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 15. notifications
-- ------------------------------------------------------------
CREATE TABLE `notifications` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED  NOT NULL,
  `type`       VARCHAR(50)   NOT NULL,
  `title`      VARCHAR(150)  NOT NULL,
  `message`    TEXT          NOT NULL,
  `link`       VARCHAR(500)  DEFAULT NULL,
  `is_read`    TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id`    (`user_id`),
  KEY `idx_notifications_is_read`    (`user_id`, `is_read`),
  KEY `idx_notifications_created_at` (`created_at`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 16. payment_transactions
-- ------------------------------------------------------------
CREATE TABLE `payment_transactions` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `order_id`       INT UNSIGNED  NOT NULL,
  `provider`       ENUM('stripe','cod','paypal') NOT NULL,
  `transaction_id` VARCHAR(200)  DEFAULT NULL,
  `amount`         DECIMAL(10,2) NOT NULL,
  `currency`       VARCHAR(3)    NOT NULL DEFAULT 'USD',
  `status`         ENUM('pending','succeeded','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  `payload`        JSON          DEFAULT NULL,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_tx_order_id`        (`order_id`),
  KEY `idx_payment_tx_transaction_id`  (`transaction_id`),
  KEY `idx_payment_tx_status`          (`status`),
  KEY `idx_payment_tx_provider`        (`provider`, `status`),
  CONSTRAINT `fk_payment_tx_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

