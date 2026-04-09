import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

export interface OrganizationOption {
  id: number;
  name: string;
  operatingUnits: OperatingUnitOption[];
}

export interface OperatingUnitOption {
  id: number;
  name: string;
  organizationId: number;
}

export function useOrganizationsForAccess() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all organizations (public endpoint)
  const { data: allOrganizations, isLoading: isLoadingOrgs } = trpc.ims.organizations.listPublic.useQuery(
    undefined,
    { enabled: true }
  );

  // Fetch all operating units (public endpoint)
  const { data: allOperatingUnits, isLoading: isLoadingOUs } = trpc.ims.operatingUnits.listPublic.useQuery(
    undefined,
    { enabled: true }
  );

  useEffect(() => {
    if (isLoadingOrgs || isLoadingOUs) {
      setIsLoading(true);
      return;
    }

    try {
      // Organize operating units by organization
      const orgMap = new Map<number, OrganizationOption>();

      if (allOrganizations) {
        allOrganizations.forEach((org) => {
          orgMap.set(org.id, {
            id: org.id,
            name: org.name,
            operatingUnits: [],
          });
        });
      }

      if (allOperatingUnits) {
        allOperatingUnits.forEach((ou) => {
          const org = orgMap.get(ou.organizationId);
          if (org) {
            org.operatingUnits.push({
              id: ou.id,
              name: ou.name,
              organizationId: ou.organizationId,
            });
          }
        });
      }

      setOrganizations(Array.from(orgMap.values()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [allOrganizations, allOperatingUnits, isLoadingOrgs, isLoadingOUs]);

  return {
    organizations,
    isLoading,
    error,
  };
}
