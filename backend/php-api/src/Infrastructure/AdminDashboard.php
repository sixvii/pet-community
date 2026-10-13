<?php

declare(strict_types=1);

namespace Pawly\Infrastructure;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Client;
use MongoDB\Collection;
use Throwable;

final class AdminDashboard
{
    private const SESSION_TTL_SECONDS = 28800;

    public static function handle(string $path, string $method, string $allowedOrigin): void
    {
        header('Cache-Control: no-store');
        if ($path === '/api/admin/login') {
            self::login($method, $allowedOrigin);

            return;
        }
        if (!str_starts_with($path, '/api/admin/')) {
            return;
        }

        try {
            $client = MongoClientFactory::create();
            $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
            $session = self::adminSession($client, $database);
            if ($session === null) {
                self::respond(401, ['error' => 'Admin session is invalid or expired. Sign in again.']);

                return;
            }

            if ($method !== 'GET' && !requestHasAllowedOrigin($allowedOrigin)) {
                self::respond(403, ['error' => 'Invalid request origin']);

                return;
            }

            if ($path === '/api/admin/dashboard' && $method === 'GET') {
                self::dashboard($client, $database, $session);

                return;
            }
            if ($path === '/api/admin/data') {
                if ($method !== 'GET') {
                    header('Allow: GET');
                    self::respond(405, ['error' => 'Method not allowed']);

                    return;
                }
                self::privateData($client, $database, $session);

                return;
            }
            if ($path === '/api/admin/reviews' && $method === 'GET') {
                self::pendingReviews($client, $database);

                return;
            }

            $request = readJsonRequestBody();
            self::mutate($client, $database, $session, $path, $method, $request);
        } catch (\InvalidArgumentException $error) {
            self::respond(400, ['error' => $error->getMessage()]);
        } catch (Throwable $error) {
            error_log('Admin dashboard request failed: ' . $error->getMessage());
            self::respond(503, ['error' => 'Unable to complete the admin request right now.']);
        }
    }

    private static function login(string $method, string $allowedOrigin): void
    {
        if ($method !== 'POST') {
            header('Allow: POST');
            self::respond(405, ['error' => 'Method not allowed']);

            return;
        }
        if (!requestHasAllowedOrigin($allowedOrigin)) {
            self::respond(403, ['error' => 'Invalid request origin']);

            return;
        }

        try {
            $request = readJsonRequestBody();
            $email = $request['email'] ?? null;
            $password = $request['password'] ?? null;
            $configuredEmail = strtolower(trim($_ENV['SUPERADMIN_EMAIL'] ?? ''));
            $configuredPassword = $_ENV['SUPERADMIN_PASSWORD'] ?? '';
            if (!is_string($email) || !is_string($password)) {
                self::respond(422, ['error' => 'Email and password are required.']);

                return;
            }
            if ($configuredEmail === '' || $configuredPassword === '') {
                self::respond(503, ['error' => 'Admin sign-in is not configured.']);

                return;
            }

            $email = strtolower(trim($email));
            $client = MongoClientFactory::create();
            $database = $_ENV['MONGODB_DATABASE'] ?? 'pawly';
            $isSuperadmin = hash_equals($configuredEmail, $email)
                && hash_equals($configuredPassword, $password);
            $account = null;
            if ($isSuperadmin) {
                $account = [
                    'id' => 'superadmin',
                    'name' => 'Pawly Superadmin',
                    'email' => $configuredEmail,
                    'role' => 'superadmin',
                    'status' => 'active',
                    'mustChangePassword' => false,
                ];
            } else {
                $stored = self::collection($client, $database, 'admin_accounts')->findOne(['email' => $email]);
                $passwordHash = $stored['passwordHash'] ?? null;
                if (
                    $stored !== null &&
                    ($stored['status'] ?? 'active') === 'active' &&
                    is_string($passwordHash) &&
                    password_verify($password, $passwordHash)
                ) {
                    $account = self::adminAccount($stored);
                }
            }

            if ($account === null) {
                self::respond(401, ['error' => 'Email or password is incorrect.']);

                return;
            }

            $token = bin2hex(random_bytes(32));
            $expiresAt = time() + self::SESSION_TTL_SECONDS;
            self::collection($client, $database, 'admin_sessions')->insertOne([
                'tokenHash' => hash('sha256', $token),
                'email' => $account['email'],
                'role' => $account['role'],
                'expiresAt' => new UTCDateTime($expiresAt * 1000),
                'createdAt' => new UTCDateTime(),
            ]);
            self::respond(200, [
                'session' => [
                    'email' => $account['email'],
                    'role' => $account['role'],
                    'token' => $token,
                    'account' => $account,
                ],
            ]);
        } catch (\InvalidArgumentException $error) {
            self::respond(400, ['error' => $error->getMessage()]);
        } catch (Throwable $error) {
            error_log('Admin login failed: ' . $error->getMessage());
            self::respond(503, ['error' => 'Unable to sign in right now. Please try again.']);
        }
    }

    private static function adminSession(Client $client, string $database): ?array
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer ([a-f0-9]{64})$/', $authorization, $matches)) {
            return null;
        }
        $session = self::collection($client, $database, 'admin_sessions')->findOne([
            'tokenHash' => hash('sha256', $matches[1]),
            'expiresAt' => ['$gt' => new UTCDateTime()],
        ]);
        if ($session === null) {
            return null;
        }
        $email = $session['email'] ?? '';
        if (is_string($email) && hash_equals(strtolower($_ENV['SUPERADMIN_EMAIL'] ?? ''), strtolower($email))) {
            return ['email' => $email, 'role' => 'superadmin'];
        }

        $account = self::collection($client, $database, 'admin_accounts')->findOne(['email' => $email]);
        if ($account === null || ($account['status'] ?? 'active') !== 'active') {
            return null;
        }

        return ['email' => $email, 'role' => $account['role'] ?? 'admin'];
    }

    private static function dashboard(Client $client, string $database, array $session): void
    {
        $users = [];
        foreach (self::collection($client, $database, $_ENV['USERS_COLLECTION'] ?? 'users')
            ->find([], ['projection' => ['passwordHash' => 0], 'sort' => ['createdAt' => -1]]) as $document) {
            $record = self::record($document);
            $role = $record['role'] ?? 'owner';
            $users[] = [
                'id' => (string) ($record['_id'] ?? ''),
                'name' => is_string($record['name'] ?? null) ? $record['name'] : '',
                'email' => is_string($record['email'] ?? null) ? $record['email'] : '',
                'location' => is_string($record['location'] ?? null) && trim($record['location']) !== ''
                    ? $record['location']
                    : 'Not provided',
                'avatar' => is_string($record['picture'] ?? null) ? $record['picture'] : '',
                'online' => false,
                'type' => $role === 'provider' ? 'Provider' : 'Pet owner',
                'status' => ($record['status'] ?? 'active') === 'suspended' ? 'suspended' : 'active',
                'verified' => ($record['verified'] ?? false) === true,
            ];
        }

        $projects = [];
        foreach (self::collection($client, $database, $_ENV['PROJECTS_COLLECTION'] ?? 'admin_projects')
            ->find([], ['sort' => ['createdAt' => -1]]) as $document) {
            $record = self::record($document);
            $projects[] = [
                'id' => (string) ($record['_id'] ?? ''),
                'name' => (string) ($record['name'] ?? ''),
                'category' => (string) ($record['category'] ?? 'Community'),
                'description' => (string) ($record['description'] ?? ''),
                'region' => (string) ($record['region'] ?? 'Global'),
                'members' => (int) ($record['members'] ?? 0),
                'status' => ($record['status'] ?? 'active') === 'paused' ? 'paused' : 'active',
            ];
        }

        $requests = [];
        foreach (self::collection($client, $database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers')
            ->find(['status' => ['$in' => ['pending', 'needs-info']]], ['sort' => ['createdAt' => -1]]) as $document) {
            $record = self::record($document);
            $requests[] = [
                'id' => (string) ($record['_id'] ?? ''),
                'name' => (string) ($record['name'] ?? ''),
                'email' => (string) ($record['email'] ?? ''),
                'category' => (string) ($record['category'] ?? $record['type'] ?? 'Provider'),
                'location' => is_string($record['location'] ?? null) && trim($record['location']) !== ''
                    ? $record['location']
                    : 'Location not provided',
                'countryCode' => (string) ($record['countryCode'] ?? ''),
                'license' => (string) ($record['license'] ?? ''),
                'status' => ($record['status'] ?? '') === 'needs-info' ? 'needs-info' : 'pending',
            ];
        }

        $reports = [];
        foreach (self::collection($client, $database, $_ENV['REPORTS_COLLECTION'] ?? 'reports')
            ->find(['status' => ['$nin' => ['resolved', 'dismissed']]], ['sort' => ['createdAt' => -1]]) as $document) {
            $record = self::record($document);
            $reports[] = [
                'id' => (string) ($record['_id'] ?? ''),
                'postId' => (string) ($record['postId'] ?? ''),
                'author' => (string) ($record['author'] ?? ''),
                'reason' => (string) ($record['reason'] ?? 'Community report'),
                'excerpt' => (string) ($record['excerpt'] ?? ''),
                'reportedBy' => (string) ($record['reportedBy'] ?? ''),
                'time' => self::dateString($record['createdAt'] ?? null),
            ];
        }

        $team = [[
            'id' => 'superadmin',
            'name' => 'Pawly Superadmin',
            'email' => strtolower($_ENV['SUPERADMIN_EMAIL'] ?? ''),
            'avatar' => '',
            'role' => 'superadmin',
            'status' => 'active',
        ]];
        foreach (self::collection($client, $database, 'admin_accounts')->find(
            ['email' => ['$ne' => strtolower($_ENV['SUPERADMIN_EMAIL'] ?? '')]],
            ['sort' => ['createdAt' => -1]],
        ) as $document) {
            $team[] = self::adminAccount($document);
        }

        $profilePhotos = [];
        foreach (self::collection($client, $database, 'admin_profiles')->find([]) as $document) {
            $record = self::record($document);
            if (is_string($record['email'] ?? null) && is_string($record['avatar'] ?? null)) {
                $profilePhotos[strtolower($record['email'])] = $record['avatar'];
            }
        }
        foreach ($team as &$member) {
            $memberEmail = strtolower((string) ($member['email'] ?? ''));
            if (isset($profilePhotos[$memberEmail])) {
                $member['avatar'] = $profilePhotos[$memberEmail];
            }
        }
        unset($member);

        $profile = ($session['role'] ?? '') === 'superadmin'
            ? [
                'id' => 'superadmin',
                'name' => 'Pawly Superadmin',
                'email' => $session['email'],
                'role' => 'superadmin',
                'status' => 'active',
                'avatar' => '',
                'mustChangePassword' => false,
            ]
            : self::adminAccount(self::collection($client, $database, 'admin_accounts')->findOne(['email' => $session['email']]));
        $profileEmail = strtolower((string) ($profile['email'] ?? ''));
        if (isset($profilePhotos[$profileEmail])) {
            $profile['avatar'] = $profilePhotos[$profileEmail];
        }

        self::respond(200, compact('users', 'projects', 'requests', 'reports', 'team', 'profile'));
    }

    private static function privateData(Client $client, string $database, array $session): void
    {
        $datasets = [
            'users' => [$_ENV['USERS_COLLECTION'] ?? 'users', ['name' => 1, 'email' => 1, 'handle' => 1, 'role' => 1, 'status' => 1, 'location' => 1, 'picture' => 1, 'careType' => 1, 'countryCode' => 1, 'createdAt' => 1, 'updatedAt' => 1]],
            'providers' => [$_ENV['PROVIDERS_COLLECTION'] ?? 'providers', ['userId' => 1, 'name' => 1, 'email' => 1, 'type' => 1, 'category' => 1, 'location' => 1, 'countryCode' => 1, 'image' => 1, 'rating' => 1, 'price' => 1, 'verified' => 1, 'status' => 1, 'license' => 1, 'createdAt' => 1, 'updatedAt' => 1]],
            'pets' => [$_ENV['PETS_COLLECTION'] ?? 'pets', ['userId' => 1, 'name' => 1, 'breed' => 1, 'age' => 1, 'image' => 1, 'createdAt' => 1]],
            'medical-records' => [$_ENV['MEDICAL_RECORDS_COLLECTION'] ?? 'medical_records', ['userId' => 1, 'petId' => 1, 'type' => 1, 'title' => 1, 'date' => 1, 'dueDate' => 1, 'notes' => 1, 'createdAt' => 1]],
            'appointments' => [$_ENV['APPOINTMENTS_COLLECTION'] ?? 'appointments', ['ownerId' => 1, 'providerUserId' => 1, 'providerId' => 1, 'appointment' => 1, 'scheduledAt' => 1, 'createdAt' => 1, 'updatedAt' => 1]],
            'account-data' => [$_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data', ['userId' => 1, 'data' => 1, 'updatedAt' => 1]],
            'conversations' => [$_ENV['CONVERSATIONS_COLLECTION'] ?? 'conversations', ['participants' => 1, 'lastMessage' => 1, 'createdAt' => 1, 'updatedAt' => 1]],
            'messages' => [$_ENV['MESSAGES_COLLECTION'] ?? 'messages', ['conversationId' => 1, 'senderId' => 1, 'text' => 1, 'createdAt' => 1, 'readBy' => 1]],
            'follows' => [$_ENV['FOLLOWS_COLLECTION'] ?? 'follows', ['followerId' => 1, 'followedId' => 1, 'createdAt' => 1]],
            'posts' => [$_ENV['POSTS_COLLECTION'] ?? 'posts', ['userId' => 1, 'name' => 1, 'handle' => 1, 'text' => 1, 'pet' => 1, 'media' => 1, 'image' => 1, 'imageAlt' => 1, 'likes' => 1, 'comments' => 1, 'visibility' => 1, 'status' => 1, 'createdAt' => 1]],
            'reviews' => [$_ENV['REVIEWS_COLLECTION'] ?? 'provider_reviews', ['providerId' => 1, 'providerName' => 1, 'userId' => 1, 'reviewerName' => 1, 'rating' => 1, 'text' => 1, 'status' => 1, 'createdAt' => 1]],
            'reports' => [$_ENV['REPORTS_COLLECTION'] ?? 'reports', ['postId' => 1, 'author' => 1, 'reason' => 1, 'excerpt' => 1, 'reportedBy' => 1, 'status' => 1, 'resolution' => 1, 'createdAt' => 1, 'resolvedAt' => 1, 'resolvedBy' => 1]],
            'projects' => [$_ENV['PROJECTS_COLLECTION'] ?? 'admin_projects', ['name' => 1, 'category' => 1, 'description' => 1, 'region' => 1, 'members' => 1, 'status' => 1, 'createdAt' => 1]],
            'lost-found' => [$_ENV['LOST_FOUND_COLLECTION'] ?? 'lost_found', ['type' => 1, 'petName' => 1, 'breed' => 1, 'location' => 1, 'description' => 1, 'contact' => 1, 'latitude' => 1, 'longitude' => 1, 'ownerId' => 1, 'ownerName' => 1, 'status' => 1, 'createdAt' => 1]],
            'adoptions' => [$_ENV['ADOPTIONS_COLLECTION'] ?? 'adoptions', ['petName' => 1, 'breed' => 1, 'age' => 1, 'location' => 1, 'description' => 1, 'contact' => 1, 'rescueName' => 1, 'providerUserId' => 1, 'status' => 1, 'createdAt' => 1, 'updatedAt' => 1]],
            'adoption-applications' => [$_ENV['ADOPTION_APPLICATIONS_COLLECTION'] ?? 'adoption_applications', ['listingId' => 1, 'providerUserId' => 1, 'applicantId' => 1, 'applicantName' => 1, 'contact' => 1, 'message' => 1, 'status' => 1, 'createdAt' => 1, 'updatedAt' => 1]],
            'saved-posts' => [$_ENV['SAVED_POSTS_COLLECTION'] ?? 'saved_posts', ['userId' => 1, 'postId' => 1, 'collection' => 1, 'createdAt' => 1]],
            'provider-availability' => [$_ENV['PROVIDER_AVAILABILITY_COLLECTION'] ?? 'provider_availability', ['providerId' => 1, 'providerUserId' => 1, 'slots' => 1, 'bookedSlotEpochs' => 1, 'updatedAt' => 1]],
            'admin-accounts' => ['admin_accounts', ['email' => 1, 'name' => 1, 'role' => 1, 'status' => 1, 'mustChangePassword' => 1, 'createdAt' => 1]],
        ];

        $resource = $_GET['resource'] ?? null;
        if (!is_string($resource) || !isset($datasets[$resource])) {
            self::respond(422, ['error' => 'Choose a valid admin data resource.', 'resources' => array_keys($datasets)]);

            return;
        }
        $pageValue = $_GET['page'] ?? '1';
        if (!is_string($pageValue) || preg_match('/\A[1-9]\d{0,3}\z/', $pageValue) !== 1) {
            self::respond(422, ['error' => 'Page must be a positive integer no greater than 9999.']);

            return;
        }

        $page = (int) $pageValue;
        $pageSize = $resource === 'account-data' ? 1 : ($resource === 'posts' ? 10 : 25);
        [$collectionName, $projection] = $datasets[$resource];
        $collection = self::collection($client, $database, $collectionName);
        $total = $collection->countDocuments([]);
        $records = [];
        foreach ($collection->find([], [
            'projection' => $projection,
            'sort' => ['createdAt' => -1, '_id' => -1],
            'skip' => ($page - 1) * $pageSize,
            'limit' => $pageSize,
        ]) as $document) {
            $record = self::record($document);
            $record['id'] = (string) ($record['_id'] ?? '');
            unset($record['_id']);
            $records[] = self::safeDataValue($record);
        }

        self::collection($client, $database, $_ENV['ADMIN_DATA_ACCESS_AUDIT_COLLECTION'] ?? 'admin_data_access_audit')->insertOne([
            'adminEmail' => $session['email'],
            'resource' => $resource,
            'page' => $page,
            'recordCount' => count($records),
            'createdAt' => new UTCDateTime(),
        ]);

        self::respond(200, [
            'resource' => $resource,
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'records' => $records,
        ]);
    }

    private static function safeDataValue(mixed $value): mixed
    {
        if ($value instanceof ObjectId) {
            return (string) $value;
        }
        if ($value instanceof UTCDateTime) {
            return $value->toDateTime()->format(DATE_ATOM);
        }
        if (is_array($value)) {
            $safe = [];
            foreach ($value as $key => $item) {
                if (is_string($key) && preg_match('/password|secret|token|credential|api.?key|authorization|cookie/i', $key) === 1) {
                    continue;
                }
                $safe[$key] = self::safeDataValue($item);
            }

            return $safe;
        }
        if ($value instanceof \JsonSerializable) {
            return self::safeDataValue($value->jsonSerialize());
        }

        return $value;
    }

    private static function mutate(
        Client $client,
        string $database,
        array $session,
        string $path,
        string $method,
        array $request,
    ): void {
        $isSuperadmin = ($session['role'] ?? '') === 'superadmin';
        if ($path === '/api/admin/reviews' && $method === 'POST') {
            $reviewId = $request['reviewId'] ?? null;
            $decision = $request['decision'] ?? null;
            if (
                !is_string($reviewId) ||
                !preg_match('/\A[0-9a-f]{24}\z/i', $reviewId) ||
                !in_array($decision, ['approve', 'reject'], true)
            ) {
                self::respond(422, ['error' => 'A review and moderation decision are required.']);

                return;
            }
            $reviews = self::collection(
                $client,
                $database,
                $_ENV['REVIEWS_COLLECTION'] ?? 'provider_reviews',
            );
            $updated = $reviews->updateOne(
                ['_id' => new ObjectId(strtolower($reviewId)), 'status' => 'pending'],
                ['$set' => [
                    'status' => $decision === 'approve' ? 'approved' : 'rejected',
                    'moderatedAt' => new UTCDateTime(),
                    'moderatedBy' => $session['email'],
                ]],
            );
            if ($updated->getModifiedCount() !== 1) {
                self::respond(404, ['error' => 'Pending review not found.']);

                return;
            }
            self::respond(200, ['moderated' => true]);

            return;
        }
        if (!$isSuperadmin && in_array($path, ['/api/admin/projects', '/api/admin/projects/status', '/api/admin/accounts', '/api/admin/accounts/status'], true)) {
            self::respond(403, ['error' => 'Superadmin access is required.']);

            return;
        }

        if ($path === '/api/admin/projects' && $method === 'POST') {
            $name = self::requiredText($request, 'name', 120);
            $project = [
                'name' => $name,
                'category' => self::optionalText($request, 'category', 80, 'Community'),
                'description' => self::optionalText($request, 'description', 1000, ''),
                'region' => self::optionalText($request, 'region', 120, 'Global'),
                'members' => 0,
                'status' => 'active',
                'createdAt' => new UTCDateTime(),
                'createdBy' => $session['email'],
            ];
            $result = self::collection($client, $database, $_ENV['PROJECTS_COLLECTION'] ?? 'admin_projects')->insertOne($project);
            self::respond(201, ['project' => ['id' => (string) $result->getInsertedId()] + $project]);

            return;
        }
        if ($path === '/api/admin/profile/avatar' && $method === 'POST') {
            $avatar = $request['avatar'] ?? null;
            if (
                !is_string($avatar) ||
                !preg_match('/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+\/]+={0,2})$/', $avatar, $matches)
            ) {
                self::respond(422, ['error' => 'Upload a PNG, JPEG, or WebP profile picture.']);

                return;
            }
            $imageData = base64_decode($matches[2], true);
            $imageInfo = false;
            if (is_string($imageData) && strlen($imageData) <= 4 * 1024 * 1024) {
                set_error_handler(static fn (): bool => true);
                try {
                    $imageInfo = getimagesizefromstring($imageData);
                } finally {
                    restore_error_handler();
                }
            }
            $expectedMime = ['png' => 'image/png', 'jpeg' => 'image/jpeg', 'webp' => 'image/webp'][$matches[1]];
            if ($imageInfo === false || ($imageInfo['mime'] ?? '') !== $expectedMime) {
                self::respond(422, ['error' => 'The profile picture must be a valid image no larger than 4 MB.']);

                return;
            }

            self::collection($client, $database, 'admin_profiles')->updateOne(
                ['email' => $session['email']],
                ['$set' => ['email' => $session['email'], 'avatar' => $avatar, 'updatedAt' => new UTCDateTime()]],
                ['upsert' => true],
            );
            self::respond(200, ['avatar' => $avatar]);

            return;
        }
        if ($path === '/api/admin/projects/status' && $method === 'POST') {
            $status = $request['status'] ?? null;
            if (!in_array($status, ['active', 'paused'], true)) {
                self::respond(422, ['error' => 'Choose a valid project status.']);

                return;
            }
            $result = self::collection($client, $database, $_ENV['PROJECTS_COLLECTION'] ?? 'admin_projects')
                ->updateOne(['_id' => self::mongoId(self::requiredText($request, 'id', 100))], ['$set' => ['status' => $status]]);
            self::updatedOrNotFound($result->getMatchedCount());

            return;
        }
        if ($path === '/api/admin/users/status' && $method === 'POST') {
            $status = $request['status'] ?? null;
            if (!in_array($status, ['active', 'suspended'], true)) {
                self::respond(422, ['error' => 'Choose a valid user status.']);

                return;
            }
            $result = self::collection($client, $database, $_ENV['USERS_COLLECTION'] ?? 'users')
                ->updateOne(['_id' => self::mongoId(self::requiredText($request, 'id', 100))], ['$set' => ['status' => $status, 'updatedAt' => new UTCDateTime()]]);
            self::updatedOrNotFound($result->getMatchedCount());

            return;
        }
        if ($path === '/api/admin/users/verification' && $method === 'POST') {
            $id = self::requiredText($request, 'id', 100);
            $verified = $request['verified'] ?? null;
            if (!is_bool($verified)) {
                self::respond(422, ['error' => 'Choose whether this user is verified.']);

                return;
            }
            $result = self::collection($client, $database, $_ENV['USERS_COLLECTION'] ?? 'users')
                ->updateOne(
                    ['_id' => self::mongoId($id)],
                    ['$set' => ['verified' => $verified, 'verifiedAt' => $verified ? new UTCDateTime() : null, 'updatedAt' => new UTCDateTime()]],
                );
            self::updatedOrNotFound($result->getMatchedCount());

            return;
        }
        if ($path === '/api/admin/providers/status' && $method === 'POST') {
            $id = self::requiredText($request, 'id', 100);
            $status = $request['status'] ?? null;
            if (!in_array($status, ['active', 'needs-info'], true)) {
                self::respond(422, ['error' => 'Choose a valid provider status.']);

                return;
            }
            $providers = self::collection($client, $database, $_ENV['PROVIDERS_COLLECTION'] ?? 'providers');
            $provider = $providers->findOne(['_id' => self::mongoId($id)]);
            if ($provider === null) {
                self::respond(404, ['error' => 'Provider application not found.']);

                return;
            }
            $updates = ['status' => $status, 'updatedAt' => new UTCDateTime()];
            if ($status === 'active') {
                if (!is_string($provider['license'] ?? null) || trim($provider['license']) === '') {
                    self::respond(422, ['error' => 'A license number is required before approving this provider.']);

                    return;
                }
                $updates['verified'] = true;
                $userId = $provider['userId'] ?? null;
                if (
                    is_string($userId) &&
                    $userId !== '' &&
                    in_array($provider['image'] ?? '', ['', '/icon-192.svg'], true)
                ) {
                    $user = self::collection($client, $database, $_ENV['USERS_COLLECTION'] ?? 'users')
                        ->findOne(['_id' => self::mongoId($userId)], ['projection' => ['picture' => 1]]);
                    if (is_string($user['picture'] ?? null)) {
                        $updates['image'] = $user['picture'];
                    }
                }
            }
            $result = $providers->updateOne(['_id' => self::mongoId($id)], ['$set' => $updates]);
            self::updatedOrNotFound($result->getMatchedCount());

            return;
        }
        if ($path === '/api/admin/reports/status' && $method === 'POST') {
            $id = self::requiredText($request, 'id', 100);
            $action = $request['action'] ?? null;
            if (!in_array($action, ['dismiss', 'remove'], true)) {
                self::respond(422, ['error' => 'Choose a valid moderation action.']);

                return;
            }
            $reports = self::collection($client, $database, $_ENV['REPORTS_COLLECTION'] ?? 'reports');
            $report = $reports->findOne(['_id' => self::mongoId($id)]);
            if ($report === null) {
                self::respond(404, ['error' => 'Report not found.']);

                return;
            }
            if ($action === 'remove') {
                $postId = $report['postId'] ?? null;
                if (!is_string($postId) || $postId === '') {
                    self::respond(422, ['error' => 'This report does not identify a post to remove.']);

                    return;
                }
                self::collection($client, $database, $_ENV['POSTS_COLLECTION'] ?? 'posts')
                    ->updateOne(['_id' => self::mongoId($postId)], ['$set' => ['status' => 'removed', 'removedAt' => new UTCDateTime()]]);
            }
            $reports->updateOne(
                ['_id' => self::mongoId($id)],
                ['$set' => ['status' => 'resolved', 'resolution' => $action, 'resolvedAt' => new UTCDateTime(), 'resolvedBy' => $session['email']]],
            );
            self::respond(200, ['ok' => true]);

            return;
        }
        if ($path === '/api/admin/accounts' && $method === 'POST' && $isSuperadmin) {
            $email = strtolower(self::requiredText($request, 'email', 254));
            $password = $request['temporaryPassword'] ?? null;
            $role = $request['role'] ?? 'admin';
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_string($password) || strlen($password) < 8 || strlen($password) > 4096 || $role !== 'admin') {
                self::respond(422, ['error' => 'Provide a valid admin email, role, and temporary password of at least 8 characters.']);

                return;
            }
            if (hash_equals(strtolower($_ENV['SUPERADMIN_EMAIL'] ?? ''), $email)) {
                self::respond(409, ['error' => 'This email is reserved for the configured superadmin.']);

                return;
            }
            $accounts = self::collection($client, $database, 'admin_accounts');
            if ($accounts->findOne(['email' => $email]) !== null) {
                self::respond(409, ['error' => 'An admin account with this email already exists.']);

                return;
            }
            $account = [
                'email' => $email,
                'name' => $email,
                'role' => 'admin',
                'status' => 'active',
                'mustChangePassword' => true,
                'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
                'createdAt' => new UTCDateTime(),
            ];
            $result = $accounts->insertOne($account);
            self::respond(201, ['account' => ['id' => (string) $result->getInsertedId()] + self::adminAccount($account)]);

            return;
        }
        if ($path === '/api/admin/accounts/status' && $method === 'POST' && $isSuperadmin) {
            $email = strtolower(self::requiredText($request, 'email', 254));
            $status = $request['status'] ?? null;
            if (!in_array($status, ['active', 'suspended'], true) || hash_equals(strtolower($_ENV['SUPERADMIN_EMAIL'] ?? ''), $email)) {
                self::respond(422, ['error' => 'Choose a valid admin account status.']);

                return;
            }
            $result = self::collection($client, $database, 'admin_accounts')
                ->updateOne(['email' => $email], ['$set' => ['status' => $status, 'updatedAt' => new UTCDateTime()]]);
            self::updatedOrNotFound($result->getMatchedCount());

            return;
        }
        if ($path === '/api/admin/password' && $method === 'POST') {
            $password = $request['password'] ?? null;
            if (!is_string($password) || strlen($password) < 8 || strlen($password) > 4096) {
                self::respond(422, ['error' => 'Password must be at least 8 characters.']);

                return;
            }
            if ($isSuperadmin) {
                self::respond(409, ['error' => 'The configured superadmin password must be changed in the backend environment.']);

                return;
            }
            $accounts = self::collection($client, $database, 'admin_accounts');
            $accounts->updateOne(
                ['email' => $session['email']],
                ['$set' => ['passwordHash' => password_hash($password, PASSWORD_DEFAULT), 'mustChangePassword' => false, 'updatedAt' => new UTCDateTime()]],
            );
            $account = $accounts->findOne(['email' => $session['email']]);
            if ($account === null) {
                self::respond(404, ['error' => 'Admin account not found.']);

                return;
            }
            self::respond(200, [
                'session' => [
                    'email' => $session['email'],
                    'role' => $session['role'],
                    'token' => preg_replace('/^Bearer /', '', $_SERVER['HTTP_AUTHORIZATION'] ?? ''),
                    'account' => self::adminAccount($account),
                ],
            ]);

            return;
        }
        if ($path === '/api/admin/logout' && $method === 'POST') {
            $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            preg_match('/^Bearer ([a-f0-9]{64})$/', $authorization, $matches);
            if (isset($matches[1])) {
                self::collection($client, $database, 'admin_sessions')->deleteOne([
                    'tokenHash' => hash('sha256', $matches[1]),
                ]);
            }
            self::respond(200, ['ok' => true]);

            return;
        }

        self::respond(404, ['error' => 'Admin endpoint not found.']);
    }

    private static function pendingReviews(Client $client, string $database): void
    {
        $pending = [];
        foreach (self::collection(
            $client,
            $database,
            $_ENV['REVIEWS_COLLECTION'] ?? 'provider_reviews',
        )->find(['status' => 'pending'], ['sort' => ['createdAt' => -1], 'limit' => 100]) as $review) {
            $pending[] = [
                'id' => (string) $review['_id'],
                'providerName' => $review['providerName'] ?? 'Provider',
                'reviewerName' => $review['reviewerName'] ?? 'Pawly member',
                'rating' => $review['rating'] ?? 0,
                'text' => $review['text'] ?? '',
                'createdAt' => ($review['createdAt'] ?? null) instanceof UTCDateTime
                    ? $review['createdAt']->toDateTime()->format(DATE_ATOM)
                    : '',
            ];
        }
        self::respond(200, ['reviews' => $pending]);
    }

    private static function collection(Client $client, string $database, string $name): Collection
    {
        return $client->selectCollection($database, $name);
    }

    private static function record(mixed $document): array
    {
        return is_object($document) && method_exists($document, 'getArrayCopy')
            ? $document->getArrayCopy()
            : (array) $document;
    }

    private static function adminAccount(mixed $document): array
    {
        $record = self::record($document);

        return [
            'id' => (string) ($record['_id'] ?? ''),
            'name' => is_string($record['name'] ?? null) ? $record['name'] : (string) ($record['email'] ?? ''),
            'email' => (string) ($record['email'] ?? ''),
            'role' => ($record['role'] ?? 'admin') === 'superadmin' ? 'superadmin' : 'admin',
            'status' => ($record['status'] ?? 'active') === 'suspended' ? 'suspended' : 'active',
            'avatar' => is_string($record['avatar'] ?? null) ? $record['avatar'] : '',
            'mustChangePassword' => ($record['mustChangePassword'] ?? false) === true,
        ];
    }

    private static function mongoId(string $id): ObjectId|string
    {
        return preg_match('/^[a-f0-9]{24}$/i', $id) ? new ObjectId($id) : $id;
    }

    private static function requiredText(array $request, string $key, int $maxLength): string
    {
        $value = $request[$key] ?? null;
        if (!is_string($value) || trim($value) === '' || strlen(trim($value)) > $maxLength) {
            throw new \InvalidArgumentException(sprintf('%s is required and must be no longer than %d characters.', ucfirst($key), $maxLength));
        }

        return trim($value);
    }

    private static function optionalText(array $request, string $key, int $maxLength, string $fallback): string
    {
        $value = $request[$key] ?? $fallback;
        if (!is_string($value) || strlen(trim($value)) > $maxLength) {
            throw new \InvalidArgumentException(sprintf('%s must be no longer than %d characters.', ucfirst($key), $maxLength));
        }

        return trim($value);
    }

    private static function dateString(mixed $date): string
    {
        if ($date instanceof UTCDateTime) {
            return $date->toDateTime()->format(DATE_ATOM);
        }

        return is_string($date) ? $date : '';
    }

    private static function updatedOrNotFound(int $matchedCount): void
    {
        if ($matchedCount === 0) {
            self::respond(404, ['error' => 'Record not found.']);

            return;
        }
        self::respond(200, ['ok' => true]);
    }

    private static function respond(int $status, array $body): void
    {
        http_response_code($status);
        echo json_encode($body, JSON_THROW_ON_ERROR);
    }
}
