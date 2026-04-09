import { ProjectSectorType } from '@/app/types/database.types';

/**
 * Determines if the Case Management tab should be shown for a project
 * based on its sectors.
 * 
 * Case Management tab shows ONLY for projects with protection-related sectors:
 * - Child Protection
 * - Protection 
 * - Education in Emergency
 * 
 * @param projectSectors - Array of project sectors
 * @returns true if Case Management tab should be displayed
 */
export function shouldShowCaseManagement(projectSectors: ProjectSectorType[] | string[]): boolean {
 if (!projectSectors || projectSectors.length === 0) {
 return false;
 }

 const caseManagementSectors = [
 ProjectSectorType.CHILD_PROTECTION,
 ProjectSectorType.PROTECTION,
 ProjectSectorType.EDUCATION_IN_EMERGENCY
 ];

 return projectSectors.some(sector => 
 caseManagementSectors.includes(sector as ProjectSectorType)
 );
}

/**
 * Get all available project sectors
 * @returns Array of all ProjectSectorType enum values
 */
export function getAllProjectSectors(): ProjectSectorType[] {
 return Object.values(ProjectSectorType);
}

/**
 * Format project sectors for display (comma-separated)
 * @param sectors - Array of project sectors
 * @returns Formatted string
 */
export function formatProjectSectors(sectors: ProjectSectorType[] | string[]): string {
 if (!sectors || sectors.length === 0) {
 return 'No sectors';
 }
 return sectors.join(', ');
}

/**
 * Parse sectors from Excel import (comma-separated string)
 * @param sectorsString - Comma-separated string of sectors
 * @returns Array of ProjectSectorType
 */
export function parseSectorsFromString(sectorsString: string): ProjectSectorType[] {
 if (!sectorsString || !sectorsString.trim()) {
 return [];
 }

 const sectorNames = sectorsString.split(',').map(s => s.trim());
 const validSectors: ProjectSectorType[] = [];

 sectorNames.forEach(name => {
 const sector = Object.values(ProjectSectorType).find(
 s => s.toLowerCase() === name.toLowerCase()
 );
 if (sector) {
 validSectors.push(sector);
 }
 });

 return validSectors;
}
