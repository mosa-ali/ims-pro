/**
 * ukraine-mozambique-governorate-mappings.ts
 * 
 * Maps GeoJSON province names to database names for Ukraine and Mozambique
 * 
 * UKRAINE:
 *   - GeoJSON uses Cyrillic transliteration with apostrophes (e.g., "Dnipropetrovs'k")
 *   - Database uses modern English spellings (e.g., "Dnipropetrovsk")
 *   - Some names differ significantly (Kiev → Kyiv, Transcarpathia → Zakarpattia)
 * 
 * MOZAMBIQUE:
 *   - GeoJSON and database mostly match
 *   - Database has additional cities (Beira, Quelimane) not in GeoJSON
 */

// ─── UKRAINE GOVERNORATE MAPPING ───────────────────────────────────────────────
export const UKRAINE_GOVERNORATE_MAPPING: Record<string, string> = {
  // Exact matches (no apostrophe)
  "Cherkasy": "Cherkasy",
  "Chernihiv": "Chernihiv",
  "Chernivtsi": "Chernivtsi",
  "Kharkiv": "Kharkiv",
  "Kherson": "Kherson",
  "Kirovohrad": "Kirovohrad",
  "Poltava": "Poltava",
  "Rivne": "Rivne",
  "Sumy": "Sumy",
  "Volyn": "Volyn",
  "Zhytomyr": "Zhytomyr",
  
  // Cyrillic transliteration with apostrophes → English spellings
  "Dnipropetrovs'k": "Dnipropetrovsk",
  "Donets'k": "Donetsk",
  "Ivano-Frankivs'k": "Ivano-Frankivsk",
  "Khmel'nyts'kyy": "Khmelnytskyi",
  "L'viv": "Lviv",
  "Luhans'k": "Luhansk",
  "Mykolayiv": "Mykolaiv",
  "Odessa": "Odesa",
  "Ternopil'": "Ternopil",
  "Vinnytsya": "Vinnytsia",
  "Zaporizhzhya": "Zaporizhzhia",
  
  // Special cases: Different English names
  "Kiev": "Kyiv",
  "Kiev City": "Kyiv Oblast",
  "Transcarpathia": "Zakarpattia",
};

// ─── MOZAMBIQUE GOVERNORATE MAPPING ───────────────────────────────────────────
export const MOZAMBIQUE_GOVERNORATE_MAPPING: Record<string, string> = {
  // Direct matches
  "Cabo Delgado": "Cabo Delgado",
  "Gaza": "Gaza",
  "Inhambane": "Inhambane",
  "Manica": "Manica",
  "Maputo": "Maputo",
  "Nampula": "Nampula",
  "Niassa": "Niassa",
  "Sofala": "Sofala",  // Not in database but in GeoJSON
  "Tete": "Tete",
  "Zambezia": "Zambezia",  // Not in database but in GeoJSON
};

/**
 * Convert GeoJSON province name to database name
 * @param geojsonName - Name from GeoJSON file
 * @param country - Country name (ukraine or mozambique)
 * @returns Database name, or original name if not found in mapping
 */
export function mapGovernorateNameByCountry(geojsonName: string, country: string): string {
  const country_lower = country.toLowerCase();
  
  if (country_lower === "ukraine") {
    return UKRAINE_GOVERNORATE_MAPPING[geojsonName] || geojsonName;
  } else if (country_lower === "mozambique") {
    return MOZAMBIQUE_GOVERNORATE_MAPPING[geojsonName] || geojsonName;
  }
  
  return geojsonName;
}

/**
 * Normalize a governorate name for comparison
 * Handles diacriticals, apostrophes, and spacing variations
 */
export function normalizeGovernorateNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")                          // Decompose diacriticals
    .replace(/[\u0300-\u036f]/g, "")          // Remove combining marks
    .replace(/[''`'\u2018\u2019]/g, "")       // Remove apostrophes
    .replace(/[-]/g, " ")                     // Hyphen → space
    .replace(/\s+/g, " ")                     // Collapse spaces
    .trim();
}
