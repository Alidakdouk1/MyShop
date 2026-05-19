-- Seed 001: categories (top-level + sub-categories)
-- Safe to re-run (INSERT IGNORE)

INSERT IGNORE INTO `categories` (`id`, `parent_id`, `name`, `slug`, `sort_order`) VALUES
-- Top-level
(1,  NULL, 'Women',           'women',            1),
(2,  NULL, 'Men',             'men',              2),
(3,  NULL, 'Kids',            'kids',             3),
(4,  NULL, 'Electronics',     'electronics',      4),
(5,  NULL, 'Home & Garden',   'home-garden',      5),
(6,  NULL, 'Beauty',          'beauty',           6),
(7,  NULL, 'Sports',          'sports',           7),
(8,  NULL, 'Bags',            'bags',             8),
(9,  NULL, 'Shoes',           'shoes',            9),
(10, NULL, 'Accessories',     'accessories',      10),

-- Women sub-categories
(11, 1,   'Dresses',          'women-dresses',    1),
(12, 1,   'Tops & Blouses',   'women-tops',       2),
(13, 1,   'Pants & Jeans',    'women-pants',      3),
(14, 1,   'Swimwear',         'women-swimwear',   4),
(15, 1,   'Lingerie',         'women-lingerie',   5),
(16, 1,   'Outerwear',        'women-outerwear',  6),

-- Men sub-categories
(17, 2,   'T-Shirts',         'men-tshirts',      1),
(18, 2,   'Shirts',           'men-shirts',       2),
(19, 2,   'Pants',            'men-pants',        3),
(20, 2,   'Suits',            'men-suits',        4),
(21, 2,   'Activewear',       'men-activewear',   5),
(22, 2,   'Outerwear',        'men-outerwear',    6),

-- Kids sub-categories
(23, 3,   'Girls Clothing',   'kids-girls',       1),
(24, 3,   'Boys Clothing',    'kids-boys',        2),
(25, 3,   'Baby',             'kids-baby',        3),
(26, 3,   'Toys',             'kids-toys',        4),

-- Electronics sub-categories
(27, 4,   'Phones',           'electronics-phones',  1),
(28, 4,   'Laptops',          'electronics-laptops', 2),
(29, 4,   'Tablets',          'electronics-tablets', 3),
(30, 4,   'Accessories',      'electronics-acc',     4),
(31, 4,   'Smart Watches',    'electronics-watches', 5),

-- Home & Garden sub-categories
(32, 5,   'Furniture',        'home-furniture',   1),
(33, 5,   'Kitchen',          'home-kitchen',     2),
(34, 5,   'Bedding',          'home-bedding',     3),
(35, 5,   'Decor',            'home-decor',       4),
(36, 5,   'Garden',           'home-garden-sub',  5),

-- Beauty sub-categories
(37, 6,   'Skincare',         'beauty-skincare',  1),
(38, 6,   'Makeup',           'beauty-makeup',    2),
(39, 6,   'Hair Care',        'beauty-hair',      3),
(40, 6,   'Perfume',          'beauty-perfume',   4),

-- Sports sub-categories
(41, 7,   'Running',          'sports-running',   1),
(42, 7,   'Yoga',             'sports-yoga',      2),
(43, 7,   'Gym Equipment',    'sports-gym',       3),
(44, 7,   'Team Sports',      'sports-team',      4),

-- Shoes sub-categories
(45, 9,   'Women Shoes',      'shoes-women',      1),
(46, 9,   'Men Shoes',        'shoes-men',        2),
(47, 9,   'Sneakers',         'shoes-sneakers',   3),
(48, 9,   'Boots',            'shoes-boots',      4);
