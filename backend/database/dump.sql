-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: myshop
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `myshop`
--

/*!40000 DROP DATABASE IF EXISTS `myshop`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `myshop` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `myshop`;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `addresses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `label` varchar(50) NOT NULL DEFAULT 'Home',
  `recipient_name` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `street` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) NOT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_addresses_user_id` (`user_id`),
  KEY `idx_addresses_is_default` (`user_id`,`is_default`),
  CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (1,4,'Home','Alice Johnson',NULL,'123 Maple St','New York','NY','United States','10001',1,'2026-05-23 22:30:48','2026-05-23 22:30:48'),(2,5,'Home','Bob Smith',NULL,'456 Oak Ave','Los Angeles','CA','United States','90001',1,'2026-05-23 22:30:48','2026-05-23 22:30:48'),(3,5,'Office','Bob Smith',NULL,'789 Pine Blvd','Los Angeles','CA','United States','90002',0,'2026-05-23 22:30:48','2026-05-23 22:30:48');
/*!40000 ALTER TABLE `addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart`
--

DROP TABLE IF EXISTS `cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cart` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `session_id` varchar(128) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cart_user_id` (`user_id`),
  KEY `idx_cart_session_id` (`session_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart`
--

LOCK TABLES `cart` WRITE;
/*!40000 ALTER TABLE `cart` DISABLE KEYS */;
INSERT INTO `cart` VALUES (1,7,NULL,'2026-05-23 22:43:06','2026-05-23 22:43:06'),(2,9,NULL,'2026-05-23 23:26:49','2026-05-23 23:26:49'),(3,NULL,'1h4atielbn53kkl5vjb7bcggo8e','2026-05-25 11:05:53','2026-05-25 11:05:53'),(4,NULL,'17dv6tmoska9eegn2vpe3nrt2fd','2026-05-25 11:05:53','2026-05-25 11:05:53'),(7,4,NULL,'2026-05-25 11:26:17','2026-05-25 11:26:17');
/*!40000 ALTER TABLE `cart` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_item_options`
--

DROP TABLE IF EXISTS `cart_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cart_item_options` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cart_item_id` int(10) unsigned NOT NULL,
  `filter_option_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cart_item_option` (`cart_item_id`,`filter_option_id`),
  KEY `idx_cio_item` (`cart_item_id`),
  KEY `fk_cio_option` (`filter_option_id`),
  CONSTRAINT `fk_cio_item` FOREIGN KEY (`cart_item_id`) REFERENCES `cart_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cio_option` FOREIGN KEY (`filter_option_id`) REFERENCES `filter_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_item_options`
--

LOCK TABLES `cart_item_options` WRITE;
/*!40000 ALTER TABLE `cart_item_options` DISABLE KEYS */;
INSERT INTO `cart_item_options` VALUES (2,2,36),(3,2,49),(4,2,69);
/*!40000 ALTER TABLE `cart_item_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cart_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cart_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `variant_id` int(10) unsigned DEFAULT NULL,
  `option_signature` varchar(255) DEFAULT NULL,
  `quantity` smallint(5) unsigned NOT NULL DEFAULT 1,
  `price_snapshot` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cart_items_cart_id` (`cart_id`),
  KEY `idx_cart_items_product_id` (`product_id`),
  KEY `idx_cart_items_variant_id` (`variant_id`),
  CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `cart` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
INSERT INTO `cart_items` VALUES (2,2,9,19,'2,36,49,69',1,44.99,'2026-05-25 11:09:53','2026-05-25 11:09:53'),(7,1,1,1,NULL,2,19.99,'2026-05-25 23:04:48','2026-05-26 22:14:32'),(8,7,1,1,NULL,1,19.99,'2026-05-25 23:29:41','2026-05-25 23:29:41'),(9,1,12,NULL,NULL,1,15.99,'2026-05-26 21:18:31','2026-05-26 21:18:31'),(10,1,13,NULL,NULL,1,6.99,'2026-05-26 21:22:11','2026-05-26 21:22:11');
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `section_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `has_sizes` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_parent_id` (`parent_id`),
  KEY `idx_categories_sort_order` (`sort_order`),
  KEY `idx_categories_section` (`section_id`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_categories_section` FOREIGN KEY (`section_id`) REFERENCES `category_sections` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,NULL,NULL,'Women','women','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(2,NULL,NULL,'Men','men','https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=800&q=80',0,2,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(3,NULL,NULL,'Kids','kids','https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80',0,3,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(4,NULL,NULL,'Electronics','electronics','https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',0,4,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(5,NULL,NULL,'Home & Garden','home-garden','https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',0,5,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(6,NULL,NULL,'Beauty','beauty','https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',0,6,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(7,NULL,NULL,'Sports','sports','https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',0,7,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(8,NULL,NULL,'Bags','bags','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',0,8,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(9,NULL,NULL,'Shoes','shoes','https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=800&q=80',0,9,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(10,NULL,NULL,'Accessories','accessories','https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80',0,10,'2026-05-23 22:30:36','2026-05-24 20:54:54'),(11,1,NULL,'Dresses','women-dresses',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(12,1,NULL,'Tops & Blouses','women-tops',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(13,1,NULL,'Pants & Jeans','women-pants',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(14,1,NULL,'Swimwear','women-swimwear',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(15,1,NULL,'Lingerie','women-lingerie',NULL,0,5,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(16,1,NULL,'Outerwear','women-outerwear',NULL,0,6,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(17,2,NULL,'T-Shirts','men-tshirts',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(18,2,NULL,'Shirts','men-shirts',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(19,2,NULL,'Pants','men-pants',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(20,2,NULL,'Suits','men-suits',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(21,2,NULL,'Activewear','men-activewear',NULL,0,5,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(22,2,NULL,'Outerwear','men-outerwear',NULL,0,6,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(23,3,NULL,'Girls Clothing','kids-girls',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(24,3,NULL,'Boys Clothing','kids-boys',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(25,3,NULL,'Baby','kids-baby',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(26,3,NULL,'Toys','kids-toys',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(27,4,NULL,'Phones','electronics-phones',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(28,4,NULL,'Laptops','electronics-laptops',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(29,4,NULL,'Tablets','electronics-tablets',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(30,4,NULL,'Accessories','electronics-acc',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(31,4,NULL,'Smart Watches','electronics-watches',NULL,0,5,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(32,5,NULL,'Furniture','home-furniture',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(33,5,NULL,'Kitchen','home-kitchen',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(34,5,NULL,'Bedding','home-bedding',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(35,5,NULL,'Decor','home-decor',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(36,5,NULL,'Garden','home-garden-sub',NULL,0,5,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(37,6,NULL,'Skincare','beauty-skincare',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(38,6,NULL,'Makeup','beauty-makeup',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(39,6,NULL,'Hair Care','beauty-hair',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(40,6,NULL,'Perfume','beauty-perfume',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(41,7,NULL,'Running','sports-running',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(42,7,NULL,'Yoga','sports-yoga',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(43,7,NULL,'Gym Equipment','sports-gym',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(44,7,NULL,'Team Sports','sports-team',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(45,9,NULL,'Women Shoes','shoes-women',NULL,0,1,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(46,9,NULL,'Men Shoes','shoes-men',NULL,0,2,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(47,9,NULL,'Sneakers','shoes-sneakers',NULL,0,3,'2026-05-23 22:30:36','2026-05-23 22:30:36'),(48,9,NULL,'Boots','shoes-boots',NULL,0,4,'2026-05-23 22:30:36','2026-05-23 22:30:36');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_filters`
--

DROP TABLE IF EXISTS `category_filters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category_filters` (
  `category_id` int(10) unsigned NOT NULL,
  `filter_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`category_id`,`filter_id`),
  KEY `idx_cf_filter` (`filter_id`),
  CONSTRAINT `fk_cf_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cf_filter` FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_filters`
--

LOCK TABLES `category_filters` WRITE;
/*!40000 ALTER TABLE `category_filters` DISABLE KEYS */;
/*!40000 ALTER TABLE `category_filters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_sections`
--

DROP TABLE IF EXISTS `category_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category_sections` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int(10) unsigned NOT NULL,
  `title` varchar(150) NOT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cs_category` (`category_id`),
  CONSTRAINT `fk_cs_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_sections`
--

LOCK TABLES `category_sections` WRITE;
/*!40000 ALTER TABLE `category_sections` DISABLE KEYS */;
/*!40000 ALTER TABLE `category_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_conversations`
--

DROP TABLE IF EXISTS `chat_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_conversations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `status` enum('open','closed') NOT NULL DEFAULT 'open',
  `last_message_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_chat_user` (`user_id`),
  KEY `idx_chat_last` (`last_message_at`),
  CONSTRAINT `fk_chat_conv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_conversations`
--

LOCK TABLES `chat_conversations` WRITE;
/*!40000 ALTER TABLE `chat_conversations` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_messages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` int(10) unsigned NOT NULL,
  `sender_id` int(10) unsigned NOT NULL,
  `sender_role` enum('user','admin') NOT NULL,
  `body` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_chat_msg_conv` (`conversation_id`,`id`),
  CONSTRAINT `fk_chat_msg_conv` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `coupons` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `type` enum('percent','fixed') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `min_order` decimal(10,2) NOT NULL DEFAULT 0.00,
  `usage_limit` int(10) unsigned DEFAULT NULL,
  `used_count` int(10) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupons_code` (`code`),
  KEY `idx_coupons_is_active` (`is_active`),
  KEY `idx_coupons_expires_at` (`expires_at`),
  KEY `idx_coupons_active_expires` (`is_active`,`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
INSERT INTO `coupons` VALUES (1,'WELCOME10','percent',10.00,0.00,NULL,0,1,'2027-05-23 22:31:00','2026-05-23 22:31:00','2026-05-23 22:31:00'),(2,'SAVE20','percent',20.00,50.00,500,0,1,'2026-11-23 22:31:00','2026-05-23 22:31:00','2026-05-23 22:31:00'),(3,'FLAT5OFF','fixed',5.00,20.00,1000,0,1,'2026-08-23 22:31:00','2026-05-23 22:31:00','2026-05-23 22:31:00'),(4,'TECH15','percent',15.00,30.00,200,0,1,'2026-11-23 22:31:00','2026-05-23 22:31:00','2026-05-23 22:31:00'),(5,'FREESHIP','fixed',8.00,0.00,NULL,0,1,'2027-05-23 22:31:00','2026-05-23 22:31:00','2026-05-23 22:31:00');
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `filter_options`
--

DROP TABLE IF EXISTS `filter_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `filter_options` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `filter_id` int(10) unsigned NOT NULL,
  `value` varchar(120) NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_filter_options_filter_value` (`filter_id`,`value`),
  KEY `idx_filter_options_filter` (`filter_id`),
  KEY `idx_filter_options_display` (`display_order`),
  CONSTRAINT `fk_filter_options_filter` FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=215 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `filter_options`
--

LOCK TABLES `filter_options` WRITE;
/*!40000 ALTER TABLE `filter_options` DISABLE KEYS */;
INSERT INTO `filter_options` VALUES (24,2,'XS',1,'2026-05-23 22:59:04'),(25,2,'S',2,'2026-05-23 22:59:04'),(26,2,'M',3,'2026-05-23 22:59:04'),(27,2,'L',4,'2026-05-23 22:59:04'),(28,2,'XL',5,'2026-05-23 22:59:04'),(29,2,'XXL',6,'2026-05-23 22:59:04'),(30,2,'XXXL',7,'2026-05-23 22:59:04'),(31,2,'4XL',8,'2026-05-23 22:59:04'),(32,2,'One Size',9,'2026-05-23 22:59:04'),(33,2,'Plus Size',10,'2026-05-23 22:59:04'),(34,3,'Casual',1,'2026-05-23 22:59:04'),(35,3,'Elegant',2,'2026-05-23 22:59:04'),(36,3,'Streetwear',3,'2026-05-23 22:59:04'),(37,3,'Vintage',4,'2026-05-23 22:59:04'),(38,3,'Boho',5,'2026-05-23 22:59:04'),(39,3,'Sporty',6,'2026-05-23 22:59:04'),(40,3,'Business',7,'2026-05-23 22:59:04'),(41,3,'Y2K',8,'2026-05-23 22:59:04'),(42,3,'Cottagecore',9,'2026-05-23 22:59:04'),(43,3,'Minimalist',10,'2026-05-23 22:59:04'),(44,3,'Preppy',11,'2026-05-23 22:59:04'),(45,3,'Grunge',12,'2026-05-23 22:59:04'),(46,3,'Romantic',13,'2026-05-23 22:59:04'),(47,3,'Korean',14,'2026-05-23 22:59:04'),(48,3,'Sexy',15,'2026-05-23 22:59:04'),(49,4,'Solid',1,'2026-05-23 22:59:04'),(50,4,'Striped',2,'2026-05-23 22:59:04'),(51,4,'Floral',3,'2026-05-23 22:59:04'),(52,4,'Plaid',4,'2026-05-23 22:59:04'),(53,4,'Polka Dot',5,'2026-05-23 22:59:04'),(54,4,'Animal Print',6,'2026-05-23 22:59:04'),(55,4,'Leopard',7,'2026-05-23 22:59:04'),(56,4,'Geometric',8,'2026-05-23 22:59:04'),(57,4,'Tie Dye',9,'2026-05-23 22:59:04'),(58,4,'Camouflage',10,'2026-05-23 22:59:04'),(59,4,'Color Block',11,'2026-05-23 22:59:04'),(60,4,'Graphic',12,'2026-05-23 22:59:04'),(61,4,'Paisley',13,'2026-05-23 22:59:04'),(62,4,'Houndstooth',14,'2026-05-23 22:59:04'),(63,5,'Cotton',1,'2026-05-23 22:59:04'),(64,5,'Polyester',2,'2026-05-23 22:59:04'),(65,5,'Linen',3,'2026-05-23 22:59:04'),(66,5,'Silk',4,'2026-05-23 22:59:04'),(67,5,'Wool',5,'2026-05-23 22:59:04'),(68,5,'Denim',6,'2026-05-23 22:59:04'),(69,5,'Leather',7,'2026-05-23 22:59:04'),(70,5,'Faux Leather',8,'2026-05-23 22:59:04'),(71,5,'Chiffon',9,'2026-05-23 22:59:04'),(72,5,'Velvet',10,'2026-05-23 22:59:04'),(73,5,'Knit',11,'2026-05-23 22:59:04'),(74,5,'Lace',12,'2026-05-23 22:59:04'),(75,5,'Spandex',13,'2026-05-23 22:59:04'),(76,5,'Rayon',14,'2026-05-23 22:59:04'),(77,5,'Satin',15,'2026-05-23 22:59:04'),(78,5,'Mesh',16,'2026-05-23 22:59:04'),(79,5,'Corduroy',17,'2026-05-23 22:59:04'),(80,5,'Fleece',18,'2026-05-23 22:59:04'),(81,6,'Sleeveless',1,'2026-05-23 22:59:04'),(82,6,'Cap Sleeve',2,'2026-05-23 22:59:04'),(83,6,'Short Sleeve',3,'2026-05-23 22:59:04'),(84,6,'Three-Quarter Sleeve',4,'2026-05-23 22:59:04'),(85,6,'Long Sleeve',5,'2026-05-23 22:59:04'),(86,6,'Extra Long Sleeve',6,'2026-05-23 22:59:04'),(87,7,'Round Neck',1,'2026-05-23 22:59:04'),(88,7,'V Neck',2,'2026-05-23 22:59:04'),(89,7,'Crew Neck',3,'2026-05-23 22:59:04'),(90,7,'Turtleneck',4,'2026-05-23 22:59:04'),(91,7,'Halter',5,'2026-05-23 22:59:04'),(92,7,'Off Shoulder',6,'2026-05-23 22:59:04'),(93,7,'Square Neck',7,'2026-05-23 22:59:04'),(94,7,'Cowl Neck',8,'2026-05-23 22:59:04'),(95,7,'Scoop Neck',9,'2026-05-23 22:59:04'),(96,7,'Boat Neck',10,'2026-05-23 22:59:04'),(97,7,'Collared',11,'2026-05-23 22:59:04'),(98,7,'Sweetheart',12,'2026-05-23 22:59:04'),(99,7,'One Shoulder',13,'2026-05-23 22:59:04'),(100,8,'Mini',1,'2026-05-23 22:59:04'),(101,8,'Short',2,'2026-05-23 22:59:04'),(102,8,'Midi',3,'2026-05-23 22:59:04'),(103,8,'Knee Length',4,'2026-05-23 22:59:04'),(104,8,'Maxi',5,'2026-05-23 22:59:04'),(105,8,'Long',6,'2026-05-23 22:59:04'),(106,8,'Cropped',7,'2026-05-23 22:59:04'),(107,8,'Regular',8,'2026-05-23 22:59:04'),(108,8,'Floor Length',9,'2026-05-23 22:59:04'),(109,9,'High Waist',1,'2026-05-23 22:59:04'),(110,9,'Mid Waist',2,'2026-05-23 22:59:04'),(111,9,'Low Waist',3,'2026-05-23 22:59:04'),(112,9,'Elastic Waist',4,'2026-05-23 22:59:04'),(113,9,'Natural Waist',5,'2026-05-23 22:59:04'),(114,9,'Drawstring Waist',6,'2026-05-23 22:59:04'),(115,10,'Slim Fit',1,'2026-05-23 22:59:04'),(116,10,'Regular Fit',2,'2026-05-23 22:59:04'),(117,10,'Loose Fit',3,'2026-05-23 22:59:04'),(118,10,'Oversized',4,'2026-05-23 22:59:04'),(119,10,'Skinny',5,'2026-05-23 22:59:04'),(120,10,'Relaxed',6,'2026-05-23 22:59:04'),(121,10,'Bodycon',7,'2026-05-23 22:59:04'),(122,10,'Tailored',8,'2026-05-23 22:59:04'),(123,10,'Straight',9,'2026-05-23 22:59:04'),(124,11,'Straight',1,'2026-05-23 22:59:04'),(125,11,'Curved',2,'2026-05-23 22:59:04'),(126,11,'Asymmetric',3,'2026-05-23 22:59:04'),(127,11,'High-Low',4,'2026-05-23 22:59:04'),(128,11,'Ruffle',5,'2026-05-23 22:59:04'),(129,11,'Split',6,'2026-05-23 22:59:04'),(130,11,'Raw Hem',7,'2026-05-23 22:59:04'),(131,11,'Scalloped',8,'2026-05-23 22:59:04'),(132,12,'Dress',1,'2026-05-23 22:59:04'),(133,12,'Top',2,'2026-05-23 22:59:04'),(134,12,'T-Shirt',3,'2026-05-23 22:59:04'),(135,12,'Blouse',4,'2026-05-23 22:59:04'),(136,12,'Shirt',5,'2026-05-23 22:59:04'),(137,12,'Sweater',6,'2026-05-23 22:59:04'),(138,12,'Cardigan',7,'2026-05-23 22:59:04'),(139,12,'Hoodie',8,'2026-05-23 22:59:04'),(140,12,'Jacket',9,'2026-05-23 22:59:04'),(141,12,'Coat',10,'2026-05-23 22:59:04'),(142,12,'Blazer',11,'2026-05-23 22:59:04'),(143,12,'Pants',12,'2026-05-23 22:59:04'),(144,12,'Jeans',13,'2026-05-23 22:59:04'),(145,12,'Leggings',14,'2026-05-23 22:59:04'),(146,12,'Shorts',15,'2026-05-23 22:59:04'),(147,12,'Skirt',16,'2026-05-23 22:59:04'),(148,12,'Jumpsuit',17,'2026-05-23 22:59:04'),(149,12,'Romper',18,'2026-05-23 22:59:04'),(150,12,'Activewear',19,'2026-05-23 22:59:04'),(151,12,'Swimwear',20,'2026-05-23 22:59:04'),(152,12,'Lingerie',21,'2026-05-23 22:59:04'),(153,13,'Hourglass',1,'2026-05-23 22:59:04'),(154,13,'Pear',2,'2026-05-23 22:59:04'),(155,13,'Apple',3,'2026-05-23 22:59:04'),(156,13,'Rectangle',4,'2026-05-23 22:59:04'),(157,13,'Inverted Triangle',5,'2026-05-23 22:59:04'),(158,14,'Spring',1,'2026-05-23 22:59:04'),(159,14,'Summer',2,'2026-05-23 22:59:04'),(160,14,'Fall',3,'2026-05-23 22:59:04'),(161,14,'Winter',4,'2026-05-23 22:59:04'),(162,14,'All Season',5,'2026-05-23 22:59:04'),(163,15,'Casual',1,'2026-05-23 22:59:04'),(164,15,'Work',2,'2026-05-23 22:59:04'),(165,15,'Party',3,'2026-05-23 22:59:04'),(166,15,'Formal',4,'2026-05-23 22:59:04'),(167,15,'Beach',5,'2026-05-23 22:59:04'),(168,15,'Wedding',6,'2026-05-23 22:59:04'),(169,15,'Vacation',7,'2026-05-23 22:59:04'),(170,15,'Sport',8,'2026-05-23 22:59:04'),(171,15,'Date Night',9,'2026-05-23 22:59:04'),(172,15,'Everyday',10,'2026-05-23 22:59:04'),(173,15,'Homewear',11,'2026-05-23 22:59:04'),(174,16,'Buttons',1,'2026-05-23 22:59:04'),(175,16,'Zipper',2,'2026-05-23 22:59:04'),(176,16,'Pockets',3,'2026-05-23 22:59:04'),(177,16,'Bow',4,'2026-05-23 22:59:04'),(178,16,'Ruffles',5,'2026-05-23 22:59:04'),(179,16,'Lace',6,'2026-05-23 22:59:04'),(180,16,'Embroidery',7,'2026-05-23 22:59:04'),(181,16,'Sequins',8,'2026-05-23 22:59:04'),(182,16,'Beading',9,'2026-05-23 22:59:04'),(183,16,'Fringe',10,'2026-05-23 22:59:04'),(184,16,'Pleated',11,'2026-05-23 22:59:04'),(185,16,'Cutout',12,'2026-05-23 22:59:04'),(186,16,'Drawstring',13,'2026-05-23 22:59:04'),(187,16,'Belt',14,'2026-05-23 22:59:04'),(188,16,'Chain',15,'2026-05-23 22:59:04'),(189,17,'Sheer',1,'2026-05-23 22:59:04'),(190,17,'Semi-Sheer',2,'2026-05-23 22:59:04'),(191,17,'Opaque',3,'2026-05-23 22:59:04'),(192,18,'Adult',1,'2026-05-23 22:59:04'),(193,18,'Teen',2,'2026-05-23 22:59:04'),(194,18,'Kids',3,'2026-05-23 22:59:04'),(195,18,'Toddler',4,'2026-05-23 22:59:04'),(196,18,'Baby',5,'2026-05-23 22:59:04'),(197,19,'Curve / Plus',1,'2026-05-23 22:59:04'),(198,19,'Petite',2,'2026-05-23 22:59:04'),(199,19,'Tall',3,'2026-05-23 22:59:04'),(200,19,'Maternity',4,'2026-05-23 22:59:04'),(201,19,'Essentials',5,'2026-05-23 22:59:04'),(202,19,'Premium',6,'2026-05-23 22:59:04'),(203,19,'Eco / Sustainable',7,'2026-05-23 22:59:04'),(204,20,'Flat',1,'2026-05-23 22:59:04'),(205,20,'Low (1-2 in)',2,'2026-05-23 22:59:04'),(206,20,'Mid (2-3 in)',3,'2026-05-23 22:59:04'),(207,20,'High (3-4 in)',4,'2026-05-23 22:59:04'),(208,20,'Ultra High (4+ in)',5,'2026-05-23 22:59:04'),(209,21,'Round Toe',1,'2026-05-23 22:59:04'),(210,21,'Pointed Toe',2,'2026-05-23 22:59:04'),(211,21,'Square Toe',3,'2026-05-23 22:59:04'),(212,21,'Open Toe',4,'2026-05-23 22:59:04'),(213,21,'Almond Toe',5,'2026-05-23 22:59:04'),(214,21,'Peep Toe',6,'2026-05-23 22:59:04');
/*!40000 ALTER TABLE `filter_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `filters`
--

DROP TABLE IF EXISTS `filters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `filters` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `type` enum('single','multi','range') NOT NULL DEFAULT 'multi',
  `unit` varchar(20) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_filters_name` (`name`),
  KEY `idx_filters_is_active` (`is_active`),
  KEY `idx_filters_display` (`display_order`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `filters`
--

LOCK TABLES `filters` WRITE;
/*!40000 ALTER TABLE `filters` DISABLE KEYS */;
INSERT INTO `filters` VALUES (2,'Size','multi',NULL,0,1,3,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(3,'Trends / Style','multi',NULL,0,1,5,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(4,'Pattern','multi',NULL,0,1,6,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(5,'Material / Fabric','multi',NULL,0,1,7,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(6,'Sleeve Length','multi',NULL,0,1,8,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(7,'Neckline','multi',NULL,0,1,9,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(8,'Length','multi',NULL,0,1,10,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(9,'Waistline','multi',NULL,0,1,13,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(10,'Fit Type','multi',NULL,0,1,14,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(11,'Hem Shape','multi',NULL,0,1,15,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(12,'Type','multi',NULL,0,1,16,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(13,'Body Shape','multi',NULL,0,1,17,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(14,'Season','multi',NULL,0,1,18,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(15,'Occasion','multi',NULL,0,1,19,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(16,'Decoration / Details','multi',NULL,0,1,20,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(17,'Sheer','multi',NULL,0,1,21,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(18,'Age Group','multi',NULL,0,1,22,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(19,'Collection','multi',NULL,0,1,24,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(20,'Heel Height','multi',NULL,0,1,25,'2026-05-23 22:59:04','2026-05-23 22:59:04'),(21,'Toe Shape','multi',NULL,0,1,26,'2026-05-23 22:59:04','2026-05-23 22:59:04');
/*!40000 ALTER TABLE `filters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `homepage_sections`
--

DROP TABLE IF EXISTS `homepage_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `homepage_sections` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `label` varchar(255) NOT NULL DEFAULT '',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `section_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`section_data`)),
  `styles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`styles`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `homepage_sections`
--

LOCK TABLES `homepage_sections` WRITE;
/*!40000 ALTER TABLE `homepage_sections` DISABLE KEYS */;
INSERT INTO `homepage_sections` VALUES (1,'hero_3col','Hero Banner',1,1,'{\"left_banners\":[{\"title\":\"Hot Sellers\",\"link\":\"/shop?sort=bestselling\",\"bg_color\":\"#1a1a1a\",\"text_color\":\"#ffffff\",\"image_url\":\"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80\"},{\"title\":\"New Arrivals\",\"link\":\"/shop?sort=newest\",\"bg_color\":\"#1e3a5f\",\"text_color\":\"#ffffff\",\"image_url\":\"https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80\"},{\"title\":\"Style Refresh Festival\",\"link\":\"/shop\",\"bg_color\":\"#5c4a2a\",\"text_color\":\"#ffffff\",\"image_url\":\"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80\"}],\"center\":{\"badge\":\"UP TO 90% OFF\",\"title_top\":\"Shipped From Our\",\"title_main\":\"LOCAL\",\"title_sub\":\"WAREHOUSE\",\"cta\":\"SHOP NOW\",\"link\":\"/shop\",\"bg_color\":\"#f5e8c8\",\"accent_color\":\"#C0392B\",\"image_url\":\"\",\"slides\":[{\"image_url\":\"uploads/homepage/60bd5916a873830a55716af7dd061809.jpg\",\"bg_color\":\"#f5e8c8\"},{\"image_url\":\"uploads/homepage/200362adc72438241f89ee1087347740.png\",\"bg_color\":\"#f5e8c8\"}]},\"right_brands\":[{\"name\":\"ROMWE\",\"link\":\"/shop\",\"bg_color\":\"#6e6e6e\",\"image_url\":\"https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80\"},{\"name\":\"EMERY ROSE\",\"link\":\"/shop\",\"bg_color\":\"#c9b8a8\",\"image_url\":\"https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&q=80\"},{\"name\":\"MOTF\",\"link\":\"/shop\",\"bg_color\":\"#4a4a4a\",\"image_url\":\"https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=800&q=80\"}]}',NULL,'2026-05-23 19:59:35','2026-05-25 20:02:12'),(2,'category_circles','Category Navigation',2,1,'{\"max_items\":12}',NULL,'2026-05-23 19:59:35','2026-05-23 19:59:35'),(3,'product_grid','Best Sellers',3,1,'{\"title\":\"Best Sellers\",\"subtitle\":\"Top picks loved by our customers\",\"query\":\"bestselling\",\"limit\":8,\"cols\":4,\"view_all_link\":\"/shop?sort=bestselling\",\"view_all_label\":\"View all\"}',NULL,'2026-05-23 19:59:35','2026-05-23 19:59:35'),(4,'promo_banners','Promotional Banners',4,1,'{\"layout\": \"2col\", \"banners\": [{\"title\": \"SALE\", \"subtitle\": \"Up to 70% off selected items\", \"cta\": \"Shop now →\", \"link\": \"/shop?on_sale=1\", \"bg_color\": \"#C0392B\", \"text_color\": \"#ffffff\", \"image_url\": \"https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80\"}, {\"title\": \"NEW IN\", \"subtitle\": \"Fresh styles added every week\", \"cta\": \"Shop new arrivals →\", \"link\": \"/shop?sort=newest\", \"bg_color\": \"#0E0E0E\", \"text_color\": \"#ffffff\", \"image_url\": \"https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80\"}]}',NULL,'2026-05-23 19:59:35','2026-05-24 17:54:54'),(5,'product_grid','New Arrivals',5,1,'{\"title\":\"New Arrivals\",\"subtitle\":\"Fresh styles added daily\",\"query\":\"newest\",\"limit\":8,\"cols\":4,\"view_all_link\":\"/shop?sort=newest\",\"view_all_label\":\"View all\"}',NULL,'2026-05-23 19:59:35','2026-05-23 19:59:35'),(6,'trust_badges','Trust Badges',6,1,'{\"cols\":4,\"badges\":[{\"icon\":\"🚚\",\"title\":\"Free Shipping\",\"desc\":\"On orders over $50\"},{\"icon\":\"↩️\",\"title\":\"Easy Returns\",\"desc\":\"30-day return policy\"},{\"icon\":\"🔒\",\"title\":\"Secure Payment\",\"desc\":\"SSL encrypted checkout\"},{\"icon\":\"⭐\",\"title\":\"Top Quality\",\"desc\":\"Verified seller products\"}],\"bg_color\":\"\",\"text_color\":\"\"}',NULL,'2026-05-23 19:59:35','2026-05-23 19:59:35'),(7,'hero_3col','Hero Banner',7,1,'{\"left_banners\":[{\"title\":\"gsjjks\",\"link\":\"/shop\",\"bg_color\":\"#1a1a1a\",\"text_color\":\"#ffffff\",\"image_url\":\"uploads/homepage/cad2159c3c98ab6bea6af624e6644a74.jpg\"},{\"title\":\"sdnjkcsdj\",\"link\":\"/shop\",\"bg_color\":\"#1e3a5f\",\"text_color\":\"#ffffff\",\"image_url\":\"uploads/homepage/237f7ae2ada27ecc4bdf660efc43d6a7.jpg\"},{\"title\":\"Banner 3\",\"link\":\"/shop\",\"bg_color\":\"#5c4a2a\",\"text_color\":\"#ffffff\",\"image_url\":\"\"}],\"center\":{\"badge\":\"UP TO 90% OFF\",\"title_top\":\"Shipped From Our\",\"title_main\":\"LOCAL\",\"title_sub\":\"WAREHOUSE\",\"cta\":\"SHOP NOW\",\"link\":\"/shop\",\"bg_color\":\"#f5e8c8\",\"accent_color\":\"#C0392B\",\"image_url\":\"\"},\"right_brands\":[{\"name\":\"BRAND 1\",\"link\":\"/shop\",\"bg_color\":\"#6e6e6e\",\"image_url\":\"\"},{\"name\":\"BRAND 2\",\"link\":\"/shop\",\"bg_color\":\"#c9b8a8\",\"image_url\":\"\"},{\"name\":\"BRAND 3\",\"link\":\"/shop\",\"bg_color\":\"#4a4a4a\",\"image_url\":\"\"}]}',NULL,'2026-05-25 19:24:19','2026-05-25 19:25:40');
/*!40000 ALTER TABLE `homepage_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `homepage_settings`
--

DROP TABLE IF EXISTS `homepage_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `homepage_settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `settings_json` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `homepage_settings`
--

LOCK TABLES `homepage_settings` WRITE;
/*!40000 ALTER TABLE `homepage_settings` DISABLE KEYS */;
INSERT INTO `homepage_settings` VALUES (1,'{\"announcement_bar\":[{\"icon\":\"🚚\",\"text\":\"Free Shipping\"},{\"icon\":\"↩️\",\"text\":\"Free Returns\"},{\"icon\":\"💳\",\"text\":\"No Hidden Fees\"}],\"hero_left_banners\":[{\"title\":\"Hot Sellers\",\"link\":\"/shop?sort=bestselling\",\"bg_color\":\"#1a1a1a\",\"text_color\":\"#ffffff\",\"image_url\":\"\"},{\"title\":\"New Arrivals\",\"link\":\"/shop?sort=newest\",\"bg_color\":\"#1e3a5f\",\"text_color\":\"#ffffff\",\"image_url\":\"\"},{\"title\":\"Style Refresh Festival\",\"link\":\"/shop\",\"bg_color\":\"#5c4a2a\",\"text_color\":\"#ffffff\",\"image_url\":\"\"}],\"hero_center\":{\"badge\":\"UP TO 90% OFF\",\"title_top\":\"Shipped From Our\",\"title_main\":\"LOCAL\",\"title_sub\":\"WAREHOUSE\",\"cta\":\"SHOP NOW\",\"link\":\"/shop\",\"bg_color\":\"#f5e8c8\",\"accent_color\":\"#C0392B\",\"image_url\":\"\"},\"hero_right_brands\":[{\"name\":\"ROMWE\",\"link\":\"/shop\",\"bg_color\":\"#6e6e6e\",\"image_url\":\"\"},{\"name\":\"EMERY ROSE\",\"link\":\"/shop\",\"bg_color\":\"#c9b8a8\",\"image_url\":\"\"},{\"name\":\"MOTF\",\"link\":\"/shop\",\"bg_color\":\"#4a4a4a\",\"image_url\":\"\"}],\"sections\":{\"show_categories\":true,\"show_featured\":true,\"show_promo_banners\":true,\"show_new_arrivals\":true,\"show_trust_badges\":true},\"featured_section\":{\"title\":\"Best Sellers\",\"subtitle\":\"Top picks loved by our customers\"},\"new_arrivals_section\":{\"title\":\"New Arrivals\",\"subtitle\":\"Fresh styles added daily\"},\"promo_banners\":[{\"title\":\"SALE\",\"subtitle\":\"Up to 70% off selected items\",\"cta\":\"Shop now →\",\"link\":\"/shop?on_sale=1\",\"bg_color\":\"#C0392B\"},{\"title\":\"NEW IN\",\"subtitle\":\"Fresh styles added every week\",\"cta\":\"Shop new arrivals →\",\"link\":\"/shop?sort=newest\",\"bg_color\":\"#0E0E0E\"}],\"trust_badges\":[{\"icon\":\"🚚\",\"title\":\"Free Shipping\",\"desc\":\"On orders over $50\"},{\"icon\":\"↩️\",\"title\":\"Easy Returns\",\"desc\":\"30-day return policy\"},{\"icon\":\"🔒\",\"title\":\"Secure Payment\",\"desc\":\"SSL encrypted checkout\"},{\"icon\":\"⭐\",\"title\":\"Top Quality\",\"desc\":\"Verified seller products\"}],\"shop_page\":{\"banner\":{\"title\":\"All Products\",\"subtitle\":\"\",\"bg_color\":\"\",\"bg_image\":\"uploads/homepage/efd11d46b3cff7d1ee2e6d83360b4051.jpg\",\"text_color\":\"#0F0F0F\",\"side_image\":\"\",\"overlay_opacity\":0.2},\"grid\":{\"cols\":4,\"mobile_cols\":2,\"card_shape\":\"rounded\"},\"sort\":{\"default_sort\":\"newest\",\"per_page\":20},\"card\":{\"show_rating\":true,\"show_quick_add\":true,\"show_badges\":true,\"image_ratio\":\"3/4\"},\"empty_state\":{\"icon\":\"🛍️\",\"title\":\"No products found\",\"subtitle\":\"Try adjusting your filters\"}}}','2026-05-25 19:28:45');
/*!40000 ALTER TABLE `homepage_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `newsletter_subscribers`
--

DROP TABLE IF EXISTS `newsletter_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `newsletter_subscribers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `source` varchar(50) DEFAULT 'footer',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_newsletter_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `newsletter_subscribers`
--

LOCK TABLES `newsletter_subscribers` WRITE;
/*!40000 ALTER TABLE `newsletter_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `newsletter_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `link` varchar(500) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`),
  KEY `idx_notifications_is_read` (`user_id`,`is_read`),
  KEY `idx_notifications_created_at` (`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (2,7,'order_update','Order #2 Confirmed','Your order of $57.99 has been placed successfully.','/orders/2',0,'2026-05-25 22:30:18'),(3,7,'order_update','Return Requested','Your return request for order #2 has been received.','/account/orders/2',0,'2026-05-25 22:33:09'),(4,7,'order_update','Order #3 Confirmed','Your order of $57.98 has been placed successfully.','/orders/3',0,'2026-05-25 22:59:00'),(5,7,'order_update','Return Update','Your return for order #2 is now: approved.','/account/orders/2',0,'2026-05-26 21:20:05');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_item_options`
--

DROP TABLE IF EXISTS `order_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_item_options` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_item_id` int(10) unsigned NOT NULL,
  `filter_option_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_order_item_option` (`order_item_id`,`filter_option_id`),
  KEY `idx_oio_item` (`order_item_id`),
  KEY `fk_oio_option` (`filter_option_id`),
  CONSTRAINT `fk_oio_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_oio_option` FOREIGN KEY (`filter_option_id`) REFERENCES `filter_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_item_options`
--

LOCK TABLES `order_item_options` WRITE;
/*!40000 ALTER TABLE `order_item_options` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_item_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `variant_id` int(10) unsigned DEFAULT NULL,
  `quantity` smallint(5) unsigned NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `product_name_snapshot` varchar(255) NOT NULL,
  `sku_snapshot` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (2,2,2,NULL,1,49.99,49.99,'Elegant Midi Dress','FSD-002','2026-05-25 22:30:18'),(3,3,7,13,2,24.99,49.98,'Men Oxford Shirt','MOS-001','2026-05-25 22:59:00');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `address_id` int(10) unsigned DEFAULT NULL,
  `coupon_id` int(10) unsigned DEFAULT NULL,
  `status` enum('pending','confirmed','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `subtotal` decimal(10,2) NOT NULL,
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `payment_method` enum('stripe','cod') NOT NULL DEFAULT 'cod',
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `stripe_payment_intent_id` varchar(100) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_coupon_id` (`coupon_id`),
  KEY `idx_orders_user_status` (`user_id`,`status`),
  KEY `fk_orders_address` (`address_id`),
  CONSTRAINT `fk_orders_address` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (2,7,NULL,NULL,'delivered',49.99,8.00,0.00,0.00,57.99,'stripe','pending',NULL,NULL,'','2026-05-25 22:30:18','2026-05-25 22:32:29'),(3,7,NULL,NULL,'confirmed',49.98,8.00,0.00,0.00,57.98,'cod','pending',NULL,NULL,'','2026-05-25 22:59:00','2026-05-25 22:59:24');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_transactions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `provider` enum('stripe','cod','paypal') NOT NULL,
  `transaction_id` varchar(200) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `status` enum('pending','succeeded','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_payment_tx_order_id` (`order_id`),
  KEY `idx_payment_tx_transaction_id` (`transaction_id`),
  KEY `idx_payment_tx_status` (`status`),
  KEY `idx_payment_tx_provider` (`provider`,`status`),
  CONSTRAINT `fk_payment_tx_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_filter_values`
--

DROP TABLE IF EXISTS `product_filter_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_filter_values` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `filter_id` int(10) unsigned NOT NULL,
  `filter_option_id` int(10) unsigned DEFAULT NULL,
  `min_value` decimal(12,2) DEFAULT NULL,
  `max_value` decimal(12,2) DEFAULT NULL,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `quantity` int(11) DEFAULT NULL,
  `hover_text` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pfv_product` (`product_id`),
  KEY `idx_pfv_filter` (`filter_id`),
  KEY `idx_pfv_option` (`filter_option_id`),
  KEY `idx_pfv_product_filter` (`product_id`,`filter_id`),
  CONSTRAINT `fk_pfv_filter` FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pfv_option` FOREIGN KEY (`filter_option_id`) REFERENCES `filter_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pfv_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_filter_values`
--

LOCK TABLES `product_filter_values` WRITE;
/*!40000 ALTER TABLE `product_filter_values` DISABLE KEYS */;
INSERT INTO `product_filter_values` VALUES (3,1,2,24,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(4,1,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(5,1,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(6,1,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(7,1,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(8,1,3,46,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(9,1,3,35,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(10,1,4,51,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(11,1,5,71,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(12,1,5,76,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(15,2,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(16,2,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(17,2,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(18,2,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(19,2,3,35,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(20,2,3,46,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(21,2,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(22,2,5,77,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(24,3,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(25,3,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(26,3,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(27,3,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(28,3,3,34,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(29,3,3,43,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(30,3,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(31,3,5,63,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(34,4,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(35,4,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(36,4,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(37,4,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(38,4,2,29,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(39,4,3,34,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(40,4,3,47,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(41,4,4,50,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(42,4,5,63,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(43,4,5,65,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(46,5,2,24,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(47,5,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(48,5,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(49,5,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(50,5,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(51,5,3,34,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(52,5,3,36,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(53,5,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(54,5,5,68,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(55,5,5,75,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(59,6,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(60,6,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(61,6,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(62,6,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(63,6,2,29,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(64,6,3,34,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(65,6,3,43,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(66,6,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(67,6,5,63,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(70,7,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(71,7,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(72,7,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(73,7,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(74,7,3,40,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(75,7,3,44,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(76,7,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(77,7,5,63,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(80,8,2,25,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(81,8,2,26,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(82,8,2,27,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(83,8,2,28,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(84,8,3,40,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(85,8,3,34,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(86,8,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(87,8,5,63,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(88,8,5,75,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(90,9,3,36,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(91,9,3,39,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(92,9,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(93,9,5,69,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(94,9,5,70,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(95,9,5,78,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(98,10,3,35,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(99,10,3,48,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(100,10,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(101,10,5,70,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(120,20,2,32,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(121,20,3,34,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(122,20,3,43,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(123,20,4,49,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(124,20,5,63,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35'),(125,20,5,65,NULL,NULL,0,NULL,NULL,'2026-05-24 21:15:35');
/*!40000 ALTER TABLE `product_filter_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_images` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `sort_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_product_images_product_id` (`product_id`),
  KEY `idx_product_images_sort` (`product_id`,`sort_order`),
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (1,1,'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(2,2,'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(3,3,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(4,4,'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(5,5,'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(6,6,'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(7,7,'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(8,8,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(9,9,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(10,10,'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(11,11,'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(12,12,'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(13,13,'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(14,14,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(15,15,'https://images.unsplash.com/photo-1601972602288-3be527b4f18a?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(16,16,'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(17,17,'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(18,18,'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(19,19,'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(20,20,'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',0,1,'2026-05-23 22:30:59'),(21,18,'uploads/products/18/ea4e8bb03040b798ee454bef5c482fba.png',0,0,'2026-05-26 21:21:19');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_variants` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `size` varchar(30) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `price_modifier` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock_qty` int(10) unsigned NOT NULL DEFAULT 0,
  `sku` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_variants_sku` (`sku`),
  KEY `idx_product_variants_product_id` (`product_id`),
  KEY `idx_product_variants_size_color` (`product_id`,`size`,`color`),
  CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (1,1,'XS','Pink',0.00,30,'FSD-001-XS-PNK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(2,1,'S','Pink',0.00,40,'FSD-001-S-PNK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(3,1,'M','Pink',0.00,40,'FSD-001-M-PNK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(4,1,'L','Pink',0.00,25,'FSD-001-L-PNK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(5,1,'XL','Pink',2.00,15,'FSD-001-XL-PNK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(6,5,'XS','Blue',0.00,20,'FJN-001-XS-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59'),(7,5,'S','Blue',0.00,25,'FJN-001-S-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59'),(8,5,'M','Blue',0.00,25,'FJN-001-M-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59'),(9,5,'L','Blue',0.00,20,'FJN-001-L-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59'),(10,5,'XL','Blue',0.00,10,'FJN-001-XL-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59'),(11,5,'XS','Black',0.00,20,'FJN-001-XS-BLK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(12,5,'S','Black',0.00,20,'FJN-001-S-BLK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(13,7,'S','White',0.00,20,'MOS-001-S-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(14,7,'M','White',0.00,25,'MOS-001-M-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(15,7,'L','White',0.00,25,'MOS-001-L-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(16,7,'XL','White',0.00,15,'MOS-001-XL-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(17,7,'S','Blue',0.00,15,'MOS-001-S-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59'),(18,7,'M','Blue',0.00,20,'MOS-001-M-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59'),(19,9,'36','White',0.00,10,'WSN-001-36-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(20,9,'37','White',0.00,10,'WSN-001-37-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(21,9,'38','White',0.00,12,'WSN-001-38-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(22,9,'39','White',0.00,10,'WSN-001-39-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(23,9,'40','White',0.00,8,'WSN-001-40-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(24,9,'41','White',0.00,5,'WSN-001-41-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(25,11,NULL,'Black',0.00,80,'TWE-001-BLK','2026-05-23 22:30:59','2026-05-23 22:30:59'),(26,11,NULL,'White',0.00,80,'TWE-001-WHT','2026-05-23 22:30:59','2026-05-23 22:30:59'),(27,11,NULL,'Blue',5.00,40,'TWE-001-BLU','2026-05-23 22:30:59','2026-05-23 22:30:59');
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int(10) unsigned DEFAULT NULL,
  `category_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(280) NOT NULL,
  `description` text DEFAULT NULL,
  `base_price` decimal(10,2) NOT NULL,
  `sale_price` decimal(10,2) DEFAULT NULL,
  `stock_qty` int(10) unsigned NOT NULL DEFAULT 0,
  `sku` varchar(100) NOT NULL,
  `status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `views_count` int(10) unsigned NOT NULL DEFAULT 0,
  `weight` decimal(8,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  UNIQUE KEY `uq_products_sku` (`sku`),
  KEY `idx_products_vendor_id` (`vendor_id`),
  KEY `idx_products_category_id` (`category_id`),
  KEY `idx_products_status` (`status`),
  KEY `idx_products_is_featured` (`is_featured`),
  KEY `idx_products_created_at` (`created_at`),
  KEY `idx_products_base_price` (`base_price`),
  KEY `idx_products_sale_price` (`sale_price`),
  KEY `idx_products_status_category` (`status`,`category_id`),
  KEY `idx_products_status_featured` (`status`,`is_featured`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_products_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,2,11,'Floral Wrap Dress','floral-wrap-dress','A beautiful floral wrap dress perfect for summer. Lightweight fabric, midi length.',29.99,19.99,150,'FSD-001','active',1,92,0.30,'2026-05-23 22:30:59','2026-05-26 22:21:29'),(2,2,11,'Elegant Midi Dress','elegant-midi-dress','Classic elegant midi dress with a flattering silhouette. Available in multiple colors.',49.99,NULL,79,'FSD-002','active',1,7,0.35,'2026-05-23 22:30:59','2026-05-25 22:30:18'),(3,2,12,'Casual Cotton Top','casual-cotton-top','Soft 100% cotton casual top, great for everyday wear. Relaxed fit.',14.99,9.99,199,'FCT-001','active',0,1,0.20,'2026-05-23 22:30:59','2026-05-25 11:12:05'),(4,2,12,'Striped Oversized Blouse','striped-oversized-blouse','Trendy striped oversized blouse with dropped shoulders. Perfect for casual outings.',24.99,NULL,120,'FOB-001','active',0,0,0.25,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(5,2,13,'High-Waist Skinny Jeans','high-waist-skinny-jeans','Classic high-waist skinny jeans with stretch fabric for comfort. 5-pocket design.',39.99,29.99,100,'FJN-001','active',1,0,0.60,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(6,2,17,'Men Basic Crew Tee','men-basic-crew-tee','Essential men\'s basic crew neck t-shirt. 100% cotton, pre-shrunk.',12.99,NULL,300,'MBT-001','active',0,10,0.20,'2026-05-23 22:30:59','2026-05-25 22:45:53'),(7,2,18,'Men Oxford Shirt','men-oxford-shirt','Classic Oxford button-down shirt. Smart casual style, wrinkle resistant.',34.99,24.99,88,'MOS-001','active',1,7,0.35,'2026-05-23 22:30:59','2026-05-25 22:59:00'),(8,2,19,'Men Slim Chinos','men-slim-chinos','Slim fit chinos with elasticated waistband. Versatile and comfortable for any occasion.',44.99,NULL,75,'MSC-001','active',0,6,0.55,'2026-05-23 22:30:59','2026-05-24 21:18:59'),(9,2,47,'White Chunky Sneakers','white-chunky-sneakers','Trendy white chunky sole sneakers. Cushioned insole, durable rubber outsole.',59.99,44.99,60,'WSN-001','active',1,6,0.80,'2026-05-23 22:30:59','2026-05-25 11:09:40'),(10,2,45,'Strappy Heeled Sandals','strappy-heeled-sandals','Elegant strappy heeled sandals, 3-inch block heel for comfort and style.',45.99,NULL,45,'SHS-001','active',0,0,0.50,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(11,3,27,'Wireless Earbuds Pro','wireless-earbuds-pro','True wireless earbuds with 30hr battery, active noise cancellation, IPX5 waterproof.',79.99,59.99,200,'TWE-001','active',1,0,0.10,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(12,3,27,'Fast Charge Cable Pack','fast-charge-cable-pack','Pack of 3 braided USB-C cables. Supports 100W fast charging. 6ft length.',15.99,NULL,500,'TCC-001','active',0,20,0.15,'2026-05-23 22:30:59','2026-05-26 21:18:26'),(13,3,30,'Portable Phone Stand','portable-phone-stand','Adjustable aluminum phone stand. Foldable design, fits phones 4-7 inches.',9.99,6.99,400,'TPS-001','active',0,6,0.08,'2026-05-23 22:30:59','2026-05-26 21:22:27'),(14,3,31,'Smart Fitness Tracker','smart-fitness-tracker','Fitness tracker with heart rate monitor, sleep tracking, 7-day battery, waterproof.',49.99,39.99,150,'TFT-001','active',1,0,0.05,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(15,3,30,'Wireless Charging Pad','wireless-charging-pad','15W fast wireless charging pad. Compatible with all Qi devices. LED indicator.',19.99,NULL,250,'TWC-001','active',0,0,0.12,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(16,3,28,'Laptop Cooling Pad','laptop-cooling-pad','Ultra-slim laptop cooling pad with 2 silent fans. Fits laptops up to 17 inches. USB powered.',29.99,22.99,80,'TLP-001','active',0,0,0.45,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(17,3,30,'Bluetooth Keyboard','bluetooth-keyboard','Slim rechargeable Bluetooth keyboard. Multi-device pairing (3 devices), scissor switches.',45.99,NULL,60,'TBK-001','active',1,0,0.40,'2026-05-23 22:30:59','2026-05-23 22:30:59'),(18,3,29,'Tablet Stand Holder','tablet-stand-holder-ed47f5ed','Adjustable aluminum tablet stand. 360° rotation, compatible with 4-13 inch tablets.',19.99,14.99,0,'TTS-001','active',0,3,0.22,'2026-05-23 22:30:59','2026-05-26 21:22:39'),(19,2,37,'Vitamin C Face Serum','vitamin-c-face-serum','20% Vitamin C serum with hyaluronic acid and Vitamin E. Brightening and anti-aging.',24.99,18.99,180,'BCS-001','active',1,2,0.10,'2026-05-23 22:30:59','2026-05-23 23:02:30'),(20,2,8,'Canvas Tote Bag','canvas-tote-bag','Large canvas tote bag with inner zip pocket and magnetic closure. 100% cotton.',22.99,NULL,200,'CTB-001','active',0,0,0.30,'2026-05-23 22:30:59','2026-05-23 22:30:59');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_requests`
--

DROP TABLE IF EXISTS `return_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `return_requests` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `reason` text NOT NULL,
  `status` enum('requested','approved','rejected','completed') NOT NULL DEFAULT 'requested',
  `admin_note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_return_user` (`user_id`),
  KEY `idx_return_order` (`order_id`),
  KEY `idx_return_status` (`status`),
  CONSTRAINT `fk_return_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_return_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_requests`
--

LOCK TABLES `return_requests` WRITE;
/*!40000 ALTER TABLE `return_requests` DISABLE KEYS */;
INSERT INTO `return_requests` VALUES (1,2,7,'no','approved','no comment','2026-05-25 22:33:09','2026-05-26 21:20:05');
/*!40000 ALTER TABLE `return_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reviews` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `order_id` int(10) unsigned NOT NULL,
  `rating` tinyint(3) unsigned NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `body` text DEFAULT NULL,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_product_order` (`user_id`,`product_id`,`order_id`),
  KEY `idx_reviews_product_id` (`product_id`),
  KEY `idx_reviews_user_id` (`user_id`),
  KEY `idx_reviews_rating` (`rating`),
  KEY `idx_reviews_created_at` (`created_at`),
  KEY `idx_reviews_product_rating` (`product_id`,`rating`),
  KEY `fk_reviews_order` (`order_id`),
  CONSTRAINT `fk_reviews_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_notifications`
--

DROP TABLE IF EXISTS `stock_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_notifications` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `email` varchar(190) NOT NULL,
  `is_notified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_stock_notify` (`product_id`,`email`),
  KEY `idx_stock_notify_product` (`product_id`),
  CONSTRAINT `fk_stock_notify_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_notifications`
--

LOCK TABLES `stock_notifications` WRITE;
/*!40000 ALTER TABLE `stock_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('customer','vendor','admin') NOT NULL DEFAULT 'customer',
  `avatar_url` varchar(500) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email_verification_token` varchar(100) DEFAULT NULL,
  `password_reset_token` varchar(100) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `refresh_token_hash` varchar(255) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','admin@myshop.com','$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12','admin',NULL,'+1-555-0001',1,NULL,NULL,NULL,NULL,NULL,'2026-05-23 22:30:48','2026-05-25 11:15:57'),(2,'Fashion Store','vendor1@myshop.com','$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12','vendor',NULL,'+1-555-0002',1,NULL,NULL,NULL,NULL,NULL,'2026-05-23 22:30:48','2026-05-25 11:15:57'),(3,'Tech World','vendor2@myshop.com','$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12','vendor',NULL,'+1-555-0003',1,NULL,NULL,NULL,NULL,NULL,'2026-05-23 22:30:48','2026-05-25 11:15:57'),(4,'Alice Johnson','alice@example.com','$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12','customer',NULL,'+1-555-0004',1,NULL,NULL,NULL,'$2y$10$qqorUF4I.3vP445xCQ3DG.6aPOcSm/xkzLz8Mig4RDYdyaw4.6guG','2026-05-25 22:29:33','2026-05-23 22:30:48','2026-05-25 23:29:45'),(5,'Bob Smith','bob@example.com','$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12','customer',NULL,'+1-555-0005',1,NULL,NULL,NULL,NULL,NULL,'2026-05-23 22:30:48','2026-05-25 11:15:57'),(6,'Carol Davis','carol@example.com','$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12','customer',NULL,'+1-555-0006',0,NULL,NULL,NULL,NULL,NULL,'2026-05-23 22:30:48','2026-05-25 11:15:57'),(7,'MyShop Admin','myshop@gmail.com','$2y$12$Zggc4tu29lpYImadkyVbauMJYh23.w6460rkJvxyCFYRBQveZ8EXO','admin',NULL,NULL,1,NULL,NULL,NULL,'$2y$10$5Pq7CAL3/xwpZcVqZnHMc.lje47X1MlegNyfvS5M8QCikHtHym32q','2026-05-25 21:22:58','2026-05-23 22:31:10','2026-05-26 22:30:38'),(9,'Ali Ahmad Dakdouk','alidakdouk70@gmail.com','$2y$12$rZSkmj3Tq97nCczaApyMX.yOLxjW0MiH1LQ.Tx3.qcoxmG3RpjXYG','customer',NULL,'',0,'bb49e45c5c62c3d4221bf2d75d47d99e89bd2ad761edc6dec38e1e84975e404c',NULL,NULL,'$2y$10$u94eUj1LJ/cb/uDcvFrsM.GyL8JdDUOHli5z4o3ft1h6NEWrGnpRK','2026-05-24 20:50:10','2026-05-23 23:03:44','2026-05-25 22:17:40'),(10,'Ali Ahmad Dakdouk','alidakdouk7@gmail.com','$2y$12$vEqmJFu5WWUR7rP5LmYiueOvKRSgeKzoBuDkn3hAAVWICgjoU5V8G','customer',NULL,'',0,'412707a156b0415c023deebcf5e8d39d5f005cc9e25145b6008378e62a4e7aeb',NULL,NULL,'$2y$10$lVwgsZt49KQPAPI6iW9aruPX6yt/W2ZeMtV4dKmufl6jJiJkh3gke','2026-05-23 22:26:33','2026-05-23 23:26:31','2026-05-23 23:26:33');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_profiles`
--

DROP TABLE IF EXISTS `vendor_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendor_profiles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `store_name` varchar(150) NOT NULL,
  `store_slug` varchar(160) NOT NULL,
  `bio` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `banner_url` varchar(500) DEFAULT NULL,
  `rating_avg` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_sales` int(10) unsigned NOT NULL DEFAULT 0,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendor_user_id` (`user_id`),
  UNIQUE KEY `uq_vendor_store_slug` (`store_slug`),
  KEY `idx_vendor_rating` (`rating_avg`),
  KEY `idx_vendor_is_approved` (`is_approved`),
  CONSTRAINT `fk_vendor_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_profiles`
--

LOCK TABLES `vendor_profiles` WRITE;
/*!40000 ALTER TABLE `vendor_profiles` DISABLE KEYS */;
INSERT INTO `vendor_profiles` VALUES (1,2,'Fashion Store','fashion-store','Premium clothing and accessories for every style.',NULL,NULL,4.70,1250,1,'2026-05-23 22:30:48','2026-05-23 22:30:48'),(2,3,'Tech World','tech-world','Latest gadgets and electronics at unbeatable prices.',NULL,NULL,4.85,890,1,'2026-05-23 22:30:48','2026-05-23 22:30:48');
/*!40000 ALTER TABLE `vendor_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlists`
--

DROP TABLE IF EXISTS `wishlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wishlists` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlists_user_product` (`user_id`,`product_id`),
  KEY `idx_wishlists_user_id` (`user_id`),
  KEY `idx_wishlists_product_id` (`product_id`),
  CONSTRAINT `fk_wishlists_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wishlists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlists`
--

LOCK TABLES `wishlists` WRITE;
/*!40000 ALTER TABLE `wishlists` DISABLE KEYS */;
INSERT INTO `wishlists` VALUES (1,9,1,'2026-05-23 23:27:27'),(3,7,1,'2026-05-25 23:07:12'),(4,7,12,'2026-05-25 23:07:26');
/*!40000 ALTER TABLE `wishlists` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-26 22:31:52
