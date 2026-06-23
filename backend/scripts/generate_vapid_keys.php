<?php
/**
 * One-time VAPID keypair generator.
 *
 * Web Push servers require the publisher to sign a JWT with an ES256 key
 * (P-256 elliptic curve). The PUBLIC key gets handed to the browser when it
 * subscribes; the PRIVATE key signs every push.
 *
 * Run once:
 *   php backend/scripts/generate_vapid_keys.php
 *
 * Copy the printed lines into backend/.env. Don't lose them — re-generating
 * invalidates every existing browser subscription.
 */
declare(strict_types=1);

if (!extension_loaded('openssl')) {
    fwrite(STDERR, "openssl extension required\n");
    exit(1);
}

// Windows PHP needs an explicit openssl.cnf — XAMPP ships one in php/extras.
$confCandidates = [
    'C:/xampp/php/extras/openssl/openssl.cnf',
    'C:/xampp/php/extras/ssl/openssl.cnf',
    'C:/xampp/apache/conf/openssl.cnf',
];
$conf = ['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC];
foreach ($confCandidates as $c) {
    if (is_file($c)) { $conf['config'] = $c; break; }
}

$res = openssl_pkey_new($conf);
if (!$res) {
    fwrite(STDERR, "Failed to generate EC key: " . openssl_error_string() . "\n");
    exit(1);
}

openssl_pkey_export($res, $privatePem);
$details = openssl_pkey_get_details($res);

// Public key in uncompressed form (0x04 || X || Y) — base64url encoded.
$x = str_pad($details['ec']['x'] ?? '', 32, "\0", STR_PAD_LEFT);
$y = str_pad($details['ec']['y'] ?? '', 32, "\0", STR_PAD_LEFT);
$publicRaw = "\x04" . $x . $y;
$publicB64 = rtrim(strtr(base64_encode($publicRaw), '+/', '-_'), '=');

// Private key as 32-byte raw scalar, base64url. Some libs read the PEM directly
// but base64url is friendlier inside .env.
$privateRaw = str_pad($details['ec']['d'] ?? '', 32, "\0", STR_PAD_LEFT);
$privateB64 = rtrim(strtr(base64_encode($privateRaw), '+/', '-_'), '=');

echo "\n";
echo "Copy these into backend/.env:\n";
echo "\n";
echo "VAPID_PUBLIC_KEY={$publicB64}\n";
echo "VAPID_PRIVATE_KEY={$privateB64}\n";
echo "VAPID_SUBJECT=mailto:you@yourdomain.com\n";
echo "\n";
echo "Done. The public key goes to browsers; the private key stays here.\n";
