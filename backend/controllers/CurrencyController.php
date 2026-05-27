<?php
declare(strict_types=1);

class CurrencyController
{
    private CurrencyModel $currencies;

    public function __construct()
    {
        $this->currencies = new CurrencyModel();
    }

    /** Public — enabled currencies for the storefront picker. */
    public function index(): never
    {
        method('GET');
        success($this->currencies->enabled());
    }

    public function adminIndex(): never
    {
        method('GET');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        success($this->currencies->adminAll());
    }

    public function adminStore(): never
    {
        method('POST');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $data = getBody();

        $code = strtoupper(trim(sanitize($data['code'] ?? '')));
        $name = trim(sanitize($data['name'] ?? ''));
        $sym  = trim($data['symbol'] ?? '');
        $rate = (float) ($data['rate'] ?? 0);

        if (!preg_match('/^[A-Z]{3}$/', $code)) error('Code must be a 3-letter currency code (e.g. EUR).', 422);
        if (!$name || !$sym)                     error('Name and symbol are required.', 422);
        if ($rate <= 0)                          error('Rate must be greater than 0.', 422);
        if ($this->currencies->findByCode($code)) error('That currency already exists.', 409);

        $id = $this->currencies->create([
            'code' => $code, 'name' => $name, 'symbol' => $sym, 'rate' => $rate,
            'is_default' => 0, 'is_enabled' => (int) ($data['is_enabled'] ?? 1),
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ]);
        success(['id' => $id], 'Currency added.', 201);
    }

    public function adminUpdate(int $id): never
    {
        method('PUT');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $cur = $this->currencies->findById($id);
        if (!$cur) error('Currency not found.', 404);
        $data = getBody();

        $update = [];
        if (array_key_exists('name', $data))   $update['name']   = trim(sanitize($data['name']));
        if (array_key_exists('symbol', $data)) $update['symbol'] = trim($data['symbol']);
        if (array_key_exists('rate', $data)) {
            $rate = (float) $data['rate'];
            if ($rate <= 0) error('Rate must be greater than 0.', 422);
            $update['rate'] = $rate;
        }
        if (array_key_exists('is_enabled', $data)) $update['is_enabled'] = (int) (bool) $data['is_enabled'];
        if (array_key_exists('sort_order', $data)) $update['sort_order'] = (int) $data['sort_order'];

        if ($update) $this->currencies->update($id, $update);

        // Setting default is exclusive.
        if (!empty($data['is_default'])) {
            if ($cur['code'] !== 'USD') error('Only the base currency (USD) can be the default.', 422);
            $this->currencies->setDefault($id);
        }
        success($this->currencies->findById($id), 'Currency updated.');
    }

    public function adminDestroy(int $id): never
    {
        method('DELETE');
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $cur = $this->currencies->findById($id);
        if (!$cur) error('Currency not found.', 404);
        if ((int) $cur['is_default'] === 1) error('Cannot delete the default currency.', 422);
        $this->currencies->delete($id);
        success(null, 'Currency deleted.');
    }
}
