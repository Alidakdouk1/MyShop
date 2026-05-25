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
if (match_route('/api/auth/me', $path, $params)) {
    (new AuthController())->me();
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
if (match_route('/api/products/{id}/notify-me', $path, $params)) {
    if ($method === 'POST') (new StockNotificationController())->subscribe((int) $params['id']);
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
if (match_route('/api/cart/merge', $path, $params)) {
    (new CartController())->merge();
}
if (match_route('/api/cart/items', $path, $params)) {
    if ($method === 'POST') (new CartController())->addItem();
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
        success($item, 'Added to wishlist.', 201);
    }
}
if (match_route('/api/wishlist/{id}', $path, $params)) {
    $auth = AuthMiddleware::require();
    if ($method === 'DELETE') {
        (new WishlistModel())->remove((int) $params['id'], (int) $auth['sub']);
        success(null, 'Removed from wishlist.');
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

// ── Sitemap (public XML) ──────────────────────────────────────
if (match_route('/sitemap.xml', $path, $params)) {
    (new SitemapController())->index();
}

// ── Newsletter ────────────────────────────────────────────────
if (match_route('/api/newsletter/subscribe', $path, $params)) {
    if ($method === 'POST') (new NewsletterController())->subscribe();
}
if (match_route('/api/admin/newsletter', $path, $params)) {
    if ($method === 'GET') (new NewsletterController())->adminIndex();
}

// ── Admin — Dashboard ─────────────────────────────────────────
if (match_route('/api/admin/dashboard', $path, $params)) {
    (new AdminController())->dashboard();
}
if (match_route('/api/admin/abandoned-carts', $path, $params)) {
    if ($method === 'GET') (new AdminController())->abandonedCarts();
}

// ── Admin — Users ─────────────────────────────────────────────
if (match_route('/api/admin/users', $path, $params)) {
    if ($method === 'GET')  (new AdminController())->users();
    if ($method === 'POST') (new AdminController())->createUser();
}
if (match_route('/api/admin/users/{id}/role', $path, $params)) {
    if ($method === 'PUT') (new AdminController())->updateUserRole((int) $params['id']);
}
if (match_route('/api/admin/users/{id}', $path, $params)) {
    if ($method === 'PUT')    (new AdminController())->updateUser((int) $params['id']);
    if ($method === 'DELETE') (new AdminController())->deleteUser((int) $params['id']);
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
if (match_route('/api/admin/orders', $path, $params)) {
    (new AdminController())->orders();
}
if (match_route('/api/admin/orders/{id}/status', $path, $params)) {
    if ($method === 'PUT') (new AdminController())->updateOrderStatus((int) $params['id']);
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

// ── 404 fallback ─────────────────────────────────────────────
error("Route not found: {$method} {$path}", 404);
