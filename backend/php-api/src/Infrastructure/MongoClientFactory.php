<?php

declare(strict_types=1);

namespace Pawly\Infrastructure;

use MongoDB\Client;

final class MongoClientFactory
{
    public static function create(): Client
    {
        return new Client(
            $_ENV['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017',
            [],
            ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']],
        );
    }
}
