<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Pawly\Infrastructure\MongoClientFactory;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

$client = MongoClientFactory::create();
$database = $client->selectDatabase($_ENV['MONGODB_DATABASE'] ?? 'pawly');
$accountData = $database->selectCollection($_ENV['ACCOUNT_DATA_COLLECTION'] ?? 'account_data');
$appointments = $database->selectCollection($_ENV['APPOINTMENTS_COLLECTION'] ?? 'appointments');
$medicalRecords = $database->selectCollection($_ENV['MEDICAL_RECORDS_COLLECTION'] ?? 'medical_records');

$appendNotification = static function (string $userId, array $notification) use ($accountData): void {
    $accountData->updateOne(
        ['userId' => $userId],
        ['$setOnInsert' => ['userId' => $userId]],
        ['upsert' => true],
    );
    $accountData->updateOne(
        [
            'userId' => $userId,
            'data.notifications.id' => ['$ne' => $notification['id']],
        ],
        ['$push' => ['data.notifications' => ['$each' => [$notification], '$slice' => -500]]],
    );
};

while (true) {
    try {
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $windowEnd = $now->modify('+24 hours');
        foreach ($appointments->find(
            ['appointment.status' => 'CONFIRMED'],
            ['projection' => ['ownerId' => 1, 'appointment' => 1, 'scheduledAt' => 1]],
        ) as $document) {
            $userId = $document['ownerId'] ?? null;
            $appointment = $document['appointment'] ?? null;
            if (!is_string($userId)) {
                continue;
            }
            if (!is_array($appointment) || !is_string($document['scheduledAt'] ?? null)) {
                continue;
            }
            try {
                $scheduledAt = new DateTimeImmutable($document['scheduledAt']);
            } catch (Throwable) {
                continue;
            }
            if ($scheduledAt <= $now || $scheduledAt > $windowEnd) {
                continue;
            }
            $minutes = max(1, (int) ceil(($scheduledAt->getTimestamp() - $now->getTimestamp()) / 60));
            $remaining = $minutes >= 60
                ? 'in ' . (int) ceil($minutes / 60) . ' hour' . ((int) ceil($minutes / 60) === 1 ? '' : 's')
                : "in {$minutes} minute" . ($minutes === 1 ? '' : 's');
            $appendNotification($userId, [
                'id' => 'appointment-reminder-' . (string) $document['_id'] . '-' . $scheduledAt->getTimestamp(),
                'name' => is_string($appointment['providerName'] ?? null) ? $appointment['providerName'] : 'Your provider',
                'action' => 'Appointment reminder · ' . $remaining,
                'detail' => ($appointment['service'] ?? 'Appointment') . ' for ' . ($appointment['petName'] ?? 'your pet') .
                    ' is scheduled for ' . ($appointment['date'] ?? '') . ' at ' . ($appointment['time'] ?? '') .
                    '. Open appointments to confirm or reschedule.',
                'time' => 'Upcoming',
                'kind' => 'care',
                'target' => 'appointments',
                'unread' => true,
            ]);
        }

        $today = $now->format('Y-m-d');
        $dueThrough = $now->modify('+7 days')->format('Y-m-d');
        foreach ($medicalRecords->find(
            ['dueDate' => ['$type' => 'string', '$lte' => $dueThrough, '$gte' => $now->modify('-1 day')->format('Y-m-d')]],
            ['projection' => ['userId' => 1, 'petId' => 1, 'title' => 1, 'dueDate' => 1]],
        ) as $record) {
            $userId = $record['userId'] ?? null;
            $dueDate = $record['dueDate'] ?? null;
            $title = $record['title'] ?? null;
            if (!is_string($userId) || !is_string($dueDate) || !is_string($title)) {
                continue;
            }
            $appendNotification($userId, [
                'id' => 'medical-reminder-' . (string) $record['_id'] . '-' . $dueDate,
                'petId' => (string) ($record['petId'] ?? ''),
                'name' => 'Pet health reminder',
                'action' => $dueDate < $today ? 'Medical care is overdue' : 'Medical care is due soon',
                'detail' => $title . ' is due ' . ($dueDate < $today ? 'since ' : 'on ') . $dueDate . '.',
                'time' => 'Upcoming',
                'kind' => 'care',
                'target' => 'pets',
                'unread' => true,
            ]);
        }
    } catch (Throwable $error) {
        error_log('Reminder worker cycle failed: ' . $error->getMessage());
    }

    sleep(60);
}
