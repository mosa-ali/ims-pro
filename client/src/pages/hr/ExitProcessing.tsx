/**
 * ============================================================================
 * EXIT PROCESSING - Staff in exit process
 * ============================================================================
 */

import { FilteredEmployeesList } from './FilteredEmployeesList';
import { useLanguage } from '@/contexts/LanguageContext';

export function ExitProcessing() {
 return (
 <FilteredEmployeesList
 filter="exit-processing"
 title={{
 en: 'Exit Processing',
 ar: 'معالجة المغادرة'
 }}
 subtitle={{
 en: 'Staff in exit process',
 ar: 'الموظفون في عملية المغادرة'
 }}
 backPath="/organization/hr/employees-profiles"
 showAddButton={false}
 />
 );
}
