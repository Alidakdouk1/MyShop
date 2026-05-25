<?php
declare(strict_types=1);

class ReturnController
{
    private const STATUSES = ['requested', 'approved', 'rejected', 'completed'];

    // POST /api/returns — customer requests a return for a delivered order they own.
    public function store(): never
    {
        method('POST');
        $auth   = AuthMiddleware::require();
        $data   = getBody();
        $orderId = (int) ($data['order_id'] ?? 0);
        $reason  = sanitize($data['reason'] ?? '');
        if (!$orderId || $reason === '') error('Order and reason are required.', 422);

        $order = (new OrderModel())->findById($orderId);
        if (!$order) error('Order not found.', 404);
        if ((int) $order['user_id'] !== (int) $auth['sub']) error('Forbidden.', 403);
        if ($order['status'] !== 'delivered') error('Only delivered orders can be returned.', 422);

        $rm = new ReturnModel();
        if ($rm->forOrder($orderId)) error('A return request already exists for this order.', 422);

        $id = $rm->create(['order_id' => $orderId, 'user_id' => (int) $auth['sub'], 'reason' => $reason]);

        (new NotificationModel())->create(
            (int) $auth['sub'], 'order_update', 'Return Requested',
            "Your return request for order #{$orderId} has been received.",
            "/account/orders/{$orderId}"
        );
        success($rm->findById($id), 'Return request submitted.', 201);
    }

    // GET /api/returns — the customer's own requests.
    public function index(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        success((new ReturnModel())->forUser((int) $auth['sub']));
    }

    // GET /api/admin/returns
    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        [, $perPage, $offset] = PaginationHelper::params();
        success((new ReturnModel())->all($perPage, $offset));
    }

    // PUT /api/admin/returns/{id} — { status, admin_note }
    public function adminUpdate(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data   = getBody();
        $status = $data['status'] ?? '';
        if (!in_array($status, self::STATUSES, true)) error('Invalid status.', 422);

        $rm = new ReturnModel();
        $existing = $rm->findById($id);
        if (!$existing) error('Return request not found.', 404);

        $rm->updateStatus($id, $status, isset($data['admin_note']) ? sanitize((string) $data['admin_note']) : null);

        (new NotificationModel())->create(
            (int) $existing['user_id'], 'order_update', 'Return Update',
            "Your return for order #{$existing['order_id']} is now: {$status}.",
            "/account/orders/{$existing['order_id']}"
        );
        success($rm->findById($id), 'Return updated.');
    }
}
