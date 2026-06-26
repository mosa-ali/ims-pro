/**
 * countryGeoJsonMap.ts
 * Location: src/utils/countryGeoJsonMap.ts
 *
 * Maps operating_units.country values → GeoJSON file slugs
 * served from /public/maps/{slug}-governorates.geojson
 *
 * All 99 countries sourced from countryGovernorateCoordinates.ts
 * GeoJSON files generated from the same coordinate database.
 */

const COUNTRY_GEOJSON_MAP: Record<string, string> = {
  "afghanistan": "afghanistan",
  "argentina": "argentina",
  "australia": "australia",
  "austria": "austria",
  "bahrain": "bahrain",
  "bangladesh": "bangladesh",
  "belgium": "belgium",
  "bolivia": "bolivia",
  "brazil": "brazil",
  "bulgaria": "bulgaria",
  "burkina faso": "burkina-faso",
  "burundi": "burundi",
  "cambodia": "cambodia",
  "cameroon": "cameroon",
  "canada": "canada",
  "central african republic": "central-african-republic",
  "chad": "chad",
  "chile": "chile",
  "china": "china",
  "colombia": "colombia",
  "congo": "congo",
  "croatia": "croatia",
  "czech republic": "czech-republic",
  "democratic republic of the congo": "democratic-republic-of-the-congo",
  "denmark": "denmark",
  "ecuador": "ecuador",
  "egypt": "egypt",
  "equatorial guinea": "equatorial-guinea",
  "ethiopia": "ethiopia",
  "finland": "finland",
  "france": "france",
  "gabon": "gabon",
  "germany": "germany",
  "ghana": "ghana",
  "greece": "greece",
  "hungary": "hungary",
  "iceland": "iceland",
  "india": "india",
  "indonesia": "indonesia",
  "iran": "iran",
  "iraq": "iraq",
  "ireland": "ireland",
  "israel": "israel",
  "italy": "italy",
  "ivory coast": "ivory-coast",
  "japan": "japan",
  "jordan": "jordan",
  "kenya": "kenya",
  "kuwait": "kuwait",
  "laos": "laos",
  "lebanon": "lebanon",
  "malawi": "malawi",
  "malaysia": "malaysia",
  "mali": "mali",
  "mexico": "mexico",
  "mozambique": "mozambique",
  "myanmar": "myanmar",
  "netherlands": "netherlands",
  "new zealand": "new-zealand",
  "niger": "niger",
  "nigeria": "nigeria",
  "norway": "norway",
  "oman": "oman",
  "pakistan": "pakistan",
  "palestine": "palestine",
  "peru": "peru",
  "philippines": "philippines",
  "poland": "poland",
  "portugal": "portugal",
  "qatar": "qatar",
  "romania": "romania",
  "russia": "russia",
  "rwanda": "rwanda",
  "saudi arabia": "saudi-arabia",
  "senegal": "senegal",
  "serbia": "serbia",
  "singapore": "singapore",
  "slovenia": "slovenia",
  "somalia": "somalia",
  "south africa": "south-africa",
  "south korea": "south-korea",
  "spain": "spain",
  "sudan": "sudan",
  "sweden": "sweden",
  "switzerland": "switzerland",
  "syria": "syria",
  "taiwan": "taiwan",
  "tanzania": "tanzania",
  "thailand": "thailand",
  "turkey": "turkey",
  "uganda": "uganda",
  "ukraine": "ukraine",
  "united arab emirates": "united-arab-emirates",
  "united kingdom": "united-kingdom",
  "united states": "united-states",
  "vietnam": "vietnam",
  "yemen": "yemen",
  "zambia": "zambia",
  "zimbabwe": "zimbabwe",
};

/**
 * Resolve operating_units.country → GeoJSON URL
 * Returns null if country not mapped → shows "map not available" state
 */
export function resolveCountryGeoJson(country: string | null | undefined): string | null {
  if (!country) return null;
  const slug = COUNTRY_GEOJSON_MAP[country.trim().toLowerCase()];
  return slug ? `/maps/${slug}-governorates.geojson` : null;
}

/**
 * Normalize country name for display
 */
export function normalizeCountryName(country: string | null | undefined): string {
  if (!country) return "Unknown";
  return country
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
