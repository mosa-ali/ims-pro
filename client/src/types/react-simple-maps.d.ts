/**
 * react-simple-maps.d.ts
 * Location: src/types/react-simple-maps.d.ts  (or project root /types/)
 *
 * Manual type declarations for react-simple-maps v3.0.0
 * which ships no .d.ts files.
 *
 * Covers only the props actually used in this codebase.
 * Derived from v3 propTypes in dist/index.js.
 */
declare module "react-simple-maps" {
  import * as React from "react";

  // ── ComposableMap ──────────────────────────────────────────────────────────
  export interface ProjectionConfig {
    scale?: number;
    center?: [number, number];
    rotate?: [number, number, number];
    parallels?: [number, number];
  }

  export interface ComposableMapProps {
    width?: number;
    height?: number;
    /** String identifier e.g. "geoMercator", "geoAlbers" */
    projection?: string | ((config: ProjectionConfig) => any);
    projectionConfig?: ProjectionConfig;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export const ComposableMap: React.ForwardRefExoticComponent<
    ComposableMapProps & React.RefAttributes<SVGSVGElement>
  >;

  // ── Geographies ───────────────────────────────────────────────────────────
  export interface GeographiesRenderProps {
    geographies: any[];
    outline: any;
    borders: any; 
  }

  export interface GeographiesProps {
    /** URL string, GeoJSON object, or feature array */
    geography: string | object | any[];
    children: (props: GeographiesRenderProps) => React.ReactNode;
    parseGeographies?: (features: any[]) => any[];
    className?: string;
  }

  export const Geographies: React.ForwardRefExoticComponent<
    GeographiesProps & React.RefAttributes<SVGGElement>
  >;

  // ── Geography ─────────────────────────────────────────────────────────────
  export interface GeographyStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    outline?: string;
    cursor?: string;
  }

  export interface GeographyProps {
    geography: any;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: GeographyStyle;
      hover?: GeographyStyle;
      pressed?: GeographyStyle;
    };
    className?: string;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    onClick?: (event: React.MouseEvent) => void;
  }

  export const Geography: React.ForwardRefExoticComponent<
    GeographyProps & React.RefAttributes<SVGPathElement>
  >;

  // ── Other exports (typed loosely — extend as needed) ──────────────────────
  export const Marker: React.FC<any>;
  export const Annotation: React.FC<any>;
  export const Graticule: React.FC<any>;
  export const Sphere: React.FC<any>;
  export const Line: React.FC<any>;
  export const ZoomableGroup: React.FC<any>;
  export const MapProvider: React.FC<any>;
  export const MapContext: React.Context<any>;
  export const ZoomPanContext: React.Context<any>;
  export const ZoomPanProvider: React.FC<any>;

  export function useGeographies(options: {
    geography: string | object | any[];
    parseGeographies?: (features: any[]) => any[];
  }): GeographiesRenderProps;

  export function useMapContext(): any;
  export function useZoomPan(): any;
  export function useZoomPanContext(): any;
}
