/**
 * ============================================================================
 * EXIT PROCESSING - Staff in exit process
 * ============================================================================
 */

import { FilteredEmployeesList } from './FilteredEmployeesList';

export function ExitProcessing() {
 return (
 <FilteredEmployeesList
 filter="exit-processing"
title={{
  en: 'Exit Processing',
  ar: 'معالجة المغادرة',
  it: 'Gestione delle Uscite'
}}
subtitle={{
  en: 'Staff in exit process',
  ar: 'الموظفون في عملية المغادرة',
  it: 'Personale attualmente nel processo di uscita'
}}
 backPath="/organization/hr/employees-profiles"
 showAddButton={false}
 />
 );
}
