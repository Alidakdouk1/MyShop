-- Migration 047: per-product SEO overrides for <title>, meta description,
-- and the Open Graph share image (Google + WhatsApp / Facebook / Twitter).
ALTER TABLE `products`
  ADD COLUMN `seo_title`       VARCHAR(80)  NULL AFTER `description`,
  ADD COLUMN `seo_description` VARCHAR(200) NULL AFTER `seo_title`,
  ADD COLUMN `seo_og_image`    VARCHAR(500) NULL AFTER `seo_description`;
