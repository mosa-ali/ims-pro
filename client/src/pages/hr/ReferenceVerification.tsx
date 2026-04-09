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
 ar: 'المرجع والتحقق'
 }}
 subtitle={{
 en: 'Generate employment references',
 ar: 'إنشاء مراجع العمل'
 }}
 backPath="/organization/hr/employees-profiles"
 showAddButton={false}
 />
 );
}
