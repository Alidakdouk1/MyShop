<?php
declare(strict_types=1);

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base   = '/MyShop/backend';
$path   = '/' . ltrim(str_replace($base, '', $uri), '/');
$method = $_SERVER['REQUEST_METHOD'];

// ── Route matcher ────────────────────────────────────────────
function match_route(string $pattern, string $path, array &$params): bool
{
    $regex = preg_replace('/\{(\w+)\}/', '([^/]+)', $pattern);
    $regex = "#^{$regex}$#";
    if (!preg_match($regex, $path, $m)) return false;
    array_shift($m);
    preg_match_all('/\{(\w+)\}/', $pattern, $keys);
    $params = array_combine($keys[1], $m);
    return true;
}

$params = [];

// ── Auth ─────────────────────────────────────────────────────
if (match_route('/api/auth/register', $path, $params)) {
    (new AuthController())->register();
}
if (match_route('/api/auth/login', $path, $params)) {
    (new AuthController())->login();
}
if (match_route('/api/auth/logout', $path, $params)) {
    (new AuthController())->logout();
}
if (match_route('/api/auth/refresh-token', $path, $params)) {
    (new AuthController())->refreshToken();
}
if (match_route('/api/auth/forgot-password', $path, $params)) {
    (new AuthController())->forgotPassword();
}
if (match_route('/api/auth/reset-password', $path, $params)) {
    (new AuthController())->resetPassword();
}
if (match_route('/api/auth/google', $path, $params)) {
    (new AuthController())->googleLogin();
}
if (match_route('/api/auth/me', $path, $params)) {
    (new AuthController())->me();
}
if (match_route('/api/auth/2fa/setup', $path, $params)) {
    (new AuthController())->setupTwoFactor();
}
if (match_route('/api/auth/2fa/enable', $path, $params)) {
    (new AuthController())->enableTwoFactor();
}
if (match_route('/api/auth/2fa/disable', $path, $params)) {
    (new AuthController())->disableTwoFactor();
}
if (match_route('/api/auth/2fa/verify-login', $path, $params)) {
    (new AuthController())->verifyTwoFactorLogin();
}

// ── Categories ───────────────────────────────────────────────
if (match_route('/api/categories', $path, $params)) {
    (new ProductController())->categories();
}
if (match_route('/api/categories/flat', $path, $params)) {
    (new ProductController())->categoriesFlat();
}
if (match_route('/api/categories/sections', $path, $params)) {
    (new ProductController())->categorySections();
}

// ── Search ───────────────────────────────────────────────────
if (match_route('/api/search/by-image', $path, $params)) {
    (new SearchController())->byImage();
}

// ── Marketplace (user classifieds) ──────────────────────────
// Admin routes first so /admin/marketplace isn't swallowed by /{id} patterns.
if (match_route('/api/admin/marketplace/settings', $path, $params)) {
    (new MarketplaceController())->adminSettings();
}
if (match_route('/api/admin/marketplace', $path, $params)) {
    (new MarketplaceController())->adminIndex();
}
if (match_route('/api/admin/marketplace/{id}/status', $path, $params)) {
    (new MarketplaceController())->adminSetStatus((int) $params['id']);
}
if (match_route('/api/admin/marketplace/{id}/feature', $path, $params)) {
    (new MarketplaceController())->adminSetFeatured((int) $params['id']);
}
// Literal sub-paths before the {id} catch-all.
if (match_route('/api/marketplace/settings', $path, $params)) {
    (new MarketplaceController())->getSettings();
}
if (match_route('/api/marketplace/mine', $path, $params)) {
    (new MarketplaceController())->mine();
}
if (match_route('/api/marketplace', $path, $params)) {
    if ($method === 'GET')  (new MarketplaceController())->index();
    if ($method === 'POST') (new MarketplaceController())->store();
}
if (match_route('/api/marketplace/{id}/image', $path, $params)) {
    (new MarketplaceController())->uploadImage((int) $params['id']);
}
if (match_route('/api/marketplace/{id}/sold', $path, $params)) {
    (new MarketplaceController())->markSold((int) $params['id']);
}
if (match_route('/api/marketplace/{id}/report', $path, $params)) {
    (new MarketplaceController())->report((int) $params['id']);
}
if (match_route('/api/marketplace/{id}/renew', $path, $params)) {
    (new MarketplaceController())->renew((int) $params['id']);
}
if (match_route('/api/marketplace/{id}', $path, $params)) {
    if ($method === 'GET')    (new MarketplaceController())->show((int) $params['id']);
    if ($method === 'PUT')    (new MarketplaceController())->update((int) $params['id']);
    if ($method === 'DELETE') (new MarketplaceController())->destroy((int) $params['id']);
}

// ── Reels (vertical video feed of products) ─────────────────
if (match_route('/api/reels', $path, $params)) {
    (new ReelsController())->index();
}
if (match_route('/api/reels/settings', $path, $params)) {
    (new ReelsController())->getSettings();
}
if (match_route('/api/admin/reels/settings', $path, $params)) {
    (new ReelsController())->adminSettings();
}
if (match_route('/api/reels/{id}/view', $path, $params)) {
    (new ReelsController())->recordView((int) $params['id']);
}
if (match_route('/api/reels/{id}/comments', $path, $params)) {
    if ($method === 'GET')  (new ReelsController())->listComments((int) $params['id']);
    if ($method === 'POST') (new ReelsController())->addComment((int) $params['id']);
}
if (match_route('/api/reels/comments/{id}', $path, $params)) {
    if ($method === 'DELETE') (new ReelsController())->deleteComment((int) $params['id']);
}
if (match_route('/api/admin/reels', $path, $params)) {
    (new ReelsController())->adminList();
}
if (match_route('/api/admin/reels/reorder', $path, $params)) {
    (new ReelsController())->adminReorder();
}
if (match_route('/api/admin/reels/{id}/pin', $path, $params)) {
    (new ReelsController())->adminPin((int) $params['id']);
}

// ── Web Push ─────────────────────────────────────────────────
if (match_route('/api/push/public-key', $path, $params)) {
    (new PushController())->publicKey();
}
if (match_route('/api/push/subscriptions', $path, $params)) {
    if ($method === 'POST')   (new PushController())->subscribe();
    if ($method === 'DELETE') (new PushController())->unsubscribe();
}

// ── Products (public + admin write) ──────────────────────────
if (match_route('/api/products', $path, $params)) {
    if ($method === 'GET') (new ProductController())->index();
    // POST now admin-only (enforced inside store())
    if ($method === 'POST') (new ProductController())->store();
}
if (match_route('/api/products/{slug}', $path, $params)) {
    if ($method === 'GET') (new ProductController())->show($params['slug']);
}
if (match_route('/api/products/{id}/update', $path, $params)) {
    if ($method === 'PUT') (new ProductController())->update((int) $params['id']);
}
if (match_route('/api/products/{id}', $path, $params)) {
    if ($method === 'PUT')    (new ProductController())->update((int) $params['id']);
    if ($method === 'DELETE') (new ProductController())->destroy((int) $params['id']);
}
if (match_route('/api/products/{id}/images', $path, $params)) {
    if ($method === 'POST') (new ProductController())->uploadImage((int) $params['id']);
}
if (match_route('/api/products/{id}/reviews', $path, $params)) {
    if ($method === 'GET') (new ReviewController())->forProduct((int) $params['id']);
}
if (match_route('/api/products/{id}/questions', $path, $params)) {
    if ($method === 'GET') (new QuestionController())->forProduct((int) $params['id']);
}
if (match_route('/api/products/{id}/reviewability', $path, $params)) {
    if ($method === 'GET') (new ReviewController())->reviewability((int) $params['id']);
}
if (match_route('/api/products/{id}/notify-me', $path, $params)) {
    if ($method === 'POST') (new StockNotificationController())->subscribe((int) $params['id']);
}
if (match_route('/api/products/{id}/notify-me/push', $path, $params)) {
    if ($method === 'POST') (new StockNotificationController())->subscribePush((int) $params['id']);
}
if (match_route('/api/products/{id}/filters', $path, $params)) {
    if ($method === 'GET')                          (new FilterController())->showForProduct((int) $params['id']);
    if ($method === 'POST' || $method === 'PUT')    (new FilterController())->saveForProduct((int) $params['id']);
}

// ── Filters (public + admin) ─────────────────────────────────
if (match_route('/api/filters', $path, $params)) {
    if ($method === 'GET')  (new FilterController())->index();
    if ($method === 'POST') (new FilterController())->store();
}
if (match_route('/api/filters/{id}', $path, $params)) {
    if ($method === 'PUT')    (new FilterController())->update((int) $params['id']);
    if ($method === 'DELETE') (new FilterController())->destroy((int) $params['id']);
}
if (match_route('/api/admin/filters', $path, $params)) {
    if ($method === 'GET') (new FilterController())->adminIndex();
}
if (match_route('/api/filter-options', $path, $params)) {
    if ($method === 'POST') (new FilterController())->storeOption();
}
if (match_route('/api/filter-options/{id}', $path, $params)) {
    if ($method === 'PUT')    (new FilterController())->updateOption((int) $params['id']);
    if ($method === 'DELETE') (new FilterController())->destroyOption((int) $params['id']);
}

// ── Cart ─────────────────────────────────────────────────────
if (match_route('/api/cart', $path, $params)) {
    if ($method === 'GET')    (new CartController())->index();
    if ($method === 'DELETE') (new CartController())->clear();
}
if (match_route('/api/cart/recommendations', $path, $params)) {
    if ($method === 'GET') (new CartController())->recommendations();
}
if (match_route('/api/cart/upsell', $path, $params)) {
    if ($method === 'GET') (new CartController())->upsell();
}
if (match_route('/api/cart/merge', $path, $params)) {
    (new CartController())->merge();
}
if (match_route('/api/cart/items', $path, $params)) {
    if ($method === 'POST') (new CartController())->addItem();
}
if (match_route('/api/cart/bundles/{id}', $path, $params)) {
    if ($method === 'POST') (new CartController())->addBundle((int) $params['id']);
}
if (match_route('/api/cart/items/{id}', $path, $params)) {
    if ($method === 'PUT')    (new CartController())->updateItem((int) $params['id']);
    if ($method === 'DELETE') (new CartController())->removeItem((int) $params['id']);
}

// ── Orders ───────────────────────────────────────────────────
if (match_route('/api/orders', $path, $params)) {
    if ($method === 'POST') (new OrderController())->checkout();
    if ($method === 'GET')  (new OrderController())->index();
}
if (match_route('/api/orders/{id}', $path, $params)) {
    if ($method === 'GET') (new OrderController())->show((int) $params['id']);
}
if (match_route('/api/orders/{id}/cancel', $path, $params)) {
    if ($method === 'PUT') (new OrderController())->cancel((int) $params['id']);
}
if (match_route('/api/orders/{id}/reorder', $path, $params)) {
    if ($method === 'POST') (new OrderController())->reorder((int) $params['id']);
}

// ── Returns / RMA ─────────────────────────────────────────────
if (match_route('/api/returns', $path, $params)) {
    if ($method === 'POST') (new ReturnController())->store();
    if ($method === 'GET')  (new ReturnController())->index();
}
if (match_route('/api/admin/returns', $path, $params)) {
    if ($method === 'GET') (new ReturnController())->adminIndex();
}
if (match_route('/api/admin/returns/{id}', $path, $params)) {
    if ($method === 'PUT') (new ReturnController())->adminUpdate((int) $params['id']);
}

// ── Users ────────────────────────────────────────────────────
if (match_route('/api/users/profile', $path, $params)) {
    (new UserController())->profile();
}
if (match_route('/api/users/stats', $path, $params)) {
    if ($method === 'GET') (new UserController())->stats();
}
if (match_route('/api/users/avatar', $path, $params)) {
    if ($method === 'POST') (new UserController())->uploadAvatar();
}
if (match_route('/api/users/addresses', $path, $params)) {
    if ($method === 'GET')  (new UserController())->addresses();
    if ($method === 'POST') (new UserController())->storeAddress();
}
if (match_route('/api/users/addresses/{id}', $path, $params)) {
    if ($method === 'PUT')    (new UserController())->updateAddress((int) $params['id']);
    if ($method === 'DELETE') (new UserController())->deleteAddress((int) $params['id']);
}

// ── Reviews ──────────────────────────────────────────────────
if (match_route('/api/reviews', $path, $params)) {
    if ($method === 'POST') (new ReviewController())->store();
}
if (match_route('/api/reviews/{id}', $path, $params)) {
    if ($method === 'DELETE') (new ReviewController())->destroy((int) $params['id']);
}
if (match_route('/api/reviews/{id}/photos', $path, $params)) {
    if ($method === 'POST') (new ReviewController())->uploadPhoto((int) $params['id']);
}

// ── Product Q&A ──────────────────────────────────────────────
if (match_route('/api/questions', $path, $params)) {
    if ($method === 'POST') (new QuestionController())->store();
}
if (match_route('/api/questions/{id}', $path, $params)) {
    if ($method === 'DELETE') (new QuestionController())->destroy((int) $params['id']);
}

// ── Wishlist ─────────────────────────────────────────────────
if (match_route('/api/wishlist', $path, $params)) {
    $auth = AuthMiddleware::require();
    $wl   = new WishlistModel();
    if ($method === 'GET') {
        success($wl->forUser((int) $auth['sub']));
    }
    if ($method === 'POST') {
        $data = getBody();
        $pid  = (int) ($data['product_id'] ?? 0);
        if (!$pid) error('product_id required.', 422);
        $item = $wl->add((int) $auth['sub'], $pid);
        if (!$item) error('Could not add to wishlist.', 500);

        // Auto-watch: if the product is out of stock, silently subscribe this
        // user to the back-in-stock list using their account email. When the
        // admin later restocks, the existing fan-out emails / pushes every
        // wisher. Customer doesn't have to remember to tap "Notify me".
        $product = (new ProductModel())->findById($pid);
        if ($product && (int) ($product['stock_qty'] ?? 0) <= 0) {
            $userEmail = getDB()->prepare("SELECT email FROM users WHERE id = ?");
            $userEmail->execute([(int) $auth['sub']]);
            $email = (string) $userEmail->fetchColumn();
            if ($email) {
                (new StockNotificationModel())->subscribe($pid, strtolower($email));
            }
        }

        success($item, 'Added to wishlist.', 201);
    }
}
// Sharing — MUST come before /api/wishlist/{id} so "share" doesn't get parsed as an id.
if (match_route('/api/wishlist/share', $path, $params)) {
    $auth = AuthMiddleware::require();
    $wl   = new WishlistModel();
    if ($method === 'GET') {
        $row = getDB()->prepare("SELECT wishlist_share_token FROM users WHERE id = ?");
        $row->execute([(int) $auth['sub']]);
        $tok = $row->fetchColumn();
        success(['token' => $tok ?: null]);
    }
    if ($method === 'POST') {
        $token = $wl->ensureShareToken((int) $auth['sub']);
        success(['token' => $token], 'Sharing enabled.');
    }
    if ($method === 'DELETE') {
        $wl->clearShareToken((int) $auth['sub']);
        success(null, 'Sharing disabled.');
    }
}
if (match_route('/api/wishlist/{id}', $path, $params)) {
    $auth = AuthMiddleware::require();
    if ($method === 'DELETE') {
        (new WishlistModel())->remove((int) $params['id'], (int) $auth['sub']);
        success(null, 'Removed from wishlist.');
    }
}
// Public — anyone with the link can view, no auth.
if (match_route('/api/wishlists/shared/{token}', $path, $params)) {
    if ($method === 'GET') {
        $wl    = new WishlistModel();
        $token = (string) $params['token'];
        $owner = $wl->findUserByShareToken($token);
        if (!$owner) error('Wishlist not found or sharing was disabled.', 404);
        // Surname is stripped for privacy — only the first name shows publicly.
        $first = explode(' ', trim((string) $owner['name']))[0];
        success([
            'owner_name' => $first,
            'items'      => $wl->forUser((int) $owner['id']),
        ]);
    }
}

// ── Coupons ──────────────────────────────────────────────────
if (match_route('/api/coupons/validate', $path, $params)) {
    (new CouponController())->validate();
}
if (match_route('/api/admin/coupons', $path, $params)) {
    if ($method === 'GET')  (new CouponController())->adminIndex();
    if ($method === 'POST') (new CouponController())->adminStore();
}

// ── Sitemap (public XML) + robots.txt ─────────────────────────
if (match_route('/sitemap.xml', $path, $params)) {
    (new SitemapController())->index();
}
if (match_route('/robots.txt', $path, $params)) {
    (new SitemapController())->robots();
}
if (match_route('/api/admin/seo/stats', $path, $params)) {
    if ($method === 'GET') (new SitemapController())->stats();
}

// ── Newsletter ────────────────────────────────────────────────
if (match_route('/api/newsletter/subscribe', $path, $params)) {
    if ($method === 'POST') (new NewsletterController())->subscribe();
}
if (match_route('/api/newsletter/popup', $path, $params)) {
    if ($method === 'GET') (new NewsletterController())->popupConfig();
}
if (match_route('/api/newsletter/welcome-discount', $path, $params)) {
    if ($method === 'POST') (new NewsletterController())->welcomeDiscount();
}
if (match_route('/api/admin/newsletter', $path, $params)) {
    if ($method === 'GET') (new NewsletterController())->adminIndex();
}
if (match_route('/api/admin/newsletter/popup', $path, $params)) {
    if ($method === 'GET') (new NewsletterController())->adminGetPopup();
    if ($method === 'PUT') (new NewsletterController())->adminUpdatePopup();
}
// Campaigns. Order matters — /campaigns/{id}/send must come BEFORE /campaigns/{id}.
if (match_route('/api/admin/newsletter/campaigns', $path, $params)) {
    if ($method === 'GET')  (new NewsletterController())->adminCampaignsIndex();
    if ($method === 'POST') (new NewsletterController())->adminCampaignStore();
}
if (match_route('/api/admin/newsletter/campaigns/{id}/send', $path, $params)) {
    if ($method === 'POST') (new NewsletterController())->adminCampaignSend((int) $params['id']);
}
if (match_route('/api/admin/newsletter/campaigns/{id}', $path, $params)) {
    if ($method === 'GET')    (new NewsletterController())->adminCampaignShow((int) $params['id']);
    if ($method === 'PUT')    (new NewsletterController())->adminCampaignUpdate((int) $params['id']);
    if ($method === 'DELETE') (new NewsletterController())->adminCampaignDestroy((int) $params['id']);
}

// ── Payment: bank transfer ────────────────────────────────────
if (match_route('/api/payment/bank-transfer', $path, $params)) {
    if ($method === 'GET') (new PaymentController())->bankTransferPublic();
}
if (match_route('/api/admin/payment/bank-transfer', $path, $params)) {
    if ($method === 'GET') (new PaymentController())->adminGetBankTransfer();
    if ($method === 'PUT') (new PaymentController())->adminUpdateBankTransfer();
}
if (match_route('/api/admin/orders/{id}/mark-paid', $path, $params)) {
    if ($method === 'PUT') (new PaymentController())->adminMarkPaid((int) $params['id']);
}
if (match_route('/api/payment/whish', $path, $params)) {
    if ($method === 'GET') (new PaymentController())->whishPublic();
}
if (match_route('/api/admin/payment/whish', $path, $params)) {
    if ($method === 'GET') (new PaymentController())->adminGetWhish();
    if ($method === 'PUT') (new PaymentController())->adminUpdateWhish();
}

// ── Admin — Dashboard ─────────────────────────────────────────
if (match_route('/api/admin/dashboard', $path, $params)) {
    (new AdminController())->dashboard();
}
if (match_route('/api/admin/abandoned-carts', $path, $params)) {
    if ($method === 'GET') (new AdminController())->abandonedCarts();
}
if (match_route('/api/admin/low-stock', $path, $params)) {
    if ($method === 'GET') (new AdminController())->lowStock();
}

// ── Admin — Abandoned cart recovery ───────────────────────────
if (match_route('/api/admin/abandoned-cart/settings', $path, $params)) {
    if ($method === 'GET') (new AbandonedCartController())->adminGetSettings();
    if ($method === 'PUT') (new AbandonedCartController())->adminUpdateSettings();
}
if (match_route('/api/admin/abandoned-cart/pending', $path, $params)) {
    if ($method === 'GET') (new AbandonedCartController())->adminPending();
}
if (match_route('/api/admin/abandoned-cart/{id}/send', $path, $params)) {
    if ($method === 'POST') (new AbandonedCartController())->adminSend((int) $params['id']);
}

// ── Promotions (admin only — engine runs server-side on cart/checkout) ─
if (match_route('/api/admin/promotions', $path, $params)) {
    if ($method === 'GET')  (new PromotionController())->adminIndex();
    if ($method === 'POST') (new PromotionController())->adminStore();
}
if (match_route('/api/admin/promotions/{id}', $path, $params)) {
    if ($method === 'PUT')    (new PromotionController())->adminUpdate((int) $params['id']);
    if ($method === 'DELETE') (new PromotionController())->adminDestroy((int) $params['id']);
}

// ── Testimonials (public + admin) ─────────────────────────────
if (match_route('/api/testimonials', $path, $params)) {
    if ($method === 'GET') (new TestimonialController())->publicIndex();
}
if (match_route('/api/admin/testimonials', $path, $params)) {
    if ($method === 'GET')  (new TestimonialController())->adminIndex();
    if ($method === 'POST') (new TestimonialController())->adminStore();
}
// "candidates" specific before {id}
if (match_route('/api/admin/testimonials/candidates', $path, $params)) {
    if ($method === 'GET') (new TestimonialController())->adminCandidates();
}
if (match_route('/api/admin/testimonials/{id}', $path, $params)) {
    if ($method === 'PUT')    (new TestimonialController())->adminUpdate((int) $params['id']);
    if ($method === 'DELETE') (new TestimonialController())->adminDestroy((int) $params['id']);
}

// ── WhatsApp order notifications (admin templates only) ──────
if (match_route('/api/admin/whatsapp-notifications', $path, $params)) {
    if ($method === 'GET') (new WhatsAppNotifyController())->adminGet();
    if ($method === 'PUT') (new WhatsAppNotifyController())->adminUpdate();
}
if (match_route('/api/admin/whatsapp-notifications/events', $path, $params)) {
    if ($method === 'GET') (new WhatsAppNotifyController())->adminGetEvents();
}

// ── Sales banner (public + admin) ─────────────────────────────
if (match_route('/api/sales-banner', $path, $params)) {
    if ($method === 'GET') (new SalesBannerController())->publicGet();
}
if (match_route('/api/admin/sales-banner', $path, $params)) {
    if ($method === 'GET') (new SalesBannerController())->adminGet();
    if ($method === 'PUT') (new SalesBannerController())->adminUpdate();
}

// ── Shipping estimate (public + admin) ────────────────────────
if (match_route('/api/shipping-estimate', $path, $params)) {
    if ($method === 'GET') (new ShippingEstimateController())->publicGet();
}
if (match_route('/api/admin/shipping-estimate', $path, $params)) {
    if ($method === 'GET') (new ShippingEstimateController())->adminGet();
    if ($method === 'PUT') (new ShippingEstimateController())->adminUpdate();
}
if (match_route('/api/admin/analytics', $path, $params)) {
    if ($method === 'GET') (new AdminController())->analytics();
}

// ── Admin — Users ─────────────────────────────────────────────
if (match_route('/api/admin/users', $path, $params)) {
    if ($method === 'GET')  (new AdminController())->users();
    if ($method === 'POST') (new AdminController())->createUser();
}
if (match_route('/api/admin/users/{id}/role', $path, $params)) {
    if ($method === 'PUT') (new AdminController())->updateUserRole((int) $params['id']);
}
if (match_route('/api/admin/users/{id}/vip', $path, $params)) {
    if ($method === 'PUT') (new AdminController())->setVipLevel((int) $params['id']);
}
if (match_route('/api/admin/users/{id}/notes', $path, $params)) {
    if ($method === 'GET')  (new AdminController())->listNotes((int) $params['id']);
    if ($method === 'POST') (new AdminController())->addNote((int) $params['id']);
}
if (match_route('/api/admin/users/{id}', $path, $params)) {
    if ($method === 'GET')    (new AdminController())->userDetail((int) $params['id']);
    if ($method === 'PUT')    (new AdminController())->updateUser((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteUser((int) $params['id']);
}
if (match_route('/api/admin/notes/{id}', $path, $params)) {
    if ($method === 'PUT')    (new AdminController())->updateNote((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteNote((int) $params['id']);
}

// ── Admin — Admins ────────────────────────────────────────────
if (match_route('/api/admin/admins', $path, $params)) {
    if ($method === 'GET')  (new AdminController())->admins();
    if ($method === 'POST') (new AdminController())->createAdmin();
}
if (match_route('/api/admin/admins/{id}', $path, $params)) {
    if ($method === 'PUT')    (new AdminController())->updateAdmin((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteAdmin((int) $params['id']);
}

// ── Admin — Categories ────────────────────────────────────────
if (match_route('/api/admin/categories', $path, $params)) {
    if ($method === 'GET')  (new AdminController())->categories();
    if ($method === 'POST') (new AdminController())->createCategory();
}
// category ↔ filter assignments — must be matched before the generic {id} route
if (match_route('/api/admin/categories/{id}/filters', $path, $params)) {
    if ($method === 'GET')                       (new FilterController())->categoryFilters((int) $params['id']);
    if ($method === 'POST' || $method === 'PUT') (new FilterController())->saveCategoryFilters((int) $params['id']);
}
// category sections ("others" blocks) — also before the generic {id} route
if (match_route('/api/admin/sections', $path, $params)) {
    if ($method === 'GET') (new AdminController())->sections();
}
if (match_route('/api/admin/categories/{id}/sections', $path, $params)) {
    if ($method === 'POST') (new AdminController())->createSection((int) $params['id']);
}
if (match_route('/api/admin/sections/{id}', $path, $params)) {
    if ($method === 'PUT')    (new AdminController())->updateSection((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteSection((int) $params['id']);
}
if (match_route('/api/admin/categories/{id}', $path, $params)) {
    if ($method === 'PUT')    (new AdminController())->updateCategory((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteCategory((int) $params['id']);
}

// ── Admin — Orders ────────────────────────────────────────────
if (match_route('/api/admin/orders/stats', $path, $params)) {
    if ($method === 'GET') (new AdminController())->ordersStats();
}
if (match_route('/api/admin/orders', $path, $params)) {
    (new AdminController())->orders();
}
if (match_route('/api/admin/orders/{id}/status', $path, $params)) {
    if ($method === 'PUT') (new AdminController())->updateOrderStatus((int) $params['id']);
}
if (match_route('/api/admin/orders/{id}/tracking', $path, $params)) {
    if ($method === 'PUT') (new AdminController())->updateOrderTracking((int) $params['id']);
}

// ── Admin — Products ──────────────────────────────────────────
if (match_route('/api/admin/products', $path, $params)) {
    if ($method === 'GET')  (new AdminController())->products();
    if ($method === 'POST') (new AdminController())->createProduct();
}
// CSV import/export — must precede the generic {id} route below
if (match_route('/api/admin/products/export', $path, $params)) {
    if ($method === 'GET') (new AdminController())->exportProductsCsv();
}
if (match_route('/api/admin/products/import', $path, $params)) {
    if ($method === 'POST') (new AdminController())->importProductsCsv();
}
if (match_route('/api/admin/products/stats', $path, $params)) {
    if ($method === 'GET') (new AdminController())->productsStats();
}
if (match_route('/api/admin/products/bulk', $path, $params)) {
    if ($method === 'POST') (new AdminController())->bulkProducts();
}
if (match_route('/api/admin/orders/bulk', $path, $params)) {
    if ($method === 'POST') (new AdminController())->bulkOrders();
}
if (match_route('/api/admin/products/{id}/media', $path, $params)) {
    if ($method === 'POST') (new ProductController())->uploadMedia((int) $params['id']);
}
if (match_route('/api/admin/products/{id}/images', $path, $params)) {
    if ($method === 'POST') (new AdminController())->uploadProductImage((int) $params['id']);
}
if (match_route('/api/admin/products/{id}/images/{imgId}', $path, $params)) {
    if ($method === 'DELETE') (new AdminController())->deleteProductImage((int) $params['id'], (int) $params['imgId']);
}
if (match_route('/api/admin/products/{id}/variants', $path, $params)) {
    if ($method === 'POST') (new AdminController())->addVariant((int) $params['id']);
}
if (match_route('/api/admin/products/{id}/variants/{vid}', $path, $params)) {
    if ($method === 'DELETE') (new AdminController())->deleteVariant((int) $params['id'], (int) $params['vid']);
}
if (match_route('/api/admin/products/{id}', $path, $params)) {
    if ($method === 'GET')    (new AdminController())->getProduct((int) $params['id']);
    if ($method === 'PUT')    (new AdminController())->updateProduct((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteProduct((int) $params['id']);
}

// ── Homepage Settings (legacy – announcement bar) ─────────────
if (match_route('/api/homepage-settings', $path, $params)) {
    if ($method === 'GET') (new AdminController())->getHomepageSettings();
    if ($method === 'PUT') (new AdminController())->updateHomepageSettings();
}
if (match_route('/api/admin/homepage-images', $path, $params)) {
    if ($method === 'POST') (new AdminController())->uploadHomepageImage();
}

// ── Homepage Sections (CMS builder – public) ──────────────────
if (match_route('/api/homepage-sections', $path, $params)) {
    if ($method === 'GET') (new AdminController())->getPublicHomepageSections();
}

// ── Homepage Sections (CMS builder – admin) ───────────────────
// reorder and duplicate must be matched before the generic {id} route
if (match_route('/api/admin/homepage-sections/reorder', $path, $params)) {
    if ($method === 'PUT') (new AdminController())->reorderHomepageSections();
}
if (match_route('/api/admin/homepage-sections/{id}/duplicate', $path, $params)) {
    if ($method === 'POST') (new AdminController())->duplicateHomepageSection((int) $params['id']);
}
if (match_route('/api/admin/homepage-sections/{id}', $path, $params)) {
    if ($method === 'PUT')    (new AdminController())->updateHomepageSection((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteHomepageSection((int) $params['id']);
}
if (match_route('/api/admin/homepage-sections', $path, $params)) {
    if ($method === 'GET')  (new AdminController())->getAdminHomepageSections();
    if ($method === 'POST') (new AdminController())->createHomepageSection();
}

// ── Chat (customer) ───────────────────────────────────────────
if (match_route('/api/chat/poll', $path, $params)) {
    (new ChatController())->poll();
}
if (match_route('/api/chat/send', $path, $params)) {
    (new ChatController())->send();
}
if (match_route('/api/chat/unread', $path, $params)) {
    (new ChatController())->unread();
}
if (match_route('/api/chat', $path, $params)) {
    (new ChatController())->myChat();
}

// ── Reviews (admin) ───────────────────────────────────────────
if (match_route('/api/admin/reviews', $path, $params)) {
    if ($method === 'GET') (new ReviewController())->adminIndex();
}

// ── Activity ticker (public) ──────────────────────────────────
if (match_route('/api/activity/recent', $path, $params)) {
    if ($method === 'GET') (new ActivityController())->recent();
}

// ── Activity ticker (admin) ───────────────────────────────────
if (match_route('/api/admin/activity/settings', $path, $params)) {
    if ($method === 'GET') (new ActivityController())->adminGet();
    if ($method === 'PUT') (new ActivityController())->adminUpdate();
}

// ── Bundles (public + admin) ──────────────────────────────────
if (match_route('/api/bundles/{id}', $path, $params)) {
    if ($method === 'GET') (new BundleController())->show((int) $params['id']);
}
if (match_route('/api/admin/bundles', $path, $params)) {
    if ($method === 'GET')  (new BundleController())->adminIndex();
    if ($method === 'POST') (new BundleController())->adminStore();
}
if (match_route('/api/admin/bundles/{id}', $path, $params)) {
    if ($method === 'GET')    (new BundleController())->adminShow((int) $params['id']);
    if ($method === 'PUT')    (new BundleController())->adminUpdate((int) $params['id']);
    if ($method === 'DELETE') (new BundleController())->adminDestroy((int) $params['id']);
}

// ── Currencies (public list) ──────────────────────────────────
if (match_route('/api/currencies', $path, $params)) {
    if ($method === 'GET') (new CurrencyController())->index();
}

// ── Currencies (admin) ────────────────────────────────────────
if (match_route('/api/admin/currencies', $path, $params)) {
    if ($method === 'GET')  (new CurrencyController())->adminIndex();
    if ($method === 'POST') (new CurrencyController())->adminStore();
}
if (match_route('/api/admin/currencies/{id}', $path, $params)) {
    if ($method === 'PUT')    (new CurrencyController())->adminUpdate((int) $params['id']);
    if ($method === 'DELETE') (new CurrencyController())->adminDestroy((int) $params['id']);
}

// ── Flash Sales (admin) ───────────────────────────────────────
if (match_route('/api/admin/flash-sales', $path, $params)) {
    if ($method === 'GET')  (new FlashSaleController())->adminIndex();
    if ($method === 'POST') (new FlashSaleController())->adminStore();
}
if (match_route('/api/admin/flash-sales/{id}', $path, $params)) {
    if ($method === 'DELETE') (new FlashSaleController())->adminDestroy((int) $params['id']);
}

// ── Product Q&A (admin) ───────────────────────────────────────
// /unread must be matched before the generic {id} route
if (match_route('/api/admin/questions/unread', $path, $params)) {
    (new QuestionController())->adminUnread();
}
if (match_route('/api/admin/questions', $path, $params)) {
    if ($method === 'GET') (new QuestionController())->adminIndex();
}
if (match_route('/api/admin/questions/{id}', $path, $params)) {
    if ($method === 'PUT') (new QuestionController())->adminAnswer((int) $params['id']);
}

// ── Chat (admin) ──────────────────────────────────────────────
if (match_route('/api/admin/chat/unread', $path, $params)) {
    (new ChatController())->adminUnread();
}
if (match_route('/api/admin/chat/conversations', $path, $params)) {
    (new ChatController())->adminConversations();
}
// {id}/messages must be matched before the generic {id} route
if (match_route('/api/admin/chat/conversations/{id}/messages', $path, $params)) {
    if ($method === 'GET')  (new ChatController())->adminMessages((int) $params['id']);
    if ($method === 'POST') (new ChatController())->adminSend((int) $params['id']);
}
if (match_route('/api/admin/chat/conversations/{id}', $path, $params)) {
    if ($method === 'PUT') (new ChatController())->adminSetStatus((int) $params['id']);
}

// ── 404 fallback ─────────────────────────────────────────────
error("Route not found: {$method} {$path}", 404);
