/**
 * ============================================================================
 * Microsoft Graph API Integration Service
 * ============================================================================
 * 
 * Provides access to authenticated tenant's Microsoft 365 resources:
 * - SharePoint sites and document libraries
 * - OneDrive folders and files
 * - File upload/download operations
 * - Metadata and permissions management
 * 
 * Requires valid tenant connection and Microsoft Graph API access token
 * ============================================================================
 */

import axios, { AxiosInstance } from 'axios';

export interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
  displayName: string;
  description?: string;
}

export interface DocumentLibrary {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
  itemCount: number;
}

export interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  webUrl: string;
  parentReference?: { driveId: string; id: string };
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy: { user: { displayName: string; email: string } };
  lastModifiedBy: { user: { displayName: string; email: string } };
}

export class GraphApiService {
  private graphClient: AxiosInstance;
  private tenantId: string;
  private accessToken: string;

  constructor(tenantId: string, accessToken: string) {
    this.tenantId = tenantId;
    this.accessToken = accessToken;

    this.graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all SharePoint sites accessible to the tenant
   */
  async getSharePointSites(): Promise<SharePointSite[]> {
    try {
      const response = await this.graphClient.get('/sites?search=*');
      return response.data.value.map((site: any) => ({
        id: site.id,
        name: site.name,
        webUrl: site.webUrl,
        displayName: site.displayName,
        description: site.description,
      }));
    } catch (error) {
      console.error('[GraphAPI] Failed to get SharePoint sites:', error);
      throw new Error('Failed to retrieve SharePoint sites');
    }
  }

  /**
   * Get document libraries for a specific SharePoint site
   */
  async getDocumentLibraries(siteId: string): Promise<DocumentLibrary[]> {
    try {
      const response = await this.graphClient.get(`/sites/${siteId}/drives`);
      return response.data.value.map((drive: any) => ({
        id: drive.id,
        name: drive.name,
        displayName: drive.name,
        webUrl: drive.webUrl,
        itemCount: drive.quota?.used || 0,
      }));
    } catch (error) {
      console.error('[GraphAPI] Failed to get document libraries:', error);
      throw new Error('Failed to retrieve document libraries');
    }
  }

  /**
   * Get OneDrive root folder contents
   */
  async getOneDriveRootItems(userId: string): Promise<DriveItem[]> {
    try {
      const response = await this.graphClient.get(`/users/${userId}/drive/root/children`);
      return response.data.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.folder ? 'folder' : 'file',
        size: item.size,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        webUrl: item.webUrl,
        parentReference: item.parentReference,
      }));
    } catch (error) {
      console.error('[GraphAPI] Failed to get OneDrive items:', error);
      throw new Error('Failed to retrieve OneDrive items');
    }
  }

  /**
   * Get folder contents
   */
  async getFolderContents(driveId: string, itemId: string): Promise<DriveItem[]> {
    try {
      const response = await this.graphClient.get(`/drives/${driveId}/items/${itemId}/children`);
      return response.data.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.folder ? 'folder' : 'file',
        size: item.size,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        webUrl: item.webUrl,
        parentReference: item.parentReference,
      }));
    } catch (error) {
      console.error('[GraphAPI] Failed to get folder contents:', error);
      throw new Error('Failed to retrieve folder contents');
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(driveId: string, itemId: string): Promise<FileMetadata> {
    try {
      const response = await this.graphClient.get(`/drives/${driveId}/items/${itemId}`);
      const item = response.data;
      return {
        id: item.id,
        name: item.name,
        size: item.size,
        mimeType: item.file?.mimeType || 'unknown',
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        createdBy: item.createdBy,
        lastModifiedBy: item.lastModifiedBy,
      };
    } catch (error) {
      console.error('[GraphAPI] Failed to get file metadata:', error);
      throw new Error('Failed to retrieve file metadata');
    }
  }

  /**
   * Get download URL for a file
   */
  async getFileDownloadUrl(driveId: string, itemId: string): Promise<string> {
    try {
      const response = await this.graphClient.get(`/drives/${driveId}/items/${itemId}?$select=@microsoft.graph.downloadUrl`);
      return response.data['@microsoft.graph.downloadUrl'];
    } catch (error) {
      console.error('[GraphAPI] Failed to get download URL:', error);
      throw new Error('Failed to get file download URL');
    }
  }

  /**
   * Upload file to OneDrive
   */
  async uploadFile(driveId: string, parentItemId: string, fileName: string, fileContent: Buffer): Promise<DriveItem> {
    try {
      const response = await this.graphClient.put(
        `/drives/${driveId}/items/${parentItemId}:/${fileName}:/content`,
        fileContent,
        { headers: { 'Content-Type': 'application/octet-stream' } }
      );
      return {
        id: response.data.id,
        name: response.data.name,
        type: 'file',
        size: response.data.size,
        createdDateTime: response.data.createdDateTime,
        lastModifiedDateTime: response.data.lastModifiedDateTime,
        webUrl: response.data.webUrl,
        parentReference: response.data.parentReference,
      };
    } catch (error) {
      console.error('[GraphAPI] Failed to upload file:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Create folder
   */
  async createFolder(driveId: string, parentItemId: string, folderName: string): Promise<DriveItem> {
    try {
      const response = await this.graphClient.post(`/drives/${driveId}/items/${parentItemId}/children`, {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      });
      return {
        id: response.data.id,
        name: response.data.name,
        type: 'folder',
        createdDateTime: response.data.createdDateTime,
        lastModifiedDateTime: response.data.lastModifiedDateTime,
        webUrl: response.data.webUrl,
        parentReference: response.data.parentReference,
      };
    } catch (error) {
      console.error('[GraphAPI] Failed to create folder:', error);
      throw new Error('Failed to create folder');
    }
  }

  /**
   * Delete item (file or folder)
   */
  async deleteItem(driveId: string, itemId: string): Promise<boolean> {
    try {
      await this.graphClient.delete(`/drives/${driveId}/items/${itemId}`);
      return true;
    } catch (error) {
      console.error('[GraphAPI] Failed to delete item:', error);
      throw new Error('Failed to delete item');
    }
  }

  /**
   * Rename item
   */
  async renameItem(driveId: string, itemId: string, newName: string): Promise<DriveItem> {
    try {
      const response = await this.graphClient.patch(`/drives/${driveId}/items/${itemId}`, {
        name: newName,
      });
      return {
        id: response.data.id,
        name: response.data.name,
        type: response.data.folder ? 'folder' : 'file',
        size: response.data.size,
        createdDateTime: response.data.createdDateTime,
        lastModifiedDateTime: response.data.lastModifiedDateTime,
        webUrl: response.data.webUrl,
        parentReference: response.data.parentReference,
      };
    } catch (error) {
      console.error('[GraphAPI] Failed to rename item:', error);
      throw new Error('Failed to rename item');
    }
  }

  /**
   * Search for files
   */
  async searchFiles(driveId: string, query: string): Promise<DriveItem[]> {
    try {
      const response = await this.graphClient.get(`/drives/${driveId}/root/search(q='${query}')`);
      return response.data.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.folder ? 'folder' : 'file',
        size: item.size,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        webUrl: item.webUrl,
        parentReference: item.parentReference,
      }));
    } catch (error) {
      console.error('[GraphAPI] Failed to search files:', error);
      throw new Error('Failed to search files');
    }
  }

  /**
   * Get file version history
   */
  async getFileVersions(driveId: string, itemId: string): Promise<any[]> {
    try {
      const response = await this.graphClient.get(`/drives/${driveId}/items/${itemId}/versions`);
      return response.data.value;
    } catch (error) {
      console.error('[GraphAPI] Failed to get file versions:', error);
      throw new Error('Failed to retrieve file versions');
    }
  }

  /**
   * Share file/folder with user
   */
  async shareItem(driveId: string, itemId: string, userEmail: string, role: 'read' | 'write' | 'owner' = 'read'): Promise<boolean> {
    try {
      await this.graphClient.post(`/drives/${driveId}/items/${itemId}/invite`, {
        recipients: [{ email: userEmail }],
        message: 'You have been granted access to this item',
        requireSignIn: true,
        sendInvitation: true,
        roles: [role],
      });
      return true;
    } catch (error) {
      console.error('[GraphAPI] Failed to share item:', error);
      throw new Error('Failed to share item');
    }
  }

  /**
   * Get sharing links
   */
  async getSharingLinks(driveId: string, itemId: string): Promise<any[]> {
    try {
      const response = await this.graphClient.get(`/drives/${driveId}/items/${itemId}/permissions`);
      return response.data.value.filter((p: any) => p.link);
    } catch (error) {
      console.error('[GraphAPI] Failed to get sharing links:', error);
      throw new Error('Failed to retrieve sharing links');
    }
  }

  /**
   * Validate access token
   */
  async validateAccessToken(): Promise<boolean> {
    try {
      await this.graphClient.get('/me');
      return true;
    } catch (error) {
      console.error('[GraphAPI] Access token validation failed:', error);
      return false;
    }
  }
}

/**
 * Create GraphApiService instance for a tenant
 */
export async function createGraphApiService(tenantId: string, accessToken: string): Promise<GraphApiService> {
  const service = new GraphApiService(tenantId, accessToken);
  
  // Validate token
  const isValid = await service.validateAccessToken();
  if (!isValid) {
    throw new Error('Invalid access token for Microsoft Graph API');
  }

  return service;
}
