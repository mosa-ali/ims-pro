/**
 * cambodia-governorate-mapping.ts
 * 
 * Maps GeoJSON province names (with French diacriticals) to database names (English)
 * This is needed because the GeoJSON uses Khmer transliteration with accents,
 * while the database stores English names without accents.
 * 
 * Example:
 *   GeoJSON: "Batdâmbâng" → Database: "Battambang"
 *   GeoJSON: "Siemréab" → Database: "Siem Reap"
 */

export const CAMBODIA_GOVERNORATE_MAPPING: Record<string, string> = {
  // GeoJSON name → Database name
  "Batdâmbâng": "Battambang",
  "Bântéay Méanchey": "Banteay Meanchey",
  "Kaôh Kong": "Koh Kong",
  "Kep": "Kep", // No change needed
  "Krâchéh": "Kratie",
  "Kâmpóng Cham": "Kampong Cham",
  "Kâmpóng Chhnang": "Kampong Chhnang",
  "Kâmpóng Spœ": "Kampong Speu",
  "Kâmpóng Thum": "Kampong Thom",
  "Kâmpôt": "Kampot",
  "Kândal": "Kandal",
  "Môndól Kiri": "Mondulkiri",
  "Otdar Mean Chey": "Oddar Meanchey",
  "Phnom Penh": "Phnom Penh", // No change needed
  "Pouthisat": "Pursat",
  "Preah Vihéar": "Preah Vihear",
  "Prey Vêng": "Prey Veng",
  "Rôtânôkiri": "Ratanakiri",
  "Siemréab": "Siem Reap",
  "Stœng Trêng": "Stung Treng",
  "Svay Rieng": "Svay Rieng", // No change needed
  "Takêv": "Takeo",
  "Krong Pailin": "Pailin",
  "Krong Preah Sihanouk": "Preah Sihanouk",
};

/**
 * Convert GeoJSON province name to database name
 * @param geojsonName - Name from GeoJSON file
 * @returns Database name, or original name if not found in mapping
 */
export function mapCambodiaGovernorateName(geojsonName: string): string {
  return CAMBODIA_GOVERNORATE_MAPPING[geojsonName] || geojsonName;
}

/**
 * Normalize a governorate name for comparison (handles both GeoJSON and database names)
 * 
 * Rules:
 *   - Convert to lowercase
 *   - Remove all diacritical marks (NFD decompose + remove combining chars)
 *   - Remove hyphens, spaces, and special characters
 *   - Collapse multiple spaces
 *   - Trim
 * 
 * Examples:
 *   "Siemréab" → "siemreab"
 *   "Siem Reap" → "siemreap"
 *   "Kâmpóng Cham" → "kampongcham"
 *   "Kampong Cham" → "kampongcham"
 */
export function normalizeCambodiaGovernorateName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")                          // Decompose diacriticals
    .replace(/[\u0300-\u036f]/g, "")          // Remove combining marks
    .replace(/[^\w]/g, "")                    // Remove all non-word characters
    .trim();
}

/**
 * Check if a GeoJSON name matches a database name (accounting for diacriticals)
 */
export function isCambodiaGovernorateMatch(geojsonName: string, dbName: string): boolean {
  const normalized1 = normalizeCambodiaGovernorateName(geojsonName);
  const normalized2 = normalizeCambodiaGovernorateName(dbName);
  return normalized1 === normalized2;
}
