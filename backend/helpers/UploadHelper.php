<?php
declare(strict_types=1);

class UploadHelper
{
    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const MAX_SIZE     = 5 * 1024 * 1024; // 5 MB
    private const VIDEO_MIME   = ['video/mp4', 'video/webm', 'video/quicktime'];
    private const VIDEO_MAX    = 50 * 1024 * 1024; // 50 MB

    public static function saveProductImage(array $file, int $productId): string
    {
        self::validate($file);

        $dir = __DIR__ . "/../uploads/products/{$productId}/";
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $ext      = self::ext($file['type']);
        $filename = bin2hex(random_bytes(16)) . ".{$ext}";
        $dest     = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('Failed to move uploaded file');
        }

        self::resize($dest, $dir, $filename);

        return "uploads/products/{$productId}/{$filename}";
    }

    public static function saveProductVideo(array $file, int $productId): string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new InvalidArgumentException('Upload error code: ' . $file['error']);
        }
        if ($file['size'] > self::VIDEO_MAX) {
            throw new InvalidArgumentException('Video too large. Max 50 MB.');
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime  = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if (!in_array($mime, self::VIDEO_MIME, true)) {
            throw new InvalidArgumentException('Invalid video type. Allowed: MP4, WebM, MOV.');
        }

        $dir = __DIR__ . "/../uploads/products/{$productId}/videos/";
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $ext = match ($mime) {
            'video/mp4'        => 'mp4',
            'video/webm'       => 'webm',
            'video/quicktime'  => 'mov',
            default            => 'mp4',
        };
        $filename = bin2hex(random_bytes(16)) . ".{$ext}";
        $dest     = $dir . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('Failed to move uploaded video');
        }
        return "uploads/products/{$productId}/videos/{$filename}";
    }

    public static function saveReviewImage(array $file, int $reviewId): string
    {
        self::validate($file);

        $dir = __DIR__ . "/../uploads/reviews/{$reviewId}/";
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $ext      = self::ext($file['type']);
        $filename = bin2hex(random_bytes(16)) . ".{$ext}";
        $dest     = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('Failed to move uploaded file');
        }

        self::resize($dest, $dir, $filename);

        return "uploads/reviews/{$reviewId}/{$filename}";
    }

    public static function saveHomepageImage(array $file): string
    {
        self::validate($file);

        $dir = __DIR__ . '/../uploads/homepage/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $ext      = self::ext($file['type']);
        $filename = bin2hex(random_bytes(16)) . ".{$ext}";
        $dest     = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('Failed to move uploaded file');
        }

        return "uploads/homepage/{$filename}";
    }

    private static function validate(array $file): void
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new InvalidArgumentException('Upload error code: ' . $file['error']);
        }
        if ($file['size'] > self::MAX_SIZE) {
            throw new InvalidArgumentException('File too large. Max 5 MB.');
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime  = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if (!in_array($mime, self::ALLOWED_MIME, true)) {
            throw new InvalidArgumentException('Invalid file type. Allowed: JPEG, PNG, WebP, GIF.');
        }
    }

    private static function resize(string $src, string $dir, string $filename): void
    {
        if (!extension_loaded('gd')) return;

        $sizes = ['thumb' => 200, 'medium' => 600, 'large' => 1200];
        [$origW, $origH, $type] = getimagesize($src);

        $srcImg = match ($type) {
            IMAGETYPE_JPEG => imagecreatefromjpeg($src),
            IMAGETYPE_PNG  => imagecreatefrompng($src),
            IMAGETYPE_WEBP => imagecreatefromwebp($src),
            default        => null,
        };
        if (!$srcImg) return;

        foreach ($sizes as $label => $maxW) {
            if ($origW <= $maxW) continue;
            $ratio  = $maxW / $origW;
            $newW   = $maxW;
            $newH   = (int) round($origH * $ratio);
            $dest   = imagecreatetruecolor($newW, $newH);
            imagecopyresampled($dest, $srcImg, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            $name   = pathinfo($filename, PATHINFO_FILENAME) . "_{$label}." . pathinfo($filename, PATHINFO_EXTENSION);
            match ($type) {
                IMAGETYPE_JPEG => imagejpeg($dest, $dir . $name, 85),
                IMAGETYPE_PNG  => imagepng($dest, $dir . $name),
                IMAGETYPE_WEBP => imagewebp($dest, $dir . $name, 85),
                default        => null,
            };
            imagedestroy($dest);
        }
        imagedestroy($srcImg);
    }

    private static function ext(string $mime): string
    {
        return match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
            default      => 'jpg',
        };
    }
}
