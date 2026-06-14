/**
 * ============================================================================
 * REFERENCE & VERIFICATION - Generate employment references
 * ============================================================================
 */

import { FilteredEmployeesList } from './FilteredEmployeesList';
import { useLanguage } from '@/contexts/LanguageContext';

export function ReferenceVerification() {
  return (
    <FilteredEmployeesList
      filter="reference"
      title={{
        en: 'Reference & Verification',
        ar: 'المرجع والتحقق',
        it: 'Referenze e Verifiche'
      }}
      subtitle={{
        en: 'Generate employment references',
        ar: 'إنشاء مراجع العمل',
        it: 'Genera referenze lavorative'
      }}
      backPath="/organization/hr/employees-profiles"
      showAddButton={false}
    />
  );
}