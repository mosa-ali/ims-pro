/**
 * Storage Provider Abstraction Layer
 * 
 * Provides a unified interface for multiple storage backends:
 * - S3 (AWS S3 or compatible)
 * - SharePoint (Microsoft SharePoint Online)
 * - OneDrive (Microsoft OneDrive for Business)
 * 
 * This abstraction allows seamless switching between storage providers
 * without changing application code.
 */

export interface StorageUploadOptions {
  key: string; // File path/key in storage
  data: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
  organizationId: number;
  operatingUnitId: number;
}

export interface StorageDownloadOptions {
  key: string;
  organizationId: number;
  operatingUnitId: number;
  expiresIn?: number; // Expiration time in seconds (for signed URLs)
}

export interface StorageDeleteOptions {
  key: string;
  organizationId: number;
  operatingUnitId: number;
}

export interface StorageListOptions {
  prefix?: string;
  organizationId: number;
  operatingUnitId: number;
  limit?: number;
  continuationToken?: string;
}

export interface StorageFile {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  url?: string;
  metadata?: Record<string, string>;
}

export interface StorageListResult {
  files: StorageFile[];
  continuationToken?: string;
  hasMore: boolean;
}

export interface StorageUploadResult {
  key: string;
  url: string;
  size: number;
  contentType?: string;
}

export interface StorageDownloadResult {
  url: string;
  expiresAt?: Date;
}

/**
 * Abstract base class for all storage providers
 */
export abstract class StorageProvider {
  abstract name: string;

  /**
   * Upload a file to storage
   */
  abstract upload(options: StorageUploadOptions): Promise<StorageUploadResult>;

  /**
   * Get a signed/presigned URL for downloading a file
   */
  abstract getDownloadUrl(options: StorageDownloadOptions): Promise<StorageDownloadResult>;

  /**
   * Delete a file from storage
   */
  abstract delete(options: StorageDeleteOptions): Promise<void>;

  /**
   * List files in storage with optional prefix filtering
   */
  abstract list(options: StorageListOptions): Promise<StorageListResult>;

  /**
   * Check if a file exists in storage
   */
  abstract exists(key: string, organizationId: number, operatingUnitId: number): Promise<boolean>;

  /**
   * Get file metadata (size, last modified, etc.)
   */
  abstract getMetadata(
    key: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<Partial<StorageFile> | null>;

  /**
   * Copy a file from one location to another
   */
  abstract copy(
    sourceKey: string,
    destKey: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<void>;

  /**
   * Move a file from one location to another
   */
  abstract move(
    sourceKey: string,
    destKey: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<void>;

  /**
   * Validate storage connectivity
   */
  abstract validateConnection(): Promise<boolean>;

  /**
   * Get storage usage statistics
   */
  abstract getStorageStats(organizationId: number, operatingUnitId: number): Promise<{
    totalSize: number;
    fileCount: number;
    usagePercentage: number;
  }>;
}

/**
 * Storage provider factory for creating provider instances
 */
export class StorageProviderFactory {
  private static providers: Map<string, StorageProvider> = new Map();

  static register(name: string, provider: StorageProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  static get(name: string): StorageProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Storage provider '${name}' not found`);
    }
    return provider;
  }

  static getDefault(): StorageProvider {
    // Default to S3 if available
    const s3 = this.providers.get('s3');
    if (s3) return s3;

    // Otherwise return first registered provider
    const first = this.providers.values().next().value;
    if (!first) {
      throw new Error('No storage providers registered');
    }
    return first;
  }

  static listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Storage provider configuration
 */
export interface StorageProviderConfig {
  type: 'S3' | 'SHAREPOINT' | 'ONEDRIVE';
  name: string;
  isDefault: boolean;
  config: Record<string, any>;
}
