/**
 * ============================================================================
 * ORGANIZATION CONTEXT ADAPTER
 * ============================================================================
 * 
 * Re-exports the OrganizationContext from the main contexts folder.
 * 
 * ============================================================================
 */

export { 
  OrganizationProvider, 
  useOrganization 
} from '@/contexts/OrganizationContext';

export type { 
  Organization, 
  OrganizationRole 
} from '@/contexts/OrganizationContext';
