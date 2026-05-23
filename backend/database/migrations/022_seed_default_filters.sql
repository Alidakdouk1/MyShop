-- Migration 022: seed the default fashion/storefront filters + their options.
--
-- Idempotent & re-runnable:
--   * filters.name is UNIQUE, so the ON DUPLICATE KEY trick reuses the existing
--     row's id instead of inserting a second copy.
--   * filter_options has a UNIQUE (filter_id, value) key, so INSERT IGNORE skips
--     options that are already there.
--
-- Skipped on purpose (handled elsewhere in the app, not product attributes):
--   Price       — shop sidebar already has a price-range control
--   Sort by     — shop already has a sort dropdown
--   Rating      — computed from reviews
--   Discount    — driven by sale_price ("On Sale" toggle)
--   Quantity    — per-option stock set on the product Add/Edit page

-- ── 2. Color ────────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Color', 'multi', NULL, 0, 1, 2)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Black',1),(@fid,'White',2),(@fid,'Gray',3),(@fid,'Beige',4),(@fid,'Brown',5),
(@fid,'Khaki',6),(@fid,'Red',7),(@fid,'Burgundy',8),(@fid,'Pink',9),(@fid,'Hot Pink',10),
(@fid,'Orange',11),(@fid,'Yellow',12),(@fid,'Green',13),(@fid,'Olive',14),(@fid,'Mint',15),
(@fid,'Blue',16),(@fid,'Navy',17),(@fid,'Light Blue',18),(@fid,'Purple',19),(@fid,'Lavender',20),
(@fid,'Gold',21),(@fid,'Silver',22),(@fid,'Multicolor',23);

-- ── 3. Size ─────────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Size', 'multi', NULL, 0, 1, 3)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'XS',1),(@fid,'S',2),(@fid,'M',3),(@fid,'L',4),(@fid,'XL',5),
(@fid,'XXL',6),(@fid,'XXXL',7),(@fid,'4XL',8),(@fid,'One Size',9),(@fid,'Plus Size',10);

-- ── 5. Trends / Style ─────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Trends / Style', 'multi', NULL, 0, 1, 5)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Casual',1),(@fid,'Elegant',2),(@fid,'Streetwear',3),(@fid,'Vintage',4),(@fid,'Boho',5),
(@fid,'Sporty',6),(@fid,'Business',7),(@fid,'Y2K',8),(@fid,'Cottagecore',9),(@fid,'Minimalist',10),
(@fid,'Preppy',11),(@fid,'Grunge',12),(@fid,'Romantic',13),(@fid,'Korean',14),(@fid,'Sexy',15);

-- ── 6. Pattern ────────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Pattern', 'multi', NULL, 0, 1, 6)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Solid',1),(@fid,'Striped',2),(@fid,'Floral',3),(@fid,'Plaid',4),(@fid,'Polka Dot',5),
(@fid,'Animal Print',6),(@fid,'Leopard',7),(@fid,'Geometric',8),(@fid,'Tie Dye',9),(@fid,'Camouflage',10),
(@fid,'Color Block',11),(@fid,'Graphic',12),(@fid,'Paisley',13),(@fid,'Houndstooth',14);

-- ── 7. Material / Fabric ──────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Material / Fabric', 'multi', NULL, 0, 1, 7)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Cotton',1),(@fid,'Polyester',2),(@fid,'Linen',3),(@fid,'Silk',4),(@fid,'Wool',5),
(@fid,'Denim',6),(@fid,'Leather',7),(@fid,'Faux Leather',8),(@fid,'Chiffon',9),(@fid,'Velvet',10),
(@fid,'Knit',11),(@fid,'Lace',12),(@fid,'Spandex',13),(@fid,'Rayon',14),(@fid,'Satin',15),
(@fid,'Mesh',16),(@fid,'Corduroy',17),(@fid,'Fleece',18);

-- ── 8. Sleeve Length ──────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Sleeve Length', 'multi', NULL, 0, 1, 8)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Sleeveless',1),(@fid,'Cap Sleeve',2),(@fid,'Short Sleeve',3),
(@fid,'Three-Quarter Sleeve',4),(@fid,'Long Sleeve',5),(@fid,'Extra Long Sleeve',6);

-- ── 9. Neckline ───────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Neckline', 'multi', NULL, 0, 1, 9)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Round Neck',1),(@fid,'V Neck',2),(@fid,'Crew Neck',3),(@fid,'Turtleneck',4),(@fid,'Halter',5),
(@fid,'Off Shoulder',6),(@fid,'Square Neck',7),(@fid,'Cowl Neck',8),(@fid,'Scoop Neck',9),
(@fid,'Boat Neck',10),(@fid,'Collared',11),(@fid,'Sweetheart',12),(@fid,'One Shoulder',13);

-- ── 10. Length ────────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Length', 'multi', NULL, 0, 1, 10)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Mini',1),(@fid,'Short',2),(@fid,'Midi',3),(@fid,'Knee Length',4),(@fid,'Maxi',5),
(@fid,'Long',6),(@fid,'Cropped',7),(@fid,'Regular',8),(@fid,'Floor Length',9);

-- ── 13. Waistline ─────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Waistline', 'multi', NULL, 0, 1, 13)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'High Waist',1),(@fid,'Mid Waist',2),(@fid,'Low Waist',3),
(@fid,'Elastic Waist',4),(@fid,'Natural Waist',5),(@fid,'Drawstring Waist',6);

-- ── 14. Fit Type ──────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Fit Type', 'multi', NULL, 0, 1, 14)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Slim Fit',1),(@fid,'Regular Fit',2),(@fid,'Loose Fit',3),(@fid,'Oversized',4),
(@fid,'Skinny',5),(@fid,'Relaxed',6),(@fid,'Bodycon',7),(@fid,'Tailored',8),(@fid,'Straight',9);

-- ── 15. Hem Shape ─────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Hem Shape', 'multi', NULL, 0, 1, 15)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Straight',1),(@fid,'Curved',2),(@fid,'Asymmetric',3),(@fid,'High-Low',4),
(@fid,'Ruffle',5),(@fid,'Split',6),(@fid,'Raw Hem',7),(@fid,'Scalloped',8);

-- ── 16. Type ──────────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Type', 'multi', NULL, 0, 1, 16)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Dress',1),(@fid,'Top',2),(@fid,'T-Shirt',3),(@fid,'Blouse',4),(@fid,'Shirt',5),
(@fid,'Sweater',6),(@fid,'Cardigan',7),(@fid,'Hoodie',8),(@fid,'Jacket',9),(@fid,'Coat',10),
(@fid,'Blazer',11),(@fid,'Pants',12),(@fid,'Jeans',13),(@fid,'Leggings',14),(@fid,'Shorts',15),
(@fid,'Skirt',16),(@fid,'Jumpsuit',17),(@fid,'Romper',18),(@fid,'Activewear',19),
(@fid,'Swimwear',20),(@fid,'Lingerie',21);

-- ── 17. Body Shape ────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Body Shape', 'multi', NULL, 0, 1, 17)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Hourglass',1),(@fid,'Pear',2),(@fid,'Apple',3),(@fid,'Rectangle',4),(@fid,'Inverted Triangle',5);

-- ── 18. Season ────────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Season', 'multi', NULL, 0, 1, 18)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Spring',1),(@fid,'Summer',2),(@fid,'Fall',3),(@fid,'Winter',4),(@fid,'All Season',5);

-- ── 19. Occasion ──────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Occasion', 'multi', NULL, 0, 1, 19)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Casual',1),(@fid,'Work',2),(@fid,'Party',3),(@fid,'Formal',4),(@fid,'Beach',5),
(@fid,'Wedding',6),(@fid,'Vacation',7),(@fid,'Sport',8),(@fid,'Date Night',9),
(@fid,'Everyday',10),(@fid,'Homewear',11);

-- ── 20. Decoration / Details ──────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Decoration / Details', 'multi', NULL, 0, 1, 20)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Buttons',1),(@fid,'Zipper',2),(@fid,'Pockets',3),(@fid,'Bow',4),(@fid,'Ruffles',5),
(@fid,'Lace',6),(@fid,'Embroidery',7),(@fid,'Sequins',8),(@fid,'Beading',9),(@fid,'Fringe',10),
(@fid,'Pleated',11),(@fid,'Cutout',12),(@fid,'Drawstring',13),(@fid,'Belt',14),(@fid,'Chain',15);

-- ── 21. Sheer ─────────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Sheer', 'multi', NULL, 0, 1, 21)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Sheer',1),(@fid,'Semi-Sheer',2),(@fid,'Opaque',3);

-- ── 22. Age Group ─────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Age Group', 'multi', NULL, 0, 1, 22)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Adult',1),(@fid,'Teen',2),(@fid,'Kids',3),(@fid,'Toddler',4),(@fid,'Baby',5);

-- ── 24. Collection (SHEIN categories / lines) ────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Collection', 'multi', NULL, 0, 1, 24)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Curve / Plus',1),(@fid,'Petite',2),(@fid,'Tall',3),(@fid,'Maternity',4),
(@fid,'Essentials',5),(@fid,'Premium',6),(@fid,'Eco / Sustainable',7);

-- ── 25. Heel Height ───────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Heel Height', 'multi', NULL, 0, 1, 25)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Flat',1),(@fid,'Low (1-2 in)',2),(@fid,'Mid (2-3 in)',3),
(@fid,'High (3-4 in)',4),(@fid,'Ultra High (4+ in)',5);

-- ── 26. Toe Shape ─────────────────────────────────────────────────────────────
INSERT INTO filters (name, type, unit, is_required, is_active, display_order)
VALUES ('Toe Shape', 'multi', NULL, 0, 1, 26)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @fid = LAST_INSERT_ID();
INSERT IGNORE INTO filter_options (filter_id, value, display_order) VALUES
(@fid,'Round Toe',1),(@fid,'Pointed Toe',2),(@fid,'Square Toe',3),
(@fid,'Open Toe',4),(@fid,'Almond Toe',5),(@fid,'Peep Toe',6);
