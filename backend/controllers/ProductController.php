<?php
declare(strict_types=1);

class ProductController
{
    private ProductModel $products;

    public function __construct()
    {
        $this->products = new ProductModel();
    }

    /** Attach `flash_sale` (title, discount, ends_at, flash_price) to any product
     *  rows that are in a currently-active flash sale. */
    private function attachFlash(array $products): array
    {
        if (!$products) return $products;
        $map = (new FlashSaleModel())->activeForProductIds(array_map(fn($p) => (int) $p['id'], $products));
        foreach ($products as &$p) {
            $sale = $map[(int) $p['id']] ?? null;
            if (!$sale) continue;
            $p['flash_sale'] = [
                'title'            => $sale['title'],
                'discount_percent' => $sale['discount_percent'],
                'ends_at'          => $sale['ends_at'],
                'flash_price'      => FlashSaleModel::priceFor($p, $sale),
            ];
        }
        return $products;
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
            'filters'        => $this->parseFilterParam($_GET['filters'] ?? null),
            'range_filters'  => $this->parseRangeFilterParams($_GET),
        ];
        $items = $this->products->search($filters, $perPage, $offset);
        $items = $this->attachFlash($items);
        $total = $this->products->countSearch($filters);
        paginated($items, $total, $page, $perPage);
    }

    /**
     * Parse a `filters` query param into [filter_id => [option_id, ...]].
     * Accepts either:
     *   filters=1:2,3;4:7         (URL-friendly)
     *   filters[1][]=2&filters[1][]=3&filters[4][]=7   (array notation)
     *   filters={"1":[2,3],"4":[7]}  (JSON)
     */
    private function parseFilterParam(mixed $raw): array
    {
        if ($raw === null || $raw === '') return [];
        if (is_array($raw)) {
            $out = [];
            foreach ($raw as $fid => $opts) {
                $fid = (int) $fid;
                if (!$fid) continue;
                $out[$fid] = array_values(array_filter(array_map('intval', (array) $opts)));
            }
            return $out;
        }
        $str = (string) $raw;
        if ($str !== '' && ($str[0] === '{' || $str[0] === '[')) {
            $decoded = json_decode($str, true);
            if (is_array($decoded)) return $this->parseFilterParam($decoded);
        }
        // Compact form: 1:2,3;4:7
        $out = [];
        foreach (explode(';', $str) as $chunk) {
            if (!str_contains($chunk, ':')) continue;
            [$fid, $opts] = explode(':', $chunk, 2);
            $fid = (int) $fid;
            if (!$fid) continue;
            $out[$fid] = array_values(array_filter(array_map('intval', explode(',', $opts))));
        }
        return $out;
    }

    /**
     * Pull per-filter range bounds from query params shaped like
     * f_<filterId>_min / f_<filterId>_max into [filter_id => [min, max]].
     */
    private function parseRangeFilterParams(array $query): array
    {
        $out = [];
        foreach ($query as $key => $val) {
            if (!preg_match('/^f_(\d+)_(min|max)$/', (string) $key, $m)) continue;
            if ($val === '' || $val === null) continue;
            $fid = (int) $m[1];
            if (!$fid) continue;
            $out[$fid] ??= ['min' => null, 'max' => null];
            $out[$fid][$m[2]] = (float) $val;
        }
        return $out;
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

        // "Frequently bought together" from real co-purchase history. When the
        // store is young and there isn't enough order data yet, top up with the
        // most-viewed items from the same category so the block still shows.
        $fbt        = $this->products->frequentlyBoughtTogether((int) $product['id'], 6);
        $takenIds   = array_map(fn($r) => (int) $r['id'], $fbt);
        $takenIds[] = (int) $product['id'];
        if (count($fbt) < 4) {
            $popular = $this->products->search([
                'category_id' => $searchCatId,
                'sort'        => 'popular',
            ], 20, 0);
            foreach ($popular as $cand) {
                if (count($fbt) >= 4) break;
                if (in_array((int) $cand['id'], $takenIds, true)) continue;
                $cand['together_count'] = 0;
                $fbt[]      = $cand;
                $takenIds[] = (int) $cand['id'];
            }
        }
        $product['related']         = $this->attachFlash($product['related']);
        $product['bought_together'] = $this->attachFlash($fbt);
        $product                    = $this->attachFlash([$product])[0];

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

    public function categorySections(): never
    {
        method('GET');
        success((new CategorySectionModel())->all());
    }
}
