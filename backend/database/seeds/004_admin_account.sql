-- Seed 004: primary admin account + category has_sizes flags
-- Password: 1my#shopa5f  (bcrypt cost=12)

INSERT IGNORE INTO `users`
  (`name`, `email`, `password_hash`, `role`, `is_verified`, `phone`)
VALUES
  ('MyShop Admin', 'myshop@gmail.com',
   '$2y$12$Zggc4tu29lpYImadkyVbauMJYh23.w6460rkJvxyCFYRBQveZ8EXO',
   'admin', 1, NULL);

-- ── has_sizes = 1 for clothing / shoes / sports-apparel categories ───────────
UPDATE `categories` SET `has_sizes` = 1 WHERE `id` IN (
  -- Women top-level + all sub-categories
  1, 11, 12, 13, 14, 15, 16,
  -- Men top-level + all sub-categories
  2, 17, 18, 19, 20, 21, 22,
  -- Kids clothing sub-categories (not Toys = 26)
  3, 23, 24, 25,
  -- Shoes top-level + all sub-categories
  9, 45, 46, 47, 48,
  -- Sports apparel (Running=41, Yoga=42) — not Gym Equipment=43, Team Sports=44
  41, 42
);
