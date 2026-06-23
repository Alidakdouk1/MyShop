<?php
declare(strict_types=1);

/**
 * Auto-generated sitemap.xml + robots.txt.
 *
 * The sitemap reflects the live catalogue every request — no caching, no cron.
 * For a few thousand products this stays under the 50k-URL / 50MB sitemap limit
 * and renders comfortably under a second. Bigger catalogues should sitemap-index
 * by category; not needed yet.
 *
 * Each product entry includes its primary image as <image:image> so Google
 * Images indexes the product photo — meaningful traffic for visual categories.
 */
class SitemapController
{
    public function index(): never
    {
        $base = $this->frontendBase();
        $db   = getDB();

        $urls = [];

        // Static, high-priority pages.
        $urls[] = ['loc' => "$base/",            'priority' => '1.0', 'changefreq' => 'daily'];
        $urls[] = ['loc' => "$base/shop",        'priority' => '0.8', 'changefreq' => 'daily'];

        // EVERY category (parents + children), not just top-level — internal
        // linking signal helps Google rank category landing pages.
        $cats = $db->query("SELECT id, updated_at FROM categories ORDER BY id")->fetchAll();
        foreach ($cats as $c) {
            $urls[] = [
                'loc'        => "$base/shop?category_id=" . (int) $c['id'],
                'lastmod'    => substr((string) ($c['updated_at'] ?? ''), 0, 10) ?: null,
                'priority'   => '0.6',
                'changefreq' => 'weekly',
            ];
        }

        // Active products with primary image (joined to skip a per-row subquery).
        $prods = $db->query(
            "SELECT p.slug, p.updated_at,
                    (SELECT image_url FROM product_images
                     WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image,
                    p.name
             FROM products p
             WHERE p.status = 'active'
             ORDER BY p.id"
        )->fetchAll();

        foreach ($prods as $p) {
            $entry = [
                'loc'        => "$base/products/" . rawurlencode((string) $p['slug']),
                'lastmod'    => substr((string) ($p['updated_at'] ?? ''), 0, 10) ?: null,
                'priority'   => '0.7',
                'changefreq' => 'weekly',
            ];
            if (!empty($p['image'])) {
                $img = $p['image'];
                if (!preg_match('#^https?://#', $img)) {
                    $img = $this->backendBase() . '/' . ltrim($img, '/');
                }
                $entry['image']      = $img;
                $entry['image_caption'] = (string) $p['name'];
            }
            $urls[] = $entry;
        }

        header('Content-Type: application/xml; charset=UTF-8');
        header('X-Robots-Tag: noindex'); // The sitemap itself shouldn't appear in results.
        $out  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $out .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
        $out .= '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";
        foreach ($urls as $u) {
            $out .= "  <url>\n    <loc>" . htmlspecialchars($u['loc'], ENT_XML1) . "</loc>\n";
            if (!empty($u['lastmod']))    $out .= "    <lastmod>{$u['lastmod']}</lastmod>\n";
            if (!empty($u['changefreq'])) $out .= "    <changefreq>{$u['changefreq']}</changefreq>\n";
            if (!empty($u['priority']))   $out .= "    <priority>{$u['priority']}</priority>\n";
            if (!empty($u['image'])) {
                $out .= "    <image:image>\n";
                $out .= "      <image:loc>" . htmlspecialchars($u['image'], ENT_XML1) . "</image:loc>\n";
                if (!empty($u['image_caption'])) {
                    $out .= "      <image:caption>" . htmlspecialchars($u['image_caption'], ENT_XML1) . "</image:caption>\n";
                }
                $out .= "    </image:image>\n";
            }
            $out .= "  </url>\n";
        }
        $out .= '</urlset>';
        echo $out;
        exit;
    }

    /**
     * Public robots.txt. Disallows the parts of the site that shouldn't be
     * crawled (auth/admin/cart/checkout) and points crawlers at the sitemap.
     */
    public function robots(): never
    {
        $base = $this->frontendBase();
        header('Content-Type: text/plain; charset=UTF-8');
        echo "User-agent: *\n";
        echo "Allow: /\n";
        echo "Disallow: /admin\n";
        echo "Disallow: /login\n";
        echo "Disallow: /register\n";
        echo "Disallow: /cart\n";
        echo "Disallow: /checkout\n";
        echo "Disallow: /account/\n";
        echo "Disallow: /wishlist/\n";   // public-share view fine for SEO? — skipping to keep privacy
        echo "\n";
        echo "Sitemap: {$base}/sitemap.xml\n";
        exit;
    }

    /**
     * Stats endpoint for the admin SEO Tools panel. Cheap counts; no XML build.
     */
    public function stats(): never
    {
        $auth = AuthMiddleware::require();
        RoleMiddleware::require($auth, 'admin');
        $db = getDB();
        $productCount = (int) $db->query("SELECT COUNT(*) FROM products WHERE status = 'active'")->fetchColumn();
        $catCount     = (int) $db->query("SELECT COUNT(*) FROM categories")->fetchColumn();
        // Static pages: home + shop = 2.
        $total = 2 + $catCount + $productCount;
        success([
            'total_urls'      => $total,
            'product_urls'    => $productCount,
            'category_urls'   => $catCount,
            'static_urls'     => 2,
            'sitemap_url'     => $this->frontendBase() . '/sitemap.xml',
            'sitemap_backend' => $this->backendBase() . '/sitemap.xml',
            'robots_url'      => $this->frontendBase() . '/robots.txt',
            'robots_backend'  => $this->backendBase() . '/robots.txt',
        ]);
    }

    private function frontendBase(): string
    {
        return rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
    }

    private function backendBase(): string
    {
        // Derive from the current request so links in dev/prod both work even
        // when no BACKEND_URL env var is set.
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $script = rtrim(str_replace('/index.php', '', $_SERVER['SCRIPT_NAME'] ?? ''), '/');
        return env('BACKEND_URL', "$scheme://$host$script");
    }
}
