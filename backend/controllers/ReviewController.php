<?php
declare(strict_types=1);

class ReviewController
{
    private ReviewModel $reviews;

    public function __construct()
    {
        $this->reviews = new ReviewModel();
    }

    public function store(): never
    {
        method('POST');
        $auth   = AuthMiddleware::require();
        $data   = getBody();
        $userId = (int) $auth['sub'];

        $productId = (int) ($data['product_id'] ?? 0);
        $orderId   = (int) ($data['order_id']   ?? 0);
        $rating    = (int) ($data['rating']      ?? 0);

        if (!$productId || !$orderId || $rating < 1 || $rating > 5) {
            error('product_id, order_id, and rating (1-5) are required.', 422);
        }

        $stmt = getDB()->prepare(
            "SELECT id FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.id = ? AND o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'"
        );
        $stmt->execute([$orderId, $userId, $productId]);
        if (!$stmt->fetch()) error('You can only review delivered orders you purchased.', 403);

        if ($this->reviews->userAlreadyReviewed($userId, $productId, $orderId)) {
            error('You already reviewed this product for this order.', 409);
        }

        $id = $this->reviews->create([
            'product_id' => $productId,
            'user_id'    => $userId,
            'order_id'   => $orderId,
            'rating'     => $rating,
            'title'      => sanitize($data['title'] ?? ''),
            'body'       => sanitize($data['body']  ?? ''),
        ]);

        (new VendorModel())->updateRating(
            (int) (new ProductModel())->findById($productId)['vendor_id']
        );

        success($this->reviews->findById($id), 'Review submitted.', 201);
    }

    public function forProduct(int $productId): never
    {
        method('GET');
        [$page, $perPage, $offset] = PaginationHelper::params();
        $items = $this->reviews->forProduct($productId, $perPage, $offset);
        $total = $this->reviews->countForProduct($productId);
        $stats = $this->reviews->stats($productId);
        respond([
            'success' => true,
            'data'    => $items,
            'stats'   => $stats,
            'meta'    => ['total' => $total, 'current_page' => $page, 'per_page' => $perPage],
        ]);
    }

    public function destroy(int $id): never
    {
        method('DELETE');
        $auth   = AuthMiddleware::require();
        $review = $this->reviews->findById($id);
        if (!$review) error('Review not found.', 404);
        if ($auth['role'] !== 'admin' && (int) $review['user_id'] !== (int) $auth['sub']) {
            error('Forbidden.', 403);
        }
        $this->reviews->delete($id);
        success(null, 'Review deleted.');
    }
}
