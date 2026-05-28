<?php
declare(strict_types=1);

class BundleController
{
    private BundleModel $bundles;

    public function __construct()
    {
        $this->bundles = new BundleModel();
    }

    // ── Public ──────────────────────────────────────────────────────────────

    public function show(int $id): never
    {
        method('GET');
        $b = $this->bundles->findWithItems($id);
        if (!$b || !$b['is_active']) error('Bundle not found.', 404);
        success($b);
    }

    // ── Admin ───────────────────────────────────────────────────────────────

    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $items = $this->bundles->adminAll();
        foreach ($items as &$b) {
            $b['product_ids'] = $this->bundles->productIds((int) $b['id']);
        }
        success($items);
    }

    public function adminShow(int $id): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $b = $this->bundles->findWithItems($id);
        if (!$b) error('Bundle not found.', 404);
        success($b);
    }

    public function adminStore(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data = getBody();

        $title    = trim(sanitize($data['title'] ?? ''));
        $price    = (float) ($data['bundle_price'] ?? 0);
        $image    = trim($data['image_url'] ?? '');
        $active   = !empty($data['is_active']);
        $products = is_array($data['product_ids'] ?? null) ? $data['product_ids'] : [];

        if (!$title)                error('Title is required.', 422);
        if ($price <= 0)            error('Bundle price must be greater than 0.', 422);
        if (count($products) < 2)   error('A bundle needs at least 2 products.', 422);

        $id = $this->bundles->create($title, $price, $image ?: null, $active);
        $this->bundles->setItems($id, $products);
        success(['id' => $id], 'Bundle created.', 201);
    }

    public function adminUpdate(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $b = $this->bundles->findById($id);
        if (!$b) error('Bundle not found.', 404);
        $data = getBody();

        $update = [];
        if (array_key_exists('title', $data))     $update['title']     = trim(sanitize($data['title']));
        if (array_key_exists('bundle_price', $data)) {
            $p = (float) $data['bundle_price'];
            if ($p <= 0) error('Bundle price must be greater than 0.', 422);
            $update['bundle_price'] = $p;
        }
        if (array_key_exists('image_url', $data)) $update['image_url'] = trim($data['image_url']) ?: null;
        if (array_key_exists('is_active', $data)) $update['is_active'] = empty($data['is_active']) ? 0 : 1;
        if ($update) $this->bundles->update($id, $update);

        if (array_key_exists('product_ids', $data) && is_array($data['product_ids'])) {
            if (count($data['product_ids']) < 2) error('A bundle needs at least 2 products.', 422);
            $this->bundles->setItems($id, $data['product_ids']);
        }
        success($this->bundles->findWithItems($id), 'Bundle updated.');
    }

    public function adminDestroy(int $id): never
    {
        method('DELETE');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        if (!$this->bundles->findById($id)) error('Bundle not found.', 404);
        $this->bundles->delete($id);
        success(null, 'Bundle deleted.');
    }
}
