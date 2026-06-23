<?php
declare(strict_types=1);

class PromotionController
{
    private PromotionModel $model;

    public function __construct()
    {
        $this->model = new PromotionModel();
    }

    private function guard(): array
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        return $auth;
    }

    public function adminIndex(): never
    {
        method('GET');
        $this->guard();
        $rows = $this->model->allAdmin();
        // Decode scope_ids for the form on the way out so the admin UI never
        // has to know we store it as JSON text.
        foreach ($rows as &$r) {
            $r['scope_ids'] = $r['scope_ids']
                ? (json_decode((string) $r['scope_ids'], true) ?: [])
                : [];
        }
        success($rows);
    }

    public function adminStore(): never
    {
        method('POST');
        $this->guard();
        $d    = getBody();
        $name = trim(sanitize((string) ($d['name'] ?? '')));
        $type = $d['type'] ?? '';
        if ($name === '')                                  error('Name is required.', 422);
        if (!in_array($type, ['bogo', 'gift'], true))      error('Invalid promo type.', 422);

        if ($type === 'bogo') {
            if (empty($d['buy_quantity']) || empty($d['get_quantity'])) {
                error('Buy & get quantities are required for BOGO.', 422);
            }
        } else {
            if (empty($d['min_subtotal']) || empty($d['gift_product_id'])) {
                error('Min subtotal and gift product are required for free-gift promos.', 422);
            }
        }

        $id = $this->model->create([
            'name'             => $name,
            'type'             => $type,
            'is_active'        => $d['is_active'] ?? 1,
            'starts_at'        => !empty($d['starts_at']) ? $d['starts_at'] : null,
            'ends_at'          => !empty($d['ends_at'])   ? $d['ends_at']   : null,
            'buy_quantity'     => $d['buy_quantity']     ?? null,
            'get_quantity'     => $d['get_quantity']     ?? null,
            'discount_percent' => $d['discount_percent'] ?? null,
            'scope_type'       => $d['scope_type']       ?? null,
            'scope_ids'        => is_array($d['scope_ids'] ?? null) ? array_map('intval', $d['scope_ids']) : null,
            'min_subtotal'     => $d['min_subtotal']    ?? null,
            'gift_product_id'  => $d['gift_product_id'] ?? null,
        ]);
        success($this->model->findOne($id), 'Promotion created.', 201);
    }

    public function adminUpdate(int $id): never
    {
        method('PUT');
        $this->guard();
        if (!$this->model->findOne($id)) error('Promotion not found.', 404);

        $d = getBody();
        if (isset($d['scope_ids']) && is_array($d['scope_ids'])) {
            $d['scope_ids'] = array_map('intval', $d['scope_ids']);
        }
        $this->model->updateOne($id, $d);
        success($this->model->findOne($id), 'Promotion updated.');
    }

    public function adminDestroy(int $id): never
    {
        method('DELETE');
        $this->guard();
        if (!$this->model->findOne($id)) error('Promotion not found.', 404);
        $this->model->delete($id);
        success(null, 'Promotion deleted.');
    }
}
