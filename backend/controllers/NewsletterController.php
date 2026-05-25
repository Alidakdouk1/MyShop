<?php
declare(strict_types=1);

class NewsletterController
{
    private NewsletterModel $subs;

    public function __construct()
    {
        $this->subs = new NewsletterModel();
    }

    // Public — anyone can subscribe from the storefront footer.
    public function subscribe(): never
    {
        method('POST');
        $data  = getBody();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error('Please enter a valid email address.', 422);
        }
        $source = sanitize($data['source'] ?? 'footer');
        $res = $this->subs->subscribe($email, $source);
        success(
            null,
            $res['already'] ? "You're already subscribed — thank you!" : 'Thanks for subscribing!',
            201
        );
    }

    // Admin — list subscribers.
    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        [, $perPage, $offset] = PaginationHelper::params();
        success($this->subs->all($perPage, $offset));
    }
}
