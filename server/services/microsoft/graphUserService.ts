/**
 * ============================================================================
 * Microsoft Graph User Service
 * ============================================================================
 * 
 * Service for Microsoft Graph user directory operations.
 * Handles:
 * - User directory search
 * - User profile retrieval
 * - Organization user listing
 * - User information mapping
 * 
 * ============================================================================
 */

import { graphAuthService } from "./graphAuthService";

export interface GraphUser {
  id: string; // Azure AD Object ID (oid)
  userPrincipalName: string; // Email
  displayName: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
}

interface GraphUserSearchResponse {
  value: Array<{
    id: string;
    userPrincipalName: string;
    displayName: string;
    givenName?: string;
    surname?: string;
    jobTitle?: string;
    officeLocation?: string;
    mobilePhone?: string;
    businessPhones?: string[];
  }>;
}

interface GraphUserResponse {
  id: string;
  userPrincipalName: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
}

class GraphUserService {
  private readonly GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

  /**
   * Search Microsoft 365 directory for users
   * Supports search by email, display name, or other attributes
   */
  async searchUsers(
    tenantId: string,
    searchTerm: string,
    limit: number = 10
  ): Promise<GraphUser[]> {
    if (!searchTerm || searchTerm.trim() === "") {
      return [];
    }

    const accessToken = await graphAuthService.getAccessToken(tenantId);

    // Build search filter
    // Search in userPrincipalName (email) and displayName
    const searchFilter = encodeURIComponent(
      `startswith(userPrincipalName,'${searchTerm}') or startswith(displayName,'${searchTerm}')`
    );

    const url = `${this.GRAPH_API_BASE}/users?$filter=${searchFilter}&$top=${limit}&$select=id,userPrincipalName,displayName,givenName,surname,jobTitle,officeLocation,mobilePhone,businessPhones`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`User search failed: ${response.status} - ${error}`);
      }

      const data = await response.json() as GraphUserSearchResponse;
      return data.value.map((user) => this.mapGraphUser(user));
    } catch (err) {
      console.error("Failed to search Microsoft Graph users:", err);
      throw err;
    }
  }

  /**
   * Get user profile by ID (Azure AD Object ID)
   */
  async getUserById(tenantId: string, userId: string): Promise<GraphUser | null> {
    const accessToken = await graphAuthService.getAccessToken(tenantId);

    const url = `${this.GRAPH_API_BASE}/users/${userId}?$select=id,userPrincipalName,displayName,givenName,surname,jobTitle,officeLocation,mobilePhone,businessPhones`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Get user failed: ${response.status} - ${error}`);
      }

      const data = await response.json() as GraphUserResponse;
      return this.mapGraphUser(data);
    } catch (err) {
      console.error("Failed to get Microsoft Graph user:", err);
      throw err;
    }
  }

  /**
   * Get user profile by email (userPrincipalName)
   */
  async getUserByEmail(tenantId: string, email: string): Promise<GraphUser | null> {
    const accessToken = await graphAuthService.getAccessToken(tenantId);

    const url = `${this.GRAPH_API_BASE}/users/${email}?$select=id,userPrincipalName,displayName,givenName,surname,jobTitle,officeLocation,mobilePhone,businessPhones`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Get user by email failed: ${response.status} - ${error}`);
      }

      const data = await response.json() as GraphUserResponse;
      return this.mapGraphUser(data);
    } catch (err) {
      console.error("Failed to get Microsoft Graph user by email:", err);
      throw err;
    }
  }

  /**
   * List all users in organization (paginated)
   */
  async listUsers(
    tenantId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<{ users: GraphUser[]; total: number }> {
    const accessToken = await graphAuthService.getAccessToken(tenantId);

    const url = `${this.GRAPH_API_BASE}/users?$top=${limit}&$skip=${skip}&$select=id,userPrincipalName,displayName,givenName,surname,jobTitle,officeLocation,mobilePhone,businessPhones&$count=true`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ConsistencyLevel: "eventual", // Required for $count
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`List users failed: ${response.status} - ${error}`);
      }

      const data = await response.json() as GraphUserSearchResponse & { "@odata.count": number };
      return {
        users: data.value.map((user) => this.mapGraphUser(user)),
        total: data["@odata.count"] || 0,
      };
    } catch (err) {
      console.error("Failed to list Microsoft Graph users:", err);
      throw err;
    }
  }

  /**
   * Map Microsoft Graph user response to internal format
   */
  private mapGraphUser(user: GraphUserResponse): GraphUser {
    return {
      id: user.id,
      userPrincipalName: user.userPrincipalName,
      displayName: user.displayName,
      givenName: user.givenName,
      surname: user.surname,
      jobTitle: user.jobTitle,
      officeLocation: user.officeLocation,
      mobilePhone: user.mobilePhone,
      businessPhones: user.businessPhones,
    };
  }
}

// Export singleton instance
export const graphUserService = new GraphUserService();
