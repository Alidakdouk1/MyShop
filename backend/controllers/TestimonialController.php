<?php
declare(strict_types=1);

class TestimonialController
{
    private TestimonialModel $model;

    public function __construct()
    {
        $this->model = new TestimonialModel();
    }

    private function guard(): array
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        return $auth;
    }

    /** Public — the homepage carousel reads from this. */
    public function publicIndex(): never
    {
        method('GET');
        success($this->model->forPublic());
    }

    public function adminIndex(): never
    {
        method('GET');
        $this->guard();
        success($this->model->allAdmin());
    }

    public function adminStore(): never
    {
        method('POST');
        $this->guard();
        $d    = getBody();
        $name = trim(sanitize((string) ($d['name'] ?? '')));
        $body = trim(sanitize((string) ($d['body'] ?? '')));
        if ($name === '') error('Name is required.', 422);
        if ($body === '') error('Testimonial body is required.', 422);

        $loc   = trim((string) ($d['location']  ?? ''));
        $photo = trim((string) ($d['photo_url'] ?? ''));
        $id = $this->model->create([
            'name'             => mb_substr($name, 0, 100),
            'location'         => $loc   !== '' ? mb_substr(sanitize($loc), 0, 100) : null,
            'photo_url'        => $photo !== '' ? mb_substr($photo, 0, 500)        : null,
            'rating'           => (int) ($d['rating'] ?? 5),
            'body'             => mb_substr($body, 0, 1000),
            'source_review_id' => isset($d['source_review_id']) && $d['source_review_id'] !== null ? (int) $d['source_review_id'] : null,
            'is_active'        => $d['is_active']  ?? 1,
            'sort_order'       => $d['sort_order'] ?? 0,
        ]);
        success($this->model->findById($id), 'Testimonial added.', 201);
    }

    public function adminUpdate(int $id): never
    {
        method('PUT');
        $this->guard();
        if (!$this->model->findById($id)) error('Not found.', 404);

        $d = getBody();
        $patch = [];
        foreach (['name','location','photo_url','body'] as $f) {
            if (array_key_exists($f, $d)) {
                $patch[$f] = $d[$f] === null ? null : mb_substr(trim(sanitize((string) $d[$f])), 0, $f === 'body' ? 1000 : 500);
            }
        }
        foreach (['rating','is_active','sort_order'] as $f) {
            if (array_key_exists($f, $d)) $patch[$f] = $d[$f];
        }
        $this->model->update($id, $patch);
        success($this->model->findById($id), 'Testimonial updated.');
    }

    public function adminDestroy(int $id): never
    {
        method('DELETE');
        $this->guard();
        if (!$this->model->findById($id)) error('Not found.', 404);
        $this->model->delete($id);
        success(null, 'Testimonial deleted.');
    }

    /**
     * Lists 5-star reviews the admin can promote into testimonials.
     * Excludes ones already imported (source_review_id match) so the list
     * doesn't repeat past picks.
     */
    public function adminCandidates(): never
    {
        method('GET');
        $this->guard();
        $rows = getDB()->query(
            "SELECT r.id, r.rating, r.body, r.created_at,
                    COALESCE(r.reviewer_name, u.name) AS reviewer_name,
                    p.name AS product_name
             FROM reviews r
             LEFT JOIN users u ON u.id = r.user_id
             LEFT JOIN products p ON p.id = r.product_id
             WHERE r.rating >= 4
               AND CHAR_LENGTH(COALESCE(r.body, '')) >= 40
               AND NOT EXISTS (SELECT 1 FROM testimonials t WHERE t.source_review_id = r.id)
             ORDER BY r.rating DESC, r.created_at DESC
             LIMIT 30"
        )->fetchAll();
        success($rows);
    }
}
