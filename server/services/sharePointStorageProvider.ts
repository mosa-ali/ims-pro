/**
 * SharePoint Storage Provider Implementation
 * 
 * Implements the StorageProvider interface for Microsoft SharePoint Online
 * Uses Microsoft Graph API for document management
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

/**
 * SharePoint Storage Provider
 * Uses Microsoft Graph API for SharePoint operations
 */
export class SharePointStorageProvider extends StorageProvider {
  name = 'SharePoint';
  private graphApiUrl: string;
  private accessToken: string;
  private siteId: string;
  private driveId: string;
  private prefix: string;

  constructor(config: {
    graphApiUrl: string;
    accessToken: string;
    siteId: string;
    driveId: string;
    prefix?: string;
  }) {
    super();
    this.graphApiUrl = config.graphApiUrl;
    this.accessToken = config.accessToken;
    this.siteId = config.siteId;
    this.driveId = config.driveId;
    this.prefix = config.prefix || 'IMS-Documents';
  }

  /**
   * Build the full SharePoint path with organization/ou prefix for isolation
   */
  private buildPath(key: string, organizationId: number, operatingUnitId: number): string {
    const isolationPrefix = `org-${organizationId}/ou-${operatingUnitId}`;
    return `${this.prefix}/${isolationPrefix}/${key}`.replace(/\/+/g, '/');
  }

  /**
   * Make HTTP request to Microsoft Graph API
   */
  private async makeGraphRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const url = `${this.graphApiUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SharePoint API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const path = this.buildPath(options.key, options.organizationId, options.operatingUnitId);
    const fileName = path.split('/').pop() || 'file';
    const folderPath = path.substring(0, path.lastIndexOf('/'));

    try {
      // Ensure folder structure exists
      await this.ensureFolderStructure(folderPath);

      // Upload file
      const endpoint = `/drives/${this.driveId}/root:/${path}:/content`;

      const uploadResponse = await fetch(
        `${this.graphApiUrl}${endpoint}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': options.contentType || 'application/octet-stream',
          },
          body: options.data,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const uploadedFile = await uploadResponse.json();

      return {
        key: options.key,
        url: uploadedFile.webUrl,
        size: uploadedFile.size,
        contentType: options.contentType,
      };
    } catch (error) {
      throw new Error(`Failed to upload file to SharePoint: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDownloadUrl(options: StorageDownloadOptions): Promise<StorageDownloadResult> {
    const path = this.buildPath(options.key, options.organizationId, options.operatingUnitId);

    try {
      const endpoint = `/drives/${this.driveId}/root:/${path}`;
      const file = await this.makeGraphRequest('GET', endpoint);

      // Generate download link
      const downloadUrl = file['@microsoft.graph.downloadUrl'];

      return {
        url: downloadUrl,
        expiresAt: new Date(Date.now() + (options.expiresIn || 3600) * 1000),
      };
    } catch (error) {
      throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(options: StorageDeleteOptions): Promise<void> {
    const path = this.buildPath(options.key, options.organizationId, options.operatingUnitId);

    try {
      const endpoint = `/drives/${this.driveId}/root:/${path}`;
      await this.makeGraphRequest('DELETE', endpoint);
    } catch (error) {
      throw new Error(`Failed to delete file from SharePoint: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async list(options: StorageListOptions): Promise<StorageListResult> {
    const isolationPrefix = `org-${options.organizationId}/ou-${options.operatingUnitId}`;
    const folderPath = options.prefix
      ? `${this.prefix}/${isolationPrefix}/${options.prefix}`.replace(/\/+/g, '/')
      : `${this.prefix}/${isolationPrefix}`.replace(/\/+/g, '/');

    try {
      const endpoint = `/drives/${this.driveId}/root:/${folderPath}:/children?$top=${options.limit || 200}`;
      const response = await this.makeGraphRequest('GET', endpoint);

      const files: StorageFile[] = (response.value || [])
        .filter((item: any) => !item.folder) // Only files, not folders
        .map((item: any) => ({
          key: item.name,
          name: item.name,
          size: item.size,
          lastModified: new Date(item.lastModifiedDateTime),
          contentType: item.file?.mimeType,
          url: item.webUrl,
        }));

      return {
        files,
        continuationToken: response['@odata.nextLink'],
        hasMore: !!response['@odata.nextLink'],
      };
    } catch (error) {
      throw new Error(`Failed to list files from SharePoint: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exists(key: string, organizationId: number, operatingUnitId: number): Promise<boolean> {
    const path = this.buildPath(key, organizationId, operatingUnitId);

    try {
      const endpoint = `/drives/${this.driveId}/root:/${path}`;
      await this.makeGraphRequest('GET', endpoint);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(
    key: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<Partial<StorageFile> | null> {
    const path = this.buildPath(key, organizationId, operatingUnitId);

    try {
      const endpoint = `/drives/${this.driveId}/root:/${path}`;
      const file = await this.makeGraphRequest('GET', endpoint);

      return {
        key,
        name: file.name,
        size: file.size,
        lastModified: new Date(file.lastModifiedDateTime),
        contentType: file.file?.mimeType,
        url: file.webUrl,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async copy(
    sourceKey: string,
    destKey: string,
    organizationId: number,
    operatingUnitId: number
  ): Promise<void> {
    const sourcePath = this.buildPath(sourceKey, organizationId, operatingUnitId);
    const destPath = this.buildPath(destKey, organizationId, operatingUnitId);

    try {
      const sourceEndpoint = `/drives/${this.driveId}/root:/${sourcePath}`;
      const sourceFile = await this.makeGraphRequest('GET', sourceEndpoint);

      const destFolderPath = destPath.substring(0, destPath.lastIndexOf('/'));
      const destFileName = destPath.split('/').pop();

      // Copy using Graph API copy action
      const copyEndpoint = `/drives/${this.driveId}/items/${sourceFile.id}/copy`;
      await this.makeGraphRequest('POST', copyEndpoint, {
        parentReference: {
          path: `/drives/${this.driveId}/root:/${destFolderPath}`,
        },
        name: destFileName,
      });
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
    const sourcePath = this.buildPath(sourceKey, organizationId, operatingUnitId);
    const destPath = this.buildPath(destKey, organizationId, operatingUnitId);

    try {
      const sourceEndpoint = `/drives/${this.driveId}/root:/${sourcePath}`;
      const sourceFile = await this.makeGraphRequest('GET', sourceEndpoint);

      const destFolderPath = destPath.substring(0, destPath.lastIndexOf('/'));
      const destFileName = destPath.split('/').pop();

      // Move using Graph API PATCH
      const moveEndpoint = `/drives/${this.driveId}/items/${sourceFile.id}`;
      await this.makeGraphRequest('PATCH', moveEndpoint, {
        parentReference: {
          path: `/drives/${this.driveId}/root:/${destFolderPath}`,
        },
        name: destFileName,
      });
    } catch (error) {
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const endpoint = `/drives/${this.driveId}`;
      await this.makeGraphRequest('GET', endpoint);
      return true;
    } catch (error) {
      console.error('SharePoint connection validation failed:', error);
      return false;
    }
  }

  async getStorageStats(organizationId: number, operatingUnitId: number): Promise<{
    totalSize: number;
    fileCount: number;
    usagePercentage: number;
  }> {
    const isolationPrefix = `org-${organizationId}/ou-${operatingUnitId}`;
    const folderPath = `${this.prefix}/${isolationPrefix}`.replace(/\/+/g, '/');

    try {
      let totalSize = 0;
      let fileCount = 0;

      // Get folder stats using Graph API
      const endpoint = `/drives/${this.driveId}/root:/${folderPath}`;
      const folder = await this.makeGraphRequest('GET', endpoint);

      // Recursively get all files
      const getAllFiles = async (itemId: string): Promise<void> => {
        const childrenEndpoint = `/drives/${this.driveId}/items/${itemId}/children`;
        const response = await this.makeGraphRequest('GET', childrenEndpoint);

        for (const item of response.value || []) {
          if (item.file) {
            totalSize += item.size || 0;
            fileCount += 1;
          } else if (item.folder) {
            await getAllFiles(item.id);
          }
        }
      };

      await getAllFiles(folder.id);

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

  /**
   * Ensure folder structure exists in SharePoint
   */
  private async ensureFolderStructure(folderPath: string): Promise<void> {
    const folders = folderPath.split('/').filter((f) => f);
    let currentPath = '';

    for (const folder of folders) {
      currentPath += `/${folder}`;

      try {
        // Try to get the folder
        const endpoint = `/drives/${this.driveId}/root:${currentPath}`;
        await this.makeGraphRequest('GET', endpoint);
      } catch (error) {
        // Folder doesn't exist, create it
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
        const folderName = folder;

        const createEndpoint = `/drives/${this.driveId}/root:${parentPath}:/children`;
        await this.makeGraphRequest('POST', createEndpoint, {
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        });
      }
    }
  }
}
