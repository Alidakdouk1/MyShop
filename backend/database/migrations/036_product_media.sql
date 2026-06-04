-- Migration 036: extend product_images to carry video media (YouTube + uploads)
-- Rather than create a separate media table, we widen the existing one so all
-- gallery items live in one ordered list. `image_url` doubles as a poster
-- thumbnail for videos. For `youtube`, video_url is the canonical embed URL;
-- for `video`, it's a path under uploads/products/{id}/videos/.
ALTER TABLE `product_images`
  ADD COLUMN `media_type` ENUM('image','youtube','video') NOT NULL DEFAULT 'image' AFTER `image_url`,
  ADD COLUMN `video_url`  VARCHAR(500) DEFAULT NULL AFTER `media_type`;
