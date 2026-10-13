<?php

declare(strict_types=1);

namespace Pawly\Infrastructure;

use Cloudinary\Cloudinary;

final class CloudinaryStorage
{
    private Cloudinary $cloudinary;

    public function __construct()
    {
        $this->cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => $_ENV['CLOUDINARY_CLOUD_NAME'] ?? '',
                'api_key' => $_ENV['CLOUDINARY_API_KEY'] ?? '',
                'api_secret' => $_ENV['CLOUDINARY_API_SECRET'] ?? '',
            ],
            'url' => ['secure' => true],
        ]);
    }

    /** @return array{publicId: string, secureUrl: string} */
    public function upload(
        string $filePath,
        string $folder = 'pawly',
        string $resourceType = 'image',
    ): array
    {
        if (!in_array($resourceType, ['image', 'video'], true)) {
            throw new \InvalidArgumentException('Unsupported Cloudinary resource type.');
        }

        $result = $this->cloudinary->uploadApi()->upload($filePath, [
            'folder' => $folder,
            'resource_type' => $resourceType,
        ]);

        return [
            'publicId' => (string) $result['public_id'],
            'secureUrl' => (string) $result['secure_url'],
        ];
    }
}