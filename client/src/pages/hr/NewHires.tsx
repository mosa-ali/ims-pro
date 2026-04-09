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
 ar: 'التعيينات الجديدة'
 }}
 subtitle={{
 en: 'Hired within last 90 days',
 ar: 'تم توظيفهم خلال آخر 90 يوماً'
 }}
 backPath="/organization/hr/employees-profiles"
 showAddButton={false}
 />
 );
}
