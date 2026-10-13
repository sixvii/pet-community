<?php

declare(strict_types=1);

use Dotenv\Dotenv;
use Pawly\Infrastructure\CloudinaryStorage;
use Pawly\Infrastructure\MongoClientFactory;

require dirname(__DIR__) . '/vendor/autoload.php';

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

/**
 * @param array<string, mixed> $payload
 */
function finishGooglePopup(array $payload): never
{
    $targetOrigin = rtrim($_ENV['APP_ORIGIN'] ?? 'http://localhost:5173', '/');
    $message = json_encode(
        $payload,
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR,
    );
    $origin = json_encode(
        $targetOrigin,
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR,
    );
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><title>Google sign-in</title>'
        . '<script>if(window.opener){window.opener.postMessage(' . $message . ',' . $origin . ')}window.close()</script>';
    exit;
}

function startAuthSession(): void
{
    $sameSite = $_ENV['SESSION_SAME_SITE'] ?? 'Lax';
    if (!in_array($sameSite, ['Lax', 'Strict', 'None'], true)) {
        throw new RuntimeException('SESSION_SAME_SITE must be Lax, Strict, or None.');
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    $isHttps = ($_ENV['APP_ENV'] ?? 'local') === 'production'
        || (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || $sameSite === 'None';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps || $sameSite === 'None',
        'httponly' => true,
        'samesite' => $sameSite,
    ]);
    if (!session_start()) {
        throw new RuntimeException('Unable to start authentication session.');
    }
}

/**
 * @return array<string, mixed>
 */
function readJsonRequestBody(): array
{
    try {
        $body = json_decode(file_get_contents('php://input') ?: '', true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new InvalidArgumentException('Request body must be valid JSON.');
    }
    if (!is_array($body)) {
        throw new InvalidArgumentException('Request body must be a JSON object.');
    }

    return $body;
}

function requestHasAllowedOrigin(string $allowedOrigin): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return false;
    }
    if (hash_equals(rtrim($allowedOrigin, '/'), rtrim($origin, '/'))) {
        return true;
    }
    if (($_ENV['APP_ENV'] ?? '') !== 'local') {
        return false;
    }

    $allowed = parse_url($allowedOrigin);
    $request = parse_url($origin);
    if (!is_array($allowed) || !is_array($request)) {
        return false;
    }
    $localHosts = ['localhost', '127.0.0.1', '[::1]'];
    $allowedHost = strtolower($allowed['host'] ?? '');
    $requestHost = strtolower($request['host'] ?? '');

    return in_array($allowedHost, $localHosts, true) &&
        in_array($requestHost, $localHosts, true) &&
        strtolower($allowed['scheme'] ?? '') === strtolower($request['scheme'] ?? '') &&
        !isset($allowed['path']) &&
        !isset($allowed['query']) &&
        !isset($allowed['fragment']) &&
        !isset($allowed['user']) &&
        !isset($allowed['pass']) &&
        !isset($request['path']) &&
        !isset($request['query']) &&
        !isset($request['fragment']) &&
        !isset($request['user']) &&
        !isset($request['pass']);
}

/**
 * @return array{client_id: string, client_secret: string, redirect_uri: string}
 */
function googleOAuthConfig(): array
{
    $clientId = trim($_ENV['GOOGLE_CLIENT_ID'] ?? '');
    $clientSecret = trim($_ENV['GOOGLE_CLIENT_SECRET'] ?? '');
    $redirectUri = trim($_ENV['GOOGLE_REDIRECT_URI'] ?? '');
    if ($clientId === '' || $clientSecret === '' || $redirectUri === '') {
        throw new RuntimeException('Google OAuth is not configured.');
    }

    return [
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => $redirectUri,
    ];
}

/**
 * @param array<string, string> $headers
 * @param array<string, string>|null $form
 * @return array<string, mixed>
 */
function requestGoogleJson(string $url, string $method = 'GET', array $headers = [], ?array $form = null): array
{
    if ($form !== null) {
        $headers[] = 'Content-Type: application/x-www-form-urlencoded';
    }

    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ];
    if ($form !== null) {
        $options['http']['content'] = http_build_query($form);
    }

    $response = @file_get_contents($url, false, stream_context_create($options));
    $statusLine = $http_response_header[0] ?? '';
    if ($response === false || !preg_match('/\s2\d{2}\s/', $statusLine)) {
        throw new RuntimeException('Google OAuth request failed.');
    }

    $decoded = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($decoded)) {
        throw new RuntimeException('Google returned an invalid response.');
    }

    return $decoded;
}

$allowedOrigin = $_ENV['APP_ORIGIN'] ?? 'http://localhost:5173';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$corsOrigin = requestHasAllowedOrigin($allowedOrigin) ? $requestOrigin : $allowedOrigin;
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (str_starts_with($path, '/api/admin/')) {
    Pawly\Infrastructure\AdminDashboard::handle($path, $method, $allowedOrigin);
    exit;
}

$authRoutes = [
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/auth/register',
    '/api/auth/signin',
    '/api/auth/profile-picture',
];
if (in_array($path, $authRoutes, true)) {
    header('Cache-Control: no-store');
    try {
        if (in_array($path, ['/api/auth/register', '/api/auth/signin'], true) && $method === 'POST') {
            if (!requestHasAllowedOrigin($allowedOrigin)) {
                http_response_code(403);
                echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
                exit;
            }

            try {
                $request = readJsonRequestBody();
            } catch (InvalidArgumentException $error) {
                http_response_code(400);
                echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
                exit;
            }

            $email = $request['email'] ?? null;
            $password = $request['password'] ?? null;
            if (!is_string($email) || !is_string($password)) {
                http_response_code(422);
                echo json_encode(['error' => 'Email and password are required.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $email = strtolower(trim($email));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
                http_response_code(422);
                echo json_encode(['error' => 'Enter a valid email address.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if (strlen($password) < 8 || strlen($password) > 4096) {
                http_response_code(422);
                echo json_encode(['error' => 'Password must be at least 8 characters.'], JSON_THROW_ON_ERROR);
                exit;
            }

            $client = MongoClientFactory::create();
            $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
            $users = $client->selectCollection($database, $_ENV['USERS_COLLECTION'] ?? 'users');
            $users->createIndex(
                ['email' => 1],
                [
                    'unique' => true,
                    'partialFilterExpression' => ['email' => ['$type' => 'string']],
                ],
            );

            if ($path === '/api/auth/register') {
                $firstName = $request['firstName'] ?? null;
                $lastName = $request['lastName'] ?? null;
                $role = $request['role'] ?? 'owner';
                if (
                    !is_string($firstName) ||
                    !is_string($lastName) ||
                    trim($firstName) === '' ||
                    trim($lastName) === '' ||
                    strlen($firstName) > 100 ||
                    strlen($lastName) > 100
                ) {
                    http_response_code(422);
                    echo json_encode(['error' => 'First and last name are required.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                if (!in_array($role, ['owner', 'provider'], true)) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Choose a valid account type.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                $careType = $request['careType'] ?? '';
                if (
                    !is_string($careType) ||
                    strlen(trim($careType)) > 120 ||
                    ($role === 'provider' && trim($careType) === '')
                ) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Enter the type of care you provide.'], JSON_THROW_ON_ERROR);
                    exit;
                }

                if ($users->findOne(['email' => $email]) !== null) {
                    http_response_code(409);
                    echo json_encode(['error' => 'An account with this email already exists.'], JSON_THROW_ON_ERROR);
                    exit;
                }

                $gender = $request['gender'] ?? '';
                $phone = $request['phone'] ?? '';
                $allowedGenders = ['', 'Woman', 'Man', 'Non-binary', 'Prefer not to say'];
                if (
                    !is_string($gender) ||
                    !in_array($gender, $allowedGenders, true) ||
                    !is_string($phone) ||
                    strlen($phone) > 40
                ) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Check the optional profile fields and try again.'], JSON_THROW_ON_ERROR);
                    exit;
                }

                $countryCode = null;
                if ($role === 'provider') {
                    $countryCode = $request['countryCode'] ?? null;
                    $supportedCountryCodes = ['US', 'GB', 'AU', 'CA', 'DE', 'NG'];
                    if (!is_string($countryCode) || !in_array($countryCode, $supportedCountryCodes, true)) {
                        http_response_code(422);
                        echo json_encode(['error' => 'Choose a valid country for your provider profile.'], JSON_THROW_ON_ERROR);
                        exit;
                    }
                }

                $now = new MongoDB\BSON\UTCDateTime();
                $name = trim($firstName) . ' ' . trim($lastName);
                $insert = [
                    'email' => $email,
                    'name' => $name,
                    'picture' => null,
                    'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
                    'role' => $role,
                    'careType' => trim($careType),
                    'countryCode' => $countryCode,
                    'gender' => $gender,
                    'phone' => trim($phone),
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $inserted = $users->insertOne($insert);
                if ($role === 'provider') {
                    try {
                        $providers = $client->selectCollection(
                            $database,
                            $_ENV['PROVIDERS_COLLECTION'] ?? 'providers',
                        );
                        $providers->insertOne([
                            'userId' => (string) $inserted->getInsertedId(),
                            'email' => $email,
                            'name' => $name,
                            'type' => trim($careType),
                            'category' => trim($careType),
                            'location' => 'Location not provided',
                            'countryCode' => $countryCode,
                            'image' => '/icon-192.svg',
                            'rating' => 'New',
                            'price' => 'Contact for pricing',
                            'verified' => false,
                            'status' => 'pending',
                            'createdAt' => $now,
                            'updatedAt' => $now,
                        ]);
                    } catch (Throwable $error) {
                        $users->deleteOne(['_id' => $inserted->getInsertedId()]);
                        throw $error;
                    }
                }
                $user = [
                    'id' => (string) $inserted->getInsertedId(),
                    'email' => $email,
                    'name' => $name,
                    'picture' => null,
                    'role' => $role,
                    'careType' => trim($careType),
                ];
            } else {
                $account = $users->findOne(['email' => $email]);
                if ($account !== null && ($account['status'] ?? 'active') === 'suspended') {
                    http_response_code(403);
                    echo json_encode(['error' => 'This account is suspended. Contact Pawly support.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                $passwordHash = $account['passwordHash'] ?? null;
                if (!is_string($passwordHash) || !password_verify($password, $passwordHash)) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Email or password is incorrect.'], JSON_THROW_ON_ERROR);
                    exit;
                }

                $storedRole = $account['role'] ?? 'owner';
                $role = in_array($storedRole, ['owner', 'provider', 'admin'], true) ? $storedRole : 'owner';
                $name = $account['name'] ?? $email;
                $picture = $account['picture'] ?? null;
                $user = [
                    'id' => (string) $account['_id'],
                    'email' => $email,
                    'name' => is_string($name) ? $name : $email,
                    'picture' => is_string($picture) ? $picture : null,
                    'role' => $role,
                    'careType' => is_string($account['careType'] ?? null) ? $account['careType'] : '',
                ];
            }

            startAuthSession();
            if (!session_regenerate_id(true)) {
                throw new RuntimeException('Unable to secure the sign-in session.');
            }
            $_SESSION['user'] = $user;
            http_response_code($path === '/api/auth/register' ? 201 : 200);
            echo json_encode(['user' => $user], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($path === '/api/auth/profile-picture' && $method === 'POST') {
            if (!requestHasAllowedOrigin($allowedOrigin)) {
                http_response_code(403);
                echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
                exit;
            }

            startAuthSession();
            $sessionUser = $_SESSION['user'] ?? null;
            if (
                !is_array($sessionUser) ||
                !isset($sessionUser['id']) ||
                !is_string($sessionUser['id']) ||
                preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
            ) {
                http_response_code(401);
                echo json_encode(['error' => 'Sign in to update your profile picture.'], JSON_THROW_ON_ERROR);
                exit;
            }

            $file = $_FILES['picture'] ?? null;
            if (!is_array($file) || !isset($file['error']) || !is_int($file['error'])) {
                http_response_code(422);
                echo json_encode(['error' => 'Choose an image for your profile picture.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $message = $file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE
                    ? 'Choose an image smaller than 2 MB.'
                    : 'The profile picture upload failed. Please try again.';
                http_response_code(422);
                echo json_encode(['error' => $message], JSON_THROW_ON_ERROR);
                exit;
            }

            $temporaryPath = $file['tmp_name'] ?? null;
            $fileSize = is_string($temporaryPath) ? filesize($temporaryPath) : false;
            if (
                !is_string($temporaryPath) ||
                !is_uploaded_file($temporaryPath) ||
                $fileSize === false ||
                $fileSize < 1 ||
                $fileSize > 2 * 1024 * 1024
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'Choose a valid image smaller than 2 MB.'], JSON_THROW_ON_ERROR);
                exit;
            }

            $imageInfo = getimagesize($temporaryPath);
            $mimeType = is_array($imageInfo) ? ($imageInfo['mime'] ?? '') : '';
            if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
                http_response_code(422);
                echo json_encode(['error' => 'Use a JPEG, PNG, WebP, or GIF image.'], JSON_THROW_ON_ERROR);
                exit;
            }

            $uploadedImage = (new CloudinaryStorage())->upload($temporaryPath, 'pawly/profile-pictures');
            $client = MongoClientFactory::create();
            $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
            $users = $client->selectCollection($database, $_ENV['USERS_COLLECTION'] ?? 'users');
            $updated = $users->updateOne(
                ['_id' => new \MongoDB\BSON\ObjectId($sessionUser['id'])],
                [
                    '$set' => [
                        'picture' => $uploadedImage['secureUrl'],
                        'pictureSource' => 'user',
                        'updatedAt' => new MongoDB\BSON\UTCDateTime(),
                    ],
                ],
            );
            if ($updated->getMatchedCount() !== 1) {
                http_response_code(404);
                echo json_encode(['error' => 'Account not found.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if (($_SESSION['user']['role'] ?? '') === 'provider') {
                $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers')
                    ->updateOne(
                        ['userId' => $sessionUser['id']],
                        ['$set' => ['image' => $uploadedImage['secureUrl'], 'updatedAt' => new MongoDB\BSON\UTCDateTime()]],
                    );
            }

            $email = $_SESSION['user']['email'] ?? null;
            if (is_string($email)) {
                $handle = strtolower(explode('@', $email, 2)[0]);
                $posts = $client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts');
                $posts->updateMany(
                    [
                        '$or' => [
                            ['userId' => $sessionUser['id']],
                            [
                                'userId' => ['$exists' => false],
                                'handle' => $handle,
                            ],
                        ],
                    ],
                    ['$set' => ['avatar' => $uploadedImage['secureUrl']]],
                );
            }

            $_SESSION['user']['picture'] = $uploadedImage['secureUrl'];
            echo json_encode(['user' => $_SESSION['user']], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($path === '/api/auth/google' && $method === 'GET') {
            startAuthSession();
            $config = googleOAuthConfig();
            $state = bin2hex(random_bytes(32));
            $_SESSION['google_oauth_state'] = $state;

            $authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
                'client_id' => $config['client_id'],
                'redirect_uri' => $config['redirect_uri'],
                'response_type' => 'code',
                'scope' => 'openid email profile',
                'state' => $state,
                'prompt' => 'select_account',
            ]);
            header('Location: ' . $authorizationUrl, true, 302);
            exit;
        }

        if ($path === '/api/auth/google/callback' && $method === 'GET') {
            startAuthSession();
            $config = googleOAuthConfig();
            $returnedState = $_GET['state'] ?? '';
            $expectedState = $_SESSION['google_oauth_state'] ?? '';
            unset($_SESSION['google_oauth_state']);

            if (
                !is_string($returnedState) ||
                !is_string($expectedState) ||
                $expectedState === '' ||
                !hash_equals($expectedState, $returnedState)
            ) {
                finishGooglePopup([
                    'type' => 'pawly-google-auth',
                    'success' => false,
                    'error' => 'Google sign-in could not be verified. Please try again.',
                ]);
            }
            if (isset($_GET['error']) || !isset($_GET['code']) || !is_string($_GET['code'])) {
                finishGooglePopup([
                    'type' => 'pawly-google-auth',
                    'success' => false,
                    'error' => 'Google sign-in was cancelled or failed.',
                ]);
            }

            $tokenResponse = requestGoogleJson(
                'https://oauth2.googleapis.com/token',
                'POST',
                [],
                [
                    'code' => $_GET['code'],
                    'client_id' => $config['client_id'],
                    'client_secret' => $config['client_secret'],
                    'redirect_uri' => $config['redirect_uri'],
                    'grant_type' => 'authorization_code',
                ],
            );
            $accessToken = $tokenResponse['access_token'] ?? null;
            if (!is_string($accessToken) || $accessToken === '') {
                throw new RuntimeException('Google did not return an access token.');
            }

            $googleUser = requestGoogleJson(
                'https://openidconnect.googleapis.com/v1/userinfo',
                'GET',
                ['Authorization: Bearer ' . $accessToken],
            );
            $googleSub = $googleUser['sub'] ?? null;
            $email = $googleUser['email'] ?? null;
            $emailVerified = $googleUser['email_verified'] ?? false;
            if (is_string($email)) {
                $email = strtolower(trim($email));
            }
            if (
                !is_string($googleSub) ||
                $googleSub === '' ||
                !is_string($email) ||
                !filter_var($email, FILTER_VALIDATE_EMAIL) ||
                $emailVerified !== true
            ) {
                throw new RuntimeException('Google account does not have a verified email address.');
            }

            $name = $googleUser['name'] ?? $email;
            $picture = $googleUser['picture'] ?? null;
            if (!is_string($name) || $name === '') {
                $name = $email;
            }
            if (
                !is_string($picture) ||
                filter_var($picture, FILTER_VALIDATE_URL) === false ||
                parse_url($picture, PHP_URL_SCHEME) !== 'https'
            ) {
                $picture = null;
            }

            $client = MongoClientFactory::create();
            $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
            $usersCollection = $_ENV['USERS_COLLECTION'] ?? 'users';
            $users = $client->selectCollection($database, $usersCollection);
            $users->createIndex(['googleSub' => 1], ['unique' => true]);
            $users->createIndex(
                ['email' => 1],
                [
                    'unique' => true,
                    'partialFilterExpression' => ['email' => ['$type' => 'string']],
                ],
            );
            $existingUser = $users->findOne(
                ['$or' => [['googleSub' => $googleSub], ['email' => $email]]],
                ['projection' => ['picture' => 1, 'pictureSource' => 1, 'status' => 1]],
            );
            if ($existingUser !== null && ($existingUser['status'] ?? 'active') === 'suspended') {
                http_response_code(403);
                echo json_encode(['error' => 'This account is suspended. Contact Pawly support.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if (
                $existingUser !== null &&
                ($existingUser['pictureSource'] ?? null) === 'user' &&
                is_string($existingUser['picture'] ?? null)
            ) {
                $picture = $existingUser['picture'];
            }
            $now = new MongoDB\BSON\UTCDateTime();
            $users->updateOne(
                ['$or' => [['googleSub' => $googleSub], ['email' => $email]]],
                [
                    '$set' => [
                        'googleSub' => $googleSub,
                        'email' => $email,
                        'name' => $name,
                        'picture' => $picture,
                        'updatedAt' => $now,
                    ],
                    '$setOnInsert' => [
                        'role' => 'owner',
                        'createdAt' => $now,
                    ],
                ],
                ['upsert' => true],
            );
            $userDocument = $users->findOne(['googleSub' => $googleSub]);
            if ($userDocument === null) {
                throw new RuntimeException('Unable to load the signed-in user.');
            }
            $storedRole = $userDocument['role'] ?? 'owner';
            $role = in_array($storedRole, ['owner', 'provider', 'admin'], true) ? $storedRole : 'owner';
            $user = [
                'id' => (string) $userDocument['_id'],
                'email' => $email,
                'name' => $name,
                'picture' => $picture,
                'role' => $role,
                'careType' => is_string($userDocument['careType'] ?? null) ? $userDocument['careType'] : '',
            ];

            if (!session_regenerate_id(true)) {
                throw new RuntimeException('Unable to secure the sign-in session.');
            }
            $_SESSION['user'] = $user;
            finishGooglePopup([
                'type' => 'pawly-google-auth',
                'success' => true,
                'user' => $user,
            ]);
        }

        if ($path === '/api/auth/me' && $method === 'GET') {
            startAuthSession();
            $user = $_SESSION['user'] ?? null;
            if (!is_array($user)) {
                http_response_code(200);
                echo json_encode(['user' => null], JSON_THROW_ON_ERROR);
                exit;
            }
            if (preg_match('/\A[0-9a-f]{24}\z/i', (string) ($user['id'] ?? ''))) {
                $client = MongoClientFactory::create();
                $account = $client
                    ->selectCollection($_ENV['MONGODB_DATABASE'] ?? 'pawly', $_ENV['USERS_COLLECTION'] ?? 'users')
                    ->findOne(['_id' => new MongoDB\BSON\ObjectId($user['id'])], ['projection' => ['status' => 1]]);
                if ($account !== null && ($account['status'] ?? 'active') === 'suspended') {
                    $_SESSION = [];
                    http_response_code(200);
                    echo json_encode(['user' => null], JSON_THROW_ON_ERROR);
                    exit;
                }
            }

            http_response_code(200);
            echo json_encode(['user' => $user], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($path === '/api/auth/logout' && $method === 'POST') {
            if (!requestHasAllowedOrigin($allowedOrigin)) {
                http_response_code(403);
                echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
                exit;
            }

            startAuthSession();
            $_SESSION = [];
            $cookie = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $cookie['path'],
                'domain' => $cookie['domain'],
                'secure' => $cookie['secure'],
                'httponly' => $cookie['httponly'],
                'samesite' => $cookie['samesite'],
            ]);
            session_destroy();
            http_response_code(204);
            exit;
        }

        if (
            in_array(
                $path,
                ['/api/auth/register', '/api/auth/signin', '/api/auth/logout', '/api/auth/profile-picture'],
                true,
            )
            && $method !== 'POST'
        ) {
            http_response_code(405);
            header('Allow: POST');
            echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
            exit;
        }
        http_response_code(405);
        header('Allow: ' . (in_array($path, ['/api/auth/logout', '/api/auth/profile-picture'], true) ? 'POST' : 'GET'));
        echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Authentication request failed: ' . $error->getMessage());
        if (in_array($path, ['/api/auth/google', '/api/auth/google/callback'], true)) {
            finishGooglePopup([
                'type' => 'pawly-google-auth',
                'success' => false,
                'error' => 'Google sign-in is unavailable. Check the server configuration and try again.',
            ]);
        }
        http_response_code(503);
        echo json_encode(['error' => 'Authentication service is unavailable'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if ($path === '/api/pets' && in_array($method, ['GET', 'POST'], true)) {
    header('Cache-Control: no-store');

    if ($method === 'POST' && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !isset($sessionUser['id']) ||
            !is_string($sessionUser['id']) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to access your pets.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $collection = $client->selectCollection($database, $_ENV['PETS_COLLECTION'] ?? 'pets');
        $collection->createIndex(['userId' => 1, 'createdAt' => -1]);

        if ($method === 'GET') {
            $documents = $collection->find(
                ['userId' => $sessionUser['id']],
                ['sort' => ['createdAt' => -1]],
            );
            $pets = [];
            foreach ($documents as $document) {
                $pet = $document;
                $pet['id'] = (string) $pet['_id'];
                unset($pet['_id'], $pet['userId']);
                $pets[] = $pet;
            }

            http_response_code(200);
            echo json_encode($pets, JSON_THROW_ON_ERROR);
            exit;
        }

        $name = $_POST['name'] ?? null;
        $breed = $_POST['breed'] ?? null;
        if (
            !is_string($name) ||
            trim($name) === '' ||
            strlen($name) > 100 ||
            !is_string($breed) ||
            trim($breed) === '' ||
            strlen($breed) > 100
        ) {
            http_response_code(422);
            echo json_encode(['error' => 'Enter a valid pet name and breed.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $imageUrl = '';
        if (isset($_FILES['petPhoto']) && is_array($_FILES['petPhoto'])) {
            $photo = $_FILES['petPhoto'];
            $uploadError = $photo['error'] ?? UPLOAD_ERR_NO_FILE;
            if (!is_int($uploadError) || !in_array($uploadError, [UPLOAD_ERR_OK, UPLOAD_ERR_NO_FILE], true)) {
                http_response_code(422);
                echo json_encode(['error' => 'Unable to upload this pet photo.'], JSON_THROW_ON_ERROR);
                exit;
            }

            if ($uploadError === UPLOAD_ERR_OK) {
                $temporaryPath = $photo['tmp_name'] ?? null;
                if (
                    !is_string($temporaryPath) ||
                    !is_uploaded_file($temporaryPath) ||
                    !isset($photo['size']) ||
                    !is_int($photo['size']) ||
                    $photo['size'] < 1 ||
                    $photo['size'] > 2 * 1024 * 1024
                ) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Pet photos must be smaller than 2 MB.'], JSON_THROW_ON_ERROR);
                    exit;
                }

                $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath);
                if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Use a JPEG, PNG, WebP, or GIF pet photo.'], JSON_THROW_ON_ERROR);
                    exit;
                }

                $uploaded = (new CloudinaryStorage())->upload(
                    $temporaryPath,
                    'pawly/pets/' . $sessionUser['id'],
                );
                $imageUrl = $uploaded['secureUrl'];
            }
        }

        $pet = [
            'userId' => $sessionUser['id'],
            'name' => trim($name),
            'breed' => trim($breed),
            'age' => 'New pet',
            'image' => $imageUrl,
            'createdAt' => new MongoDB\BSON\UTCDateTime(),
        ];
        $inserted = $collection->insertOne($pet);
        unset($pet['userId'], $pet['createdAt']);
        $pet['id'] = (string) $inserted->getInsertedId();

        http_response_code(201);
        echo json_encode($pet, JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Private pet request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to access your pets right now. Please try again.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if (
    preg_match('#\A/api/pets/([0-9a-f]{24})/medical-records(?:/([0-9a-f]{24}))?\z#i', $path, $medicalMatch) === 1 &&
    in_array($method, ['GET', 'POST', 'DELETE'], true)
) {
    header('Cache-Control: no-store');
    if (in_array($method, ['POST', 'DELETE'], true) && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (!is_array($sessionUser) || !is_string($sessionUser['id'] ?? null)) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to access pet medical records.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $petId = strtolower($medicalMatch[1]);
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $pets = $client->selectCollection($database, $_ENV['PETS_COLLECTION'] ?? 'pets');
        $pet = $pets->findOne([
            '_id' => new MongoDB\BSON\ObjectId($petId),
            'userId' => $sessionUser['id'],
        ]);
        if ($pet === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Pet not found.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $records = $client->selectCollection(
            $database,
            $_ENV['MEDICAL_RECORDS_COLLECTION'] ?? 'medical_records',
        );
        $records->createIndex(['userId' => 1, 'petId' => 1, 'createdAt' => -1]);
        if ($method === 'GET') {
            $result = [];
            foreach ($records->find(
                ['userId' => $sessionUser['id'], 'petId' => $petId],
                ['sort' => ['date' => -1], 'limit' => 500],
            ) as $record) {
                $result[] = [
                    'id' => (string) $record['_id'],
                    'type' => $record['type'],
                    'title' => $record['title'],
                    'date' => $record['date'],
                    'dueDate' => $record['dueDate'] ?? null,
                    'notes' => $record['notes'] ?? '',
                    'createdAt' => ($record['createdAt'] ?? null) instanceof MongoDB\BSON\UTCDateTime
                        ? $record['createdAt']->toDateTime()->format(DATE_ATOM)
                        : '',
                ];
            }
            echo json_encode(['records' => $result], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($method === 'DELETE') {
            $recordId = $medicalMatch[2] ?? '';
            if ($recordId === '') {
                http_response_code(404);
                echo json_encode(['error' => 'Medical record not found.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $deleted = $records->deleteOne([
                '_id' => new MongoDB\BSON\ObjectId(strtolower($recordId)),
                'userId' => $sessionUser['id'],
                'petId' => $petId,
            ]);
            if ($deleted->getDeletedCount() !== 1) {
                http_response_code(404);
                echo json_encode(['error' => 'Medical record not found.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $client->selectCollection($database, $_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data')->updateOne(
                ['userId' => $sessionUser['id']],
                ['$pull' => ['data.notifications' => [
                    'id' => ['$regex' => '^medical-reminder-' . strtolower($recordId) . '-'],
                ]]],
            );
            echo json_encode(['deleted' => true], JSON_THROW_ON_ERROR);
            exit;
        }

        try {
            $request = readJsonRequestBody();
        } catch (InvalidArgumentException $error) {
            http_response_code(400);
            echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
            exit;
        }
        $type = $request['type'] ?? null;
        $title = $request['title'] ?? null;
        $date = $request['date'] ?? null;
        $dueDate = $request['dueDate'] ?? null;
        $notes = $request['notes'] ?? '';
        $validDate = static function (mixed $value): bool {
            if (!is_string($value) || preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $value) !== 1) {
                return false;
            }
            $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            $errors = DateTimeImmutable::getLastErrors();
            return $parsed !== false &&
                ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0)) &&
                $parsed->format('Y-m-d') === $value;
        };
        if (
            !is_string($type) ||
            !in_array($type, ['vaccination', 'medication', 'allergy', 'visit'], true) ||
            !is_string($title) ||
            trim($title) === '' ||
            strlen($title) > 120 ||
            !$validDate($date) ||
            ($dueDate !== null && $dueDate !== '' && !$validDate($dueDate)) ||
            !is_string($notes) ||
            strlen($notes) > 2000
        ) {
            http_response_code(422);
            echo json_encode(['error' => 'Enter a valid medical record type, title, date, and notes.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $createdAt = new MongoDB\BSON\UTCDateTime();
        $record = [
            'userId' => $sessionUser['id'],
            'petId' => $petId,
            'type' => $type,
            'title' => trim($title),
            'date' => $date,
            'dueDate' => is_string($dueDate) && $dueDate !== '' ? $dueDate : null,
            'notes' => trim($notes),
            'createdAt' => $createdAt,
        ];
        $inserted = $records->insertOne($record);
        echo json_encode([
            'record' => [
                'id' => (string) $inserted->getInsertedId(),
                'type' => $type,
                'title' => trim($title),
                'date' => $date,
                'dueDate' => $record['dueDate'],
                'notes' => trim($notes),
                'createdAt' => $createdAt->toDateTime()->format(DATE_ATOM),
            ],
        ], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Pet medical record request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to access pet medical records right now.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if (
    $path === '/api/appointments' ||
    preg_match('#\A/api/appointments/([0-9a-f]{24})\z#i', $path, $appointmentMatch) === 1
) {
    header('Cache-Control: no-store');
    if (in_array($method, ['POST', 'PATCH'], true) && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }
    if (
        ($path === '/api/appointments' && !in_array($method, ['GET', 'POST'], true)) ||
        ($path !== '/api/appointments' && $method !== 'PATCH')
    ) {
        http_response_code(405);
        header('Allow: GET, POST, PATCH');
        echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (!is_array($sessionUser) || !is_string($sessionUser['id'] ?? null)) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to access appointments.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $appointments = $client->selectCollection($database, $_ENV['APPOINTMENTS_COLLECTION'] ?? 'appointments');
        $appointments->createIndex(['ownerId' => 1, 'scheduledAt' => 1]);
        $appointments->createIndex(['providerUserId' => 1, 'scheduledAt' => 1]);
        $appointments->createIndex(['appointment.id' => 1], ['unique' => true]);
        $accountData = $client->selectCollection($database, $_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data');
        $parseSchedule = static function (mixed $value): ?DateTimeImmutable {
            if (
                !is_string($value) ||
                preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\z/', $value) !== 1
            ) {
                return null;
            }
            try {
                return new DateTimeImmutable($value);
            } catch (Throwable) {
                return null;
            }
        };

        if ($method === 'GET') {
            if (($sessionUser['role'] ?? '') === 'owner') {
                $legacyData = $accountData->findOne(
                    ['userId' => $sessionUser['id']],
                    ['projection' => ['data.appointments' => 1]],
                );
                $providerRecords = $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers');
                foreach (($legacyData['data']['appointments'] ?? []) as $legacy) {
                    if (
                        !is_array($legacy) ||
                        !is_string($legacy['id'] ?? null) ||
                        $appointments->findOne(['appointment.id' => $legacy['id']], ['projection' => ['_id' => 1]]) !== null
                    ) {
                        continue;
                    }
                    $providerId = $legacy['providerId'] ?? null;
                    if (!is_string($providerId) || preg_match('/\A[0-9a-f]{24}\z/i', $providerId) !== 1) {
                        continue;
                    }
                    $providerRecord = $providerRecords->findOne([
                        '_id' => new MongoDB\BSON\ObjectId(strtolower($providerId)),
                        'status' => 'active',
                    ]);
                    if (!is_string($providerRecord['userId'] ?? null)) {
                        continue;
                    }
                    $legacy['ownerId'] = $sessionUser['id'];
                    $legacy['ownerName'] = $sessionUser['name'] ?? ($legacy['ownerName'] ?? 'Pawly member');
                    $legacy['ownerAvatar'] = $sessionUser['picture'] ?? ($legacy['ownerAvatar'] ?? '');
                    $appointments->insertOne([
                        'ownerId' => $sessionUser['id'],
                        'providerUserId' => $providerRecord['userId'],
                        'providerId' => strtolower($providerId),
                        'appointment' => $legacy,
                        'scheduledAt' => is_string($legacy['scheduledAt'] ?? null) ? $legacy['scheduledAt'] : null,
                        'createdAt' => new MongoDB\BSON\UTCDateTime(),
                        'updatedAt' => new MongoDB\BSON\UTCDateTime(),
                    ]);
                }
            }

            $documents = $appointments->find(
                ['$or' => [['ownerId' => $sessionUser['id']], ['providerUserId' => $sessionUser['id']]]],
                ['sort' => ['scheduledAt' => 1], 'limit' => 200],
            );
            $result = [];
            foreach ($documents as $document) {
                $appointment = $document['appointment'] ?? [];
                if (!is_array($appointment)) {
                    continue;
                }
                $appointment['id'] = (string) ($document['_id'] ?? '');
                $appointment['ownerId'] = $document['ownerId'] ?? '';
                $result[] = $appointment;
            }
            echo json_encode(['appointments' => $result], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($method === 'POST') {
            if (($sessionUser['role'] ?? '') !== 'owner') {
                http_response_code(403);
                echo json_encode(['error' => 'Only pet owners can book appointments.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $request = readJsonRequestBody();
            $petId = $request['petId'] ?? null;
            $providerId = $request['providerId'] ?? null;
            $scheduledAt = $request['scheduledAt'] ?? null;
            $service = $request['service'] ?? null;
            $professional = $request['professional'] ?? '';
            $duration = $request['duration'] ?? null;
            $price = $request['price'] ?? null;
            if (
                !is_string($petId) || preg_match('/\A[0-9a-f]{24}\z/i', $petId) !== 1 ||
                !is_string($providerId) || preg_match('/\A[0-9a-f]{24}\z/i', $providerId) !== 1 ||
                !is_string($scheduledAt) || strlen($scheduledAt) > 80 ||
                !is_string($service) || trim($service) === '' || strlen($service) > 150 ||
                !is_string($professional) || strlen($professional) > 150 ||
                !is_string($duration) || trim($duration) === '' || strlen($duration) > 40 ||
                !is_numeric($price) || (float) $price < 0 || (float) $price > 100000000
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'Enter valid pet, provider, service, time, duration, and price details.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $scheduled = $parseSchedule($scheduledAt);
            if ($scheduled === null) {
                http_response_code(422);
                echo json_encode(['error' => 'Choose a valid appointment date and time.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if ($scheduled <= new DateTimeImmutable()) {
                http_response_code(422);
                echo json_encode(['error' => 'Appointment time must be in the future.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $pet = $client->selectCollection($database, $_ENV['PETS_COLLECTION'] ?? 'pets')->findOne([
                '_id' => new MongoDB\BSON\ObjectId(strtolower($petId)),
                'userId' => $sessionUser['id'],
            ]);
            $provider = $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers')->findOne([
                '_id' => new MongoDB\BSON\ObjectId(strtolower($providerId)),
                'status' => 'active',
            ]);
            if ($pet === null || $provider === null || !is_string($provider['userId'] ?? null)) {
                http_response_code(404);
                echo json_encode(['error' => 'Pet or provider is no longer available.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if (preg_match('/\A\d{1,3}\b/', trim($duration), $durationMatch) !== 1 || (int) $durationMatch[0] < 1 || (int) $durationMatch[0] > 720) {
                http_response_code(422);
                echo json_encode(['error' => 'Appointment duration must be between 1 and 720 minutes.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $durationSeconds = (int) $durationMatch[0] * 60;
            $availability = $client->selectCollection($database, $_ENV['PROVIDER_AVAILABILITY_COLLECTION'] ?? 'provider_availability');
            $providerId = strtolower($providerId);
            $bookingLocks = $client->selectCollection(
                $database,
                $_ENV['PROVIDER_BOOKING_LOCKS_COLLECTION'] ?? 'provider_booking_locks',
            );
            $appointment = \Pawly\Infrastructure\ProviderBookingLock::synchronized(
                $bookingLocks,
                $providerId,
                static function () use (
                    $availability,
                    $appointments,
                    $durationSeconds,
                    $pet,
                    $petId,
                    $price,
                    $professional,
                    $provider,
                    $providerId,
                    $request,
                    $scheduled,
                    $service,
                    $sessionUser,
                    $duration,
                ): array {
                    $availabilityRecord = $availability->findOne(['providerId' => $providerId]);
                    $slotIsPublished = false;
                    foreach (($availabilityRecord['slots'] ?? []) as $slot) {
                        if (is_string($slot) && (new DateTimeImmutable($slot))->getTimestamp() === $scheduled->getTimestamp()) {
                            $slotIsPublished = true;
                            break;
                        }
                    }
                    if (!$slotIsPublished) {
                        return ['conflict' => 'Choose a time currently published as available by this provider.'];
                    }

                    foreach ($appointments->find([
                        'providerUserId' => $provider['userId'],
                        'appointment.status' => ['$in' => ['PENDING', 'CONFIRMED', 'IN_PROGRESS']],
                    ]) as $existingAppointment) {
                        $existingAt = $existingAppointment['appointment']['scheduledAt'] ?? null;
                        if (!is_string($existingAt)) {
                            continue;
                        }
                        $existingStart = (new DateTimeImmutable($existingAt))->getTimestamp();
                        $existingDuration = $existingAppointment['appointment']['duration'] ?? '30 min';
                        $existingMinutes = preg_match('/\A\d{1,3}\b/', (string) $existingDuration, $existingMatch) === 1
                            ? max(1, min(720, (int) $existingMatch[0]))
                            : 30;
                        if (
                            $scheduled->getTimestamp() < $existingStart + $existingMinutes * 60 &&
                            $existingStart < $scheduled->getTimestamp() + $durationSeconds
                        ) {
                            return ['conflict' => 'That time overlaps an existing appointment. Choose another available slot.'];
                        }
                    }

                    $slotEpoch = $scheduled->getTimestamp();
                    $claimedSlot = $availability->updateOne(
                        [
                            'providerId' => $providerId,
                            'slots' => $scheduled->format(DATE_ATOM),
                            'bookedSlotEpochs' => ['$ne' => $slotEpoch],
                        ],
                        ['$addToSet' => ['bookedSlotEpochs' => $slotEpoch]],
                    );
                    if ($claimedSlot->getMatchedCount() !== 1) {
                        return ['conflict' => 'That time was just booked. Choose another available slot.'];
                    }

                    $now = new MongoDB\BSON\UTCDateTime();
                    $appointment = [
                        'petId' => strtolower($petId),
                        'petName' => $pet['name'] ?? '',
                        'petBreed' => $pet['breed'] ?? '',
                        'ownerName' => $sessionUser['name'] ?? 'Pawly member',
                        'ownerId' => $sessionUser['id'],
                        'ownerAvatar' => $sessionUser['picture'] ?? '',
                        'providerId' => $providerId,
                        'providerName' => $provider['name'] ?? 'Pet care provider',
                        'service' => trim($service),
                        'professional' => trim($professional),
                        'date' => is_string($request['date'] ?? null) ? $request['date'] : $scheduled->format('M j, Y'),
                        'time' => is_string($request['time'] ?? null) ? $request['time'] : $scheduled->format('g:i A'),
                        'scheduledAt' => $scheduled->format(DATE_ATOM),
                        'duration' => trim($duration),
                        'price' => (float) $price,
                        'status' => 'PENDING',
                        'notes' => is_string($request['notes'] ?? null) ? substr(trim($request['notes']), 0, 2000) : '',
                    ];
                    $appointmentObjectId = new MongoDB\BSON\ObjectId();
                    $appointment['id'] = (string) $appointmentObjectId;
                    try {
                        $appointments->insertOne([
                            '_id' => $appointmentObjectId,
                            'ownerId' => $sessionUser['id'],
                            'providerUserId' => $provider['userId'],
                            'providerId' => $providerId,
                            'appointment' => $appointment,
                            'scheduledAt' => $scheduled->format(DATE_ATOM),
                            'createdAt' => $now,
                            'updatedAt' => $now,
                        ]);
                    } catch (Throwable $error) {
                        $availability->updateOne(
                            ['providerId' => $providerId],
                            ['$pull' => ['bookedSlotEpochs' => $slotEpoch]],
                        );
                        throw $error;
                    }

                    return $appointment;
                },
            );
            if (isset($appointment['conflict'])) {
                http_response_code(409);
                echo json_encode(['error' => $appointment['conflict']], JSON_THROW_ON_ERROR);
                exit;
            }
            $accountData->updateOne(
                ['userId' => $provider['userId']],
                ['$push' => ['data.notifications' => [
                    '$each' => [[
                        'id' => 'appointment-request-' . $appointment['id'],
                        'name' => $appointment['ownerName'],
                        'action' => 'requested an appointment',
                        'detail' => $appointment['service'] . ' for ' . $appointment['petName'] . ' · ' . $appointment['date'] . ' at ' . $appointment['time'],
                        'time' => 'Just now',
                        'avatar' => $appointment['ownerAvatar'],
                        'kind' => 'care',
                        'target' => 'appointments',
                        'unread' => true,
                    ]],
                    '$slice' => -500,
                ]]],
                ['upsert' => true],
            );
            http_response_code(201);
            echo json_encode(['appointment' => $appointment], JSON_THROW_ON_ERROR);
            exit;
        }

        $appointmentId = strtolower($appointmentMatch[1]);
        $document = $appointments->findOne([
            '_id' => new MongoDB\BSON\ObjectId($appointmentId),
            '$or' => [['ownerId' => $sessionUser['id']], ['providerUserId' => $sessionUser['id']]],
        ]);
        if ($document === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Appointment not found.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $request = readJsonRequestBody();
        $isOwner = ($document['ownerId'] ?? null) === $sessionUser['id'];
        $currentStatus = $document['appointment']['status'] ?? 'PENDING';
        $update = [];
        $rescheduleAt = null;
        $rescheduleProviderId = null;
        $availability = null;
        if (isset($request['status'])) {
            $status = $request['status'];
            $allowedTransitions = $isOwner
                ? ['CANCELLED' => ['PENDING', 'CONFIRMED']]
                : [
                    'CONFIRMED' => ['PENDING'],
                    'IN_PROGRESS' => ['CONFIRMED'],
                    'COMPLETED' => ['CONFIRMED', 'IN_PROGRESS'],
                    'REJECTED' => ['PENDING'],
                    'NO_SHOW' => ['CONFIRMED', 'IN_PROGRESS'],
                ];
            if (!is_string($status) || !isset($allowedTransitions[$status]) || !in_array($currentStatus, $allowedTransitions[$status], true)) {
                http_response_code(422);
                echo json_encode(['error' => 'That appointment status change is not allowed.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $update['appointment.status'] = $status;
        }
        if (isset($request['scheduledAt']) || isset($request['date']) || isset($request['time'])) {
            if (!$isOwner || $currentStatus !== 'PENDING' && $currentStatus !== 'CONFIRMED') {
                http_response_code(403);
                echo json_encode(['error' => 'Only the pet owner can reschedule an upcoming appointment.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $scheduledAt = $request['scheduledAt'] ?? null;
            if (!is_string($scheduledAt)) {
                http_response_code(422);
                echo json_encode(['error' => 'Choose a valid appointment date and time.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $scheduled = $parseSchedule($scheduledAt);
            if ($scheduled === null) {
                http_response_code(422);
                echo json_encode(['error' => 'Choose a valid appointment date and time.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if ($scheduled <= new DateTimeImmutable()) {
                http_response_code(422);
                echo json_encode(['error' => 'Appointment time must be in the future.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $providerId = $document['providerId'] ?? null;
            if (!is_string($providerId)) {
                http_response_code(409);
                echo json_encode(['error' => 'This appointment is missing its provider availability record.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $rescheduleAt = $scheduled;
            $rescheduleProviderId = $providerId;
            $availability = $client->selectCollection(
                $database,
                $_ENV['PROVIDER_AVAILABILITY_COLLECTION'] ?? 'provider_availability',
            );
            $update['scheduledAt'] = $scheduled->format(DATE_ATOM);
            $update['appointment.scheduledAt'] = $scheduled->format(DATE_ATOM);
            $update['appointment.date'] = is_string($request['date'] ?? null) ? $request['date'] : $scheduled->format('M j, Y');
            $update['appointment.time'] = is_string($request['time'] ?? null) ? $request['time'] : $scheduled->format('g:i A');
        }
        if ($update === []) {
            http_response_code(422);
            echo json_encode(['error' => 'Provide a status update or a new appointment time.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $update['updatedAt'] = new MongoDB\BSON\UTCDateTime();
        $providerId = is_string($rescheduleProviderId)
            ? $rescheduleProviderId
            : ($document['providerId'] ?? null);
        if (!is_string($providerId) || $providerId === '') {
            throw new RuntimeException('Appointment provider record is missing.');
        }
        $bookingLocks = $client->selectCollection(
            $database,
            $_ENV['PROVIDER_BOOKING_LOCKS_COLLECTION'] ?? 'provider_booking_locks',
        );
        $writeResult = \Pawly\Infrastructure\ProviderBookingLock::synchronized(
            $bookingLocks,
            $providerId,
            static function () use (
                $appointments,
                $availability,
                $currentStatus,
                $document,
                $appointmentId,
                $providerId,
                $request,
                $rescheduleAt,
                $update,
            ): array {
                $newSlotEpoch = $rescheduleAt?->getTimestamp();
                $oldScheduledAt = $document['appointment']['scheduledAt'] ?? null;
                $oldSlotEpoch = is_string($oldScheduledAt)
                    ? (new DateTimeImmutable($oldScheduledAt))->getTimestamp()
                    : null;
                $claimedNewSlot = false;
                if ($rescheduleAt !== null) {
                    $availabilityRecord = $availability?->findOne(['providerId' => $providerId]);
                    $slotIsPublished = false;
                    foreach (($availabilityRecord['slots'] ?? []) as $slot) {
                        if (is_string($slot) && (new DateTimeImmutable($slot))->getTimestamp() === $newSlotEpoch) {
                            $slotIsPublished = true;
                            break;
                        }
                    }
                    if (!$slotIsPublished || $availability === null) {
                        return ['conflict' => 'Choose a time currently published as available by this provider.'];
                    }

                    $durationValue = $document['appointment']['duration'] ?? '30 min';
                    $durationMinutes = preg_match('/\A\d{1,3}\b/', (string) $durationValue, $durationMatch) === 1
                        ? max(1, min(720, (int) $durationMatch[0]))
                        : 30;
                    foreach ($appointments->find([
                        'providerUserId' => $document['providerUserId'],
                        '_id' => ['$ne' => new MongoDB\BSON\ObjectId($appointmentId)],
                        'appointment.status' => ['$in' => ['PENDING', 'CONFIRMED', 'IN_PROGRESS']],
                    ]) as $existingAppointment) {
                        $existingAt = $existingAppointment['appointment']['scheduledAt'] ?? null;
                        if (!is_string($existingAt)) {
                            continue;
                        }
                        $existingStart = (new DateTimeImmutable($existingAt))->getTimestamp();
                        $existingDuration = $existingAppointment['appointment']['duration'] ?? '30 min';
                        $existingMinutes = preg_match('/\A\d{1,3}\b/', (string) $existingDuration, $existingMatch) === 1
                            ? max(1, min(720, (int) $existingMatch[0]))
                            : 30;
                        if (
                            $newSlotEpoch < $existingStart + $existingMinutes * 60 &&
                            $existingStart < $newSlotEpoch + $durationMinutes * 60
                        ) {
                            return ['conflict' => 'That time overlaps an existing appointment. Choose another available slot.'];
                        }
                    }

                    if (
                        $newSlotEpoch !== $oldSlotEpoch &&
                        !in_array($request['status'] ?? null, ['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW'], true)
                    ) {
                        $claim = $availability->updateOne(
                            [
                                'providerId' => $providerId,
                                'slots' => $rescheduleAt->format(DATE_ATOM),
                                'bookedSlotEpochs' => ['$ne' => $newSlotEpoch],
                            ],
                            ['$addToSet' => ['bookedSlotEpochs' => $newSlotEpoch]],
                        );
                        if ($claim->getMatchedCount() !== 1) {
                            return ['conflict' => 'That time was just booked. Choose another available slot.'];
                        }
                        $claimedNewSlot = true;
                    }
                }

                try {
                    $result = $appointments->updateOne(
                        [
                            '_id' => new MongoDB\BSON\ObjectId($appointmentId),
                            'appointment.status' => $currentStatus,
                            ...(is_string($oldScheduledAt) ? ['appointment.scheduledAt' => $oldScheduledAt] : []),
                        ],
                        ['$set' => $update],
                    );
                } catch (Throwable $error) {
                    if ($claimedNewSlot) {
                        $availability?->updateOne(
                            ['providerId' => $providerId],
                            ['$pull' => ['bookedSlotEpochs' => $newSlotEpoch]],
                        );
                    }
                    throw $error;
                }
                if ($result->getMatchedCount() !== 1) {
                    if ($claimedNewSlot) {
                        $availability?->updateOne(
                            ['providerId' => $providerId],
                            ['$pull' => ['bookedSlotEpochs' => $newSlotEpoch]],
                        );
                    }

                    return ['conflict' => 'This appointment changed in another request. Refresh and try again.'];
                }

                $releaseOldSlot = ($rescheduleAt !== null && $newSlotEpoch !== $oldSlotEpoch) ||
                    in_array($request['status'] ?? null, ['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW'], true);
                if ($releaseOldSlot && $oldSlotEpoch !== null && $availability !== null) {
                    $availability->updateOne(['providerId' => $providerId], ['$pull' => ['bookedSlotEpochs' => $oldSlotEpoch]]);
                }

                return ['updated' => true];
            },
        );
        if (isset($writeResult['conflict'])) {
            http_response_code(409);
            echo json_encode(['error' => $writeResult['conflict']], JSON_THROW_ON_ERROR);
            exit;
        }
        if (isset($request['status']) || isset($request['scheduledAt'])) {
            $accountData->updateOne(
                ['userId' => $document['ownerId']],
                ['$pull' => ['data.notifications' => [
                    'id' => ['$regex' => '^appointment-reminder-' . $appointmentId . '-'],
                ]]],
            );
        }
        $updatedDocument = $appointments->findOne(['_id' => new MongoDB\BSON\ObjectId($appointmentId)]);
        $updatedAppointment = $updatedDocument['appointment'] ?? [];
        $updatedAppointment['id'] = $appointmentId;
        $updatedAppointment['ownerId'] = $document['ownerId'];
        $recipientId = $isOwner ? ($document['providerUserId'] ?? null) : ($document['ownerId'] ?? null);
        if (is_string($recipientId)) {
            $statusLabel = $request['status'] ?? 'rescheduled';
            $accountData->updateOne(
                ['userId' => $recipientId],
                ['$push' => ['data.notifications' => [
                    '$each' => [[
                        'id' => 'appointment-update-' . $appointmentId . '-' . bin2hex(random_bytes(4)),
                        'name' => $isOwner
                            ? ($updatedAppointment['ownerName'] ?? 'Pawly member')
                            : ($updatedAppointment['providerName'] ?? 'Appointment update'),
                        'action' => 'appointment ' . strtolower((string) $statusLabel),
                        'detail' => $updatedAppointment['service'] ?? '',
                        'time' => 'Just now',
                        'kind' => 'care',
                        'target' => 'appointments',
                        'unread' => true,
                    ]],
                    '$slice' => -500,
                ]]],
                ['upsert' => true],
            );
        }
        echo json_encode(['appointment' => $updatedAppointment], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Appointment request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to access appointments right now.'], JSON_THROW_ON_ERROR);
    }
    exit;
}

if ($path === '/api/followers' && $method === 'GET') {
    header('Cache-Control: no-store');

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !isset($sessionUser['id']) ||
            !is_string($sessionUser['id']) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to view your followers.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $follows = $client->selectCollection($database, $_ENV['FOLLOWS_COLLECTION'] ?? 'follows');
        $follows->createIndex(
            ['followerId' => 1, 'followedId' => 1],
            ['unique' => true],
        );
        $follows->createIndex(['followedId' => 1, 'createdAt' => -1]);
        $users = $client->selectCollection($database, $_ENV['USERS_COLLECTION'] ?? 'users');

        $incomingFollows = iterator_to_array($follows->find(
            ['followedId' => $sessionUser['id']],
            ['sort' => ['createdAt' => -1], 'limit' => 500],
        ), false);
        $followerIds = array_map(
            static fn (array|object $follow): mixed => $follow['followerId'] ?? null,
            $incomingFollows,
        );
        $sessionEmail = $_SESSION['user']['email'] ?? '';
        $sessionHandle = is_string($sessionEmail)
            ? strtolower(explode('@', $sessionEmail, 2)[0])
            : '';
        if ($sessionHandle !== '') {
            $accountData = $client->selectCollection(
                $database,
                $_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data',
            );
            $accountData->createIndex(['data.followingHandles' => 1]);
            foreach ($accountData->find(
                ['data.followingHandles' => $sessionHandle],
                ['projection' => ['userId' => 1], 'limit' => 500],
            ) as $legacyFollower) {
                $followerIds[] = $legacyFollower['userId'] ?? null;
            }
        }
        $followerIds = array_values(array_unique(array_filter(
            $followerIds,
            static fn (mixed $id): bool =>
            is_string($id) && $id !== $sessionUser['id'] && preg_match('/\A[0-9a-f]{24}\z/i', $id) === 1
        )));
        $outgoingFollows = iterator_to_array($follows->find(
            ['followerId' => $sessionUser['id']],
            [
                'projection' => ['followedId' => 1],
                'sort' => ['createdAt' => -1],
                'limit' => 500,
            ],
        ), false);
        $followingIds = [];
        foreach ($outgoingFollows as $follow) {
            $followedId = $follow['followedId'] ?? null;
            if (is_string($followedId) && $followedId !== $sessionUser['id']) {
                $followingIds[$followedId] = true;
            }
        }
        $accountData = $client->selectCollection(
            $database,
            $_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data',
        );
        $legacyFollowing = $accountData->findOne(
            ['userId' => $sessionUser['id']],
            ['projection' => ['data.followingHandles' => 1]],
        );
        $storedHandles = $legacyFollowing['data']['followingHandles'] ?? [];
        $legacyHandles = is_array($storedHandles)
            ? array_slice(array_values(array_unique(array_filter(
                $storedHandles,
                static fn (mixed $handle): bool => is_string($handle) && $handle !== '',
            ))), 0, 500)
            : [];
        if ($legacyHandles !== []) {
            $legacyUsers = $users->find(
                [
                    '$or' => array_map(
                        static fn (string $handle): array => [
                            'email' => new MongoDB\BSON\Regex('^' . preg_quote($handle, '/') . '@', 'i'),
                        ],
                        $legacyHandles,
                    ),
                    'status' => ['$ne' => 'suspended'],
                ],
                ['projection' => ['_id' => 1]],
            );
            foreach ($legacyUsers as $legacyUser) {
                $legacyId = (string) ($legacyUser['_id'] ?? '');
                if ($legacyId !== '' && $legacyId !== $sessionUser['id']) {
                    $followingIds[$legacyId] = true;
                }
            }
        }

        $allUserIds = array_values(array_unique(array_filter(
            array_merge($followerIds, array_keys($followingIds)),
            static fn (string $id): bool => preg_match('/\A[0-9a-f]{24}\z/i', $id) === 1,
        )));
        $userIds = array_map(static fn (string $id): MongoDB\BSON\ObjectId => new MongoDB\BSON\ObjectId($id), $allUserIds);
        $relatedUsers = $userIds === []
            ? []
            : iterator_to_array($users->find(
                [
                    '_id' => ['$in' => $userIds],
                    'status' => ['$ne' => 'suspended'],
                ],
                ['projection' => ['name' => 1, 'email' => 1, 'picture' => 1, 'role' => 1]],
            ), false);
        $userById = [];
        foreach ($relatedUsers as $relatedUser) {
            $userById[(string) $relatedUser['_id']] = $relatedUser;
        }

        $followerAccounts = [];
        foreach ($followerIds as $followerId) {
            $follower = $userById[$followerId] ?? null;
            if ($follower === null) {
                continue;
            }
            $email = $follower['email'] ?? '';
            $followerAccounts[] = [
                'id' => $followerId,
                'name' => $follower['name'] ?? 'Pawly member',
                'handle' => is_string($email) ? strtolower(explode('@', $email, 2)[0]) : 'member',
                'avatar' => $follower['picture'] ?? '',
                'role' => $follower['role'] ?? 'owner',
                'following' => isset($followingIds[$followerId]),
            ];
        }
        $followingAccounts = [];
        foreach (array_keys($followingIds) as $followingId) {
            $followingUser = $userById[$followingId] ?? null;
            if ($followingUser === null) {
                continue;
            }
            $email = $followingUser['email'] ?? '';
            $followingAccounts[] = [
                'id' => $followingId,
                'name' => $followingUser['name'] ?? 'Pawly member',
                'handle' => is_string($email) ? strtolower(explode('@', $email, 2)[0]) : 'member',
                'avatar' => $followingUser['picture'] ?? '',
                'role' => $followingUser['role'] ?? 'owner',
                'following' => true,
            ];
        }

        echo json_encode([
            'followers' => $followerAccounts,
            'following' => $followingAccounts,
        ], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Follower list request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to load your followers right now.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if ($path === '/api/follows' && $method === 'POST') {
    header('Cache-Control: no-store');
    if (!requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !isset($sessionUser['id']) ||
            !is_string($sessionUser['id']) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to follow Pawly members.'], JSON_THROW_ON_ERROR);
            exit;
        }

        try {
            $request = readJsonRequestBody();
        } catch (InvalidArgumentException $error) {
            http_response_code(400);
            echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
            exit;
        }
        $targetId = $request['targetUserId'] ?? null;
        $following = $request['following'] ?? null;
        if (
            !is_string($targetId) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $targetId) !== 1 ||
            !is_bool($following)
        ) {
            http_response_code(422);
            echo json_encode(['error' => 'Choose a valid member to follow.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $targetId = strtolower($targetId);
        if (hash_equals($sessionUser['id'], $targetId)) {
            http_response_code(422);
            echo json_encode(['error' => 'You cannot follow your own account.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $users = $client->selectCollection($database, $_ENV['USERS_COLLECTION'] ?? 'users');
        $target = $users->findOne(
            [
                '_id' => new MongoDB\BSON\ObjectId($targetId),
                'status' => ['$ne' => 'suspended'],
            ],
            ['projection' => ['_id' => 1]],
        );
        if ($target === null) {
            http_response_code(404);
            echo json_encode(['error' => 'This member is unavailable.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $follows = $client->selectCollection($database, $_ENV['FOLLOWS_COLLECTION'] ?? 'follows');
        $follows->createIndex(['followerId' => 1, 'followedId' => 1], ['unique' => true]);
        $relation = ['followerId' => $sessionUser['id'], 'followedId' => $targetId];
        if ($following) {
            $upsertResult = $follows->updateOne(
                $relation,
                ['$setOnInsert' => $relation + ['createdAt' => new MongoDB\BSON\UTCDateTime()]],
                ['upsert' => true],
            );
            if ($upsertResult->getUpsertedCount() === 1) {
                $accountData = $client->selectCollection(
                    $database,
                    $_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data',
                );
                $accountData->updateOne(
                    ['userId' => $targetId],
                    ['$push' => [
                        'data.notifications' => [
                            '$each' => [[
                                'id' => 'follow-' . $sessionUser['id'],
                                'name' => is_string($sessionUser['name'] ?? null)
                                    ? $sessionUser['name']
                                    : 'A Pawly member',
                                'action' => 'started following you',
                                'detail' => 'You have a new follower.',
                                'time' => 'Just now',
                                'avatar' => is_string($sessionUser['picture'] ?? null)
                                    ? $sessionUser['picture']
                                    : '',
                                'kind' => 'community',
                                'target' => 'followers',
                                'unread' => true,
                            ]],
                            '$slice' => -500,
                        ],
                    ]],
                    ['upsert' => true],
                );
            }
        } else {
            $follows->deleteOne($relation);
        }

        echo json_encode(['following' => $following], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Follow update request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to update this follow right now.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if (in_array($path, ['/api/conversations', '/api/conversations/'], true) && in_array($method, ['GET', 'POST'], true)) {
    header('Cache-Control: no-store');
    if ($method === 'POST' && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (!is_array($sessionUser) || !is_string($sessionUser['id'] ?? null)) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to access messages.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $conversations = $client->selectCollection($database, $_ENV['CONVERSATIONS_COLLECTION'] ?? 'conversations');
        $conversations->createIndex(['participants' => 1, 'updatedAt' => -1]);
        $messages = $client->selectCollection($database, $_ENV['MESSAGES_COLLECTION'] ?? 'messages');
        $users = $client->selectCollection($database, $_ENV['USERS_COLLECTION'] ?? 'users');

        if ($method === 'GET') {
            $documents = $conversations->find(
                ['participants' => $sessionUser['id']],
                ['sort' => ['updatedAt' => -1], 'limit' => 100],
            );
            $result = [];
            foreach ($documents as $document) {
                $peerId = null;
                foreach ($document['participants'] ?? [] as $participantId) {
                    if (is_string($participantId) && $participantId !== $sessionUser['id']) {
                        $peerId = $participantId;
                        break;
                    }
                }
                if (!is_string($peerId) || preg_match('/\A[0-9a-f]{24}\z/i', $peerId) !== 1) {
                    continue;
                }
                $peer = $users->findOne(
                    ['_id' => new MongoDB\BSON\ObjectId($peerId), 'status' => ['$ne' => 'suspended']],
                    ['projection' => ['name' => 1, 'email' => 1, 'picture' => 1, 'role' => 1]],
                );
                if ($peer === null) {
                    continue;
                }
                $conversationId = (string) $document['_id'];
                $messageDocuments = iterator_to_array($messages->find(
                    ['conversationId' => $conversationId],
                    ['sort' => ['createdAt' => -1], 'limit' => 100],
                ), false);
                $conversationMessages = [];
                foreach (array_reverse($messageDocuments) as $message) {
                    $createdAt = $message['createdAt'] ?? null;
                    $senderId = $message['senderId'] ?? '';
                    $readBy = $message['readBy'] ?? [];
                    $conversationMessages[] = [
                        'id' => (string) $message['_id'],
                        'text' => $message['text'] ?? '',
                        'senderId' => $senderId,
                        'createdAt' => $createdAt instanceof MongoDB\BSON\UTCDateTime
                            ? $createdAt->toDateTime()->format(DATE_ATOM)
                            : '',
                        'read' => $senderId !== $sessionUser['id'] ||
                            in_array($peerId, $readBy, true),
                    ];
                }
                $email = $peer['email'] ?? '';
                $result[] = [
                    'id' => $conversationId,
                    'peerId' => $peerId,
                    'name' => $peer['name'] ?? 'Pawly member',
                    'handle' => is_string($email) ? strtolower(explode('@', $email, 2)[0]) : 'member',
                    'detail' => ($peer['role'] ?? '') === 'provider' ? 'Pet care provider' : 'Pawly member',
                    'avatar' => $peer['picture'] ?? '',
                    'messages' => $conversationMessages,
                ];
            }
            echo json_encode(['conversations' => $result], JSON_THROW_ON_ERROR);
            exit;
        }

        try {
            $request = readJsonRequestBody();
        } catch (InvalidArgumentException $error) {
            http_response_code(400);
            echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
            exit;
        }
        $peerId = $request['targetUserId'] ?? null;
        if (
            !is_string($peerId) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $peerId) !== 1
        ) {
            http_response_code(422);
            echo json_encode(['error' => 'Choose a valid member to message.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $peerId = strtolower($peerId);
        $peer = $users->findOne(
            ['_id' => new MongoDB\BSON\ObjectId($peerId), 'status' => ['$ne' => 'suspended']],
            ['projection' => ['name' => 1, 'email' => 1, 'picture' => 1, 'role' => 1]],
        );
        if ($peer === null) {
            $providerProfile = $client->selectCollection(
                $database,
                $_ENV['PROVIDERS_COLLECTION'] ?? 'providers',
            )->findOne(
                ['_id' => new MongoDB\BSON\ObjectId($peerId), 'status' => 'active'],
                ['projection' => ['userId' => 1]],
            );
            $providerUserId = $providerProfile['userId'] ?? null;
            if (is_string($providerUserId) && preg_match('/\A[0-9a-f]{24}\z/i', $providerUserId) === 1) {
                $peerId = strtolower($providerUserId);
                $peer = $users->findOne(
                    ['_id' => new MongoDB\BSON\ObjectId($peerId), 'status' => ['$ne' => 'suspended']],
                    ['projection' => ['name' => 1, 'email' => 1, 'picture' => 1, 'role' => 1]],
                );
            }
        }
        if (hash_equals($sessionUser['id'], $peerId)) {
            http_response_code(422);
            echo json_encode(['error' => 'Choose a different member to message.'], JSON_THROW_ON_ERROR);
            exit;
        }
        if ($peer === null) {
            http_response_code(404);
            echo json_encode(['error' => 'This member is unavailable.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $follows = $client->selectCollection($database, $_ENV['FOLLOWS_COLLECTION'] ?? 'follows');
        $isConnected = $follows->findOne([
            '$or' => [
                ['followerId' => $sessionUser['id'], 'followedId' => $peerId],
                ['followerId' => $peerId, 'followedId' => $sessionUser['id']],
            ],
        ]) !== null;
        if (!$isConnected) {
            $providerRecords = $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers');
            $peerProvider = $providerRecords->findOne(
                ['userId' => $peerId],
                ['projection' => ['_id' => 1, 'userId' => 1]],
            );
            $senderProvider = $providerRecords->findOne(
                ['userId' => $sessionUser['id']],
                ['projection' => ['_id' => 1, 'userId' => 1]],
            );
            $providerProfile = $peerProvider ?? $senderProvider;
            $providerId = $providerProfile === null ? '' : (string) $providerProfile['_id'];
            $providerUserId = $peerProvider !== null ? $peerId : $sessionUser['id'];
            $ownerId = $peerProvider !== null ? $sessionUser['id'] : $peerId;
            $appointments = $client->selectCollection($database, $_ENV['APPOINTMENTS_COLLECTION'] ?? 'appointments');
            $hasAppointment = $providerId !== '' && $appointments->findOne([
                'providerId' => $providerId,
                'providerUserId' => $providerUserId,
                'ownerId' => $ownerId,
                'appointment.status' => ['$nin' => ['CANCELLED', 'REJECTED']],
            ], ['projection' => ['_id' => 1]]) !== null;
            if (!$hasAppointment) {
                http_response_code(403);
                echo json_encode(['error' => 'Follow this member or have an appointment before starting a conversation.'], JSON_THROW_ON_ERROR);
                exit;
            }
        }

        $participants = [$sessionUser['id'], $peerId];
        sort($participants, SORT_STRING);
        $conversation = $conversations->findOneAndUpdate(
            ['participants' => $participants],
            [
                '$setOnInsert' => [
                    'participants' => $participants,
                    'createdAt' => new MongoDB\BSON\UTCDateTime(),
                    'updatedAt' => new MongoDB\BSON\UTCDateTime(),
                ],
            ],
            ['upsert' => true, 'returnDocument' => MongoDB\Operation\FindOneAndUpdate::RETURN_DOCUMENT_AFTER],
        );
        if ($conversation === null) {
            throw new RuntimeException('Unable to create conversation.');
        }
        $email = $peer['email'] ?? '';
        echo json_encode([
            'conversation' => [
                'id' => (string) $conversation['_id'],
                'peerId' => $peerId,
                'name' => $peer['name'] ?? 'Pawly member',
                'handle' => is_string($email) ? strtolower(explode('@', $email, 2)[0]) : 'member',
                'detail' => ($peer['role'] ?? '') === 'provider' ? 'Pet care provider' : 'Pawly member',
                'avatar' => $peer['picture'] ?? '',
                'messages' => [],
            ],
        ], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Conversation request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to access messages right now.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if (preg_match('#\A/api/conversations/([0-9a-f]{24})/messages\z#i', $path, $conversationMatch) === 1 && in_array($method, ['GET', 'POST'], true)) {
    header('Cache-Control: no-store');
    if ($method === 'POST' && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (!is_array($sessionUser) || !is_string($sessionUser['id'] ?? null)) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to access messages.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $conversationId = strtolower($conversationMatch[1]);
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $conversations = $client->selectCollection($database, $_ENV['CONVERSATIONS_COLLECTION'] ?? 'conversations');
        $conversation = $conversations->findOne([
            '_id' => new MongoDB\BSON\ObjectId($conversationId),
            'participants' => $sessionUser['id'],
        ]);
        if ($conversation === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Conversation not found.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $messages = $client->selectCollection($database, $_ENV['MESSAGES_COLLECTION'] ?? 'messages');
        $messages->createIndex(['conversationId' => 1, 'createdAt' => -1]);

        if ($method === 'GET') {
            $peerId = null;
            foreach ($conversation['participants'] as $participantId) {
                if ($participantId !== $sessionUser['id']) {
                    $peerId = $participantId;
                    break;
                }
            }
            $documents = iterator_to_array($messages->find(
                ['conversationId' => $conversationId],
                ['sort' => ['createdAt' => -1], 'limit' => 100],
            ), false);
            $responseMessages = [];
            foreach (array_reverse($documents) as $message) {
                $readBy = $message['readBy'] ?? [];
                $senderId = $message['senderId'] ?? '';
                $responseMessages[] = [
                    'id' => (string) $message['_id'],
                    'text' => $message['text'] ?? '',
                    'senderId' => $senderId,
                    'createdAt' => ($message['createdAt'] ?? null) instanceof MongoDB\BSON\UTCDateTime
                        ? $message['createdAt']->toDateTime()->format(DATE_ATOM)
                        : '',
                    'read' => $senderId !== $sessionUser['id'] ||
                        (is_string($peerId) && in_array($peerId, $readBy, true)),
                ];
            }
            $messages->updateMany(
                ['conversationId' => $conversationId, 'senderId' => ['$ne' => $sessionUser['id']]],
                ['$addToSet' => ['readBy' => $sessionUser['id']]],
            );
            echo json_encode(['messages' => $responseMessages], JSON_THROW_ON_ERROR);
            exit;
        }

        try {
            $request = readJsonRequestBody();
        } catch (InvalidArgumentException $error) {
            http_response_code(400);
            echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
            exit;
        }
        $text = $request['text'] ?? null;
        if (!is_string($text) || trim($text) === '' || strlen($text) > 4000) {
            http_response_code(422);
            echo json_encode(['error' => 'Messages must contain 1 to 4,000 characters.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $now = new MongoDB\BSON\UTCDateTime();
        $message = [
            'conversationId' => $conversationId,
            'senderId' => $sessionUser['id'],
            'text' => trim($text),
            'createdAt' => $now,
            'readBy' => [$sessionUser['id']],
        ];
        $inserted = $messages->insertOne($message);
        $conversations->updateOne(
            ['_id' => new MongoDB\BSON\ObjectId($conversationId)],
            ['$set' => ['updatedAt' => $now, 'lastMessage' => trim($text)]],
        );
        $peerId = null;
        foreach ($conversation['participants'] as $participantId) {
            if ($participantId !== $sessionUser['id']) {
                $peerId = $participantId;
                break;
            }
        }
        if (is_string($peerId)) {
            $peerData = $client->selectCollection($database, $_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data');
            $senderName = is_string($sessionUser['name'] ?? null) ? $sessionUser['name'] : 'A Pawly member';
            $peerData->updateOne(
                ['userId' => $peerId],
                ['$push' => [
                    'data.notifications' => [
                        '$each' => [[
                            'id' => 'message-' . (string) $inserted->getInsertedId(),
                            'name' => $senderName,
                            'action' => 'sent you a message',
                            'detail' => substr(trim($text), 0, 120),
                            'time' => 'Just now',
                            'avatar' => is_string($sessionUser['picture'] ?? null) ? $sessionUser['picture'] : '',
                            'kind' => 'community',
                            'target' => 'messages',
                            'conversationId' => $conversationId,
                            'unread' => true,
                        ]],
                        '$slice' => -500,
                    ],
                ]],
                ['upsert' => true],
            );
        }
        echo json_encode([
            'message' => [
                'id' => (string) $inserted->getInsertedId(),
                'text' => trim($text),
                'senderId' => $sessionUser['id'],
                'createdAt' => $now->toDateTime()->format(DATE_ATOM),
                'read' => false,
            ],
            'recipientId' => $peerId,
        ], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Message request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to send or load messages right now.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if (preg_match('#\A/api/providers/([0-9a-f]{24})/reviews\z#i', $path, $reviewMatch) === 1 && in_array($method, ['GET', 'POST'], true)) {
    header('Cache-Control: no-store');
    if ($method === 'POST' && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }
    try {
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $providerId = strtolower($reviewMatch[1]);
        $provider = $client->selectCollection(
            $database,
            $_ENV['PROVIDERS_COLLECTION'] ?? 'providers',
        )->findOne(['_id' => new MongoDB\BSON\ObjectId($providerId), 'status' => 'active']);
        if ($provider === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Provider not found.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $reviews = $client->selectCollection($database, $_ENV['REVIEWS_COLLECTION'] ?? 'provider_reviews');
        $reviews->createIndex(['providerId' => 1, 'status' => 1, 'createdAt' => -1]);
        $reviews->createIndex(['userId' => 1, 'appointmentId' => 1], ['unique' => true]);
        if ($method === 'GET') {
            $result = [];
            foreach ($reviews->find(
                ['providerId' => $providerId, 'status' => 'approved'],
                ['sort' => ['createdAt' => -1], 'limit' => 50],
            ) as $review) {
                $result[] = [
                    'id' => (string) $review['_id'],
                    'reviewerName' => $review['reviewerName'],
                    'rating' => $review['rating'],
                    'text' => $review['text'],
                    'createdAt' => $review['createdAt']->toDateTime()->format(DATE_ATOM),
                ];
            }
            echo json_encode(['reviews' => $result], JSON_THROW_ON_ERROR);
            exit;
        }

        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !is_string($sessionUser['id'] ?? null) ||
            !is_string($sessionUser['name'] ?? null)
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to review a provider.'], JSON_THROW_ON_ERROR);
            exit;
        }
        if (($provider['userId'] ?? null) === $sessionUser['id']) {
            http_response_code(403);
            echo json_encode(['error' => 'You cannot review your own provider profile.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $request = readJsonRequestBody();
        $appointmentId = $request['appointmentId'] ?? null;
        $rating = $request['rating'] ?? null;
        $text = $request['text'] ?? '';
        if (
            !is_string($appointmentId) ||
            trim($appointmentId) === '' ||
            strlen($appointmentId) > 100 ||
            !is_int($rating) ||
            $rating < 1 ||
            $rating > 5 ||
            !is_string($text) ||
            trim($text) === '' ||
            strlen($text) > 1000
        ) {
            http_response_code(422);
            echo json_encode(['error' => 'Provide a completed appointment, a 1–5 star rating, and a review under 1,000 characters.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $appointmentObjectId = preg_match('/\A[0-9a-f]{24}\z/i', $appointmentId) === 1
            ? new MongoDB\BSON\ObjectId(strtolower($appointmentId))
            : null;
        $eligible = $appointmentObjectId !== null && $client->selectCollection(
            $database,
            $_ENV['APPOINTMENTS_COLLECTION'] ?? 'appointments',
        )->findOne([
            '_id' => $appointmentObjectId,
            'ownerId' => $sessionUser['id'],
            'providerId' => $providerId,
            'appointment.status' => 'COMPLETED',
        ], ['projection' => ['_id' => 1]]) !== null;
        if (!$eligible) {
            http_response_code(403);
            echo json_encode(['error' => 'A completed appointment with this provider is required to leave a review.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $now = new MongoDB\BSON\UTCDateTime();
        $reviews->insertOne([
            'providerId' => $providerId,
            'providerName' => $provider['name'] ?? 'Provider',
            'userId' => $sessionUser['id'],
            'reviewerName' => $sessionUser['name'],
            'appointmentId' => $appointmentId,
            'rating' => $rating,
            'text' => trim($text),
            'status' => 'pending',
            'createdAt' => $now,
        ]);
        http_response_code(201);
        echo json_encode(['submitted' => true, 'status' => 'pending'], JSON_THROW_ON_ERROR);
    } catch (MongoDB\Driver\Exception\BulkWriteException $error) {
        if ($error->getCode() === 11000) {
            http_response_code(409);
            echo json_encode(['error' => 'You have already reviewed this appointment.'], JSON_THROW_ON_ERROR);
            exit;
        }
        error_log('Provider review request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to access provider reviews right now.'], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Provider review request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to access provider reviews right now.'], JSON_THROW_ON_ERROR);
    }
    exit;
}

if ($path === '/api/account-data' && in_array($method, ['GET', 'PUT'], true)) {
    header('Cache-Control: no-store');

    if ($method === 'PUT' && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !isset($sessionUser['id']) ||
            !is_string($sessionUser['id']) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to access your account data.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $collection = $client->selectCollection(
            $database,
            $_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data',
        );
        $collection->createIndex(['userId' => 1], ['unique' => true]);

        if ($method === 'GET') {
            $document = $collection->findOne(['userId' => $sessionUser['id']]);
            $storedData = $document['data'] ?? [];
            $data = $document === null
                ? [
                    'appointments' => [],
                    'favoriteProviderIds' => [],
                    'followingHandles' => [],
                    'notifications' => [],
                    'conversations' => [],
                    'providerServices' => [],
                ]
                : [
                    'appointments' => $storedData['appointments'] ?? [],
                    'favoriteProviderIds' => $storedData['favoriteProviderIds'] ?? [],
                    'followingHandles' => $storedData['followingHandles'] ?? [],
                    'notifications' => $storedData['notifications'] ?? [],
                    'conversations' => $storedData['conversations'] ?? [],
                    'providerServices' => $storedData['providerServices'] ?? [],
                ];

            http_response_code(200);
            echo json_encode($data, JSON_THROW_ON_ERROR);
            exit;
        }

        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 1024 * 1024) {
            http_response_code(413);
            echo json_encode(['error' => 'Account data must be smaller than 1 MB.'], JSON_THROW_ON_ERROR);
            exit;
        }
        $request = readJsonRequestBody();
        $appointments = $request['appointments'] ?? [];
        $favoriteProviderIds = $request['favoriteProviderIds'] ?? [];
        $followingHandles = $request['followingHandles'] ?? [];
        $notifications = $request['notifications'] ?? [];
        $conversations = $request['conversations'] ?? [];
        $providerServices = $request['providerServices'] ?? [];
        $isStringList = static function (mixed $items, int $limit, int $itemLength): bool {
            if (!is_array($items) || !array_is_list($items) || count($items) > $limit) {
                return false;
            }
            foreach ($items as $item) {
                if (!is_string($item) || trim($item) === '' || strlen($item) > $itemLength) {
                    return false;
                }
            }
            return true;
        };
        $isText = static fn (mixed $value, int $limit, bool $allowEmpty = false): bool =>
            is_string($value) &&
            strlen($value) <= $limit &&
            ($allowEmpty || trim($value) !== '');

        $validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'];
        $validAppointments = is_array($appointments) &&
            array_is_list($appointments) &&
            count($appointments) <= 200;
        if ($validAppointments) {
            foreach ($appointments as $appointment) {
                if (
                    !is_array($appointment) ||
                    !$isText($appointment['id'] ?? null, 100) ||
                    !$isText($appointment['petId'] ?? null, 100) ||
                    !$isText($appointment['petName'] ?? null, 100) ||
                    !$isText($appointment['petBreed'] ?? null, 100, true) ||
                    !$isText($appointment['ownerName'] ?? null, 150, true) ||
                    (isset($appointment['ownerId']) && !$isText($appointment['ownerId'], 100)) ||
                    !$isText($appointment['ownerAvatar'] ?? null, 2048, true) ||
                    !$isText($appointment['providerId'] ?? null, 150) ||
                    !$isText($appointment['providerName'] ?? null, 150) ||
                    !$isText($appointment['service'] ?? null, 150) ||
                    !$isText($appointment['professional'] ?? null, 150, true) ||
                    !$isText($appointment['date'] ?? null, 80) ||
                    !$isText($appointment['time'] ?? null, 40) ||
                    (isset($appointment['scheduledAt']) && !$isText($appointment['scheduledAt'], 80)) ||
                    !$isText($appointment['duration'] ?? null, 40) ||
                    !is_numeric($appointment['price'] ?? null) ||
                    (float) $appointment['price'] < 0 ||
                    !in_array($appointment['status'] ?? null, $validStatuses, true) ||
                    (isset($appointment['notes']) && !$isText($appointment['notes'], 2000, true))
                ) {
                    $validAppointments = false;
                    break;
                }
            }
        }

        $validNotifications = is_array($notifications) &&
            array_is_list($notifications) &&
            count($notifications) <= 500;
        if ($validNotifications) {
            foreach ($notifications as $notification) {
                if (
                    !is_array($notification) ||
                    !$isText($notification['id'] ?? null, 100) ||
                    !$isText($notification['name'] ?? null, 150) ||
                    !$isText($notification['action'] ?? null, 300) ||
                    !$isText($notification['detail'] ?? null, 500, true) ||
                    !$isText($notification['time'] ?? null, 80) ||
                    !in_array($notification['kind'] ?? null, ['care', 'community', 'provider'], true) ||
                    !in_array($notification['target'] ?? null, ['appointments', 'followers', 'home', 'messages', 'pets', 'provider-profile'], true) ||
                    !is_bool($notification['unread'] ?? null) ||
                    (isset($notification['avatar']) && !$isText($notification['avatar'], 2048, true)) ||
                    (isset($notification['providerId']) && !$isText($notification['providerId'], 150, true)) ||
                    (isset($notification['conversationId']) && !$isText($notification['conversationId'], 100)) ||
                    (isset($notification['petId']) && !$isText($notification['petId'], 100, true))
                ) {
                    $validNotifications = false;
                    break;
                }
            }
        }

        $validConversations = is_array($conversations) &&
            array_is_list($conversations) &&
            count($conversations) <= 200;
        if ($validConversations) {
            foreach ($conversations as $conversation) {
                $messages = is_array($conversation) ? ($conversation['messages'] ?? null) : null;
                if (
                    !is_array($conversation) ||
                    !$isText($conversation['id'] ?? null, 150) ||
                    !$isText($conversation['name'] ?? null, 150) ||
                    !$isText($conversation['detail'] ?? null, 300, true) ||
                    !$isText($conversation['avatar'] ?? null, 2048, true) ||
                    !$isText($conversation['time'] ?? null, 80, true) ||
                    !is_array($messages) ||
                    !array_is_list($messages) ||
                    count($messages) > 500 ||
                    (isset($conversation['unread']) &&
                        (!is_int($conversation['unread']) || $conversation['unread'] < 0))
                ) {
                    $validConversations = false;
                    break;
                }
                foreach ($messages as $message) {
                    if (
                        !is_array($message) ||
                        !$isText($message['id'] ?? null, 150) ||
                        !$isText($message['text'] ?? null, 2000) ||
                        !$isText($message['time'] ?? null, 80) ||
                        (isset($message['own']) && !is_bool($message['own']))
                    ) {
                        $validConversations = false;
                        break 2;
                    }
                }
            }
        }

        $validProviderServices = is_array($providerServices) &&
            array_is_list($providerServices) &&
            count($providerServices) <= 100;
        if ($validProviderServices) {
            foreach ($providerServices as $service) {
                if (
                    !is_array($service) ||
                    !$isText($service['id'] ?? null, 150) ||
                    !$isText($service['name'] ?? null, 80) ||
                    !$isText($service['category'] ?? null, 80) ||
                    !is_numeric($service['price'] ?? null) ||
                    (float) $service['price'] < 0 ||
                    !is_numeric($service['duration'] ?? null) ||
                    (float) $service['duration'] < 5 ||
                    (float) $service['duration'] > 1440 ||
                    !$isText($service['description'] ?? null, 160, true) ||
                    !is_bool($service['active'] ?? null)
                ) {
                    $validProviderServices = false;
                    break;
                }
            }
        }

        if (
            !$validAppointments ||
            !$isStringList($favoriteProviderIds, 200, 150) ||
            !$isStringList($followingHandles, 500, 120) ||
            !$validNotifications ||
            !$validConversations ||
            !$validProviderServices
        ) {
            http_response_code(422);
            echo json_encode(['error' => 'Account data is invalid or exceeds its storage limits.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $existingDocument = $collection->findOne(
            ['userId' => $sessionUser['id']],
            ['projection' => ['data.notifications' => 1]],
        );
        $existingNotifications = $existingDocument['data']['notifications'] ?? [];
        if (is_array($existingNotifications)) {
            $notificationIds = [];
            foreach ($notifications as $notification) {
                $notificationIds[$notification['id']] = true;
            }
            foreach ($existingNotifications as $notification) {
                if (
                    is_array($notification) &&
                    is_string($notification['id'] ?? null) &&
                    !isset($notificationIds[$notification['id']])
                ) {
                    $notifications[] = $notification;
                    $notificationIds[$notification['id']] = true;
                }
            }
            $notifications = array_slice($notifications, -500);
        }

        $data = [
            'appointments' => $appointments,
            'favoriteProviderIds' => $favoriteProviderIds,
            'followingHandles' => $followingHandles,
            'notifications' => $notifications,
            'conversations' => $conversations,
            'providerServices' => $providerServices,
        ];
        $now = new MongoDB\BSON\UTCDateTime();
        $collection->updateOne(
            ['userId' => $sessionUser['id']],
            [
                '$set' => ['data' => $data, 'updatedAt' => $now],
                '$setOnInsert' => ['userId' => $sessionUser['id'], 'createdAt' => $now],
            ],
            ['upsert' => true],
        );

        http_response_code(200);
        echo json_encode($data, JSON_THROW_ON_ERROR);
    } catch (InvalidArgumentException $error) {
        http_response_code(400);
        echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Private account data request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to access your account data right now. Please try again.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if ($path === '/api/posts' && $method === 'POST') {
    if (!requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 48 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'Post uploads must be smaller than 48 MB total.'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !isset($sessionUser['id']) ||
            !is_string($sessionUser['id']) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to publish a post.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $caption = $_POST['text'] ?? null;
        $pet = $_POST['pet'] ?? '';
        if (!is_string($caption) || trim($caption) === '' || strlen($caption) > 2000) {
            http_response_code(422);
            echo json_encode(['error' => 'Post captions must be between 1 and 2000 characters.'], JSON_THROW_ON_ERROR);
            exit;
        }
        if (!is_string($pet) || strlen($pet) > 120) {
            http_response_code(422);
            echo json_encode(['error' => 'The selected pet name is invalid.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $uploadedMedia = [];
        $files = $_FILES['media'] ?? null;
        if ($files !== null) {
            if (
                !is_array($files) ||
                !isset($files['name'], $files['tmp_name'], $files['error'], $files['size']) ||
                !is_array($files['name']) ||
                !is_array($files['tmp_name']) ||
                !is_array($files['error']) ||
                !is_array($files['size'])
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'The selected post media is invalid.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if (count($files['name']) > 5) {
                http_response_code(422);
                echo json_encode(['error' => 'A post can include up to 5 photos or videos.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if (
                count($files['name']) !== count($files['tmp_name']) ||
                count($files['name']) !== count($files['error']) ||
                count($files['name']) !== count($files['size']) ||
                array_sum($files['size']) > 40 * 1024 * 1024
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'The selected media is invalid or exceeds the 40 MB total limit.'], JSON_THROW_ON_ERROR);
                exit;
            }

            $imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            $videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
            $fileInfo = new finfo(FILEINFO_MIME_TYPE);
            foreach ($files['name'] as $index => $originalName) {
                $temporaryPath = $files['tmp_name'][$index] ?? null;
                $uploadError = $files['error'][$index] ?? UPLOAD_ERR_NO_FILE;
                $fileSize = $files['size'][$index] ?? 0;
                if (!is_int($uploadError) || $uploadError !== UPLOAD_ERR_OK) {
                    $message = $uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE
                        ? 'Each photo or video must be smaller than 3 MB.'
                        : 'A post media upload failed. Please try again.';
                    http_response_code(422);
                    echo json_encode(['error' => $message], JSON_THROW_ON_ERROR);
                    exit;
                }
                if (
                    !is_string($temporaryPath) ||
                    !is_uploaded_file($temporaryPath) ||
                    !is_int($fileSize) ||
                    $fileSize < 1 ||
                    $fileSize > 3 * 1024 * 1024
                ) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Each photo or video must be smaller than 3 MB.'], JSON_THROW_ON_ERROR);
                    exit;
                }

                $mimeType = $fileInfo->file($temporaryPath);
                $resourceType = in_array($mimeType, $imageTypes, true)
                    ? 'image'
                    : (in_array($mimeType, $videoTypes, true) ? 'video' : null);
                if ($resourceType === null) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV media.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                if ($resourceType === 'image') {
                    $imageInfo = getimagesize($temporaryPath);
                    if (!is_array($imageInfo) || ($imageInfo['mime'] ?? '') !== $mimeType) {
                        http_response_code(422);
                        echo json_encode(['error' => 'The selected image could not be validated.'], JSON_THROW_ON_ERROR);
                        exit;
                    }
                }

                $uploaded = (new CloudinaryStorage())->upload(
                    $temporaryPath,
                    'pawly/feed-posts/' . $sessionUser['id'],
                    $resourceType,
                );
                $safeName = is_string($originalName)
                    ? preg_replace('/[^A-Za-z0-9._ -]/', '', basename($originalName))
                    : '';
                $uploadedMedia[] = [
                    'url' => $uploaded['secureUrl'],
                    'type' => $mimeType,
                    'name' => $safeName !== '' ? substr($safeName, 0, 180) : 'Pet media',
                ];
            }
        }

        $userEmail = is_string($sessionUser['email'] ?? null) ? $sessionUser['email'] : '';
        $userName = is_string($sessionUser['name'] ?? null) ? $sessionUser['name'] : $userEmail;
        $firstImage = null;
        $firstVideo = null;
        foreach ($uploadedMedia as $media) {
            if ($firstImage === null && str_starts_with($media['type'], 'image/')) {
                $firstImage = $media;
            }
            if ($firstVideo === null && str_starts_with($media['type'], 'video/')) {
                $firstVideo = $media;
            }
        }

        $now = new MongoDB\BSON\UTCDateTime();
        $post = [
            'userId' => $sessionUser['id'],
            'name' => $userName,
            'handle' => explode('@', $userEmail)[0] ?: 'pawly-user',
            'pet' => trim($pet) !== '' ? trim($pet) : null,
            'time' => $now->toDateTime()->format(DATE_ATOM),
            'text' => trim($caption),
            'image' => $firstImage['url'] ?? null,
            'imageAlt' => $firstImage['name'] ?? 'Pet photo',
            'video' => $firstVideo['url'] ?? null,
            'mediaItems' => $uploadedMedia,
            'likes' => 0,
            'comments' => 0,
            'commentItems' => [],
            'avatar' => is_string($sessionUser['picture'] ?? null) ? $sessionUser['picture'] : '',
            'provider' => ($sessionUser['role'] ?? '') === 'provider',
            'verified' => ($sessionUser['verified'] ?? false) === true,
            'visibility' => 'public',
            'status' => 'published',
            'createdAt' => $now,
        ];

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $collection = $client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts');
        $result = $collection->insertOne($post);
        $post['id'] = (string) $result->getInsertedId();
        $post['createdAt'] = $post['time'];

        http_response_code(201);
        echo json_encode($post, JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Feed post creation failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to publish your post right now. Please try again.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if (preg_match('#\A/api/posts/([0-9a-f]{24})/like\z#i', $path, $likeMatch) === 1) {
    if (!in_array($method, ['POST', 'DELETE'], true)) {
        http_response_code(405);
        header('Allow: POST, DELETE');
        echo json_encode(['error' => 'Method not allowed.'], JSON_THROW_ON_ERROR);
        exit;
    }
    if (!requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !is_string($sessionUser['id'] ?? null) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to like posts.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $posts = $client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts');
        $postId = new MongoDB\BSON\ObjectId(strtolower($likeMatch[1]));
        $userId = $sessionUser['id'];
        $liked = $method === 'POST';
        $result = $posts->updateOne(
            [
                '_id' => $postId,
                'visibility' => 'public',
                'status' => 'published',
                'likedBy' => $liked
                    ? ['$ne' => $userId]
                    : $userId,
            ],
            $liked
                ? ['$addToSet' => ['likedBy' => $userId], '$inc' => ['likes' => 1]]
                : ['$pull' => ['likedBy' => $userId], '$inc' => ['likes' => -1]],
        );

        $post = $posts->findOne(
            ['_id' => $postId, 'visibility' => 'public', 'status' => 'published'],
            ['projection' => ['likes' => 1, 'likedBy' => 1]],
        );
        if ($post === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $likedBy = is_array($post['likedBy'] ?? null) ? $post['likedBy'] : [];
        $isLiked = in_array($userId, $likedBy, true);
        $likes = max(0, is_numeric($post['likes'] ?? null) ? (int) $post['likes'] : 0);
        echo json_encode(['liked' => $isLiked, 'likes' => $likes], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Feed post like failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to update this post like right now. Please try again.'], JSON_THROW_ON_ERROR);
    }
    exit;
}

if (preg_match('#\A/api/posts/([0-9a-f]{24})/reshare\z#i', $path, $reshareMatch) === 1) {
    if ($method !== 'POST') {
        http_response_code(405);
        header('Allow: POST');
        echo json_encode(['error' => 'Method not allowed.'], JSON_THROW_ON_ERROR);
        exit;
    }
    if (!requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !is_string($sessionUser['id'] ?? null) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to reshare posts.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $posts = $client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts');
        $postId = new MongoDB\BSON\ObjectId(strtolower($reshareMatch[1]));
        $userId = $sessionUser['id'];
        $posts->updateOne(
            [
                '_id' => $postId,
                'visibility' => 'public',
                'status' => 'published',
                'resharedBy' => ['$ne' => $userId],
            ],
            ['$addToSet' => ['resharedBy' => $userId], '$inc' => ['reshares' => 1]],
        );
        $post = $posts->findOne(
            ['_id' => $postId, 'visibility' => 'public', 'status' => 'published'],
            ['projection' => ['reshares' => 1, 'resharedBy' => 1]],
        );
        if ($post === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $resharedBy = is_array($post['resharedBy'] ?? null) ? $post['resharedBy'] : [];
        echo json_encode([
            'reshared' => in_array($userId, $resharedBy, true),
            'reshares' => max(0, is_numeric($post['reshares'] ?? null) ? (int) $post['reshares'] : 0),
        ], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Feed post reshare failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to reshare this post right now. Please try again.'], JSON_THROW_ON_ERROR);
    }
    exit;
}

if (preg_match('#\A/api/posts/([0-9a-f]{24})/comments\z#i', $path, $postCommentMatch) === 1) {
    header('Cache-Control: no-store');
    if ($method !== 'POST') {
        http_response_code(405);
        header('Allow: POST');
        echo json_encode(['error' => 'Method not allowed.'], JSON_THROW_ON_ERROR);
        exit;
    }
    if (!requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (
            !is_array($sessionUser) ||
            !is_string($sessionUser['id'] ?? null) ||
            preg_match('/\A[0-9a-f]{24}\z/i', $sessionUser['id']) !== 1
        ) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to comment on a post.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $request = readJsonRequestBody();
        $text = $request['text'] ?? null;
        if (!is_string($text) || trim($text) === '' || strlen($text) > 2000) {
            http_response_code(422);
            echo json_encode(['error' => 'Comments must be between 1 and 2000 characters.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $userEmail = is_string($sessionUser['email'] ?? null) ? $sessionUser['email'] : '';
        $userName = is_string($sessionUser['name'] ?? null) ? $sessionUser['name'] : $userEmail;
        $comment = [
            'id' => bin2hex(random_bytes(12)),
            'userId' => $sessionUser['id'],
            'name' => $userName !== '' ? $userName : 'Pawly member',
            'handle' => explode('@', $userEmail)[0] ?: 'pawly-user',
            'avatar' => is_string($sessionUser['picture'] ?? null) ? $sessionUser['picture'] : '',
            'text' => trim($text),
            'createdAt' => (new MongoDB\BSON\UTCDateTime())->toDateTime()->format(DATE_ATOM),
        ];

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $posts = $client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts');
        $result = $posts->updateOne(
            [
                '_id' => new MongoDB\BSON\ObjectId($postCommentMatch[1]),
                'visibility' => 'public',
                'status' => 'published',
            ],
            [
                '$push' => [
                    'commentItems' => [
                        '$each' => [$comment],
                        '$slice' => -100,
                    ],
                ],
                '$inc' => ['comments' => 1],
            ],
        );
        if ($result->getMatchedCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $post = $posts->findOne(
            ['_id' => new MongoDB\BSON\ObjectId($postCommentMatch[1])],
            ['projection' => ['comments' => 1]],
        );
        http_response_code(201);
        echo json_encode([
            'comment' => $comment,
            'comments' => is_numeric($post['comments'] ?? null) ? (int) $post['comments'] : 1,
        ], JSON_THROW_ON_ERROR);
    } catch (InvalidArgumentException $error) {
        http_response_code(422);
        echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Feed post comment failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to add your comment right now. Please try again.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if (
    in_array($path, ['/api/lost-found', '/api/adoptions', '/api/saved-posts', '/api/providers/availability'], true) ||
    $path === '/api/adoption-applications' ||
    preg_match('#\A/api/adoption-applications/([0-9a-f]{24})\z#i', $path, $providerApplicationMatch) === 1 ||
    preg_match('#\A/api/adoptions/([0-9a-f]{24})/applications\z#i', $path, $applicationMatch) === 1 ||
    preg_match('#\A/api/providers/([0-9a-f]{24})/availability\z#i', $path, $publicAvailabilityMatch) === 1
) {
    header('Cache-Control: no-store');
    $isWrite = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);
    if ($isWrite && !requestHasAllowedOrigin($allowedOrigin)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        $isPublicListingRead = $method === 'GET' && in_array($path, ['/api/lost-found', '/api/adoptions'], true);
        $isPublicAvailabilityRead = $method === 'GET' && isset($publicAvailabilityMatch[1]);
        $sessionUser = null;
        if (!$isPublicListingRead && !$isPublicAvailabilityRead) {
            startAuthSession();
            $sessionUser = $_SESSION['user'] ?? null;
            if (!is_array($sessionUser) || !is_string($sessionUser['id'] ?? null)) {
                http_response_code(401);
                echo json_encode(['error' => 'Sign in to use this feature.'], JSON_THROW_ON_ERROR);
                exit;
            }
        }

        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';

        if ($path === '/api/lost-found') {
            $listings = $client->selectCollection($database, $_ENV['LOST_FOUND_COLLECTION'] ?? 'lost_found');
            $listings->createIndex(['status' => 1, 'createdAt' => -1]);
            if ($method === 'GET') {
                $query = trim((string) ($_GET['q'] ?? ''));
                $filter = ['status' => 'open'];
                if ($query !== '') {
                    $pattern = preg_quote(substr($query, 0, 100), '/');
                    $filter['$or'] = [
                        ['petName' => ['$regex' => $pattern, '$options' => 'i']],
                        ['breed' => ['$regex' => $pattern, '$options' => 'i']],
                        ['location' => ['$regex' => $pattern, '$options' => 'i']],
                        ['description' => ['$regex' => $pattern, '$options' => 'i']],
                    ];
                }
                $items = [];
                foreach ($listings->find($filter, ['sort' => ['createdAt' => -1], 'limit' => 100]) as $item) {
                    $item['id'] = (string) $item['_id'];
                    unset($item['_id'], $item['ownerId']);
                    $items[] = $item;
                }
                echo json_encode($items, JSON_THROW_ON_ERROR);
                exit;
            }
            if ($method !== 'POST') {
                http_response_code(405);
                header('Allow: GET, POST');
                echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
                exit;
            }
            $request = readJsonRequestBody();
            $type = $request['type'] ?? null;
            $petName = $request['petName'] ?? null;
            $breed = $request['breed'] ?? '';
            $location = $request['location'] ?? null;
            $description = $request['description'] ?? null;
            $contact = $request['contact'] ?? null;
            $latitude = $request['latitude'] ?? null;
            $longitude = $request['longitude'] ?? null;
            if (
                !is_string($type) || !in_array($type, ['lost', 'found'], true) ||
                !is_string($petName) || trim($petName) === '' || strlen($petName) > 100 ||
                !is_string($breed) || strlen($breed) > 100 ||
                !is_string($location) || trim($location) === '' || strlen($location) > 300 ||
                !is_string($description) || trim($description) === '' || strlen($description) > 2000 ||
                !is_string($contact) || trim($contact) === '' || strlen($contact) > 200 ||
                (($latitude === null) !== ($longitude === null)) ||
                ($latitude !== null && (!is_numeric($latitude) || (float) $latitude < -90 || (float) $latitude > 90)) ||
                ($longitude !== null && (!is_numeric($longitude) || (float) $longitude < -180 || (float) $longitude > 180))
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'Enter valid pet, location, description, and contact details.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $listing = [
                'type' => $type,
                'petName' => trim($petName),
                'breed' => trim($breed),
                'location' => trim($location),
                'description' => trim($description),
                'contact' => trim($contact),
                'latitude' => $latitude === null ? null : (float) $latitude,
                'longitude' => $longitude === null ? null : (float) $longitude,
                'ownerId' => $sessionUser['id'],
                'ownerName' => is_string($sessionUser['name'] ?? null) ? $sessionUser['name'] : 'Pawly member',
                'status' => 'open',
                'createdAt' => new MongoDB\BSON\UTCDateTime(),
            ];
            $inserted = $listings->insertOne($listing);
            $listing['id'] = (string) $inserted->getInsertedId();
            unset($listing['ownerId']);
            http_response_code(201);
            echo json_encode($listing, JSON_THROW_ON_ERROR);
            exit;
        }

        if ($path === '/api/adoptions') {
            $listings = $client->selectCollection($database, $_ENV['ADOPTIONS_COLLECTION'] ?? 'adoptions');
            $listings->createIndex(['status' => 1, 'createdAt' => -1]);
            if ($method === 'GET') {
                $query = trim((string) ($_GET['q'] ?? ''));
                $filter = ['status' => 'available'];
                if ($query !== '') {
                    $pattern = preg_quote(substr($query, 0, 100), '/');
                    $filter['$or'] = [
                        ['petName' => ['$regex' => $pattern, '$options' => 'i']],
                        ['breed' => ['$regex' => $pattern, '$options' => 'i']],
                        ['rescueName' => ['$regex' => $pattern, '$options' => 'i']],
                        ['location' => ['$regex' => $pattern, '$options' => 'i']],
                    ];
                }
                $items = [];
                foreach ($listings->find($filter, ['sort' => ['createdAt' => -1], 'limit' => 100]) as $item) {
                    $item['id'] = (string) $item['_id'];
                    unset($item['_id'], $item['providerUserId']);
                    $items[] = $item;
                }
                echo json_encode($items, JSON_THROW_ON_ERROR);
                exit;
            }
            if ($method !== 'POST' || ($sessionUser['role'] ?? '') !== 'provider') {
                http_response_code($method === 'POST' ? 403 : 405);
                header('Allow: GET, POST');
                echo json_encode(['error' => 'Only a provider account can publish an adoption listing.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $providers = $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers');
            $provider = $providers->findOne(['userId' => $sessionUser['id'], 'status' => 'active']);
            if ($provider === null) {
                http_response_code(403);
                echo json_encode(['error' => 'An active rescue-provider profile is required to publish adoption listings.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $request = readJsonRequestBody();
            $petName = $request['petName'] ?? null;
            $breed = $request['breed'] ?? null;
            $age = $request['age'] ?? null;
            $location = $request['location'] ?? null;
            $description = $request['description'] ?? null;
            $contact = $request['contact'] ?? null;
            if (
                !is_string($petName) || trim($petName) === '' || strlen($petName) > 100 ||
                !is_string($breed) || trim($breed) === '' || strlen($breed) > 100 ||
                !is_string($age) || trim($age) === '' || strlen($age) > 60 ||
                !is_string($location) || trim($location) === '' || strlen($location) > 300 ||
                !is_string($description) || trim($description) === '' || strlen($description) > 2000 ||
                !is_string($contact) || trim($contact) === '' || strlen($contact) > 200
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'Complete the pet, location, description, and contact fields.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $listing = [
                'petName' => trim($petName),
                'breed' => trim($breed),
                'age' => trim($age),
                'location' => trim($location),
                'description' => trim($description),
                'contact' => trim($contact),
                'rescueName' => is_string($provider['name'] ?? null) ? $provider['name'] : $sessionUser['name'],
                'providerId' => (string) $provider['_id'],
                'providerUserId' => $sessionUser['id'],
                'status' => 'available',
                'createdAt' => new MongoDB\BSON\UTCDateTime(),
            ];
            $inserted = $listings->insertOne($listing);
            $listing['id'] = (string) $inserted->getInsertedId();
            unset($listing['providerUserId']);
            http_response_code(201);
            echo json_encode($listing, JSON_THROW_ON_ERROR);
            exit;
        }

        if (isset($applicationMatch[1])) {
            if ($method !== 'POST' || ($sessionUser['role'] ?? '') !== 'owner') {
                http_response_code($method === 'POST' ? 403 : 405);
                header('Allow: POST');
                echo json_encode(['error' => 'Only pet owners can apply to adopt.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $listingId = strtolower($applicationMatch[1]);
            $listings = $client->selectCollection($database, $_ENV['ADOPTIONS_COLLECTION'] ?? 'adoptions');
            $listing = $listings->findOne(['_id' => new MongoDB\BSON\ObjectId($listingId), 'status' => 'available']);
            if ($listing === null) {
                http_response_code(404);
                echo json_encode(['error' => 'This adoption listing is no longer available.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $request = readJsonRequestBody();
            $message = $request['message'] ?? null;
            $contact = $request['contact'] ?? null;
            if (
                !is_string($message) || trim($message) === '' || strlen($message) > 2000 ||
                !is_string($contact) || trim($contact) === '' || strlen($contact) > 200
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'Add a short introduction and contact details.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $applications = $client->selectCollection($database, $_ENV['ADOPTION_APPLICATIONS_COLLECTION'] ?? 'adoption_applications');
            $applications->createIndex(['listingId' => 1, 'applicantId' => 1], ['unique' => true]);
            $application = [
                'listingId' => $listingId,
                'providerUserId' => $listing['providerUserId'],
                'applicantId' => $sessionUser['id'],
                'applicantName' => $sessionUser['name'] ?? 'Pawly member',
                'contact' => trim($contact),
                'message' => trim($message),
                'status' => 'submitted',
                'createdAt' => new MongoDB\BSON\UTCDateTime(),
            ];
            $applications->updateOne(
                ['listingId' => $listingId, 'applicantId' => $sessionUser['id']],
                ['$setOnInsert' => $application],
                ['upsert' => true],
            );
            http_response_code(201);
            echo json_encode(['submitted' => true], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($path === '/api/adoption-applications' || isset($providerApplicationMatch[1])) {
            if (!in_array($method, ['GET', 'PATCH'], true)) {
                http_response_code(405);
                header('Allow: GET, PATCH');
                echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
                exit;
            }
            if (($sessionUser['role'] ?? '') !== 'provider') {
                http_response_code(403);
                echo json_encode(['error' => 'Only rescue providers can manage adoption applications.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $applications = $client->selectCollection($database, $_ENV['ADOPTION_APPLICATIONS_COLLECTION'] ?? 'adoption_applications');
            $listings = $client->selectCollection($database, $_ENV['ADOPTIONS_COLLECTION'] ?? 'adoptions');
            if ($method === 'GET' && $path === '/api/adoption-applications') {
                $result = [];
                foreach ($applications->find(
                    ['providerUserId' => $sessionUser['id']],
                    ['sort' => ['createdAt' => -1], 'limit' => 200],
                ) as $application) {
                    $listing = $listings->findOne(['_id' => new MongoDB\BSON\ObjectId($application['listingId'])]);
                    $application['id'] = (string) $application['_id'];
                    $application['petName'] = is_string($listing['petName'] ?? null) ? $listing['petName'] : 'Pet';
                    unset($application['_id'], $application['providerUserId'], $application['applicantId']);
                    $result[] = $application;
                }
                echo json_encode($result, JSON_THROW_ON_ERROR);
                exit;
            }
            if ($method !== 'PATCH' || !isset($providerApplicationMatch[1])) {
                http_response_code(405);
                header('Allow: GET, PATCH');
                echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
                exit;
            }
            $request = readJsonRequestBody();
            $status = $request['status'] ?? null;
            if (!is_string($status) || !in_array($status, ['accepted', 'rejected'], true)) {
                http_response_code(422);
                echo json_encode(['error' => 'Choose accepted or rejected for this application.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $applicationId = strtolower($providerApplicationMatch[1]);
            $application = $applications->findOne([
                '_id' => new MongoDB\BSON\ObjectId($applicationId),
                'providerUserId' => $sessionUser['id'],
                'status' => 'submitted',
            ]);
            if ($application === null) {
                http_response_code(404);
                echo json_encode(['error' => 'Submitted application not found.'], JSON_THROW_ON_ERROR);
                exit;
            }
            if ($status === 'accepted') {
                $adopted = $listings->updateOne(
                    ['_id' => new MongoDB\BSON\ObjectId($application['listingId']), 'providerUserId' => $sessionUser['id'], 'status' => 'available'],
                    ['$set' => ['status' => 'adopted', 'updatedAt' => new MongoDB\BSON\UTCDateTime()]],
                );
                if ($adopted->getMatchedCount() !== 1) {
                    http_response_code(409);
                    echo json_encode(['error' => 'This pet has already been adopted or the listing is closed.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                $applications->updateMany(
                    ['listingId' => $application['listingId'], 'providerUserId' => $sessionUser['id'], 'status' => 'submitted', '_id' => ['$ne' => new MongoDB\BSON\ObjectId($applicationId)]],
                    ['$set' => ['status' => 'rejected', 'updatedAt' => new MongoDB\BSON\UTCDateTime()]],
                );
            }
            $applications->updateOne(
                ['_id' => new MongoDB\BSON\ObjectId($applicationId), 'providerUserId' => $sessionUser['id'], 'status' => 'submitted'],
                ['$set' => ['status' => $status, 'updatedAt' => new MongoDB\BSON\UTCDateTime()]],
            );
            echo json_encode(['status' => $status], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($path === '/api/saved-posts') {
            if (!in_array($method, ['GET', 'POST', 'PATCH', 'DELETE'], true)) {
                http_response_code(405);
                header('Allow: GET, POST, PATCH, DELETE');
                echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
                exit;
            }
            $savedPosts = $client->selectCollection($database, $_ENV['SAVED_POSTS_COLLECTION'] ?? 'saved_posts');
            $savedPosts->createIndex(['userId' => 1, 'postId' => 1, 'collection' => 1], ['unique' => true]);
            if ($method === 'GET') {
                if (isset($_GET['postId'])) {
                    $postId = $_GET['postId'];
                    if (!is_string($postId) || preg_match('/\A[0-9a-f]{24}\z/i', $postId) !== 1) {
                        http_response_code(422);
                        echo json_encode(['error' => 'Choose a valid post.'], JSON_THROW_ON_ERROR);
                        exit;
                    }
                    $entry = $savedPosts->findOne([
                        'userId' => $sessionUser['id'],
                        'postId' => strtolower($postId),
                    ]);
                    echo json_encode([
                        'saved' => $entry !== null,
                        'collection' => is_string($entry['collection'] ?? null) ? $entry['collection'] : null,
                    ], JSON_THROW_ON_ERROR);
                    exit;
                }
                $saved = [];
                $posts = $client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts');
                foreach ($savedPosts->find(['userId' => $sessionUser['id']], ['sort' => ['createdAt' => -1], 'limit' => 500]) as $entry) {
                    if (preg_match('/\A[0-9a-f]{24}\z/i', $entry['postId'] ?? '') !== 1) {
                        continue;
                    }
                    $post = $posts->findOne(['_id' => new MongoDB\BSON\ObjectId($entry['postId']), 'status' => 'published']);
                    if ($post === null) {
                        continue;
                    }
                    $post['id'] = (string) $post['_id'];
                    unset($post['_id']);
                    $saved[] = ['collection' => $entry['collection'], 'post' => $post];
                }
                echo json_encode($saved, JSON_THROW_ON_ERROR);
                exit;
            }
            $request = readJsonRequestBody();
            $postId = $request['postId'] ?? null;
            $collectionName = $request['collection'] ?? 'Saved posts';
            $previousCollection = $request['previousCollection'] ?? null;
            if (
                !is_string($postId) || preg_match('/\A[0-9a-f]{24}\z/i', $postId) !== 1 ||
                !is_string($collectionName) || trim($collectionName) === '' || strlen($collectionName) > 80 ||
                ($method === 'PATCH' && (!is_string($previousCollection) || trim($previousCollection) === '' || strlen($previousCollection) > 80))
            ) {
                http_response_code(422);
                echo json_encode(['error' => 'Choose a valid post and collection name.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $postId = strtolower($postId);
            $key = ['userId' => $sessionUser['id'], 'postId' => $postId, 'collection' => trim($collectionName)];
            if ($method === 'DELETE') {
                $savedPosts->deleteOne($key);
                echo json_encode(['saved' => false], JSON_THROW_ON_ERROR);
                exit;
            }
            if ($method === 'PATCH') {
                $previousKey = [
                    'userId' => $sessionUser['id'],
                    'postId' => $postId,
                    'collection' => trim((string) $previousCollection),
                ];
                if ($savedPosts->findOne($previousKey) === null) {
                    http_response_code(404);
                    echo json_encode(['error' => 'The saved post was not found in its current collection.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                $savedPosts->updateOne($key, ['$setOnInsert' => $key + ['createdAt' => new MongoDB\BSON\UTCDateTime()]], ['upsert' => true]);
                $savedPosts->deleteOne($previousKey);
                echo json_encode(['saved' => true, 'collection' => trim($collectionName)], JSON_THROW_ON_ERROR);
                exit;
            }
            $post = $client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts')->findOne([
                '_id' => new MongoDB\BSON\ObjectId($postId),
                'status' => 'published',
            ]);
            if ($post === null) {
                http_response_code(404);
                echo json_encode(['error' => 'This post is no longer available.'], JSON_THROW_ON_ERROR);
                exit;
            }
            $savedPosts->updateOne($key, ['$setOnInsert' => $key + ['createdAt' => new MongoDB\BSON\UTCDateTime()]], ['upsert' => true]);
            echo json_encode(['saved' => true], JSON_THROW_ON_ERROR);
            exit;
        }

        if ($path === '/api/providers/availability' || isset($publicAvailabilityMatch[1])) {
            $availability = $client->selectCollection($database, $_ENV['PROVIDER_AVAILABILITY_COLLECTION'] ?? 'provider_availability');
            $availability->createIndex(['providerId' => 1], ['unique' => true]);
            $providerId = isset($publicAvailabilityMatch[1]) ? strtolower($publicAvailabilityMatch[1]) : null;
            $providerUserId = null;
            if ($path === '/api/providers/availability') {
                if ($method !== 'GET' && $method !== 'PUT') {
                    http_response_code(405);
                    header('Allow: GET, PUT');
                    echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
                    exit;
                }
                if (($sessionUser['role'] ?? '') !== 'provider') {
                    http_response_code(403);
                    echo json_encode(['error' => 'Provider accounts manage availability.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                $provider = $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers')->findOne([
                    'userId' => $sessionUser['id'],
                ]);
                if ($provider === null) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Provider profile not found.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                $providerId = (string) $provider['_id'];
                $providerUserId = $sessionUser['id'];
            } else {
                $provider = $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers')->findOne([
                    '_id' => new MongoDB\BSON\ObjectId($providerId),
                    'status' => 'active',
                ]);
                if ($provider === null) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Provider availability is not public.'], JSON_THROW_ON_ERROR);
                    exit;
                }
            }
            $record = $availability->findOne(['providerId' => $providerId]);
            $slots = $record['slots'] ?? [];
            if ($method === 'PUT') {
                $request = readJsonRequestBody();
                $slots = $request['slots'] ?? null;
                if (!is_array($slots) || count($slots) > 200) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Availability must contain at most 200 time slots.'], JSON_THROW_ON_ERROR);
                    exit;
                }
                $normalized = [];
                foreach ($slots as $slot) {
                    if (!is_string($slot) || preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\z/', $slot) !== 1 ||
                        ($scheduled = (static function (string $value): ?DateTimeImmutable {
                        try {
                            $date = new DateTimeImmutable($value);
                            $errors = DateTimeImmutable::getLastErrors();
                            return $errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0)
                                ? $date
                                : null;
                        } catch (Throwable) {
                            return null;
                        }
                    })($slot)) === null || $scheduled <= new DateTimeImmutable()) {
                        http_response_code(422);
                        echo json_encode(['error' => 'Every availability slot must be a future ISO date and time.'], JSON_THROW_ON_ERROR);
                        exit;
                    }
                    $normalized[$scheduled->getTimestamp()] = $scheduled->format(DATE_ATOM);
                }
                $appointments = $client->selectCollection($database, $_ENV['APPOINTMENTS_COLLECTION'] ?? 'appointments');
                $slots = array_values($normalized);
                sort($slots);
                $bookingLocks = $client->selectCollection(
                    $database,
                    $_ENV['PROVIDER_BOOKING_LOCKS_COLLECTION'] ?? 'provider_booking_locks',
                );
                $saveResult = \Pawly\Infrastructure\ProviderBookingLock::synchronized(
                    $bookingLocks,
                    $providerId,
                    static function () use ($availability, $appointments, $normalized, $providerId, $providerUserId, $slots): array {
                        $currentRecord = $availability->findOne(['providerId' => $providerId]);
                        foreach (($currentRecord['bookedSlotEpochs'] ?? []) as $bookedSlot) {
                            if (is_int($bookedSlot) && !isset($normalized[$bookedSlot])) {
                                return ['conflict' => 'Availability cannot remove a time with an active booking.'];
                            }
                        }
                        foreach ($appointments->find([
                            'providerUserId' => $providerUserId,
                            'appointment.status' => ['$in' => ['PENDING', 'CONFIRMED', 'IN_PROGRESS']],
                        ]) as $appointment) {
                            $bookedAt = $appointment['appointment']['scheduledAt'] ?? null;
                            if (is_string($bookedAt) && !isset($normalized[(new DateTimeImmutable($bookedAt))->getTimestamp()])) {
                                return ['conflict' => 'Availability cannot remove a time with an active appointment.'];
                            }
                        }
                        $availability->updateOne(
                            ['providerId' => $providerId],
                            ['$set' => [
                                'providerId' => $providerId,
                                'providerUserId' => $providerUserId,
                                'slots' => $slots,
                                'updatedAt' => new MongoDB\BSON\UTCDateTime(),
                            ]],
                            ['upsert' => true],
                        );

                        return ['saved' => true];
                    },
                );
                if (isset($saveResult['conflict'])) {
                    http_response_code(409);
                    echo json_encode(['error' => $saveResult['conflict']], JSON_THROW_ON_ERROR);
                    exit;
                }
            } elseif ($method !== 'GET') {
                http_response_code(405);
                header('Allow: GET, PUT');
                echo json_encode(['error' => 'Method not allowed'], JSON_THROW_ON_ERROR);
                exit;
            }
            $appointments = $client->selectCollection($database, $_ENV['APPOINTMENTS_COLLECTION'] ?? 'appointments');
            $occupied = [];
            foreach ($appointments->find([
                'providerId' => $providerId,
                'appointment.status' => ['$in' => ['PENDING', 'CONFIRMED', 'IN_PROGRESS']],
            ]) as $appointment) {
                $bookedAt = $appointment['appointment']['scheduledAt'] ?? null;
                if (is_string($bookedAt)) {
                    $occupied[(new DateTimeImmutable($bookedAt))->getTimestamp()] = true;
                }
            }
            $availableSlots = array_values(array_filter($slots, static function (mixed $slot) use ($occupied): bool {
                if (!is_string($slot)) return false;
                try {
                    return !isset($occupied[(new DateTimeImmutable($slot))->getTimestamp()]);
                } catch (Throwable) {
                    return false;
                }
            }));
            echo json_encode(['slots' => $availableSlots], JSON_THROW_ON_ERROR);
            exit;
        }
    } catch (InvalidArgumentException $error) {
        http_response_code(400);
        echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Community feature request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to complete this request right now. Please try again.'], JSON_THROW_ON_ERROR);
    }
    exit;
}

if ($method === 'GET' && $path === '/api/health') {
    try {
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $client->selectDatabase($database)->command(['ping' => 1]);

        http_response_code(200);
        echo json_encode([
            'service' => 'pawly-api',
            'status' => 'ok',
            'mongodb' => 'connected',
        ], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        http_response_code(503);
        echo json_encode([
            'service' => 'pawly-api',
            'status' => 'degraded',
            'mongodb' => 'disconnected',
        ], JSON_THROW_ON_ERROR);
    }

    exit;
}

if ($path === '/api/providers/verification' && in_array($method, ['GET', 'POST'], true)) {
    header('Cache-Control: no-store');

    try {
        startAuthSession();
        $sessionUser = $_SESSION['user'] ?? null;
        if (!is_array($sessionUser) || !isset($sessionUser['id']) || !is_string($sessionUser['id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Sign in to manage provider verification.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $userId = $sessionUser['id'];
        $userEmail = is_string($sessionUser['email'] ?? null) ? strtolower(trim($sessionUser['email'])) : '';
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $providers = $client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers');
        $provider = $providers->findOne([
            '$or' => [
                ['userId' => $userId],
                ['email' => $userEmail],
            ],
        ]);

        if ($method === 'GET') {
            $status = is_array($provider) && is_string($provider['status'] ?? null)
                ? $provider['status']
                : 'not_started';
            if (!in_array($status, ['not_started', 'pending', 'needs-info', 'active'], true)) {
                $status = 'not_started';
            }
            $verified = is_array($provider) && ($provider['verified'] ?? false) === true;
            $payload = [
                'status' => $status,
                'verified' => $verified,
            ];
            if (is_array($provider) && isset($provider['license']) && is_string($provider['license'])) {
                $payload['license'] = $provider['license'];
            }

            http_response_code(200);
            echo json_encode($payload, JSON_THROW_ON_ERROR);
            exit;
        }

        if (!requestHasAllowedOrigin($allowedOrigin)) {
            http_response_code(403);
            echo json_encode(['error' => 'Invalid request origin'], JSON_THROW_ON_ERROR);
            exit;
        }

        $request = readJsonRequestBody();
        $license = $request['license'] ?? null;
        $trimmedLicense = is_string($license) ? trim($license) : '';
        if ($trimmedLicense === '' || strlen($trimmedLicense) > 200) {
            http_response_code(422);
            echo json_encode(['error' => 'Enter a valid business or license number.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $userRole = $sessionUser['role'] ?? 'owner';
        if ($userRole !== 'provider') {
            http_response_code(403);
            echo json_encode(['error' => 'Only providers can submit verification.'], JSON_THROW_ON_ERROR);
            exit;
        }

        $name = is_string($sessionUser['name'] ?? null) ? $sessionUser['name'] : ($userEmail !== '' ? $userEmail : 'Provider');
        $careType = is_string($sessionUser['careType'] ?? null) ? trim($sessionUser['careType']) : '';
        $countryCode = is_string($sessionUser['countryCode'] ?? null) ? strtoupper(trim($sessionUser['countryCode'])) : 'US';
        $now = new MongoDB\BSON\UTCDateTime();

        if ($provider === null) {
            $insert = [
                'userId' => $userId,
                'email' => $userEmail,
                'name' => $name,
                'type' => $careType !== '' ? $careType : 'Pet care',
                'category' => $careType !== '' ? $careType : 'Pet care',
                'location' => 'Location not provided',
                'countryCode' => in_array($countryCode, ['US', 'GB', 'AU', 'CA', 'DE', 'NG'], true) ? $countryCode : 'US',
                'image' => '/icon-192.svg',
                'rating' => 'New',
                'price' => 'Contact for pricing',
                'verified' => false,
                'status' => 'pending',
                'license' => $trimmedLicense,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];
            $providers->insertOne($insert);
        } else {
            $providers->updateOne(
                ['_id' => $provider['_id']],
                ['$set' => ['license' => $trimmedLicense, 'status' => 'pending', 'verified' => false, 'updatedAt' => $now]],
            );
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'pending',
            'verified' => false,
            'license' => $trimmedLicense,
        ], JSON_THROW_ON_ERROR);
        exit;
    } catch (Throwable $error) {
        error_log($error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Unable to update provider verification right now.'], JSON_THROW_ON_ERROR);
    }

    exit;
}

if ($path === '/api/search' && $method === 'GET') {
    header('Cache-Control: no-store');
    $query = trim((string) ($_GET['q'] ?? ''));
    if (strlen($query) < 2 || strlen($query) > 80) {
        http_response_code(200);
        echo json_encode(['people' => [], 'providers' => [], 'posts' => []], JSON_THROW_ON_ERROR);
        exit;
    }

    try {
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $regex = ['$regex' => preg_quote($query, '/'), '$options' => 'i'];
        $people = [];
        foreach ($client->selectCollection($database, $_ENV['USERS_COLLECTION'] ?? 'users')->find(
            [
                'role' => ['$in' => ['owner', 'provider']],
                '$or' => [
                    ['name' => $regex],
                    ['handle' => $regex],
                    ['careType' => $regex],
                ],
            ],
            ['projection' => ['name' => 1, 'handle' => 1, 'picture' => 1, 'role' => 1, 'verified' => 1], 'limit' => 10],
        ) as $person) {
            $name = is_string($person['name'] ?? null) ? $person['name'] : 'Pawly member';
            $email = is_string($person['email'] ?? null) ? $person['email'] : '';
            $handle = is_string($person['handle'] ?? null)
                ? $person['handle']
                : ($email !== '' && str_contains($email, '@')
                    ? strtolower(explode('@', $email, 2)[0])
                    : strtolower((string) preg_replace('/[^a-zA-Z0-9_]+/', '', $name)));
            $people[] = [
                'id' => (string) $person['_id'],
                'name' => $name,
                'handle' => $handle,
                'avatar' => is_string($person['picture'] ?? null) ? $person['picture'] : '',
                'role' => ($person['role'] ?? null) === 'provider' ? 'Provider' : 'Pet owner',
                'verified' => ($person['verified'] ?? false) === true,
            ];
        }

        $providers = [];
        foreach ($client->selectCollection($database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers')->find(
            [
                'status' => 'active',
                '$or' => [
                    ['name' => $regex],
                    ['type' => $regex],
                    ['location' => $regex],
                ],
            ],
            ['projection' => ['name' => 1, 'type' => 1, 'location' => 1, 'image' => 1, 'rating' => 1, 'countryCode' => 1, 'price' => 1], 'limit' => 10],
        ) as $provider) {
            $providers[] = [
                'id' => (string) $provider['_id'],
                'name' => $provider['name'] ?? 'Provider',
                'type' => $provider['type'] ?? 'Pet care',
                'location' => is_string($provider['location'] ?? null) ? $provider['location'] : '',
                'image' => is_string($provider['image'] ?? null) ? $provider['image'] : '',
                'rating' => is_string($provider['rating'] ?? null)
                    ? $provider['rating']
                    : (is_numeric($provider['rating'] ?? null) ? (string) $provider['rating'] : 'New'),
                'countryCode' => is_string($provider['countryCode'] ?? null) ? $provider['countryCode'] : '',
                'price' => is_string($provider['price'] ?? null)
                    ? $provider['price']
                    : (is_numeric($provider['price'] ?? null) ? (string) $provider['price'] : ''),
            ];
        }

        $posts = [];
        foreach ($client->selectCollection($database, $_ENV['POSTS_COLLECTION'] ?? 'posts')->find(
            [
                'visibility' => 'public',
                'status' => 'published',
                '$or' => [
                    ['text' => $regex],
                    ['handle' => $regex],
                    ['name' => $regex],
                    ['petName' => $regex],
                ],
            ],
            ['projection' => ['name' => 1, 'handle' => 1, 'avatar' => 1, 'text' => 1, 'pet' => 1, 'createdAt' => 1], 'sort' => ['createdAt' => -1], 'limit' => 10],
        ) as $post) {
            $createdAt = $post['createdAt'] ?? null;
            $posts[] = [
                'id' => (string) $post['_id'],
                'name' => is_string($post['name'] ?? null) ? $post['name'] : 'Pawly member',
                'handle' => is_string($post['handle'] ?? null) ? $post['handle'] : '',
                'avatar' => is_string($post['avatar'] ?? null) ? $post['avatar'] : '',
                'text' => is_string($post['text'] ?? null) ? $post['text'] : '',
                'petName' => is_string($post['pet'] ?? null) ? $post['pet'] : '',
                'time' => $createdAt instanceof MongoDB\BSON\UTCDateTime
                    ? $createdAt->toDateTime()->format(DATE_ATOM)
                    : '',
            ];
        }
        echo json_encode(['people' => $people, 'providers' => $providers, 'posts' => $posts], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Search request failed: ' . $error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Search is temporarily unavailable.'], JSON_THROW_ON_ERROR);
    }
    exit;
}

if ($method === 'GET' && in_array($path, ['/api/posts', '/api/providers'], true)) {
    header('Cache-Control: no-store');

    try {
        $currentUserId = null;
        if ($path === '/api/posts') {
            startAuthSession();
            $sessionUser = $_SESSION['user'] ?? null;
            $currentUserId = is_array($sessionUser) && is_string($sessionUser['id'] ?? null)
                ? $sessionUser['id']
                : null;
        }
        $client = MongoClientFactory::create();
        $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
        $resource = $path === '/api/posts' ? 'posts' : 'providers';
        $collectionName = $_ENV[strtoupper($resource) . '_COLLECTION'] ?? $resource;
        $filter = $resource === 'posts'
            ? ['visibility' => 'public', 'status' => 'published']
            : ['status' => 'active'];

        if ($resource === 'providers' && isset($_GET['countryCode'])) {
            $filter['countryCode'] = strtoupper((string) $_GET['countryCode']);
        }

        $documents = $client
            ->selectCollection($database, $collectionName)
            ->find($filter, ['limit' => 100, 'sort' => ['createdAt' => -1]]);
        $records = [];

        foreach ($documents as $document) {
            $record = $document;
            $record['id'] = (string) $record['_id'];
            if (
                $resource === 'posts' &&
                ($record['createdAt'] ?? null) instanceof MongoDB\BSON\UTCDateTime
            ) {
                $record['createdAt'] = $record['createdAt']->toDateTime()->format(DATE_ATOM);
                $record['time'] = $record['createdAt'];
            }
            if ($resource === 'posts') {
                $postUserId = $record['userId'] ?? null;
                if (is_string($postUserId) && preg_match('/\A[0-9a-f]{24}\z/i', $postUserId) === 1) {
                    $postUser = $client->selectCollection($database, $_ENV['USERS_COLLECTION'] ?? 'users')
                        ->findOne(
                            ['_id' => new MongoDB\BSON\ObjectId($postUserId)],
                            ['projection' => ['verified' => 1]],
                        );
                    $record['verified'] = $postUser !== null && ($postUser['verified'] ?? false) === true;
                } else {
                    $record['verified'] = false;
                }
                $likedBy = is_array($record['likedBy'] ?? null) ? $record['likedBy'] : [];
                $record['liked'] = $currentUserId !== null && in_array($currentUserId, $likedBy, true);
                $record['likes'] = max(0, is_numeric($record['likes'] ?? null) ? (int) $record['likes'] : 0);
                $resharedBy = is_array($record['resharedBy'] ?? null) ? $record['resharedBy'] : [];
                $record['reshared'] = $currentUserId !== null && in_array($currentUserId, $resharedBy, true);
                $record['reshares'] = max(0, is_numeric($record['reshares'] ?? null) ? (int) $record['reshares'] : 0);
                unset($record['likedBy']);
                unset($record['resharedBy']);
            }
            unset($record['_id'], $record['passwordHash'], $record['password']);
            $records[] = $record;
        }

        http_response_code(200);
        echo json_encode($records, JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Live data is unavailable'], JSON_THROW_ON_ERROR);
    }

    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found'], JSON_THROW_ON_ERROR);