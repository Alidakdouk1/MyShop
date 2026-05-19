<?php
declare(strict_types=1);

class ProductController
{
    private ProductModel $products;

    public function __construct()
    {
        $this->products = new ProductModel();
    }

    public function index(): never
    {
        method('GET');
        [$page, $perPage, $offset] = PaginationHelper::params();
        $filters = [
            'category_id' => $_GET['category_id'] ?? null,
            'vendor_id'   => $_GET['vendor_id']   ?? null,
            'min_price'   => $_GET['price_min']   ?? $_GET['min_price'] ?? null,
            'max_price'   => $_GET['price_max']   ?? $_GET['max_price'] ?? null,
            'search'      => sanitize($_GET['search'] ?? ''),
            'featured'    => $_GET['featured']     ?? null,
            'sort'        => $_GET['sort']          ?? 'newest',
            'on_sale'     => $_GET['on_sale']      ?? null,
            'in_stock'    => $_GET['in_stock']     ?? null,
        ];
        $items = $this->products->search($filters, $perPage, $offset);
        $total = $this->products->countSearch($filters);
        paginated($items, $total, $page, $perPage);
    }

    public function show(string $slug): never
    {
        method('GET');
        $product = $this->products->findBySlug($slug);
        if (!$product) error('Product not found.', 404);

        $this->products->incrementViews((int) $product['id']);

        $reviews = new ReviewModel();
        $product['review_stats'] = $reviews->stats((int) $product['id']);

        // Walk up the category tree to find the top-level (main) category
        $cats        = new CategoryModel();
        $searchCatId = (int) $product['category_id'];
        $cat         = $cats->findById($searchCatId);
        while ($cat && $cat['parent_id'] !== null) {
            $searchCatId = (int) $cat['parent_id'];
            $cat         = $cats->findById($searchCatId);
        }

        $related = $this->products->search([
            'category_id' => $searchCatId,
            'sort'        => 'newest',
        ], 200, 0);
        $product['related'] = array_values(array_filter($related, fn($p) => $p['id'] !== $product['id']));

        success($product);
    }

    public function store(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data = getBody();

        $name = sanitize($data['name'] ?? '');
        if (!$name) error('Product name is required.', 422);
        if (!isset($data['base_price']) || !is_numeric($data['base_price'])) {
            error('Valid base price is required.', 422);
        }
        if (empty($data['category_id'])) error('Category is required.', 422);
        if (empty($data['sku'])) error('SKU is required.', 422);

        $slug = preg_replace('/[^a-z0-9]+/', '-', strtolower($name))
              . '-' . substr(bin2hex(random_bytes(4)), 0, 8);

        $id = $this->products->create([
            'vendor_id'   => (int) $auth['sub'],
            'category_id' => (int) $data['category_id'],
            'name'        => $name,
            'slug'        => $slug,
            'description' => sanitize($data['description'] ?? ''),
            'base_price'  => (float) $data['base_price'],
            'sale_price'  => isset($data['sale_price']) ? (float) $data['sale_price'] : null,
            'stock_qty'   => (int) ($data['stock_qty'] ?? 0),
            'sku'         => sanitize($data['sku']),
            'status'      => $data['status'] ?? 'draft',
            'is_featured' => (int) ($data['is_featured'] ?? 0),
            'weight'      => isset($data['weight']) ? (float) $data['weight'] : null,
        ]);

        success($this->products->findById($id), 'Product created.', 201);
    }

    public function update(int $id): never
    {
        method('PUT');
        $auth    = AuthMiddleware::require();
        $product = $this->products->findById($id);
        if (!$product) error('Product not found.', 404);
        if ($auth['role'] !== 'admin' && (int) $product['vendor_id'] !== (int) $auth['sub']) {
            error('Forbidden.', 403);
        }

        $data   = getBody();
        $fields = ['name', 'description', 'base_price', 'sale_price', 'stock_qty',
                   'category_id', 'status', 'is_featured', 'weight'];
        $update = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $data)) {
                $update[$f] = is_string($data[$f]) ? sanitize($data[$f]) : $data[$f];
            }
        }
        $this->products->update($id, $update);
        success($this->products->findById($id), 'Product updated.');
    }

    public function destroy(int $id): never
    {
        method('DELETE');
        $auth    = AuthMiddleware::require();
        $product = $this->products->findById($id);
        if (!$product) error('Product not found.', 404);
        if ($auth['role'] !== 'admin' && (int) $product['vendor_id'] !== (int) $auth['sub']) {
            error('Forbidden.', 403);
        }
        $this->products->delete($id);
        success(null, 'Product deleted.');
    }

    public function uploadImage(int $id): never
    {
        method('POST');
        $auth    = AuthMiddleware::require();
        $product = $this->products->findById($id);
        if (!$product) error('Product not found.', 404);
        if ($auth['role'] !== 'admin' && (int) $product['vendor_id'] !== (int) $auth['sub']) {
            error('Forbidden.', 403);
        }
        if (empty($_FILES['image'])) error('No image uploaded.', 422);

        try {
            $url       = UploadHelper::saveProductImage($_FILES['image'], $id);
            $isPrimary = empty($this->products->images($id));
            $imgId     = $this->products->addImage($id, $url, 0, $isPrimary);
            success(['id' => $imgId, 'image_url' => $url], 'Image uploaded.', 201);
        } catch (InvalidArgumentException $e) {
            error($e->getMessage(), 422);
        }
    }

    public function categories(): never
    {
        method('GET');
        $cats = new CategoryModel();
        success($cats->tree());
    }

    public function categoriesFlat(): never
    {
        method('GET');
        $cats = new CategoryModel();
        success($cats->flat());
    }
}
