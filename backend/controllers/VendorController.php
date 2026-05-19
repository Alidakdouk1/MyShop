<?php
declare(strict_types=1);

class VendorController
{
    private VendorModel $vendors;

    public function __construct()
    {
        $this->vendors = new VendorModel();
    }

    public function store(string $slug): never
    {
        method('GET');
        $vendor = $this->vendors->findBySlug($slug);
        if (!$vendor || !$vendor['is_approved']) error('Store not found.', 404);

        $products = new ProductModel();
        [$page, $perPage, $offset] = PaginationHelper::params();
        $items = $products->byVendor((int) $vendor['user_id'], $perPage, $offset);
        $total = $products->countSearch(['vendor_id' => $vendor['user_id']]);

        success([
            'vendor'   => $vendor,
            'products' => $items,
            'meta'     => ['total' => $total, 'current_page' => $page, 'per_page' => $perPage],
        ]);
    }

    public function dashboard(): never
    {
        method('GET');
        $auth     = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'vendor');
        $vendorId = (int) $auth['sub'];

        $profile  = $this->vendors->findByUserId($vendorId);
        $orders   = new OrderModel();
        $stats    = $orders->revenueStats();
        $products = new ProductModel();
        $productCount = $products->countSearch(['vendor_id' => $vendorId]);

        success([
            'profile'       => $profile,
            'stats'         => $stats,
            'product_count' => $productCount,
        ]);
    }

    public function updateProfile(): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'vendor');
        $data = getBody();

        $allowed = ['store_name', 'bio', 'logo_url', 'banner_url'];
        $update  = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) $update[$f] = sanitize((string) $data[$f]);
        }
        $this->vendors->update((int) $auth['sub'], $update);
        success($this->vendors->findByUserId((int) $auth['sub']), 'Store updated.');
    }
}
