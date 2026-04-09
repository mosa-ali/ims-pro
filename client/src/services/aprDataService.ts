/**
 * APR Data Service
 * 
 * Handles YEAR-BASED persistence of narrative sections for Annual Programs Report
 * Data is locked per year and stored separately from auto-aggregated system KPIs
 * 
 * CRITICAL RULES:
 * - System KPIs are READ-ONLY (auto-aggregated from real data)
 * - Narrative sections are EDITABLE and saved per year
 * - Each year has its own independent narrative data
 * - No cross-year data pollution
 */

export interface APRNarrativeData {
 year: number;
 executiveSummary: string;
 challenges: string;
 strategicOutlook: string;
 managementNotes: string;
 lastModified: string;
 modifiedBy?: string; // User who last modified
}

const APR_STORAGE_KEY = 'apr_narrative_data';

/**
 * Get all APR narrative data (all years)
 */
function getAllNarrativeData(): Record<number, APRNarrativeData> {
 try {
 const stored = localStorage.getItem(APR_STORAGE_KEY);
 return stored ? JSON.parse(stored) : {};
 } catch (error) {
 console.error('Error reading APR narrative data:', error);
 return {};
 }
}

/**
 * Get narrative data for a specific year
 * Returns empty strings if no data exists for that year
 */
export function getAPRNarrativeForYear(year: number): APRNarrativeData {
 const allData = getAllNarrativeData();
 
 return allData[year] || {
 year,
 executiveSummary: '',
 challenges: '',
 strategicOutlook: '',
 managementNotes: '',
 lastModified: new Date().toISOString()
 };
}

/**
 * Save narrative data for a specific year
 * Creates year-based lock - data is isolated per year
 */
export function saveAPRNarrativeForYear(
 year: number,
 narrativeData: Omit<APRNarrativeData, 'year' | 'lastModified'>,
 userId?: string
): void {
 try {
 const allData = getAllNarrativeData();
 
 allData[year] = {
 ...narrativeData,
 year,
 lastModified: new Date().toISOString(),
 modifiedBy: userId
 };
 
 localStorage.setItem(APR_STORAGE_KEY, JSON.stringify(allData));
 console.log(`✅ APR narrative saved for year ${year}`);
 } catch (error) {
 console.error(`Error saving APR narrative for year ${year}:`, error);
 throw error;
 }
}

/**
 * Update a specific section for a year
 */
export function updateAPRSection(
 year: number,
 section: keyof Omit<APRNarrativeData, 'year' | 'lastModified' | 'modifiedBy'>,
 value: string,
 userId?: string
): void {
 const currentData = getAPRNarrativeForYear(year);
 
 saveAPRNarrativeForYear(
 year,
 {
 executiveSummary: currentData.executiveSummary,
 challenges: currentData.challenges,
 strategicOutlook: currentData.strategicOutlook,
 managementNotes: currentData.managementNotes,
 [section]: value
 },
 userId
 );
}

/**
 * Get available years with narrative data
 */
export function getAvailableAPRYears(): number[] {
 const allData = getAllNarrativeData();
 return Object.keys(allData).map(Number).sort((a, b) => b - a);
}

/**
 * Check if a year has any narrative data
 */
export function hasNarrativeDataForYear(year: number): boolean {
 const data = getAPRNarrativeForYear(year);
 return !!(
 data.executiveSummary ||
 data.challenges ||
 data.strategicOutlook ||
 data.managementNotes
 );
}

/**
 * Delete narrative data for a specific year (admin only)
 */
export function deleteAPRNarrativeForYear(year: number): void {
 try {
 const allData = getAllNarrativeData();
 delete allData[year];
 localStorage.setItem(APR_STORAGE_KEY, JSON.stringify(allData));
 console.log(`✅ APR narrative deleted for year ${year}`);
 } catch (error) {
 console.error(`Error deleting APR narrative for year ${year}:`, error);
 throw error;
 }
}
