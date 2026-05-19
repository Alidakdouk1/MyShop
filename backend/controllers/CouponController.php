<?php
declare(strict_types=1);

class CouponController
{
    private CouponModel $coupons;

    public function __construct()
    {
        $this->coupons = new CouponModel();
    }

    public function validate(): never
    {
        method('POST');
        AuthMiddleware::require();
        $data    = getBody();
        $code    = strtoupper(sanitize($data['code'] ?? ''));
        $subtotal = (float) ($data['subtotal'] ?? 0);
        if (!$code) error('Coupon code is required.', 422);

        $coupon = $this->coupons->findByCode($code);
        if (!$coupon) error('Invalid or expired coupon code.', 404);

        $discount = $this->coupons->apply($coupon, $subtotal);
        success([
            'coupon'   => $coupon,
            'discount' => $discount,
            'new_total' => max(0, $subtotal - $discount),
        ], 'Coupon applied.');
    }

    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        [$page, $perPage, $offset] = PaginationHelper::params();
        success($this->coupons->all($perPage, $offset));
    }

    public function adminStore(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data = getBody();

        $code = strtoupper(sanitize($data['code'] ?? ''));
        $type = $data['type'] ?? '';
        $val  = (float) ($data['value'] ?? 0);

        if (!$code || !in_array($type, ['percent', 'fixed'], true) || $val <= 0) {
            error('Code, type (percent|fixed), and value are required.', 422);
        }
        if ($type === 'percent' && $val > 100) error('Percent discount cannot exceed 100.', 422);

        $id = $this->coupons->create([
            'code'        => $code,
            'type'        => $type,
            'value'       => $val,
            'min_order'   => (float) ($data['min_order'] ?? 0),
            'usage_limit' => isset($data['usage_limit']) ? (int) $data['usage_limit'] : null,
            'is_active'   => (int) ($data['is_active'] ?? 1),
            'expires_at'  => $data['expires_at'] ?? null,
        ]);
        success($this->coupons->findById($id), 'Coupon created.', 201);
    }
}
