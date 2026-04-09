/**
 * ============================================================================
 * EXITED STAFF - Completed exit process
 * ============================================================================
 */

import { FilteredEmployeesList } from './FilteredEmployeesList';

export function ExitedStaff() {
  return (
    <FilteredEmployeesList
      filter="exited"
      title={{
        en: 'Exited Staff',
        ar: 'الموظفون المغادرون'
      }}
      subtitle={{
        en: 'Completed exit process',
        ar: 'أكملوا عملية المغادرة'
      }}
      backPath="/organization/hr/employees-profiles"
      showAddButton={false}
    />
  );
}
