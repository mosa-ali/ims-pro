/**
 * Responsive Design Utilities for Executive Dashboard
 * ===================================================
 * Provides responsive breakpoints and utilities for consistent
 * mobile-first design across all dashboard components
 */

/**
 * Tailwind Breakpoints
 */
export const BREAKPOINTS = {
  xs: 320,    // Mobile (small)
  sm: 375,    // Mobile (standard)
  md: 414,    // Mobile (large)
  lg: 768,    // Tablet
  xl: 1024,   // Tablet (large)
  '2xl': 1280, // Desktop
  '3xl': 1920, // Desktop (large)
} as const;

/**
 * Responsive Grid Classes
 */
export const RESPONSIVE_GRID = {
  // 2-column grid: 1 col on mobile, 2 cols on desktop
  twoCol: 'grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6',
  
  // 3-column grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop
  threeCol: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6',
  
  // 4-column grid: 2 cols on mobile, 4 cols on desktop
  fourCol: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4',
  
  // 6-column grid: 2 cols on mobile, 3 cols on tablet, 6 cols on desktop
  sixCol: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3',
} as const;

/**
 * Responsive Padding Classes
 */
export const RESPONSIVE_PADDING = {
  // Container padding: 4px on mobile, 8px on tablet, 16px on desktop
  container: 'px-4 md:px-8 lg:px-16',
  
  // Card padding: 12px on mobile, 16px on desktop
  card: 'p-3 lg:p-4',
  
  // Section padding: 16px on mobile, 24px on desktop
  section: 'p-4 lg:p-6',
  
  // Compact padding: 8px on mobile, 12px on desktop
  compact: 'p-2 lg:p-3',
} as const;

/**
 * Responsive Font Sizes
 */
export const RESPONSIVE_FONT = {
  // Title: 20px on mobile, 24px on desktop
  title: 'text-xl lg:text-2xl',
  
  // Subtitle: 14px on mobile, 16px on desktop
  subtitle: 'text-sm lg:text-base',
  
  // Body: 12px on mobile, 14px on desktop
  body: 'text-xs lg:text-sm',
  
  // Label: 10px on mobile, 12px on desktop
  label: 'text-[10px] lg:text-xs',
} as const;

/**
 * Responsive Gap Classes
 */
export const RESPONSIVE_GAP = {
  // Large gap: 12px on mobile, 24px on desktop
  lg: 'gap-3 lg:gap-6',
  
  // Medium gap: 8px on mobile, 16px on desktop
  md: 'gap-2 lg:gap-4',
  
  // Small gap: 4px on mobile, 8px on desktop
  sm: 'gap-1 lg:gap-2',
} as const;

/**
 * Responsive Display Classes
 */
export const RESPONSIVE_DISPLAY = {
  // Hide on mobile, show on desktop
  desktopOnly: 'hidden lg:block',
  
  // Show on mobile, hide on desktop
  mobileOnly: 'lg:hidden',
  
  // Show on tablet and up
  tabletUp: 'hidden md:block',
  
  // Show on mobile and tablet only
  mobileTablet: 'md:hidden',
} as const;

/**
 * Responsive Chart Heights
 */
export const RESPONSIVE_CHART_HEIGHT = {
  // Small chart: 200px on mobile, 300px on desktop
  small: 'h-48 lg:h-72',
  
  // Medium chart: 250px on mobile, 350px on desktop
  medium: 'h-64 lg:h-96',
  
  // Large chart: 300px on mobile, 400px on desktop
  large: 'h-80 lg:h-[400px]',
  
  // Extra large chart: 350px on mobile, 450px on desktop
  xl: 'h-96 lg:h-[450px]',
} as const;

/**
 * Responsive Column Spans
 */
export const RESPONSIVE_COLS = {
  // Full width on mobile, half on desktop
  half: 'col-span-1 lg:col-span-2',
  
  // Full width on mobile, 1/3 on desktop
  third: 'col-span-1 lg:col-span-1',
  
  // Full width on mobile, 2/3 on desktop
  twoThirds: 'col-span-1 lg:col-span-2',
} as const;

/**
 * Media Query Helpers
 */
export const MEDIA_QUERIES = {
  mobile: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px) and (max-width: 1023px)',
  desktop: '@media (min-width: 1024px)',
  largeDesktop: '@media (min-width: 1280px)',
} as const;

/**
 * Hook: Detect current breakpoint
 */
export function useResponsive() {
  const [breakpoint, setBreakpoint] = React.useState<keyof typeof BREAKPOINTS>('lg');

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width < 375) setBreakpoint('xs');
      else if (width < 414) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else if (width < 1920) setBreakpoint('2xl');
      else setBreakpoint('3xl');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md',
    isTablet: breakpoint === 'lg' || breakpoint === 'xl',
    isDesktop: breakpoint === '2xl' || breakpoint === '3xl',
  };
}

/**
 * Hook: Get responsive value based on breakpoint
 */
export function useResponsiveValue<T>(values: Partial<Record<keyof typeof BREAKPOINTS, T>>): T | undefined {
  const { breakpoint } = useResponsive();
  return values[breakpoint];
}

/**
 * Utility: Generate responsive class string
 */
export function classifyResponsive(
  mobile: string,
  tablet: string = mobile,
  desktop: string = tablet
): string {
  return `${mobile} md:${tablet} lg:${desktop}`;
}

/**
 * Utility: Generate responsive style object
 */
export function styleResponsive(
  mobile: React.CSSProperties,
  tablet?: React.CSSProperties,
  desktop?: React.CSSProperties
): React.CSSProperties {
  // This is a simplified version - in real implementation,
  // you'd use CSS-in-JS or media queries
  return mobile;
}

/**
 * Responsive Container Component
 */
export const ResponsiveContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-full md:max-w-2xl lg:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Responsive Grid Component
 */
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, cols = 2, gap = 'md', className = '' }) => {
  const colsClass = {
    2: RESPONSIVE_GRID.twoCol,
    3: RESPONSIVE_GRID.threeCol,
    4: RESPONSIVE_GRID.fourCol,
    6: RESPONSIVE_GRID.sixCol,
  }[cols];

  return <div className={`${colsClass} ${className}`}>{children}</div>;
};

/**
 * Responsive Text Component
 */
export const ResponsiveText: React.FC<{
  children: React.ReactNode;
  size?: 'title' | 'subtitle' | 'body' | 'label';
  className?: string;
}> = ({ children, size = 'body', className = '' }) => {
  const sizeClass = RESPONSIVE_FONT[size];
  return <span className={`${sizeClass} ${className}`}>{children}</span>;
};

/**
 * Responsive Padding Component
 */
export const ResponsivePadding: React.FC<{
  children: React.ReactNode;
  type?: 'container' | 'card' | 'section' | 'compact';
  className?: string;
}> = ({ children, type = 'card', className = '' }) => {
  const paddingClass = RESPONSIVE_PADDING[type];
  return <div className={`${paddingClass} ${className}`}>{children}</div>;
};

/**
 * Export all utilities as a namespace
 */
export const ResponsiveUtils = {
  BREAKPOINTS,
  RESPONSIVE_GRID,
  RESPONSIVE_PADDING,
  RESPONSIVE_FONT,
  RESPONSIVE_GAP,
  RESPONSIVE_DISPLAY,
  RESPONSIVE_CHART_HEIGHT,
  RESPONSIVE_COLS,
  MEDIA_QUERIES,
  classifyResponsive,
  styleResponsive,
  useResponsive,
  useResponsiveValue,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveText,
  ResponsivePadding,
};

// Import React for hook usage
import React from 'react';
