/**
 * S3 Storage Provider Implementation
 * 
 * Implements the StorageProvider interface for AWS S3 or S3-compatible storage
 */

import {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDownloadOptions,
  StorageDownloadResult,
  StorageDeleteOptions,
  StorageListOptions,
  StorageListResult,
  StorageFile,
} from './storageProvider';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3 Storage Provider
 * Uses AWS SDK v3 for S3 operations
 */
export class S3StorageProvider extends StorageProvider {
  name = 'S3';
  private client: S3Client;
  private bucket: string;
  private region: string;
  private prefix: string;

  constructor(config: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
    prefix?: string;
  }) {
    super();
    this.bucket = config.bucket;
    this.region = config.region;
    this.prefix = config.prefix || '';

    // Initialize S3 client
    this.client = new S3Client({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
      ...(config.endpoint && { endpoint: config.endpoint }),
    });
  }

  /**
   * Build the full S3 key with organization/ou prefix for isolation
   */
  private buildKey(key: string, organizationId: number, operatingUnitId: number): string {
    const isolationPrefix = `org-${organizationId}/ou-${operatingUnitId}`;
    return `${this.prefix}${isolationPrefix}/${key}`.replace(/\/+/g, '/');
  }

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const fullKey = this.buildKey(options.key, options.organizationId, options.operatingUnitId);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: options.data,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      });

      await this.client.send(command);

      // Get the public URL
      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fullKey}`;

      return {
        key: options.key,
        url,
        size: Buffer.byteLength(options.data),
        contentType: options.contentType,
      };
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDownloadUrl(options: StorageDownloadOptions): Promise<StorageDownloadResult> {
    const fullKey = this.buildKey(options.key, options.organizationId, options.operatingUnitId);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: options.expiresIn || 3600, // Default 1 hour
      });

      return {
        url,
        expiresAt: new Date(Date.now() + (options.expiresIn || 3600) * 1000),
      };
    } catch (error) {
      throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(options: StorageDeleteOptions): Promise<void> {
    const fullKey = this.buildKey(options.key, options.organizationId, options.operatingUnitId);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async list(options: StorageListOptions): Promise<StorageListResult> {
    const isolationPrefix = `org-${options.organizationId}/ou-${options.operatingUnitId}`;
    const prefix = options.prefix
      ? `${this.prefix}${isolationPrefix}/${options.prefix}`.replace(/\/+/g, '/')
      : `${this.prefix}${isolationPrefix}/`.replace(/\/+/g, '/');

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: options.limit || 1000,
        ContinuationToken: options.continuationToken,
      });

      const response = await this.client.send(command);

      const files: StorageFile[] = (response.Contents || []).map((item) => ({
        key: item.Key?.replace(prefix, '') || '',
        name: item.Key?.split('/').pop() || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${item.Key}`,
      }));

      return {
        files,
        continuationToken: response.NextContinuationToken,
        hasMore: response.IsTruncated || false,
      };
    } catch (error) {
      throw new Error(`Failed to list files from S3: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exists(key: string, organizationId: number, operatingUnitId: number): Promise<boolean> {
    const fullKey = this.buildKey(key, organizationId, operatingUnitId);

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new Error(`Failed to check file existence: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getMetadata(
    key: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<Partial<StorageFile> | null> {
    const fullKey = this.buildKey(key, organizationId, operatingUnitId);

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      const response = await this.client.send(command);

      return {
        key,
        name: fullKey.split('/').pop(),
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fullKey}`,
        metadata: response.Metadata,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async copy(
    sourceKey: string,
    destKey: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<void> {
    const fullSourceKey = this.buildKey(sourceKey, organizationId, operatingUnitId);
    const fullDestKey = this.buildKey(destKey, organizationId, operatingUnitId);

    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${fullSourceKey}`,
        Key: fullDestKey,
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async move(
    sourceKey: string,
    destKey: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<void> {
    // Copy then delete
    await this.copy(sourceKey, destKey, organizationId, operatingUnitId);
    await this.delete({
      key: sourceKey,
      organizationId,
      operatingUnitId,
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('S3 connection validation failed:', error);
      return false;
    }
  }

  async getStorageStats(organizationId: number, operatingUnitId: number): Promise<{
    totalSize: number;
    fileCount: number;
    usagePercentage: number;
  }> {
    const isolationPrefix = `org-${organizationId}/ou-${operatingUnitId}`;
    const prefix = `${this.prefix}${isolationPrefix}/`.replace(/\/+/g, '/');

    try {
      let totalSize = 0;
      let fileCount = 0;
      let continuationToken: string | undefined;

      // Paginate through all objects
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const response = await this.client.send(command);

        (response.Contents || []).forEach((item) => {
          totalSize += item.Size || 0;
          fileCount += 1;
        });

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // Assume 1TB quota per organization
      const quotaBytes = 1024 * 1024 * 1024 * 1024; // 1TB
      const usagePercentage = (totalSize / quotaBytes) * 100;

      return {
        totalSize,
        fileCount,
        usagePercentage,
      };
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
