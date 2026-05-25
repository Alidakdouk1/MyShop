-- Seed 006: product ↔ filter-option links (product_filter_values)
-- ---------------------------------------------------------------------------
-- The storefront sidebar filters (Color, Size, Trends/Style, Pattern,
-- Material) read from `product_filter_values`. That table shipped EMPTY, so
-- selecting any option produced an `EXISTS(... )` that matched nothing — the
-- filters appeared "broken" while price (a direct column) kept working.
--
-- This seed tags the 20 catalog products with accurate options, derived from
-- their real variants (colors/sizes) and product identity. Option IDs:
--   Color(1):  Black1 White2 Gray3 Beige4 Brown5 Khaki6 Red7 Burgundy8 Pink9
--              HotPink10 Orange11 Yellow12 Green13 Olive14 Mint15 Blue16
--              Navy17 LightBlue18 Purple19 Lavender20 Gold21 Silver22 Multi23
--   Size(2):   XS24 S25 M26 L27 XL28 XXL29 XXXL30 4XL31 OneSize32 PlusSize33
--   Style(3):  Casual34 Elegant35 Streetwear36 Vintage37 Boho38 Sporty39
--              Business40 ... Minimalist43 Preppy44 ... Romantic46 Korean47 Sexy48
--   Pattern(4):Solid49 Striped50 Floral51 ...
--   Material(5):Cotton63 Polyester64 Linen65 Silk66 Denim68 Leather69
--              FauxLeather70 Chiffon71 Satin77 Mesh78 Spandex75 Rayon76
--
-- SAFE TO RE-RUN: clears only these products' links for filters 1–5 first.
-- ===========================================================================

DELETE FROM `product_filter_values` WHERE `product_id` BETWEEN 1 AND 20 AND `filter_id` IN (1,2,3,4,5);

INSERT INTO `product_filter_values` (`product_id`, `filter_id`, `filter_option_id`, `is_visible`) VALUES
-- 1 Floral Wrap Dress
(1,1,9,1),(1,1,7,1), (1,2,24,1),(1,2,25,1),(1,2,26,1),(1,2,27,1),(1,2,28,1), (1,3,46,1),(1,3,35,1), (1,4,51,1), (1,5,71,1),(1,5,76,1),
-- 2 Elegant Midi Dress
(2,1,19,1),(2,1,8,1), (2,2,25,1),(2,2,26,1),(2,2,27,1),(2,2,28,1), (2,3,35,1),(2,3,46,1), (2,4,49,1), (2,5,77,1),
-- 3 Casual Cotton Top
(3,1,2,1), (3,2,25,1),(3,2,26,1),(3,2,27,1),(3,2,28,1), (3,3,34,1),(3,3,43,1), (3,4,49,1), (3,5,63,1),
-- 4 Striped Oversized Blouse
(4,1,4,1),(4,1,2,1), (4,2,25,1),(4,2,26,1),(4,2,27,1),(4,2,28,1),(4,2,29,1), (4,3,34,1),(4,3,47,1), (4,4,50,1), (4,5,63,1),(4,5,65,1),
-- 5 High-Waist Skinny Jeans
(5,1,16,1),(5,1,1,1), (5,2,24,1),(5,2,25,1),(5,2,26,1),(5,2,27,1),(5,2,28,1), (5,3,34,1),(5,3,36,1), (5,4,49,1), (5,5,68,1),(5,5,75,1),
-- 6 Men Basic Crew Tee
(6,1,1,1),(6,1,2,1),(6,1,3,1), (6,2,25,1),(6,2,26,1),(6,2,27,1),(6,2,28,1),(6,2,29,1), (6,3,34,1),(6,3,43,1), (6,4,49,1), (6,5,63,1),
-- 7 Men Oxford Shirt
(7,1,16,1),(7,1,2,1), (7,2,25,1),(7,2,26,1),(7,2,27,1),(7,2,28,1), (7,3,40,1),(7,3,44,1), (7,4,49,1), (7,5,63,1),
-- 8 Men Slim Chinos
(8,1,6,1),(8,1,4,1), (8,2,25,1),(8,2,26,1),(8,2,27,1),(8,2,28,1), (8,3,40,1),(8,3,34,1), (8,4,49,1), (8,5,63,1),(8,5,75,1),
-- 9 White Chunky Sneakers (footwear — no apparel size)
(9,1,2,1), (9,3,36,1),(9,3,39,1), (9,4,49,1), (9,5,69,1),(9,5,70,1),(9,5,78,1),
-- 10 Strappy Heeled Sandals (footwear — no apparel size)
(10,1,1,1),(10,1,4,1), (10,3,35,1),(10,3,48,1), (10,4,49,1), (10,5,70,1),
-- 11 Wireless Earbuds Pro
(11,1,1,1),(11,1,2,1),(11,1,16,1),
-- 12 Fast Charge Cable Pack
(12,1,1,1),(12,1,2,1),
-- 13 Portable Phone Stand
(13,1,1,1),(13,1,22,1),
-- 14 Smart Fitness Tracker
(14,1,1,1),
-- 15 Wireless Charging Pad
(15,1,1,1),(15,1,2,1),
-- 16 Laptop Cooling Pad
(16,1,1,1),
-- 17 Bluetooth Keyboard
(17,1,1,1),(17,1,2,1),(17,1,22,1),
-- 18 Tablet Stand Holder
(18,1,22,1),(18,1,3,1),
-- 20 Canvas Tote Bag
(20,1,4,1),(20,1,6,1), (20,2,32,1), (20,3,34,1),(20,3,43,1), (20,4,49,1), (20,5,63,1),(20,5,65,1);
