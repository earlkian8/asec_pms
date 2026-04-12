<?php

namespace App\Services;

use Aws\S3\S3Client;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SpacesUploadService
{
    private S3Client $client;

    private string $bucket;

    public function __construct()
    {
        $this->bucket = (string) config('filesystems.disks.s3.bucket');

        $this->client = new S3Client([
            'version' => 'latest',
            'region' => (string) config('filesystems.disks.s3.region'),
            'endpoint' => (string) config('filesystems.disks.s3.endpoint'),
            'credentials' => [
                'key' => (string) config('filesystems.disks.s3.key'),
                'secret' => (string) config('filesystems.disks.s3.secret'),
            ],
            'use_path_style_endpoint' => (bool) config('filesystems.disks.s3.use_path_style_endpoint', false),
        ]);
    }

    public function generateObjectPath(int $taskId, string $originalName): string
    {
        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName) ?: 'upload.bin';

        return sprintf('progress_updates/%d/%s_%s', $taskId, (string) Str::uuid(), $safeName);
    }

    /**
     * @return array{url:string,headers:array<string,string>,expires_in:int}
     */
    public function createUploadUrl(string $path, ?string $contentType = null, int $expiresIn = 900): array
    {
        $contentType = $contentType ?: 'application/octet-stream';

        $command = $this->client->getCommand('PutObject', [
            'Bucket' => $this->bucket,
            'Key' => $path,
            'ACL' => 'public-read',
            'ContentType' => $contentType,
        ]);

        $request = $this->client->createPresignedRequest($command, sprintf('+%d seconds', $expiresIn));

        return [
            'url' => (string) $request->getUri(),
            'headers' => [
                'Content-Type' => $contentType,
                'x-amz-acl' => 'public-read',
            ],
            'expires_in' => $expiresIn,
        ];
    }

    public function createDownloadUrl(string $path, int $expiresIn = 900): string
    {
        $command = $this->client->getCommand('GetObject', [
            'Bucket' => $this->bucket,
            'Key' => $path,
        ]);

        $request = $this->client->createPresignedRequest($command, sprintf('+%d seconds', $expiresIn));

        return (string) $request->getUri();
    }

    public function objectExists(string $path): bool
    {
        return Storage::disk('s3')->exists($path);
    }

    public function deleteObject(string $path): bool
    {
        return Storage::disk('s3')->delete($path);
    }
}
