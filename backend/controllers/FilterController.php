<?php
declare(strict_types=1);

class FilterController
{
    private FilterModel $filters;

    public function __construct()
    {
        $this->filters = new FilterModel();
    }

    private function guard(): array
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        return $auth;
    }

    private const ALLOWED_TYPES = ['single', 'multi', 'range'];

    // ── Public listing ─────────────────────────────────────────────────────

    /** GET /api/filters — public list of active filters + options.
     *  Optional ?category_id=N narrows to the filters assigned to that category. */
    public function index(): never
    {
        method('GET');
        $categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : 0;
        if ($categoryId > 0) {
            success($this->filters->forCategory($categoryId, true));
        }
        success($this->filters->allWithOptions(true));
    }

    // ── Category ↔ filter assignments (admin) ───────────────────────────────

    /** GET /api/admin/categories/{id}/filters — filter ids assigned to a category. */
    public function categoryFilters(int $categoryId): never
    {
        method('GET');
        $this->guard();
        success($this->filters->filterIdsForCategory($categoryId));
    }

    /** PUT /api/admin/categories/{id}/filters — replace a category's filter ids. */
    public function saveCategoryFilters(int $categoryId): never
    {
        method('POST', 'PUT');
        $this->guard();
        $data = getBody();
        $ids  = $data['filter_ids'] ?? $data['filters'] ?? [];
        if (!is_array($ids)) error('filter_ids must be an array.', 422);
        $this->filters->setCategoryFilters($categoryId, $ids);
        success($this->filters->filterIdsForCategory($categoryId), 'Category filters saved.');
    }

    /** GET /api/admin/filters — admin list of all filters + options. */
    public function adminIndex(): never
    {
        method('GET');
        $this->guard();
        success($this->filters->allWithOptions(false));
    }

    // ── Filter CRUD ────────────────────────────────────────────────────────

    public function store(): never
    {
        method('POST');
        $this->guard();
        $data = getBody();

        $name = sanitize($data['name'] ?? '');
        if (!$name) error('Filter name is required.', 422);
        $type = $data['type'] ?? 'multi';
        if (!in_array($type, self::ALLOWED_TYPES, true)) error('Invalid filter type.', 422);

        try {
            $id = $this->filters->create([
                'name'          => $name,
                'type'          => $type,
                'unit'          => isset($data['unit']) && $data['unit'] !== '' ? sanitize((string) $data['unit']) : null,
                'is_required'   => (int) ($data['is_required'] ?? 0),
                'is_active'     => (int) ($data['is_active']   ?? 1),
                'display_order' => (int) ($data['display_order'] ?? 0),
            ]);
        } catch (\PDOException $e) {
            $dup = str_contains($e->getMessage(), 'Duplicate entry');
            error($dup ? 'A filter with this name already exists.' : 'Failed to save filter.', 422);
        }

        success($this->filters->findById($id), 'Filter created.', 201);
    }

    public function update(int $id): never
    {
        method('PUT');
        $this->guard();
        if (!$this->filters->findById($id)) error('Filter not found.', 404);

        $data   = getBody();
        $update = [];
        if (array_key_exists('name', $data)) {
            $name = sanitize((string) $data['name']);
            if (!$name) error('Filter name is required.', 422);
            $update['name'] = $name;
        }
        if (array_key_exists('type', $data)) {
            if (!in_array($data['type'], self::ALLOWED_TYPES, true)) error('Invalid filter type.', 422);
            $update['type'] = $data['type'];
        }
        if (array_key_exists('unit', $data)) {
            $update['unit'] = $data['unit'] !== '' && $data['unit'] !== null
                ? sanitize((string) $data['unit']) : null;
        }
        if (array_key_exists('is_required',   $data)) $update['is_required']   = (int) $data['is_required'];
        if (array_key_exists('is_active',     $data)) $update['is_active']     = (int) $data['is_active'];
        if (array_key_exists('display_order', $data)) $update['display_order'] = (int) $data['display_order'];

        if (empty($update)) error('Nothing to update.', 422);
        $this->filters->update($id, $update);
        success($this->filters->findById($id), 'Filter updated.');
    }

    public function destroy(int $id): never
    {
        method('DELETE');
        $this->guard();
        if (!$this->filters->findById($id)) error('Filter not found.', 404);
        $this->filters->delete($id);
        success(null, 'Filter deleted.');
    }

    // ── Option CRUD ────────────────────────────────────────────────────────

    public function storeOption(): never
    {
        method('POST');
        $this->guard();
        $data      = getBody();
        $filterId  = (int) ($data['filter_id'] ?? 0);
        $value     = sanitize($data['value'] ?? '');
        if (!$filterId) error('filter_id is required.', 422);
        if (!$value)    error('Option value is required.', 422);
        if (!$this->filters->findById($filterId)) error('Filter not found.', 404);

        try {
            $id = $this->filters->createOption($filterId, [
                'value'         => $value,
                'display_order' => (int) ($data['display_order'] ?? 0),
            ]);
        } catch (\PDOException $e) {
            $dup = str_contains($e->getMessage(), 'Duplicate entry');
            error($dup ? 'That option already exists for this filter.' : 'Failed to save option.', 422);
        }

        success($this->filters->findOption($id), 'Option created.', 201);
    }

    public function updateOption(int $id): never
    {
        method('PUT');
        $this->guard();
        if (!$this->filters->findOption($id)) error('Option not found.', 404);

        $data   = getBody();
        $update = [];
        if (array_key_exists('value', $data)) {
            $v = sanitize((string) $data['value']);
            if (!$v) error('Option value is required.', 422);
            $update['value'] = $v;
        }
        if (array_key_exists('display_order', $data)) $update['display_order'] = (int) $data['display_order'];
        if (empty($update)) error('Nothing to update.', 422);

        $this->filters->updateOption($id, $update);
        success($this->filters->findOption($id), 'Option updated.');
    }

    public function destroyOption(int $id): never
    {
        method('DELETE');
        $this->guard();
        if (!$this->filters->findOption($id)) error('Option not found.', 404);
        $this->filters->deleteOption($id);
        success(null, 'Option deleted.');
    }

    // ── Product ↔ filter values ───────────────────────────────────────────

    /** POST /api/products/{id}/filters — save selections for a product. */
    public function saveForProduct(int $productId): never
    {
        method('POST', 'PUT');
        $this->guard();

        $product = (new ProductModel())->findById($productId);
        if (!$product) error('Product not found.', 404);

        $data        = getBody();
        $selections  = $data['filters'] ?? $data['selections'] ?? [];
        if (!is_array($selections)) error('filters must be an array.', 422);

        try {
            $this->filters->saveProductFilters($productId, $selections);
            $this->filters->recomputeProductStock($productId);
        } catch (\Throwable $e) {
            error('Failed to save product filters: ' . $e->getMessage(), 500);
        }
        success($this->filters->forProduct($productId), 'Product filters saved.');
    }

    /** GET /api/products/{id}/filters — current selections for a product. */
    public function showForProduct(int $productId): never
    {
        method('GET');
        $product = (new ProductModel())->findById($productId);
        if (!$product) error('Product not found.', 404);
        success($this->filters->forProduct($productId));
    }
}
