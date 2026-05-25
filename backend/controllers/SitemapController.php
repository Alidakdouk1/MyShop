<?php
declare(strict_types=1);

class SitemapController
{
    // GET /MyShop/backend/sitemap.xml — storefront URLs for crawlers.
    public function index(): never
    {
        $base = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $db   = getDB();

        $urls   = [];
        $urls[] = ['loc' => "$base/",     'priority' => '1.0'];
        $urls[] = ['loc' => "$base/shop", 'priority' => '0.8'];

        foreach ($db->query("SELECT id FROM categories WHERE parent_id IS NULL ORDER BY id")->fetchAll() as $c) {
            $urls[] = ['loc' => "$base/shop?category_id=" . (int) $c['id'], 'priority' => '0.6'];
        }
        foreach ($db->query("SELECT slug, updated_at FROM products WHERE status='active' ORDER BY id")->fetchAll() as $p) {
            $urls[] = [
                'loc'      => "$base/products/" . rawurlencode((string) $p['slug']),
                'lastmod'  => substr((string) $p['updated_at'], 0, 10),
                'priority' => '0.7',
            ];
        }

        header('Content-Type: application/xml; charset=UTF-8');
        $out  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $out .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $u) {
            $out .= "  <url>\n    <loc>" . htmlspecialchars($u['loc'], ENT_XML1) . "</loc>\n";
            if (!empty($u['lastmod'])) $out .= "    <lastmod>{$u['lastmod']}</lastmod>\n";
            $out .= "    <priority>{$u['priority']}</priority>\n  </url>\n";
        }
        $out .= '</urlset>';
        echo $out;
        exit;
    }
}
