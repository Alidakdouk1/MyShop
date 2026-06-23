<?php
declare(strict_types=1);

class SearchController
{
    private ProductModel $products;

    public function __construct()
    {
        $this->products = new ProductModel();
    }

    /**
     * POST /api/search/by-image
     *
     * Accepts a multipart "image" file, sends it to Google Cloud Vision's
     * Label Detection endpoint, then searches the active catalogue for
     * products whose name / description matches the returned labels.
     *
     * Response: { labels: [...], products: [...] }
     */
    public function byImage(): never
    {
        method('POST');
        RateLimiter::check('search_by_image', 20, 60);

        if (empty($_FILES['image']['tmp_name']) || !is_uploaded_file($_FILES['image']['tmp_name'])) {
            error('Please upload an image in the "image" field.', 422);
        }
        $file = $_FILES['image'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error('Upload failed (error ' . $file['error'] . ').', 422);
        }
        if ($file['size'] > 5 * 1024 * 1024) {
            error('Image too large. Max 5 MB.', 422);
        }

        // Verify it's actually an image so we don't waste an API call.
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime  = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
            error('Invalid image type. Allowed: JPEG, PNG, WebP, GIF.', 422);
        }

        $apiKey = env('GOOGLE_VISION_API_KEY', '');
        if ($apiKey === '') {
            error('Image search is not configured. Admin must set GOOGLE_VISION_API_KEY.', 503);
        }

        // Call Vision API ─────────────────────────────────────────
        $b64     = base64_encode((string) file_get_contents($file['tmp_name']));
        $payload = json_encode([
            'requests' => [[
                'image'    => ['content' => $b64],
                'features' => [
                    ['type' => 'LABEL_DETECTION',  'maxResults' => 10],
                    ['type' => 'OBJECT_LOCALIZATION', 'maxResults' => 5],
                ],
            ]],
        ]);

        $ch = curl_init('https://vision.googleapis.com/v1/images:annotate?key=' . urlencode($apiKey));
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $response = curl_exec($ch);
        $http     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            error('Vision API request failed: ' . $curlErr, 502);
        }
        if ($http !== 200) {
            $body = json_decode((string) $response, true);
            $msg  = $body['error']['message'] ?? 'Vision API returned HTTP ' . $http;
            error('Vision API error: ' . $msg, 502);
        }

        $data    = json_decode((string) $response, true) ?: [];
        $labels  = $data['responses'][0]['labelAnnotations']        ?? [];
        $objects = $data['responses'][0]['localizedObjectAnnotations'] ?? [];

        // Combine labels + object names. Keep only confident hits (score > 0.6),
        // lowercase + dedupe. Multi-word labels get split into their own words
        // too so "Smart watch" also matches products tagged just "watch".
        $terms = [];
        foreach ($labels as $l) {
            if (($l['score'] ?? 0) < 0.6) continue;
            $terms[] = strtolower((string) $l['description']);
        }
        foreach ($objects as $o) {
            if (($o['score'] ?? 0) < 0.6) continue;
            $terms[] = strtolower((string) $o['name']);
        }
        $words = [];
        foreach ($terms as $t) {
            $words[] = $t;
            foreach (preg_split('/\s+/', $t) as $w) {
                if (strlen($w) >= 3) $words[] = $w;
            }
        }
        $words = array_values(array_unique(array_filter($words)));

        if (empty($words)) {
            success(['labels' => [], 'products' => []], 'No recognizable products in the image.');
        }

        // Build a product search: any term that matches name or description.
        // Cap at top 8 terms — more than that and we just blanket-match the catalog.
        $words   = array_slice($words, 0, 8);
        $clauses = [];
        $params  = [];
        foreach ($words as $w) {
            $clauses[] = '(p.name LIKE ? OR p.description LIKE ?)';
            $params[]  = "%{$w}%";
            $params[]  = "%{$w}%";
        }
        $sql = "SELECT p.id, p.name, p.slug, p.base_price, p.sale_price, p.stock_qty,
                       c.name AS category_name,
                       (SELECT image_url FROM product_images
                        WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
                FROM products p
                JOIN categories c ON c.id = p.category_id
                WHERE p.status = 'active' AND (" . implode(' OR ', $clauses) . ")
                LIMIT 24";

        $rows = getDB()->prepare($sql);
        $rows->execute($params);
        $matches = $rows->fetchAll();

        success([
            'labels'   => $words,
            'products' => $matches,
        ], 'Found ' . count($matches) . ' match' . (count($matches) === 1 ? '' : 'es') . '.');
    }
}
