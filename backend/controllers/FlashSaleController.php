<?php
declare(strict_types=1);

class FlashSaleController
{
    private FlashSaleModel $sales;

    public function __construct()
    {
        $this->sales = new FlashSaleModel();
    }

    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $items = $this->sales->adminAll();
        foreach ($items as &$s) {
            $s['product_ids'] = $this->sales->productIds((int) $s['id']);
        }
        success($items);
    }

    public function adminStore(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data = getBody();

        $title    = trim(sanitize($data['title'] ?? ''));
        $percent  = (float) ($data['discount_percent'] ?? 0);
        $starts   = trim($data['starts_at'] ?? '');
        $ends     = trim($data['ends_at'] ?? '');
        $products = is_array($data['product_ids'] ?? null) ? $data['product_ids'] : [];

        if (!$title)                       error('Title is required.', 422);
        if ($percent <= 0 || $percent > 95) error('Discount must be between 1 and 95%.', 422);
        if (!$starts || !$ends)            error('Start and end times are required.', 422);

        $startsAt = date('Y-m-d H:i:s', strtotime($starts));
        $endsAt   = date('Y-m-d H:i:s', strtotime($ends));
        if (strtotime($endsAt) <= strtotime($startsAt)) error('End time must be after the start time.', 422);
        if (empty($products))              error('Select at least one product.', 422);

        $id = $this->sales->create($title, $percent, $startsAt, $endsAt);
        $this->sales->addItems($id, $products);
        success(['id' => $id], 'Flash sale created.', 201);
    }

    public function adminDestroy(int $id): never
    {
        method('DELETE');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        if (!$this->sales->findById($id)) error('Flash sale not found.', 404);
        $this->sales->delete($id);
        success(null, 'Flash sale deleted.');
    }
}
