/**
 * ============================================================================
 * ARCHIVED EMPLOYEES - Inactive staff (historical records)
 * ============================================================================
 */

import { FilteredEmployeesList } from './FilteredEmployeesList';
import { useLanguage } from '@/contexts/LanguageContext';

export function ArchivedEmployees() {
 return (
 <FilteredEmployeesList
 filter="archived"
 title={{
 en: 'Archived Employees',
 ar: 'الموظفون المؤرشفون'
 }}
 subtitle={{
 en: 'Inactive staff (historical records)',
 ar: 'الموظفون غير النشطين (السجلات التاريخية)'
 }}
 backPath="/organization/hr/employees-profiles"
 showAddButton={false}
 />
 );
}
