import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ComposableMap, Geographies, Geography, Annotation } from "react-simple-maps";
import { AlertCircle, MapPin } from "lucide-react";
import { geoCentroid } from "d3-geo";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Governorate {
  governorateId: number;
  governorateName: string;
  country?: string;
}

export interface ProjectMapData {
  projectId: number;
  projectCode: string;
  status: string;
  totalBudget: number;
  totalSpent: number;
  governorates: Governorate[];
}

interface TooltipState {
  visible: boolean;
  name: string;
  x: number;
  y: number;
  isTarget: boolean;
}

interface Props {
  projects: ProjectMapData[];
  geoJsonUrl: string | null;
  countryName?: string;
  height?: number | string;
  organizationName?: string;
  operatingUnitName?: string;
}

// ─── Governorate Name Mappings ────────────────────────────────────────────────
// GeoJSON names may differ from database names due to transliteration, apostrophes, etc.

// Cambodia: French diacriticals (Khmer transliteration) → English names
const CAMBODIA_GOVERNORATE_MAPPING: Record<string, string> = {
  "Batdâmbâng": "Battambang",
  "Bântéay Méanchey": "Banteay Meanchey",
  "Kaôh Kong": "Koh Kong",
  "Krâchéh": "Kratie",
  "Kâmpóng Cham": "Kampong Cham",
  "Kâmpóng Chhnang": "Kampong Chhnang",
  "Kâmpóng Spœ": "Kampong Speu",
  "Kâmpóng Thum": "Kampong Thom",
  "Kâmpôt": "Kampot",
  "Kândal": "Kandal",
  "Môndól Kiri": "Mondulkiri",
  "Otdar Mean Chey": "Oddar Meanchey",
  "Pouthisat": "Pursat",
  "Preah Vihéar": "Preah Vihear",
  "Prey Vêng": "Prey Veng",
  "Rôtânôkiri": "Ratanakiri",
  "Siemréab": "Siem Reap",
  "Stœng Trêng": "Stung Treng",
  "Takêv": "Takeo",
  "Krong Pailin": "Pailin",
  "Krong Preah Sihanouk": "Preah Sihanouk",
};

// Ukraine: Cyrillic transliteration with apostrophes → English spellings
const UKRAINE_GOVERNORATE_MAPPING: Record<string, string> = {
  // Exact matches
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
  // Cyrillic transliteration with apostrophes
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
  // Special cases
  "Kiev": "Kyiv",
  "Kiev City": "Kyiv Oblast",
  "Transcarpathia": "Zakarpattia",
};

// Mozambique: Mostly direct matches
const MOZAMBIQUE_GOVERNORATE_MAPPING: Record<string, string> = {
  "Cabo Delgado": "Cabo Delgado",
  "Gaza": "Gaza",
  "Inhambane": "Inhambane",
  "Manica": "Manica",
  "Maputo": "Maputo",
  "Nampula": "Nampula",
  "Niassa": "Niassa",
  "Sofala": "Sofala",
  "Tete": "Tete",
  "Zambezia": "Zambezia",
};

// Tunisia: Direct matches (French diacriticals preserved)
const TUNISIA_GOVERNORATE_MAPPING: Record<string, string> = {
  "Ariana": "Ariana",
  "Ben Arous": "Ben Arous",
  "Bizerte": "Bizerte",
  "Béja": "Béja",
  "Gabès": "Gabès",
  "Gafsa": "Gafsa",
  "Jendouba": "Jendouba",
  "Kairouan": "Kairouan",
  "Kasserine": "Kasserine",
  "Kébili": "Kébili",
  "Le Kef": "Le Kef",
  "Mahdia": "Mahdia",
  "Manouba": "Manouba",
  "Medenine": "Medenine",
  "Monastir": "Monastir",
  "Nabeul": "Nabeul",
  "Sfax": "Sfax",
  "Sidi Bouzid": "Sidi Bouzid",
  "Siliana": "Siliana",
  "Sousse": "Sousse",
  "Tataouine": "Tataouine",
  "Tozeur": "Tozeur",
  "Tunis": "Tunis",
  "Zaghouan": "Zaghouan",
};

// ─── Country projection configs ───────────────────────────────────────────────
const COUNTRY_PROJECTION: Record<
  string,
  { scale: number; center: [number, number] }
> = {
  yemen:       { scale: 3200, center: [48, 15.5] },
  cambodia:    { scale: 4500, center: [105.0, 12.6] },
  mozambique:  { scale: 2200, center: [35.5, -18.7] },
  ukraine:     { scale: 2000, center: [31.1, 48.8] },
  colombia:    { scale: 2500, center: [-74.3, 4.7] },
  syria:       { scale: 3800, center: [38, 35] },
  iraq:        { scale: 2800, center: [44, 33] },
  sudan:       { scale: 1800, center: [30, 15] },
  somalia:     { scale: 2200, center: [46, 6] },
  libya:       { scale: 1600, center: [17, 27] },
  jordan:      { scale: 5500, center: [36.5, 31] },
  lebanon:     { scale: 9000, center: [35.8, 33.8] },
  palestine:   { scale: 9000, center: [35.2, 31.9] },
  ethiopia:    { scale: 1600, center: [40, 9] },
  afghanistan: { scale: 2800, center: [67, 33] },
  pakistan:    { scale: 1800, center: [69, 30] },
  default:     { scale: 2500, center: [45, 15] },
};

function getProjection(countryName?: string) {
  if (!countryName) return COUNTRY_PROJECTION.default;
  const key = countryName.toLowerCase().trim();
  return COUNTRY_PROJECTION[key] ?? COUNTRY_PROJECTION.default;
}

// ─── Name helpers ─────────────────────────────────────────────────────────────

/**
 * Extract the governorate display name from a GeoJSON feature's properties.
 * Tries multiple keys since different GeoJSON sources use different field names.
 * Applies Cambodia name mapping if the name is in the mapping table.
 */
function extractGovName(properties: Record<string, any>, countryName?: string): string {
  let name = (
    properties?.name      ||
    properties?.NAME_1    ||
    properties?.shapeName ||
    properties?.admin1Name||
    properties?.ADM1_EN   ||
    properties?.NAME      ||
    ""
  );
  
  // Apply country-specific mappings
  const country_lower = countryName?.toLowerCase();
  if (country_lower === "cambodia" && CAMBODIA_GOVERNORATE_MAPPING[name]) {
    name = CAMBODIA_GOVERNORATE_MAPPING[name];
  } else if (country_lower === "ukraine" && UKRAINE_GOVERNORATE_MAPPING[name]) {
    name = UKRAINE_GOVERNORATE_MAPPING[name];
  } else if (country_lower === "mozambique" && MOZAMBIQUE_GOVERNORATE_MAPPING[name]) {
    name = MOZAMBIQUE_GOVERNORATE_MAPPING[name];
  } else if (country_lower === "tunisia" && TUNISIA_GOVERNORATE_MAPPING[name]) {
    name = TUNISIA_GOVERNORATE_MAPPING[name];
  }
  
  return name;
}

/**
 * Normalize a governorate name for comparison.
 *
 * Rules (must match the DB names after normalization):
 *   - lowercase
 *   - strip diacritics (NFD decompose + remove combining chars)
 *   - strip all quote/apostrophe variants: ' ` ' ' "
 *   - strip hyphens
 *   - collapse multiple spaces
 *   - trim
 *
 * Examples:
 *   "Al Dhale'e"  → "al dhalee"
 *   "Sana'a"      → "sanaa"
 *   "Sa`dah"      → "sadah"
 *   "Al-Hudaydah" → "al hudaydah"  (hyphen → space, then collapse)
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove diacritics
    .replace(/[''`'\u2018\u2019\u201A\u201B\u0060]/g, "") // all quote variants
    .replace(/[-]/g, " ")              // hyphen → space (for "Al-Hudaydah" etc)
    .replace(/\s+/g, " ")              // collapse spaces
    .trim();
}

/**
 * Build the normalized active governorate set from all projects.
 * Per GEO_INTELLIGENCE_SYSTEM spec §5.2 — GLOBAL UNION across all projects.
 * Note: No status filter here — all projects' governorates are included
 * since the map should show total operational footprint.
 */
function buildActiveSet(projects: ProjectMapData[]): Set<string> {
  const set = new Set<string>();
  projects.forEach((project) => {
    (project.governorates || []).forEach((gov) => {
      if (gov.governorateName) {
        set.add(normalize(gov.governorateName));
      }
    });
  });
  return set;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeographicFundingMap({
  projects = [],
  geoJsonUrl,
  countryName = "the operating region",
  height = 400,
  operatingUnitName,
}: Props) {
  const [geoError, setGeoError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    name: "",
    x: 0,
    y: 0,
    isTarget: false,
  });

  // Pre-flight HEAD fetch — react-simple-maps v3 has no onError prop
  useEffect(() => {
    setGeoError(false);
    if (!geoJsonUrl) return;
    fetch(geoJsonUrl, { method: "HEAD" })
      .then((res) => { if (!res.ok) setGeoError(true); })
      .catch(() => setGeoError(true));
  }, [geoJsonUrl]);

  const activeGovernorates = useMemo(
    () => buildActiveSet(projects),
    [projects]
  );

  const projection = useMemo(
    () => getProjection(countryName),
    [countryName]
  );

  const handleMouseEnter = useCallback(
    (geo: any, e: React.MouseEvent) => {
      const name = extractGovName(geo.properties, countryName);
      if (!name) return;
      const isTarget = activeGovernorates.has(normalize(name));
      const rect = containerRef.current?.getBoundingClientRect();
      setTooltip({
        visible: true,
        name,
        x: e.clientX - (rect?.left ?? 0),
        y: e.clientY - (rect?.top ?? 0),
        isTarget,
      });
    },
    [activeGovernorates]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // ─── No GeoJSON mapped ────────────────────────────────────────────────────
  if (!geoJsonUrl) {
    return (
      <div
        className="relative bg-slate-50 overflow-hidden flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center space-y-2 px-6">
          <MapPin className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            Map not available for {countryName}
          </p>
          <p className="text-xs text-slate-400">
            Add a GeoJSON file to{" "}
            <code className="bg-white px-1 rounded border">/public/maps/</code>{" "}
            and register the country in{" "}
            <code className="bg-white px-1 rounded border">countryGeoJsonMap.ts</code>
          </p>
        </div>
      </div>
    );
  }

  // ─── GeoJSON fetch error ──────────────────────────────────────────────────
  if (geoError) {
    return (
      <div
        className="relative bg-white overflow-hidden flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center space-y-2 px-6">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
          <p className="text-sm font-semibold text-slate-600">Map data unavailable</p>
          <p className="text-xs text-slate-400">
            Could not load{" "}
            <code className="bg-slate-100 px-1 rounded">{geoJsonUrl}</code>
          </p>
          <p className="text-xs text-slate-400">
            Ensure the file exists at{" "}
            <code className="bg-slate-100 px-1 rounded">
              D:\LOCAL-IMS\public\maps\
            </code>
          </p>
        </div>
      </div>
    );
  }

  const hasProjectData = projects.length > 0 && activeGovernorates.size > 0;
  const titleText = operatingUnitName
    ? `${operatingUnitName} — Geographical Coverage`
    : "Geographical Coverage";

  // ─── Map ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden"
      style={{ height, background: "#f0f4f4" }}
    >
    {/* Map canvas */}
    <div className="absolute inset-0">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={projection}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoJsonUrl}>
          {({ geographies }) =>
            geographies.map((geo: any) => {
              const rawName = extractGovName(geo.properties, countryName);

              if (!rawName) return null;

              const isTarget =
                hasProjectData &&
                activeGovernorates.has(normalize(rawName));

              const [x, y] = geoCentroid(geo);

              return (
                <React.Fragment key={geo.rsmKey}>
                  <Geography
                    geography={geo}
                    stroke="#ffffff"
                    strokeWidth={1}
                    style={{
                      default: {
                        fill: isTarget ? "#0d7c6e" : "#d1dada",
                        outline: "none",
                        cursor: "pointer",
                      },
                      hover: {
                        fill: isTarget ? "#0a5f55" : "#b8c8c8",
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: {
                        fill: isTarget ? "#0a5f55" : "#b8c8c8",
                        outline: "none",
                      },
                    } as any}
                    onMouseEnter={(e) => handleMouseEnter(geo, e)}
                    onMouseLeave={handleMouseLeave}
                  />

                  <Annotation
                    subject={[x, y]}
                    dx={0}
                    dy={0}
                  >
                    <text
                      textAnchor="middle"
                      fontSize={isTarget ? 7 : 6}
                      fontWeight={isTarget ? 600 : 400}
                      fill="#1e293b"
                      pointerEvents="none"
                    >
                      {rawName}
                    </text>
                  </Annotation>
                </React.Fragment>
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
      {/* Tooltip */}
      {tooltip.visible && tooltip.name && (
        <div
          className="pointer-events-none absolute z-30 px-3 py-1.5 rounded-lg shadow-lg text-xs font-semibold text-white"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 36,
            background: tooltip.isTarget ? "#0d7c6e" : "#475569",
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.name}
          {tooltip.isTarget && (
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider opacity-75">
              · Active
            </span>
          )}
        </div>
      )}

      {/* Title banner */}
      <div className="absolute top-4 left-4 z-20">
        <div
          className="px-3 py-1.5 rounded-md text-[11px] font-bold text-white uppercase tracking-widest shadow-sm"
          style={{ background: "#7a6a3a" }}
        >
          {titleText}
        </div>
      </div>

      {/* Legend (bottom-left) */}
      {hasProjectData && (
        <div className="absolute bottom-4 left-4 z-20 bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2.5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: "#0d7c6e" }}
            />
            <span className="text-[10px] text-slate-600 font-medium">
              Current Operating Governorates
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
