<?php
declare(strict_types=1);

class AdminController
{
    private function guard(): array
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        return $auth;
    }

    // ── Categories ────────────────────────────────────────────────────────────

    public function categories(): never
    {
        method('GET');
        $this->guard();
        success((new CategoryModel())->adminList());
    }

    public function createCategory(): never
    {
        method('POST');
        $this->guard();
        $data = getBody();
        $name = sanitize($data['name'] ?? '');
        if (!$name) error('Name is required.', 422);

        $slug = preg_replace('/[^a-z0-9]+/', '-', strtolower($name))
              . '-' . substr(bin2hex(random_bytes(3)), 0, 6);

        $model = new CategoryModel();
        $id    = $model->create([
            'parent_id'  => isset($data['parent_id'])  && $data['parent_id']  !== '' ? (int) $data['parent_id']  : null,
            'section_id' => isset($data['section_id']) && $data['section_id'] !== '' ? (int) $data['section_id'] : null,
            'name'       => $name,
            'slug'       => $slug,
            'image_url'  => sanitize($data['image_url'] ?? ''),
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'has_sizes'  => (int) ($data['has_sizes'] ?? 0),
        ]);
        success($model->findById($id), 'Category created.', 201);
    }

    public function updateCategory(int $id): never
    {
        method('PUT');
        $this->guard();
        $model = new CategoryModel();
        if (!$model->findById($id)) error('Category not found.', 404);

        $data   = getBody();
        $update = [];
        if (array_key_exists('name', $data)) {
            $name = sanitize($data['name']);
            if (!$name) error('Name is required.', 422);
            $update['name'] = $name;
        }
        if (array_key_exists('parent_id', $data)) {
            $update['parent_id'] = ($data['parent_id'] !== '' && $data['parent_id'] !== null)
                ? (int) $data['parent_id'] : null;
        }
        if (array_key_exists('section_id', $data)) {
            $update['section_id'] = ($data['section_id'] !== '' && $data['section_id'] !== null)
                ? (int) $data['section_id'] : null;
        }
        if (array_key_exists('image_url',  $data)) $update['image_url']  = sanitize($data['image_url']);
        if (array_key_exists('sort_order', $data)) $update['sort_order'] = (int) $data['sort_order'];
        if (array_key_exists('has_sizes',  $data)) $update['has_sizes']  = (int) $data['has_sizes'];

        $model->update($id, $update);
        success($model->findById($id), 'Category updated.');
    }

    public function deleteCategory(int $id): never
    {
        method('DELETE');
        $this->guard();
        $db   = getDB();
        $chk  = $db->prepare("SELECT id FROM categories WHERE id = ?");
        $chk->execute([$id]);
        if (!$chk->fetch()) error('Category not found.', 404);

        $s = $db->prepare("SELECT COUNT(*) FROM categories WHERE parent_id = ?");
        $s->execute([$id]);
        if ((int) $s->fetchColumn() > 0) error('Delete sub-categories first.', 409);

        (new CategoryModel())->delete($id);
        success(null, 'Category deleted.');
    }

    // ── Category Sections ("others" blocks in the mega-menu) ────────────────────

    /** GET /api/admin/sections — every section across all categories. */
    public function sections(): never
    {
        method('GET');
        $this->guard();
        success((new CategorySectionModel())->all());
    }

    /** POST /api/admin/categories/{id}/sections — add a section to a category. */
    public function createSection(int $categoryId): never
    {
        method('POST');
        $this->guard();
        if (!(new CategoryModel())->findById($categoryId)) error('Category not found.', 404);

        $data  = getBody();
        $title = sanitize($data['title'] ?? '');
        if (!$title) error('Section title is required.', 422);

        $model = new CategorySectionModel();
        $id    = $model->create($categoryId, $title, (int) ($data['sort_order'] ?? 0));
        success($model->findById($id), 'Section created.', 201);
    }

    /** PUT /api/admin/sections/{id} — rename / reorder a section. */
    public function updateSection(int $id): never
    {
        method('PUT');
        $this->guard();
        $model = new CategorySectionModel();
        if (!$model->findById($id)) error('Section not found.', 404);

        $data   = getBody();
        $update = [];
        if (array_key_exists('title', $data)) {
            $title = sanitize($data['title']);
            if (!$title) error('Section title is required.', 422);
            $update['title'] = $title;
        }
        if (array_key_exists('sort_order', $data)) $update['sort_order'] = (int) $data['sort_order'];
        if (empty($update)) error('Nothing to update.', 422);

        $model->update($id, $update);
        success($model->findById($id), 'Section updated.');
    }

    /** DELETE /api/admin/sections/{id} — sub-categories fall back to the main block. */
    public function deleteSection(int $id): never
    {
        method('DELETE');
        $this->guard();
        $model = new CategorySectionModel();
        if (!$model->findById($id)) error('Section not found.', 404);
        $model->delete($id);
        success(null, 'Section deleted.');
    }

    // ── Dashboard ──────────────────────────────────────────────────────────────

    public function dashboard(): never
    {
        method('GET');
        $this->guard();
        $db = getDB();

        $orders  = new OrderModel();
        $revenue = $orders->revenueStats();
        $daily   = $orders->dailySales(30);

        $users      = (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $adminCount = (int) $db->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn();
        $products    = (int) $db->query("SELECT COUNT(*) FROM products WHERE status='active'")->fetchColumn();

        $lowStock = $db->query(
            "SELECT id, name, sku, stock_qty FROM products WHERE stock_qty <= 5 AND status='active' ORDER BY stock_qty ASC LIMIT 10"
        )->fetchAll();

        $recentOrders = $orders->all(5, 0);

        $topProducts = $db->query(
            "SELECT p.id, p.name, p.slug, SUM(oi.quantity) AS units_sold
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             GROUP BY p.id ORDER BY units_sold DESC LIMIT 5"
        )->fetchAll();

        success([
            'revenue'        => $revenue,
            'daily_sales'    => $daily,
            'total_users'    => $users,
            'total_admins'   => $adminCount,
            'total_products' => $products,
            'low_stock'      => $lowStock,
            'recent_orders'  => $recentOrders,
            'top_products'   => $topProducts,
        ]);
    }

    // ── Abandoned carts ─────────────────────────────────────────────────────

    /** GET /api/admin/abandoned-carts?hours=1 — stale registered-user carts. */
    public function abandonedCarts(): never
    {
        method('GET');
        $this->guard();
        $hours = isset($_GET['hours']) ? max(1, (int) $_GET['hours']) : 1;
        $carts = (new CartModel())->abandoned($hours);
        $value = array_sum(array_map(fn($c) => (float) $c['value'], $carts));
        success([
            'hours'       => $hours,
            'count'       => count($carts),
            'total_value' => round($value, 2),
            'carts'       => $carts,
        ]);
    }

    // ── Products CSV import / export ────────────────────────────────────────

    private const CSV_COLS = ['id','category_id','name','slug','sku','base_price','sale_price','stock_qty','status','is_featured','weight','description'];

    /** GET /api/admin/products/export — download the catalogue as CSV. */
    public function exportProductsCsv(): never
    {
        method('GET');
        $this->guard();
        $cols = implode(', ', self::CSV_COLS);
        $rows = getDB()->query("SELECT {$cols} FROM products ORDER BY id")->fetchAll();

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="products-' . date('Ymd') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, self::CSV_COLS);
        foreach ($rows as $r) {
            fputcsv($out, array_map(fn($c) => $r[$c] ?? '', self::CSV_COLS));
        }
        fclose($out);
        exit;
    }

    /** POST /api/admin/products/import — upsert products from a CSV (multipart "file"). */
    public function importProductsCsv(): never
    {
        method('POST');
        $this->guard();
        if (empty($_FILES['file']['tmp_name']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            error('Please upload a CSV file in the "file" field.', 422);
        }
        $fh = fopen($_FILES['file']['tmp_name'], 'r');
        if (!$fh) error('Could not read the uploaded file.', 422);

        $header = fgetcsv($fh);
        if (!$header) error('The CSV file is empty.', 422);
        $header = array_map(fn($h) => strtolower(trim((string) $h)), $header);

        $model = new ProductModel();
        $db    = getDB();
        $created = 0; $updated = 0; $errors = [];
        $line = 1;

        while (($row = fgetcsv($fh)) !== false) {
            $line++;
            if (count(array_filter($row, fn($v) => $v !== null && $v !== '')) === 0) continue;
            $r = [];
            foreach ($header as $i => $col) $r[$col] = $row[$i] ?? null;

            $name = trim((string) ($r['name'] ?? ''));
            $sku  = trim((string) ($r['sku'] ?? ''));
            if ($name === '' || $sku === '') { $errors[] = "Row {$line}: name and sku are required."; continue; }

            $fields = [
                'name'        => sanitize($name),
                'category_id' => isset($r['category_id']) && $r['category_id'] !== '' ? (int) $r['category_id'] : null,
                'description' => isset($r['description']) ? sanitize((string) $r['description']) : null,
                'base_price'  => isset($r['base_price']) && is_numeric($r['base_price']) ? (float) $r['base_price'] : null,
                'sale_price'  => isset($r['sale_price']) && $r['sale_price'] !== '' ? (float) $r['sale_price'] : null,
                'stock_qty'   => isset($r['stock_qty']) && $r['stock_qty'] !== '' ? (int) $r['stock_qty'] : 0,
                'sku'         => sanitize($sku),
                'status'      => in_array($r['status'] ?? '', ['active','draft','archived'], true) ? $r['status'] : 'active',
                'is_featured' => (int) ($r['is_featured'] ?? 0),
                'weight'      => isset($r['weight']) && $r['weight'] !== '' ? (float) $r['weight'] : null,
            ];

            $existingId = null;
            if (!empty($r['id'])) {
                $st = $db->prepare("SELECT id FROM products WHERE id = ?");
                $st->execute([(int) $r['id']]);
                $existingId = $st->fetchColumn() ?: null;
            }
            if (!$existingId) {
                $st = $db->prepare("SELECT id FROM products WHERE sku = ?");
                $st->execute([$fields['sku']]);
                $existingId = $st->fetchColumn() ?: null;
            }

            try {
                if ($existingId) {
                    $model->update((int) $existingId, array_filter($fields, fn($v) => $v !== null));
                    $updated++;
                } else {
                    if ($fields['category_id'] === null || $fields['base_price'] === null) {
                        $errors[] = "Row {$line}: new products need category_id and base_price.";
                        continue;
                    }
                    $fields['slug'] = preg_replace('/[^a-z0-9]+/', '-', strtolower($name))
                                    . '-' . substr(bin2hex(random_bytes(4)), 0, 8);
                    $model->create($fields);
                    $created++;
                }
            } catch (\Throwable $e) {
                $errors[] = "Row {$line}: " . $e->getMessage();
            }
        }
        fclose($fh);
        success(['created' => $created, 'updated' => $updated, 'errors' => $errors], 'Import complete.');
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    public function users(): never
    {
        method('GET');
        $this->guard();
        [$page, $perPage, $offset] = PaginationHelper::params();
        $search = sanitize($_GET['search'] ?? '');
        $model  = new UserModel();
        $items  = $model->all($perPage, $offset, $search, 'customer');
        $total  = $model->count($search, 'customer');
        paginated($items, $total, $page, $perPage);
    }

    public function updateUserRole(int $id): never
    {
        method('PUT');
        $auth = $this->guard();
        $data = getBody();
        $role = $data['role'] ?? '';
        if (!in_array($role, ['customer', 'admin'], true)) error('Invalid role.', 422);
        $model = new UserModel();
        $model->update($id, ['role' => $role]);
        success(null, 'User role updated.');
    }

    public function deleteUser(int $id): never
    {
        method('DELETE');
        $auth = $this->guard();
        if ($id === (int) $auth['sub']) error('Cannot delete your own account.', 403);
        $db = getDB();
        $user = $db->prepare("SELECT id, role FROM users WHERE id = ?");
        $user->execute([$id]);
        $row = $user->fetch();
        if (!$row) error('User not found.', 404);
        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        success(null, 'User deleted.');
    }

    public function createUser(): never
    {
        method('POST');
        $this->guard();
        $data = getBody();
        $name  = sanitize($data['name']  ?? '');
        $email = sanitize($data['email'] ?? '');
        $pass  = $data['password'] ?? '';
        $role  = $data['role']     ?? 'customer';

        if (!$name)  error('Name is required.', 422);
        if (!$email) error('Email is required.', 422);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) error('Invalid email.', 422);
        if (strlen($pass) < 6) error('Password must be at least 6 characters.', 422);
        if (!in_array($role, ['customer', 'admin'], true)) error('Invalid role.', 422);

        $db = getDB();
        $exists = $db->prepare("SELECT id FROM users WHERE email = ?");
        $exists->execute([$email]);
        if ($exists->fetch()) error('Email already in use.', 409);

        $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare(
            "INSERT INTO users (name, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, 1)"
        );
        $stmt->execute([$name, $email, $hash, $role]);
        $newId = (int) $db->lastInsertId();

        $created = $db->prepare("SELECT id, name, email, role, is_verified, created_at FROM users WHERE id = ?");
        $created->execute([$newId]);
        success($created->fetch(), 'User created.', 201);
    }

    public function updateUser(int $id): never
    {
        method('PUT');
        $auth = $this->guard();
        $data  = getBody();
        $db    = getDB();

        $check = $db->prepare("SELECT id FROM users WHERE id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) error('User not found.', 404);

        $allowed = ['name', 'email', 'role', 'phone'];
        $sets = []; $params = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) {
                $sets[]   = "`{$f}` = ?";
                $params[] = sanitize((string) $data[$f]);
            }
        }
        if (!empty($data['password'])) {
            if (strlen($data['password']) < 6) error('Password must be at least 6 characters.', 422);
            $sets[]   = '`password_hash` = ?';
            $params[] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        if (empty($sets)) error('Nothing to update.', 422);

        $params[] = $id;
        $db->prepare("UPDATE users SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

        $updated = $db->prepare("SELECT id, name, email, role, phone, is_verified, created_at FROM users WHERE id = ?");
        $updated->execute([$id]);
        success($updated->fetch(), 'User updated.');
    }

    // ── Admins ────────────────────────────────────────────────────────────────

    public function admins(): never
    {
        method('GET');
        $this->guard();
        $db    = getDB();
        $search = sanitize($_GET['search'] ?? '');
        $params = [];
        $where  = "WHERE role = 'admin'";
        if ($search) {
            $where   .= " AND (name LIKE ? OR email LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }
        $stmt = $db->prepare(
            "SELECT id, name, email, role, phone, is_verified, created_at FROM users {$where} ORDER BY id ASC"
        );
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    public function createAdmin(): never
    {
        method('POST');
        $this->guard();
        $data = getBody();
        $name  = sanitize($data['name']  ?? '');
        $email = sanitize($data['email'] ?? '');
        $pass  = $data['password'] ?? '';

        if (!$name)  error('Name is required.', 422);
        if (!$email) error('Email is required.', 422);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) error('Invalid email.', 422);
        if (strlen($pass) < 6) error('Password must be at least 6 characters.', 422);

        $db = getDB();
        $exists = $db->prepare("SELECT id FROM users WHERE email = ?");
        $exists->execute([$email]);
        if ($exists->fetch()) error('Email already in use.', 409);

        $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare(
            "INSERT INTO users (name, email, password_hash, role, is_verified) VALUES (?, ?, ?, 'admin', 1)"
        );
        $stmt->execute([$name, $email, $hash]);
        $newId = (int) $db->lastInsertId();

        $created = $db->prepare("SELECT id, name, email, role, is_verified, created_at FROM users WHERE id = ?");
        $created->execute([$newId]);
        success($created->fetch(), 'Admin created.', 201);
    }

    public function updateAdmin(int $id): never
    {
        method('PUT');
        $auth = $this->guard();
        $data  = getBody();
        $db    = getDB();

        $check = $db->prepare("SELECT id, role FROM users WHERE id = ? AND role = 'admin'");
        $check->execute([$id]);
        if (!$check->fetch()) error('Admin not found.', 404);

        $sets = []; $params = [];
        if (!empty($data['name'])) {
            $sets[]   = '`name` = ?';
            $params[] = sanitize($data['name']);
        }
        if (!empty($data['email'])) {
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) error('Invalid email.', 422);
            $sets[]   = '`email` = ?';
            $params[] = sanitize($data['email']);
        }
        if (!empty($data['password'])) {
            if (strlen($data['password']) < 6) error('Password must be at least 6 characters.', 422);
            $sets[]   = '`password_hash` = ?';
            $params[] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        if (empty($sets)) error('Nothing to update.', 422);

        $params[] = $id;
        $db->prepare("UPDATE users SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

        $updated = $db->prepare("SELECT id, name, email, role, is_verified, created_at FROM users WHERE id = ?");
        $updated->execute([$id]);
        success($updated->fetch(), 'Admin updated.');
    }

    public function deleteAdmin(int $id): never
    {
        method('DELETE');
        $auth = $this->guard();
        if ($id === (int) $auth['sub']) error('Cannot delete your own admin account.', 403);

        $db    = getDB();
        $check = $db->prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'");
        $check->execute([$id]);
        if (!$check->fetch()) error('Admin not found.', 404);

        $total = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($total <= 1) error('Cannot delete the last admin account.', 403);

        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        success(null, 'Admin deleted.');
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function orders(): never
    {
        method('GET');
        $this->guard();
        [$page, $perPage, $offset] = PaginationHelper::params();
        $status = sanitize($_GET['status'] ?? '');
        $model  = new OrderModel();
        $items  = $model->all($perPage, $offset, $status);
        $total  = $model->countAll($status);
        paginated($items, $total, $page, $perPage);
    }

    public function updateOrderStatus(int $id): never
    {
        method('PUT');
        $this->guard();
        $data    = getBody();
        $status  = $data['status'] ?? '';
        $allowed = ['pending','confirmed','shipped','delivered','cancelled','refunded'];
        if (!in_array($status, $allowed, true)) error('Invalid status.', 422);
        (new OrderModel())->updateStatus($id, $status);
        success(null, 'Order status updated.');
    }

    // ── Products ──────────────────────────────────────────────────────────────

    public function getProduct(int $id): never
    {
        method('GET');
        $this->guard();
        $model   = new ProductModel();
        $product = $model->findById($id);
        if (!$product) error('Product not found.', 404);
        $product['images']   = $model->images($id);
        $product['variants'] = $model->variants($id);
        success($product);
    }

    public function products(): never
    {
        method('GET');
        $this->guard();
        [$page, $perPage, $offset] = PaginationHelper::params();
        $model   = new ProductModel();
        $filters = [
            'search'      => sanitize($_GET['search']      ?? ''),
            'category_id' => (int) ($_GET['category_id']  ?? 0) ?: null,
        ];
        $items   = $model->searchAdmin($filters, $perPage, $offset);
        $total   = $model->countAdmin($filters);
        paginated($items, $total, $page, $perPage);
    }

    public function createProduct(): never
    {
        method('POST');
        $auth = $this->guard();
        $data = getBody();

        $name = sanitize($data['name'] ?? '');
        if (!$name) error('Product name is required.', 422);
        if (!isset($data['base_price']) || !is_numeric($data['base_price'])) error('Valid base price is required.', 422);
        if (empty($data['category_id'])) error('Category is required.', 422);
        if (empty($data['sku']))         error('SKU is required.', 422);

        $slug = preg_replace('/[^a-z0-9]+/', '-', strtolower($name))
              . '-' . substr(bin2hex(random_bytes(4)), 0, 8);

        $model = new ProductModel();

        try {
            $id = $model->create([
                'vendor_id'   => null,
                'category_id' => (int) $data['category_id'],
                'name'        => $name,
                'slug'        => $slug,
                'description' => sanitize($data['description'] ?? ''),
                'base_price'  => (float) $data['base_price'],
                'sale_price'  => isset($data['sale_price']) && $data['sale_price'] !== '' ? (float) $data['sale_price'] : null,
                'stock_qty'   => (int) ($data['stock_qty'] ?? 0),
                'sku'         => sanitize($data['sku']),
                'status'      => in_array($data['status'] ?? '', ['active','draft'], true) ? $data['status'] : 'active',
                'is_featured' => (int) ($data['is_featured'] ?? 0),
                'weight'      => isset($data['weight']) && $data['weight'] !== '' ? (float) $data['weight'] : null,
            ]);
        } catch (\PDOException $e) {
            $isDuplicate = str_contains($e->getMessage(), 'Duplicate entry');
            error($isDuplicate ? 'A product with this SKU already exists.' : 'Failed to save product: ' . $e->getMessage(), 422);
        }

        $product = $model->findById($id);
        success($product ?? ['id' => $id], 'Product created.', 201);
    }

    public function updateProduct(int $id): never
    {
        method('PUT');
        $this->guard();
        $model   = new ProductModel();
        $product = $model->findById($id);
        if (!$product) error('Product not found.', 404);

        $data   = getBody();
        $fields = ['name','description','base_price','sale_price','stock_qty',
                   'category_id','status','is_featured','weight','sku'];
        $update = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $data)) {
                $update[$f] = is_string($data[$f]) ? sanitize($data[$f]) : $data[$f];
            }
        }
        if (!empty($update['name'])) {
            $update['slug'] = preg_replace('/[^a-z0-9]+/', '-', strtolower($update['name']))
                            . '-' . substr(bin2hex(random_bytes(4)), 0, 8);
        }
        $model->update($id, $update);
        success($model->findById($id), 'Product updated.');
    }

    public function deleteProduct(int $id): never
    {
        method('DELETE');
        $this->guard();
        $model   = new ProductModel();
        $product = $model->findById($id);
        if (!$product) error('Product not found.', 404);
        $model->delete($id);
        success(null, 'Product deleted.');
    }

    public function uploadProductImage(int $id): never
    {
        method('POST');
        $this->guard();
        $model   = new ProductModel();
        $product = $model->findById($id);
        if (!$product) error('Product not found.', 404);
        if (empty($_FILES['image'])) error('No image uploaded.', 422);

        try {
            $url       = UploadHelper::saveProductImage($_FILES['image'], $id);
            $isPrimary = empty($model->images($id));
            $imgId     = $model->addImage($id, $url, 0, $isPrimary);
            success(['id' => $imgId, 'image_url' => $url], 'Image uploaded.', 201);
        } catch (InvalidArgumentException $e) {
            error($e->getMessage(), 422);
        }
    }

    public function deleteProductImage(int $productId, int $imageId): never
    {
        method('DELETE');
        $this->guard();
        $model = new ProductModel();
        if (!$model->findById($productId)) error('Product not found.', 404);
        if (!$model->deleteImage($imageId, $productId)) error('Image not found.', 404);
        success(null, 'Image deleted.');
    }

    // ── Variants ──────────────────────────────────────────────────────────────

    public function addVariant(int $productId): never
    {
        method('POST');
        $this->guard();
        $model   = new ProductModel();
        $product = $model->findById($productId);
        if (!$product) error('Product not found.', 404);

        $data = getBody();
        if (empty($data['sku'])) error('Variant SKU is required.', 422);

        $variantId = $model->addVariant($productId, [
            'size'           => sanitize($data['size']  ?? ''),
            'color'          => sanitize($data['color'] ?? ''),
            'price_modifier' => $data['price_modifier'] ?? 0,
            'stock_qty'      => $data['stock_qty']      ?? 0,
            'sku'            => sanitize($data['sku']),
        ]);
        success(['id' => $variantId], 'Variant added.', 201);
    }

    public function deleteVariant(int $productId, int $variantId): never
    {
        method('DELETE');
        $this->guard();
        $model   = new ProductModel();
        if (!$model->findById($productId)) error('Product not found.', 404);
        if (!$model->deleteVariant($variantId, $productId)) error('Variant not found.', 404);
        success(null, 'Variant deleted.');
    }

    // ── Homepage Settings ─────────────────────────────────────────────────────

    private static function defaultHomepageSettings(): array
    {
        return [
            'announcement_bar' => [
                ['icon' => '🚚', 'text' => 'Free Shipping'],
                ['icon' => '↩️',  'text' => 'Free Returns'],
                ['icon' => '💳', 'text' => 'No Hidden Fees'],
            ],
            'hero_left_banners' => [
                ['title' => 'Hot Sellers',           'link' => '/shop?sort=bestselling', 'bg_color' => '#1a1a1a', 'text_color' => '#ffffff', 'image_url' => ''],
                ['title' => 'New Arrivals',          'link' => '/shop?sort=newest',      'bg_color' => '#1e3a5f', 'text_color' => '#ffffff', 'image_url' => ''],
                ['title' => 'Style Refresh Festival','link' => '/shop',                  'bg_color' => '#5c4a2a', 'text_color' => '#ffffff', 'image_url' => ''],
            ],
            'hero_center' => [
                'badge'        => 'UP TO 90% OFF',
                'title_top'    => 'Shipped From Our',
                'title_main'   => 'LOCAL',
                'title_sub'    => 'WAREHOUSE',
                'cta'          => 'SHOP NOW',
                'link'         => '/shop',
                'bg_color'     => '#f5e8c8',
                'accent_color' => '#C0392B',
                'image_url'    => '',
            ],
            'hero_right_brands' => [
                ['name' => 'ROMWE',      'link' => '/shop', 'bg_color' => '#6e6e6e', 'image_url' => ''],
                ['name' => 'EMERY ROSE', 'link' => '/shop', 'bg_color' => '#c9b8a8', 'image_url' => ''],
                ['name' => 'MOTF',       'link' => '/shop', 'bg_color' => '#4a4a4a', 'image_url' => ''],
            ],
            'sections' => [
                'show_categories'    => true,
                'show_featured'      => true,
                'show_promo_banners' => true,
                'show_new_arrivals'  => true,
                'show_trust_badges'  => true,
            ],
            'featured_section' => [
                'title'    => 'Best Sellers',
                'subtitle' => 'Top picks loved by our customers',
            ],
            'new_arrivals_section' => [
                'title'    => 'New Arrivals',
                'subtitle' => 'Fresh styles added daily',
            ],
            'promo_banners' => [
                ['title' => 'SALE',   'subtitle' => 'Up to 70% off selected items',  'cta' => 'Shop now →',         'link' => '/shop?on_sale=1',   'bg_color' => '#C0392B'],
                ['title' => 'NEW IN', 'subtitle' => 'Fresh styles added every week', 'cta' => 'Shop new arrivals →', 'link' => '/shop?sort=newest', 'bg_color' => '#0E0E0E'],
            ],
            'trust_badges' => [
                ['icon' => '🚚', 'title' => 'Free Shipping',  'desc' => 'On orders over $50'],
                ['icon' => '↩️',  'title' => 'Easy Returns',   'desc' => '30-day return policy'],
                ['icon' => '🔒', 'title' => 'Secure Payment', 'desc' => 'SSL encrypted checkout'],
                ['icon' => '⭐', 'title' => 'Top Quality',    'desc' => 'Verified seller products'],
            ],
        ];
    }

    public function getHomepageSettings(): never
    {
        method('GET');
        $db  = getDB();
        $row = $db->query("SELECT settings_json FROM homepage_settings LIMIT 1")->fetch();
        if (!$row || !$row['settings_json'] || $row['settings_json'] === '{}') {
            success(self::defaultHomepageSettings());
        }
        $data = json_decode($row['settings_json'], true);
        success(array_replace_recursive(self::defaultHomepageSettings(), $data ?: []));
    }

    public function uploadHomepageImage(): never
    {
        method('POST');
        $this->guard();

        if (empty($_FILES['image'])) error('No image file provided.', 422);

        try {
            $path = UploadHelper::saveHomepageImage($_FILES['image']);
            success(['url' => $path], 'Image uploaded.', 201);
        } catch (InvalidArgumentException $e) {
            error($e->getMessage(), 422);
        } catch (RuntimeException $e) {
            error('Upload failed. Please try again.', 500);
        }
    }

    public function updateHomepageSettings(): never
    {
        method('PUT');
        $this->guard();
        $db   = getDB();
        $data = getBody();

        // Validate promo_banners and trust_badges are arrays
        if (isset($data['promo_banners']) && !is_array($data['promo_banners'])) {
            error('promo_banners must be an array.', 422);
        }
        if (isset($data['trust_badges']) && !is_array($data['trust_badges'])) {
            error('trust_badges must be an array.', 422);
        }

        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $count = (int) $db->query("SELECT COUNT(*) FROM homepage_settings")->fetchColumn();
        if ($count === 0) {
            $db->prepare("INSERT INTO homepage_settings (settings_json) VALUES (?)")->execute([$json]);
        } else {
            $db->prepare("UPDATE homepage_settings SET settings_json = ? LIMIT 1")->execute([$json]);
        }
        success($data, 'Homepage settings saved.');
    }

    // ── Homepage Sections (CMS Page Builder) ─────────────────────────────────

    private static function defaultSectionsData(): array
    {
        return [
            [
                'type'       => 'hero_3col',
                'label'      => 'Hero Banner',
                'sort_order' => 1,
                'is_visible' => 1,
                'section_data' => [
                    'left_banners' => [
                        ['title' => 'Hot Sellers',            'link' => '/shop?sort=bestselling', 'bg_color' => '#1a1a1a', 'text_color' => '#ffffff', 'image_url' => ''],
                        ['title' => 'New Arrivals',           'link' => '/shop?sort=newest',      'bg_color' => '#1e3a5f', 'text_color' => '#ffffff', 'image_url' => ''],
                        ['title' => 'Style Refresh Festival', 'link' => '/shop',                  'bg_color' => '#5c4a2a', 'text_color' => '#ffffff', 'image_url' => ''],
                    ],
                    'center' => [
                        'badge'        => 'UP TO 90% OFF',
                        'title_top'    => 'Shipped From Our',
                        'title_main'   => 'LOCAL',
                        'title_sub'    => 'WAREHOUSE',
                        'cta'          => 'SHOP NOW',
                        'link'         => '/shop',
                        'bg_color'     => '#f5e8c8',
                        'accent_color' => '#C0392B',
                        'image_url'    => '',
                    ],
                    'right_brands' => [
                        ['name' => 'ROMWE',      'link' => '/shop', 'bg_color' => '#6e6e6e', 'image_url' => ''],
                        ['name' => 'EMERY ROSE', 'link' => '/shop', 'bg_color' => '#c9b8a8', 'image_url' => ''],
                        ['name' => 'MOTF',       'link' => '/shop', 'bg_color' => '#4a4a4a', 'image_url' => ''],
                    ],
                ],
            ],
            [
                'type'       => 'category_circles',
                'label'      => 'Category Navigation',
                'sort_order' => 2,
                'is_visible' => 1,
                'section_data' => ['max_items' => 12],
            ],
            [
                'type'       => 'product_grid',
                'label'      => 'Best Sellers',
                'sort_order' => 3,
                'is_visible' => 1,
                'section_data' => [
                    'title'          => 'Best Sellers',
                    'subtitle'       => 'Top picks loved by our customers',
                    'query'          => 'bestselling',
                    'limit'          => 8,
                    'cols'           => 4,
                    'view_all_link'  => '/shop?sort=bestselling',
                    'view_all_label' => 'View all',
                ],
            ],
            [
                'type'       => 'promo_banners',
                'label'      => 'Promotional Banners',
                'sort_order' => 4,
                'is_visible' => 1,
                'section_data' => [
                    'layout'  => '2col',
                    'banners' => [
                        ['title' => 'SALE',   'subtitle' => 'Up to 70% off selected items',  'cta' => 'Shop now →',         'link' => '/shop?on_sale=1',   'bg_color' => '#C0392B', 'text_color' => '#ffffff', 'image_url' => ''],
                        ['title' => 'NEW IN', 'subtitle' => 'Fresh styles added every week', 'cta' => 'Shop new arrivals →', 'link' => '/shop?sort=newest', 'bg_color' => '#0E0E0E', 'text_color' => '#ffffff', 'image_url' => ''],
                    ],
                ],
            ],
            [
                'type'       => 'product_grid',
                'label'      => 'New Arrivals',
                'sort_order' => 5,
                'is_visible' => 1,
                'section_data' => [
                    'title'          => 'New Arrivals',
                    'subtitle'       => 'Fresh styles added daily',
                    'query'          => 'newest',
                    'limit'          => 8,
                    'cols'           => 4,
                    'view_all_link'  => '/shop?sort=newest',
                    'view_all_label' => 'View all',
                ],
            ],
            [
                'type'       => 'trust_badges',
                'label'      => 'Trust Badges',
                'sort_order' => 6,
                'is_visible' => 1,
                'section_data' => [
                    'cols'       => 4,
                    'badges'     => [
                        ['icon' => '🚚', 'title' => 'Free Shipping',  'desc' => 'On orders over $50'],
                        ['icon' => '↩️',  'title' => 'Easy Returns',   'desc' => '30-day return policy'],
                        ['icon' => '🔒', 'title' => 'Secure Payment', 'desc' => 'SSL encrypted checkout'],
                        ['icon' => '⭐', 'title' => 'Top Quality',    'desc' => 'Verified seller products'],
                    ],
                    'bg_color'   => '',
                    'text_color' => '',
                ],
            ],
        ];
    }

    private function seedSectionsIfEmpty(\PDO $db): void
    {
        // Auto-create the table if migration 020 hasn't been run yet
        $db->exec("
            CREATE TABLE IF NOT EXISTS `homepage_sections` (
              `id`           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
              `type`         VARCHAR(50)   NOT NULL,
              `label`        VARCHAR(255)  NOT NULL DEFAULT '',
              `sort_order`   INT           NOT NULL DEFAULT 0,
              `is_visible`   TINYINT(1)   NOT NULL DEFAULT 1,
              `section_data` JSON          NOT NULL,
              `styles`       JSON,
              `created_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
              `updated_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        $count = (int) $db->query("SELECT COUNT(*) FROM homepage_sections")->fetchColumn();
        if ($count > 0) return;

        // Read existing homepage_settings JSON for data migration
        $row = $db->query("SELECT settings_json FROM homepage_settings LIMIT 1")->fetch();
        $existing = (!empty($row['settings_json']) && $row['settings_json'] !== '{}')
            ? (json_decode($row['settings_json'], true) ?: []) : [];

        $defaults = self::defaultSectionsData();

        // Merge existing saved settings into defaults so data isn't lost
        if (!empty($existing)) {
            foreach ($defaults as &$sec) {
                if ($sec['type'] === 'hero_3col') {
                    if (!empty($existing['hero_left_banners'])) $sec['section_data']['left_banners'] = $existing['hero_left_banners'];
                    if (!empty($existing['hero_center']))       $sec['section_data']['center']       = $existing['hero_center'];
                    if (!empty($existing['hero_right_brands'])) $sec['section_data']['right_brands'] = $existing['hero_right_brands'];
                } elseif ($sec['type'] === 'product_grid' && ($sec['section_data']['query'] ?? '') === 'bestselling' && !empty($existing['featured_section'])) {
                    $sec['section_data'] = array_merge($sec['section_data'], $existing['featured_section']);
                } elseif ($sec['type'] === 'product_grid' && ($sec['section_data']['query'] ?? '') === 'newest' && !empty($existing['new_arrivals_section'])) {
                    $sec['section_data'] = array_merge($sec['section_data'], $existing['new_arrivals_section']);
                } elseif ($sec['type'] === 'promo_banners' && !empty($existing['promo_banners'])) {
                    $sec['section_data']['banners'] = array_map(
                        fn($b) => array_merge(['text_color' => '#ffffff', 'image_url' => ''], $b),
                        $existing['promo_banners']
                    );
                } elseif ($sec['type'] === 'trust_badges' && !empty($existing['trust_badges'])) {
                    $sec['section_data']['badges'] = $existing['trust_badges'];
                } elseif ($sec['type'] === 'category_circles' && isset($existing['sections']['show_categories'])) {
                    $sec['is_visible'] = $existing['sections']['show_categories'] ? 1 : 0;
                }
            }
            unset($sec);
        }

        $stmt = $db->prepare(
            "INSERT INTO homepage_sections (type, label, sort_order, is_visible, section_data, styles) VALUES (?, ?, ?, ?, ?, ?)"
        );
        foreach ($defaults as $s) {
            $stmt->execute([
                $s['type'],
                $s['label'],
                $s['sort_order'],
                $s['is_visible'],
                json_encode($s['section_data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                null,
            ]);
        }
    }

    private function formatSection(array $row): array
    {
        return [
            'id'           => (int)  $row['id'],
            'type'         =>        $row['type'],
            'label'        =>        $row['label'],
            'sort_order'   => (int)  $row['sort_order'],
            'is_visible'   => (bool) $row['is_visible'],
            'section_data' => json_decode($row['section_data'], true) ?: [],
            'styles'       => $row['styles'] ? (json_decode($row['styles'], true) ?: null) : null,
            'created_at'   =>        $row['created_at'],
            'updated_at'   =>        $row['updated_at'],
        ];
    }

    public function getPublicHomepageSections(): never
    {
        method('GET');
        $db = getDB();
        $this->seedSectionsIfEmpty($db);
        $rows = $db->query("SELECT * FROM homepage_sections WHERE is_visible = 1 ORDER BY sort_order ASC")->fetchAll();
        success(array_map([$this, 'formatSection'], $rows));
    }

    public function getAdminHomepageSections(): never
    {
        method('GET');
        $this->guard();
        $db = getDB();
        $this->seedSectionsIfEmpty($db);
        $rows = $db->query("SELECT * FROM homepage_sections ORDER BY sort_order ASC")->fetchAll();
        success(array_map([$this, 'formatSection'], $rows));
    }

    public function createHomepageSection(): never
    {
        method('POST');
        $this->guard();
        $db   = getDB();
        $data = getBody();

        $type  = sanitize($data['type']  ?? '');
        $label = sanitize($data['label'] ?? '');
        if (!$type) error('Section type is required.', 422);

        $allowed = ['hero_3col', 'category_circles', 'product_grid', 'promo_banners',
                    'trust_badges', 'text_section', 'image_text', 'custom_banner', 'offer_section'];
        if (!in_array($type, $allowed, true)) error('Invalid section type.', 422);

        $maxOrder    = (int) $db->query("SELECT COALESCE(MAX(sort_order), 0) FROM homepage_sections")->fetchColumn();
        $sectionData = is_array($data['section_data'] ?? null) ? $data['section_data'] : [];
        $styles      = is_array($data['styles']       ?? null) ? $data['styles']       : null;

        $stmt = $db->prepare(
            "INSERT INTO homepage_sections (type, label, sort_order, is_visible, section_data, styles) VALUES (?, ?, ?, 1, ?, ?)"
        );
        $stmt->execute([
            $type,
            $label ?: ucfirst(str_replace('_', ' ', $type)),
            $maxOrder + 1,
            json_encode($sectionData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $styles ? json_encode($styles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
        ]);

        $newId = (int) $db->lastInsertId();
        $row   = $db->prepare("SELECT * FROM homepage_sections WHERE id = ?");
        $row->execute([$newId]);
        success($this->formatSection($row->fetch()), 'Section created.', 201);
    }

    public function updateHomepageSection(int $id): never
    {
        method('PUT');
        $this->guard();
        $db = getDB();

        $chk = $db->prepare("SELECT id FROM homepage_sections WHERE id = ?");
        $chk->execute([$id]);
        if (!$chk->fetch()) error('Section not found.', 404);

        $data   = getBody();
        $sets   = [];
        $params = [];

        if (array_key_exists('label', $data)) {
            $sets[]   = 'label = ?';
            $params[] = sanitize($data['label']);
        }
        if (array_key_exists('is_visible', $data)) {
            $sets[]   = 'is_visible = ?';
            $params[] = $data['is_visible'] ? 1 : 0;
        }
        if (array_key_exists('section_data', $data) && is_array($data['section_data'])) {
            $sets[]   = 'section_data = ?';
            $params[] = json_encode($data['section_data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        if (array_key_exists('styles', $data)) {
            $sets[]   = 'styles = ?';
            $params[] = is_array($data['styles'])
                ? json_encode($data['styles'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : null;
        }

        if (empty($sets)) error('No fields to update.', 422);

        $params[] = $id;
        $db->prepare("UPDATE homepage_sections SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

        $stmt = $db->prepare("SELECT * FROM homepage_sections WHERE id = ?");
        $stmt->execute([$id]);
        success($this->formatSection($stmt->fetch()), 'Section updated.');
    }

    public function deleteHomepageSection(int $id): never
    {
        method('DELETE');
        $this->guard();
        $db = getDB();

        $chk = $db->prepare("SELECT id FROM homepage_sections WHERE id = ?");
        $chk->execute([$id]);
        if (!$chk->fetch()) error('Section not found.', 404);

        $db->prepare("DELETE FROM homepage_sections WHERE id = ?")->execute([$id]);
        success(null, 'Section deleted.');
    }

    public function duplicateHomepageSection(int $id): never
    {
        method('POST');
        $this->guard();
        $db = getDB();

        $stmt = $db->prepare("SELECT * FROM homepage_sections WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) error('Section not found.', 404);

        $maxOrder = (int) $db->query("SELECT COALESCE(MAX(sort_order), 0) FROM homepage_sections")->fetchColumn();

        $ins = $db->prepare(
            "INSERT INTO homepage_sections (type, label, sort_order, is_visible, section_data, styles) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $ins->execute([
            $row['type'],
            $row['label'] . ' (Copy)',
            $maxOrder + 1,
            $row['is_visible'],
            $row['section_data'],
            $row['styles'],
        ]);

        $newId = (int) $db->lastInsertId();
        $stmt2 = $db->prepare("SELECT * FROM homepage_sections WHERE id = ?");
        $stmt2->execute([$newId]);
        success($this->formatSection($stmt2->fetch()), 'Section duplicated.', 201);
    }

    public function reorderHomepageSections(): never
    {
        method('PUT');
        $this->guard();
        $db   = getDB();
        $data = getBody();

        if (empty($data['sections']) || !is_array($data['sections'])) {
            error('sections array is required.', 422);
        }

        $stmt = $db->prepare("UPDATE homepage_sections SET sort_order = ? WHERE id = ?");
        foreach ($data['sections'] as $item) {
            if (!isset($item['id'], $item['sort_order'])) continue;
            $stmt->execute([(int) $item['sort_order'], (int) $item['id']]);
        }
        success(null, 'Sections reordered.');
    }
}
