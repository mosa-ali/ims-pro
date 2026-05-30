/**
 * ============================================================================
 * useOrganizationBranding
 * ============================================================================
 *
 * Centralized hook that:
 * 1. Fetches organization branding via tRPC (settings.branding.get)
 * 2. Applies the favicon dynamically to the browser tab
 * 3. Exposes typed branding data for use in Header, Sidebar, etc.
 * 4. INVALIDATES the cache immediately on org switch so branding updates
 *    are instant — no stale data flash from the previous organization.
 *
 * Org-switch flow:
 *   OrganizationContext.switchOrganization()
 *     → updates localStorage('pms_current_org')
 *     → React re-render changes currentOrganizationId
 *     → useEffect detects change → invalidates cache → fresh fetch fires
 *     → Header/Sidebar re-render with new org's branding
 *
 * Usage:
 *   const { branding, isLoading } = useOrganizationBranding();
 *   // branding.logoUrl, branding.headerColor, branding.headerTextColor, etc.
 * ============================================================================
 */

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface OrganizationBranding {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  headerColor: string | null;
  headerTextColor: string | null;
  systemName: string | null;
  systemNameAr: string | null;
  footerText: string | null;
  footerTextAr: string | null;
  organizationName: string | null;
  organizationNameAr: string | null;
}

const DEFAULT_BRANDING: OrganizationBranding = {
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#2563EB',
  secondaryColor: '#7C3AED',
  accentColor: '#F59E0B',
  headerColor: null,
  headerTextColor: null,
  systemName: null,
  systemNameAr: null,
  footerText: null,
  footerTextAr: null,
  organizationName: null,
  organizationNameAr: null,
};

/**
 * Apply favicon to the browser tab dynamically.
 * Removes all existing favicon links first to avoid stale browser-cached icons.
 */
function applyFavicon(faviconUrl: string | null): void {
  try {
    // Remove all existing favicon links
    const existingLinks = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"]'
    );
    existingLinks.forEach((el) => el.parentNode?.removeChild(el));

    if (!faviconUrl) return;

    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon';
    // Append cache-buster so the browser doesn't serve the old org's favicon
    link.href = `${faviconUrl}?t=${Date.now()}`;
    document.head.appendChild(link);
  } catch {
    // Silently ignore favicon errors — non-critical
  }
}

export function useOrganizationBranding(): {
  branding: OrganizationBranding;
  isLoading: boolean;
  refetch: () => void;
} {
  const { currentOrganizationId } = useOrganization();
  const utils = trpc.useUtils();

  // Track the previous org ID so we can detect a real switch (not just a re-render)
  const prevOrgIdRef = useRef<string | number | null | undefined>(undefined);

  const { data, isLoading, refetch } = trpc.settings.branding.get.useQuery(undefined, {
    // Only fetch when there is an active organization scope
    enabled: !!currentOrganizationId,
    // No stale time — always show fresh branding after an org switch
    staleTime: 0,
    // Keep previous data while the new fetch is in-flight to avoid layout flash
    placeholderData: (prev) => prev,
  });

  // Invalidate + refetch immediately when the organization changes
  useEffect(() => {
    // Skip the very first render (prevOrgIdRef is undefined)
    if (prevOrgIdRef.current === undefined) {
      prevOrgIdRef.current = currentOrganizationId;
      return;
    }

    if (currentOrganizationId !== prevOrgIdRef.current) {
      prevOrgIdRef.current = currentOrganizationId;

      if (currentOrganizationId) {
        // Invalidate removes stale data from the cache immediately so the
        // next render shows the loading state rather than the old org's branding
        utils.settings.branding.get.invalidate();
      }
    }
  }, [currentOrganizationId]);

  // Apply favicon whenever branding data changes (including after org switch)
  useEffect(() => {
    // Apply the new favicon (or remove it if null)
    applyFavicon(data?.faviconUrl ?? null);
  }, [data?.faviconUrl, currentOrganizationId]);

  const branding: OrganizationBranding = {
    logoUrl: data?.logoUrl ?? null,
    faviconUrl: data?.faviconUrl ?? null,
    primaryColor: data?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: data?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    accentColor: data?.accentColor ?? DEFAULT_BRANDING.accentColor,
    headerColor: (data as any)?.headerColor ?? null,
    headerTextColor: (data as any)?.headerTextColor ?? null,
    systemName: data?.systemName ?? null,
    systemNameAr: data?.systemNameAr ?? null,
    footerText: data?.footerText ?? null,
    footerTextAr: data?.footerTextAr ?? null,
    organizationName: data?.organizationName ?? null,
    organizationNameAr: data?.organizationNameAr ?? null,
  };

  return { branding, isLoading, refetch };
}
