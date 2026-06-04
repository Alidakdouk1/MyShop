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

        if (!$productId || $rating < 1 || $rating > 5) {
            error('product_id and rating (1-5) are required.', 422);
        }

        // If the client didn't pin an order, auto-pick the most recent delivered
        // order that contains this product and hasn't been reviewed yet.
        if (!$orderId) {
            $orderId = $this->reviews->eligibleOrderForReview($userId, $productId);
            if (!$orderId) {
                if ($this->reviews->hasDeliveredPurchase($userId, $productId)) {
                    error('You have already reviewed this product for every eligible order.', 409);
                }
                error('You can only review products from delivered orders you purchased.', 403);
            }
        } else {
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
        }

        // Accept either `body` (canonical) or `comment` (sent by the storefront).
        $body = sanitize($data['body'] ?? $data['comment'] ?? '');

        $id = $this->reviews->create([
            'product_id' => $productId,
            'user_id'    => $userId,
            'order_id'   => $orderId,
            'rating'     => $rating,
            'title'      => sanitize($data['title'] ?? ''),
            'body'       => $body,
        ]);

        (new VendorModel())->updateRating(
            (int) (new ProductModel())->findById($productId)['vendor_id']
        );

        success($this->reviews->findById($id), 'Review submitted.', 201);
    }

    /** Per-user, per-product check used by the storefront to gate the form. */
    public function reviewability(int $productId): never
    {
        method('GET');
        $auth = AuthMiddleware::optional();
        if (!$auth) success(['status' => 'login_required']);
        $userId = (int) $auth['sub'];
        $orderId = $this->reviews->eligibleOrderForReview($userId, $productId);
        if ($orderId) success(['status' => 'allowed', 'order_id' => $orderId]);
        if ($this->reviews->hasDeliveredPurchase($userId, $productId)) {
            success(['status' => 'already_reviewed']);
        }
        success(['status' => 'no_purchase']);
    }

    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        [$page, $perPage, $offset] = PaginationHelper::params();
        $search    = sanitize($_GET['search'] ?? '');
        $minRating = (int) ($_GET['min_rating'] ?? 0);
        $items = $this->reviews->adminAll($perPage, $offset, $search, $minRating);
        $total = $this->reviews->countAdminAll($search, $minRating);
        // Attach photos per review for the admin list.
        $photoMap = $this->reviews->photosForReviewIds(array_map(fn($r) => (int) $r['id'], $items));
        foreach ($items as &$r) { $r['photos'] = $photoMap[(int) $r['id']] ?? []; }
        paginated($items, $total, $page, $perPage);
    }

    public function forProduct(int $productId): never
    {
        method('GET');
        [$page, $perPage, $offset] = PaginationHelper::params();
        $items = $this->reviews->forProduct($productId, $perPage, $offset);
        $total = $this->reviews->countForProduct($productId);
        $stats = $this->reviews->stats($productId);

        // Inline photos per review + a recent-photos strip for the gallery.
        $photoMap = $this->reviews->photosForReviewIds(array_map(fn($r) => (int) $r['id'], $items));
        foreach ($items as &$r) {
            $r['photos'] = $photoMap[(int) $r['id']] ?? [];
        }
        $photos = $this->reviews->recentPhotosForProduct($productId, 12);

        respond([
            'success' => true,
            'data'    => $items,
            'stats'   => $stats,
            'photos'  => $photos,
            'meta'    => ['total' => $total, 'current_page' => $page, 'per_page' => $perPage],
        ]);
    }

    public function uploadPhoto(int $id): never
    {
        method('POST');
        $auth   = AuthMiddleware::require();
        $review = $this->reviews->findById($id);
        if (!$review) error('Review not found.', 404);
        if ((int) $review['user_id'] !== (int) $auth['sub'] && $auth['role'] !== 'admin') {
            error('Forbidden.', 403);
        }
        if (empty($_FILES['photo'])) error('No photo uploaded.', 422);

        try {
            $url     = UploadHelper::saveReviewImage($_FILES['photo'], $id);
            $photoId = $this->reviews->addPhoto($id, $url);
            success(['id' => $photoId, 'image_url' => $url], 'Photo uploaded.', 201);
        } catch (InvalidArgumentException $e) {
            error($e->getMessage(), 422);
        }
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
