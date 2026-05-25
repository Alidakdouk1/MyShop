-- Seed 005: real catalog imagery (products, categories, homepage banners)
-- ---------------------------------------------------------------------------
-- Replaces the grey placehold.co placeholders that 003_seed_products.sql wrote
-- with curated, real stock photos served from the Unsplash image CDN. Because
-- every URL lives in the shared DB, the images render for ALL users/visitors.
--
-- SAFE TO RE-RUN: product updates only touch rows still pointing at
-- placehold.co, and category updates only fill empty image slots — so admin
-- uploads are never overwritten.
-- TO REVERT: re-run backend/database/seeds/003_seed_products.sql (products)
-- and clear categories.image_url / homepage_sections image_url as desired.
--
-- Every URL below was verified to return HTTP 200 before committing.
-- URL shape: https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=800&q=80
-- ===========================================================================

-- ── Products (only rows still on the placeholder host) ─────────────────────
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=1  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=2  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=3  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=4  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=5  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=6  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=7  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=8  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=9  AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=10 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=11 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=12 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=13 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=14 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1601972602288-3be527b4f18a?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=15 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=16 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=17 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=18 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=19 AND `image_url` LIKE 'https://placehold.co/%';
UPDATE `product_images` SET `image_url`='https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80' WHERE `product_id`=20 AND `image_url` LIKE 'https://placehold.co/%';

-- ── Categories (top-level circles) — only fill empty slots ─────────────────
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80' WHERE `id`=1  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=800&q=80' WHERE `id`=2  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80' WHERE `id`=3  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80' WHERE `id`=4  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80' WHERE `id`=5  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80' WHERE `id`=6  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80' WHERE `id`=7  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80' WHERE `id`=8  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=800&q=80' WHERE `id`=9  AND (`image_url` IS NULL OR `image_url`='');
UPDATE `categories` SET `image_url`='https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80' WHERE `id`=10 AND (`image_url` IS NULL OR `image_url`='');

-- ── Homepage hero banners (section 1) — side tiles only; center keeps its
--    cream panel because its headline text is dark-on-light by design ───────
UPDATE `homepage_sections` SET `section_data` = JSON_SET(
  `section_data`,
  '$.left_banners[0].image_url', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80',
  '$.left_banners[1].image_url', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
  '$.left_banners[2].image_url', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
  '$.right_brands[0].image_url', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80',
  '$.right_brands[1].image_url', 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&q=80',
  '$.right_brands[2].image_url', 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=800&q=80'
) WHERE `id`=1;

-- ── Homepage promo banners (section 4) ─────────────────────────────────────
UPDATE `homepage_sections` SET `section_data` = JSON_SET(
  `section_data`,
  '$.banners[0].image_url', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80',
  '$.banners[1].image_url', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80'
) WHERE `id`=4;
