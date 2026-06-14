/**
 * ============================================================================
 * CONTRACT RENEWALS - Contracts expiring within 60 days
 * ============================================================================
 */

import { FilteredEmployeesList } from './FilteredEmployeesList';
import { useLanguage } from '@/contexts/LanguageContext';

export function ContractRenewals() {
  return (
    <FilteredEmployeesList
      filter="renewals"
      title={{
        en: 'Contract Renewals',
        ar: 'تجديد العقود',
        it: 'Rinnovi Contrattuali'
      }}
      subtitle={{
        en: 'Contracts expiring within 60 days',
        ar: 'عقود تنتهي خلال 60 يوماً',
        it: 'Contratti in scadenza entro 60 giorni'
      }}
      backPath="/organization/hr/employees-profiles"
      showAddButton={false}
    />
  );
}
