/**
 * ============================================================================
 * NEW HIRES - Employees hired within last 90 days
 * ============================================================================
 */

import { FilteredEmployeesList } from './FilteredEmployeesList';
import { useLanguage } from '@/contexts/LanguageContext';

export function NewHires() {
  return (
    <FilteredEmployeesList
      filter="new-hires"
      title={{
        en: 'New Hires',
        ar: 'التعيينات الجديدة',
        it: 'Nuove Assunzioni'
      }}
      subtitle={{
        en: 'Hired within last 90 days',
        ar: 'تم توظيفهم خلال آخر 90 يوماً',
        it: 'Assunti negli ultimi 90 giorni'
      }}
      backPath="/organization/hr/employees-profiles"
      showAddButton={false}
    />
  );
}