/**
 * Grants Database Service
 * 
 * Provides access to all grants stored in the system
 * This is the AUTHORITATIVE source for grant-related APR metrics
 */

export interface Grant {
 id: string;
 projectId: string;
 donorName: string;
 donorType: string;
 totalAmount: number;
 spent?: number;
 currency: string;
 startDate: string;
 endDate: string;
 status: 'Active' | 'Closed' | 'Pending' | 'Suspended';
 reportingRequirements?: string;
 contractNumber?: string;
 milestones?: any[];
 documents?: any[];
}

const GRANTS_STORAGE_KEY = 'active_grants';

/**
 * Grants Database - Centralized access to all grants
 */
export const grantsDatabase = {
 /**
 * Get all grants from localStorage
 */
 getAllGrants(): Grant[] {
 try {
 const stored = localStorage.getItem(GRANTS_STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Error reading grants from database:', error);
 return [];
 }
 },

 /**
 * Get a single grant by ID
 */
 getGrantById(id: string): Grant | null {
 const grants = this.getAllGrants();
 return grants.find(g => g.id === id) || null;
 },

 /**
 * Get grants for a specific project
 */
 getGrantsByProjectId(projectId: string): Grant[] {
 const allGrants = this.getAllGrants();
 return allGrants.filter(g => g.projectId === projectId);
 },

 /**
 * Get grants filtered by year
 */
 getGrantsByYear(year: number): Grant[] {
 const allGrants = this.getAllGrants();
 return allGrants.filter(grant => {
 const grantYear = new Date(grant.startDate).getFullYear();
 return grantYear === year;
 });
 },

 /**
 * Get grants filtered by status
 */
 getGrantsByStatus(status: string): Grant[] {
 const allGrants = this.getAllGrants();
 return allGrants.filter(g => g.status === status);
 },

 /**
 * Get grants filtered by donor
 */
 getGrantsByDonor(donorName: string): Grant[] {
 const allGrants = this.getAllGrants();
 return allGrants.filter(g => g.donorName === donorName);
 },

 /**
 * Calculate total grant value
 */
 getTotalGrantValue(grants?: Grant[]): number {
 const targetGrants = grants || this.getAllGrants();
 return targetGrants.reduce((sum, g) => sum + (g.totalAmount || 0), 0);
 },

 /**
 * Calculate total spent from grants
 */
 getTotalSpent(grants?: Grant[]): number {
 const targetGrants = grants || this.getAllGrants();
 return targetGrants.reduce((sum, g) => sum + (g.spent || 0), 0);
 },

 /**
 * Calculate budget utilization rate
 */
 getUtilizationRate(grants?: Grant[]): number {
 const targetGrants = grants || this.getAllGrants();
 const totalValue = this.getTotalGrantValue(targetGrants);
 const totalSpent = this.getTotalSpent(targetGrants);
 return totalValue > 0 ? Math.round((totalSpent / totalValue) * 100) : 0;
 }
};
