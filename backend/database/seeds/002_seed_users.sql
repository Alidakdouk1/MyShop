-- Seed 002: users + vendor profiles
-- Passwords are all "Password123!" hashed with PASSWORD_BCRYPT (cost 12)
-- Hash below is pre-generated for development use only

INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_verified`, `phone`) VALUES
(1, 'Admin User',      'admin@myshop.com',    '$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12', 'admin',    1, '+1-555-0001'),
(2, 'Fashion Store',   'vendor1@myshop.com',  '$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12', 'vendor',   1, '+1-555-0002'),
(3, 'Tech World',      'vendor2@myshop.com',  '$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12', 'vendor',   1, '+1-555-0003'),
(4, 'Alice Johnson',   'alice@example.com',   '$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12', 'customer', 1, '+1-555-0004'),
(5, 'Bob Smith',       'bob@example.com',     '$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12', 'customer', 1, '+1-555-0005'),
(6, 'Carol Davis',     'carol@example.com',   '$2y$12$4JboU8J/9xmQRhbrExnldOFvdaair0TlMCKMtyFAf7LQbrRs2Qf12', 'customer', 0, '+1-555-0006');

INSERT IGNORE INTO `vendor_profiles`
  (`id`, `user_id`, `store_name`, `store_slug`, `bio`, `rating_avg`, `total_sales`, `is_approved`) VALUES
(1, 2, 'Fashion Store',  'fashion-store',  'Premium clothing and accessories for every style.', 4.70, 1250, 1),
(2, 3, 'Tech World',     'tech-world',     'Latest gadgets and electronics at unbeatable prices.', 4.85, 890,  1);

INSERT IGNORE INTO `addresses`
  (`id`, `user_id`, `label`, `recipient_name`, `street`, `city`, `state`, `country`, `zip`, `is_default`) VALUES
(1, 4, 'Home',   'Alice Johnson', '123 Maple St',   'New York',    'NY', 'United States', '10001', 1),
(2, 5, 'Home',   'Bob Smith',     '456 Oak Ave',    'Los Angeles', 'CA', 'United States', '90001', 1),
(3, 5, 'Office', 'Bob Smith',     '789 Pine Blvd',  'Los Angeles', 'CA', 'United States', '90002', 0);
