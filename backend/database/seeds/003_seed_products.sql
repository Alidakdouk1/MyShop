-- Seed 003: products, product_images, product_variants, coupons

-- Products (vendor_id 2 = Fashion Store, vendor_id 3 = Tech World)
INSERT IGNORE INTO `products`
  (`id`, `vendor_id`, `category_id`, `name`, `slug`, `description`, `base_price`, `sale_price`, `stock_qty`, `sku`, `status`, `is_featured`, `weight`) VALUES

-- Fashion Store products
(1,  2, 11, 'Floral Wrap Dress',        'floral-wrap-dress',        'A beautiful floral wrap dress perfect for summer. Lightweight fabric, midi length.',                       29.99, 19.99, 150, 'FSD-001', 'active', 1, 0.30),
(2,  2, 11, 'Elegant Midi Dress',       'elegant-midi-dress',       'Classic elegant midi dress with a flattering silhouette. Available in multiple colors.',                   49.99, NULL,  80,  'FSD-002', 'active', 1, 0.35),
(3,  2, 12, 'Casual Cotton Top',        'casual-cotton-top',        'Soft 100% cotton casual top, great for everyday wear. Relaxed fit.',                                       14.99, 9.99,  200, 'FCT-001', 'active', 0, 0.20),
(4,  2, 12, 'Striped Oversized Blouse', 'striped-oversized-blouse', 'Trendy striped oversized blouse with dropped shoulders. Perfect for casual outings.',                      24.99, NULL,  120, 'FOB-001', 'active', 0, 0.25),
(5,  2, 13, 'High-Waist Skinny Jeans',  'high-waist-skinny-jeans',  'Classic high-waist skinny jeans with stretch fabric for comfort. 5-pocket design.',                       39.99, 29.99, 100, 'FJN-001', 'active', 1, 0.60),
(6,  2, 17, 'Men Basic Crew Tee',       'men-basic-crew-tee',       'Essential men''s basic crew neck t-shirt. 100% cotton, pre-shrunk.',                                       12.99, NULL,  300, 'MBT-001', 'active', 0, 0.20),
(7,  2, 18, 'Men Oxford Shirt',         'men-oxford-shirt',         'Classic Oxford button-down shirt. Smart casual style, wrinkle resistant.',                                 34.99, 24.99, 90,  'MOS-001', 'active', 1, 0.35),
(8,  2, 19, 'Men Slim Chinos',          'men-slim-chinos',          'Slim fit chinos with elasticated waistband. Versatile and comfortable for any occasion.',                  44.99, NULL,  75,  'MSC-001', 'active', 0, 0.55),
(9,  2, 47, 'White Chunky Sneakers',    'white-chunky-sneakers',    'Trendy white chunky sole sneakers. Cushioned insole, durable rubber outsole.',                             59.99, 44.99, 60,  'WSN-001', 'active', 1, 0.80),
(10, 2, 45, 'Strappy Heeled Sandals',   'strappy-heeled-sandals',   'Elegant strappy heeled sandals, 3-inch block heel for comfort and style.',                                 45.99, NULL,  45,  'SHS-001', 'active', 0, 0.50),

-- Tech World products
(11, 3, 27, 'Wireless Earbuds Pro',     'wireless-earbuds-pro',     'True wireless earbuds with 30hr battery, active noise cancellation, IPX5 waterproof.',                    79.99, 59.99, 200, 'TWE-001', 'active', 1, 0.10),
(12, 3, 27, 'Fast Charge Cable Pack',   'fast-charge-cable-pack',   'Pack of 3 braided USB-C cables. Supports 100W fast charging. 6ft length.',                                15.99, NULL,  500, 'TCC-001', 'active', 0, 0.15),
(13, 3, 30, 'Portable Phone Stand',     'portable-phone-stand',     'Adjustable aluminum phone stand. Foldable design, fits phones 4-7 inches.',                                9.99, 6.99,  400, 'TPS-001', 'active', 0, 0.08),
(14, 3, 31, 'Smart Fitness Tracker',    'smart-fitness-tracker',    'Fitness tracker with heart rate monitor, sleep tracking, 7-day battery, waterproof.',                     49.99, 39.99, 150, 'TFT-001', 'active', 1, 0.05),
(15, 3, 30, 'Wireless Charging Pad',    'wireless-charging-pad',    '15W fast wireless charging pad. Compatible with all Qi devices. LED indicator.',                          19.99, NULL,  250, 'TWC-001', 'active', 0, 0.12),
(16, 3, 28, 'Laptop Cooling Pad',       'laptop-cooling-pad',       'Ultra-slim laptop cooling pad with 2 silent fans. Fits laptops up to 17 inches. USB powered.',            29.99, 22.99, 80,  'TLP-001', 'active', 0, 0.45),
(17, 3, 30, 'Bluetooth Keyboard',       'bluetooth-keyboard',       'Slim rechargeable Bluetooth keyboard. Multi-device pairing (3 devices), scissor switches.',               45.99, NULL,  60,  'TBK-001', 'active', 1, 0.40),
(18, 3, 29, 'Tablet Stand Holder',      'tablet-stand-holder',      'Adjustable aluminum tablet stand. 360° rotation, compatible with 4-13 inch tablets.',                    19.99, 14.99, 120, 'TTS-001', 'active', 0, 0.22),
(19, 2, 37, 'Vitamin C Face Serum',     'vitamin-c-face-serum',     '20% Vitamin C serum with hyaluronic acid and Vitamin E. Brightening and anti-aging.',                     24.99, 18.99, 180, 'BCS-001', 'active', 1, 0.10),
(20, 2,  8, 'Canvas Tote Bag',          'canvas-tote-bag',          'Large canvas tote bag with inner zip pocket and magnetic closure. 100% cotton.',                          22.99, NULL,  200, 'CTB-001', 'active', 0, 0.30);

-- Product images (primary images)
INSERT IGNORE INTO `product_images` (`product_id`, `image_url`, `sort_order`, `is_primary`) VALUES
(1,  'https://placehold.co/800x1000/FFB6C1/333?text=Floral+Dress',      0, 1),
(2,  'https://placehold.co/800x1000/C8A2C8/333?text=Midi+Dress',        0, 1),
(3,  'https://placehold.co/800x1000/87CEEB/333?text=Cotton+Top',        0, 1),
(4,  'https://placehold.co/800x1000/F5F5DC/333?text=Striped+Blouse',    0, 1),
(5,  'https://placehold.co/800x1000/4169E1/fff?text=Skinny+Jeans',      0, 1),
(6,  'https://placehold.co/800x1000/FFFFFF/333?text=Crew+Tee',          0, 1),
(7,  'https://placehold.co/800x1000/87CEFA/333?text=Oxford+Shirt',      0, 1),
(8,  'https://placehold.co/800x1000/D2B48C/333?text=Slim+Chinos',       0, 1),
(9,  'https://placehold.co/800x1000/F5F5F5/333?text=Sneakers',          0, 1),
(10, 'https://placehold.co/800x1000/FFD700/333?text=Heeled+Sandals',    0, 1),
(11, 'https://placehold.co/800x800/1a1a2e/fff?text=Earbuds+Pro',        0, 1),
(12, 'https://placehold.co/800x800/2d3748/fff?text=Cable+Pack',         0, 1),
(13, 'https://placehold.co/800x800/718096/fff?text=Phone+Stand',        0, 1),
(14, 'https://placehold.co/800x800/2b6cb0/fff?text=Fitness+Tracker',    0, 1),
(15, 'https://placehold.co/800x800/4a5568/fff?text=Charging+Pad',       0, 1),
(16, 'https://placehold.co/800x800/1a202c/fff?text=Cooling+Pad',        0, 1),
(17, 'https://placehold.co/800x800/2c5282/fff?text=BT+Keyboard',        0, 1),
(18, 'https://placehold.co/800x800/553c9a/fff?text=Tablet+Stand',       0, 1),
(19, 'https://placehold.co/800x800/FFF9C4/333?text=Vitamin+C+Serum',    0, 1),
(20, 'https://placehold.co/800x800/F0E68C/333?text=Canvas+Tote',        0, 1);

-- Product variants
INSERT IGNORE INTO `product_variants` (`product_id`, `size`, `color`, `price_modifier`, `stock_qty`, `sku`) VALUES
-- Floral Wrap Dress sizes
(1, 'XS', 'Pink',   0.00,  30, 'FSD-001-XS-PNK'),
(1, 'S',  'Pink',   0.00,  40, 'FSD-001-S-PNK'),
(1, 'M',  'Pink',   0.00,  40, 'FSD-001-M-PNK'),
(1, 'L',  'Pink',   0.00,  25, 'FSD-001-L-PNK'),
(1, 'XL', 'Pink',   2.00,  15, 'FSD-001-XL-PNK'),
-- High-Waist Skinny Jeans
(5, 'XS', 'Blue',   0.00,  20, 'FJN-001-XS-BLU'),
(5, 'S',  'Blue',   0.00,  25, 'FJN-001-S-BLU'),
(5, 'M',  'Blue',   0.00,  25, 'FJN-001-M-BLU'),
(5, 'L',  'Blue',   0.00,  20, 'FJN-001-L-BLU'),
(5, 'XL', 'Blue',   0.00,  10, 'FJN-001-XL-BLU'),
(5, 'XS', 'Black',  0.00,  20, 'FJN-001-XS-BLK'),
(5, 'S',  'Black',  0.00,  20, 'FJN-001-S-BLK'),
-- Men Oxford Shirt
(7, 'S',  'White',  0.00,  20, 'MOS-001-S-WHT'),
(7, 'M',  'White',  0.00,  25, 'MOS-001-M-WHT'),
(7, 'L',  'White',  0.00,  25, 'MOS-001-L-WHT'),
(7, 'XL', 'White',  0.00,  15, 'MOS-001-XL-WHT'),
(7, 'S',  'Blue',   0.00,  15, 'MOS-001-S-BLU'),
(7, 'M',  'Blue',   0.00,  20, 'MOS-001-M-BLU'),
-- White Chunky Sneakers (sizes)
(9, '36', 'White',  0.00,  10, 'WSN-001-36-WHT'),
(9, '37', 'White',  0.00,  10, 'WSN-001-37-WHT'),
(9, '38', 'White',  0.00,  12, 'WSN-001-38-WHT'),
(9, '39', 'White',  0.00,  10, 'WSN-001-39-WHT'),
(9, '40', 'White',  0.00,  8,  'WSN-001-40-WHT'),
(9, '41', 'White',  0.00,  5,  'WSN-001-41-WHT'),
-- Wireless Earbuds colors
(11, NULL, 'Black', 0.00,  80, 'TWE-001-BLK'),
(11, NULL, 'White', 0.00,  80, 'TWE-001-WHT'),
(11, NULL, 'Blue',  5.00,  40, 'TWE-001-BLU');

-- Coupons
INSERT IGNORE INTO `coupons` (`code`, `type`, `value`, `min_order`, `usage_limit`, `is_active`, `expires_at`) VALUES
('WELCOME10',  'percent', 10.00,  0.00,  NULL, 1, DATE_ADD(NOW(), INTERVAL 1 YEAR)),
('SAVE20',     'percent', 20.00,  50.00, 500,  1, DATE_ADD(NOW(), INTERVAL 6 MONTH)),
('FLAT5OFF',   'fixed',   5.00,   20.00, 1000, 1, DATE_ADD(NOW(), INTERVAL 3 MONTH)),
('TECH15',     'percent', 15.00,  30.00, 200,  1, DATE_ADD(NOW(), INTERVAL 6 MONTH)),
('FREESHIP',   'fixed',   8.00,   0.00,  NULL, 1, DATE_ADD(NOW(), INTERVAL 1 YEAR));
