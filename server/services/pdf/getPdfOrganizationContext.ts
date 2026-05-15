/**
 * ============================================================================
 * PDF ORGANIZATION CONTEXT HELPER
 * ============================================================================
 * 
 * Centralized helper to fetch organization, operating unit, and branding data
 * for PDF generation. Eliminates code duplication across all PDF generators.
 * 
 * USAGE:
 * ```typescript
 * const context = await getPdfOrganizationContext(db, organizationId, operatingUnitId);
 * 
 * // Now use in PDF data:
 * const pdfData = {
 *   ...context,
 *   // other PDF-specific fields
 * };
 * ```
 * 
 * BENEFITS:
 * ✅ Single source of truth for org/OU/branding data
 * ✅ Eliminates code duplication across PR, GRN, Stock Issue, etc.
 * ✅ Consistent organization context across all PDFs
 * ✅ Easy to extend with new fields (timezone, currency, etc.)
 * ✅ Type-safe with full TypeScript support
 * 
 * ============================================================================
 */

import { eq, and } from 'drizzle-orm';
import { 
  organizations, 
  operatingUnits, 
  organizationBranding 
} from 'drizzle/schema';
import { TRPCError } from '@trpc/server';

/**
 * Organization context data for PDF generation
 */
export interface PdfOrganizationContext {
  // Organization Info
  organizationId: number;
  organizationName: string;
  organizationNameAr?: string;
  organizationLogo?: string;
  organizationDomain?: string;
  organizationCountry?: string;
  organizationTimezone: string;
  organizationCurrency: string;
  organizationDefaultLanguage: string;

  // Operating Unit Info
  operatingUnitId: number;
  operatingUnitName: string;
  operatingUnitType: string;
  operatingUnitCountry?: string;
  operatingUnitCity?: string;
  operatingUnitCode?: string;
  operatingUnitTimezone: string;
  operatingUnitCurrency: string;

  // Branding Info
  brandingLogoUrl?: string;
  brandingFaviconUrl?: string;
  brandingPrimaryColor?: string;
  brandingSecondaryColor?: string;
  brandingAccentColor?: string;
  brandingHeaderText?: string;
  brandingFooterText?: string;
  brandingFooterTextAr?: string;
  brandingSystemName?: string;
  brandingSystemNameAr?: string;
  brandingCustomCss?: string;
}

/**
 * Fetch complete organization context for PDF generation
 * 
 * @param db - Database instance
 * @param organizationId - Organization ID (from ctx.scope.organizationId)
 * @param operatingUnitId - Operating Unit ID (from ctx.scope.operatingUnitId)
 * @returns Complete organization context for PDF generation
 * 
 * @throws TRPCError if organization or operating unit not found
 */
export async function getPdfOrganizationContext(
  db: any,
  organizationId: number,
  operatingUnitId: number
): Promise<PdfOrganizationContext> {
  console.log(
    `[PDF Context] Fetching organization context: orgId=${organizationId}, ouId=${operatingUnitId}`
  );

  // ========== FETCH ORGANIZATION DATA ==========
  const org = await db.query.organizations.findFirst({
  where: eq(organizations.id, organizationId),
  });

  if (!org) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Organization not found: ID=${organizationId}`,
    });
  }

  // ========== FETCH OPERATING UNIT DATA ==========
  const ou = await db.query.operatingUnits.findFirst({
  where: and(
    eq(operatingUnits.id, operatingUnitId),
    eq(operatingUnits.organizationId, organizationId)
    ),
  });

  if (!ou) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Operating Unit not found: ID=${operatingUnitId} for Organization=${organizationId}`,
    });
  }

  console.log(`[PDF Context] ✅ Operating Unit found: ${ou.name}`);

  // ========== FETCH BRANDING DATA ==========
  const branding = await db.query.organizationBranding.findFirst({
  where: eq(
    organizationBranding.organizationId,
    organizationId
      ),
    });

  console.log(`[PDF Context] ✅ Branding data ${branding ? 'found' : 'not found'}`);

  // ========== BUILD CONTEXT OBJECT ==========
  const context: PdfOrganizationContext = {
    // Organization Info
    organizationId: org.id,
    organizationName: org.name,
    organizationNameAr: org.nameAr || undefined,
    organizationLogo: branding?.logoUrl || undefined,
    organizationDomain: org.domain || undefined,
    organizationCountry: org.country || undefined,
    organizationTimezone: org.timezone || 'UTC',
    organizationCurrency: org.currency || 'USD',
    organizationDefaultLanguage: org.defaultLanguage || 'en',

    // Operating Unit Info
    operatingUnitId: ou.id,
    operatingUnitName: ou.name,
    operatingUnitType: ou.type,
    operatingUnitCountry: ou.country || undefined,
    operatingUnitCity: ou.city || undefined,
    operatingUnitCode: ou.code || undefined,
    operatingUnitTimezone: ou.timezone || 'UTC',
    operatingUnitCurrency: ou.currency || 'USD',

    // Branding Info
    brandingLogoUrl: branding?.logoUrl || undefined,
    brandingFaviconUrl: branding?.faviconUrl || undefined,
    brandingPrimaryColor: branding?.primaryColor || undefined,
    brandingSecondaryColor: branding?.secondaryColor || undefined,
    brandingAccentColor: branding?.accentColor || undefined,
    brandingHeaderText: branding?.headerText || undefined,
    brandingFooterText: branding?.footerText || undefined,
    brandingFooterTextAr: branding?.footerTextAr || undefined,
    brandingSystemName: branding?.systemName || org.name,
    brandingSystemNameAr: branding?.systemNameAr || org.nameAr || undefined,
    brandingCustomCss: branding?.customCss || undefined,
  };

  console.log(`[PDF Context] ✅ Organization context ready`);

  return context;
}

/**
 * Get display name for organization (with fallback to English if Arabic not available)
 * 
 * @param context - PDF Organization Context
 * @param language - 'en' or 'ar'
 * @returns Organization name in requested language
 */
export function getOrganizationDisplayName(
  context: PdfOrganizationContext,
  language: 'en' | 'ar'
): string {
  if (language === 'ar' && context.organizationNameAr) {
    return context.organizationNameAr;
  }
  return context.organizationName;
}

/**
 * Get display name for operating unit (with fallback to English if Arabic not available)
 * 
 * @param context - PDF Organization Context
 * @param language - 'en' or 'ar'
 * @returns Operating unit name in requested language
 */
export function getOperatingUnitDisplayName(
  context: PdfOrganizationContext,
  language: 'en' | 'ar'
): string {
  // Note: Operating units don't have Arabic names in current schema
  // This function is here for consistency and future extensibility
  return context.operatingUnitName;
}

/**
 * Get system display name (branding system name or org name)
 * 
 * @param context - PDF Organization Context
 * @param language - 'en' or 'ar'
 * @returns System name in requested language
 */
export function getSystemDisplayName(
  context: PdfOrganizationContext,
  language: 'en' | 'ar'
): string {
  if (language === 'ar' && context.brandingSystemNameAr) {
    return context.brandingSystemNameAr;
  }
  return context.brandingSystemName || context.organizationName;
}

/**
 * Get footer text for PDF (branding footer or default)
 * 
 * @param context - PDF Organization Context
 * @param language - 'en' or 'ar'
 * @returns Footer text in requested language
 */
export function getFooterText(
  context: PdfOrganizationContext,
  language: 'en' | 'ar'
): string {
  if (language === 'ar' && context.brandingFooterTextAr) {
    return context.brandingFooterTextAr;
  }
  if (context.brandingFooterText) {
    return context.brandingFooterText;
  }
  return `${context.organizationName} - ${context.operatingUnitName}`;
}

/**
 * Validate organization context has required fields
 * 
 * @param context - PDF Organization Context
 * @throws Error if required fields are missing
 */
export function validatePdfOrganizationContext(
  context: PdfOrganizationContext
): void {
  const requiredFields: (keyof PdfOrganizationContext)[] = [
    'organizationId',
    'organizationName',
    'operatingUnitId',
    'operatingUnitName',
  ];

  for (const field of requiredFields) {
    if (!context[field]) {
      throw new Error(`Missing required field in PDF context: ${String(field)}`);
    }
  }
}
