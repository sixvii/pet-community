<?php

declare(strict_types=1);

namespace Pawly\Infrastructure;

use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;
use RuntimeException;
use Throwable;

final class ProviderBookingLock
{
    private const LEASE_SECONDS = 120;
    private const WAIT_MILLISECONDS = 5000;

    public static function synchronized(Collection $locks, string $providerId, callable $operation): mixed
    {
        $locks->createIndex(['providerId' => 1], ['unique' => true]);
        $token = bin2hex(random_bytes(16));
        $deadline = microtime(true) + self::WAIT_MILLISECONDS / 1000;
        $acquired = false;

        do {
            $now = new UTCDateTime();
            try {
                $result = $locks->updateOne(
                    [
                        'providerId' => $providerId,
                        '$or' => [
                            ['lockExpiresAt' => ['$lte' => $now]],
                            ['lockExpiresAt' => ['$exists' => false]],
                        ],
                    ],
                    ['$set' => [
                        'lockToken' => $token,
                        'lockExpiresAt' => new UTCDateTime((time() + self::LEASE_SECONDS) * 1000),
                    ]],
                    ['upsert' => true],
                );
                $acquired = $result->getMatchedCount() === 1 || $result->getUpsertedCount() === 1;
            } catch (Throwable $error) {
                if ((int) $error->getCode() !== 11000) {
                    throw $error;
                }
            }

            if (!$acquired) {
                usleep(25000);
            }
        } while (!$acquired && microtime(true) < $deadline);

        if (!$acquired) {
            throw new RuntimeException('This provider schedule is busy. Retry the appointment request.');
        }

        try {
            return $operation();
        } finally {
            $locks->updateOne(
                ['providerId' => $providerId, 'lockToken' => $token],
                [
                    '$set' => ['lockExpiresAt' => new UTCDateTime(0)],
                    '$unset' => ['lockToken' => ''],
                ],
            );
        }
    }
}
