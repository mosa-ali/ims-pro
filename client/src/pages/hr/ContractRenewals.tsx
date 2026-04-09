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
 ar: 'تجديد العقود'
 }}
 subtitle={{
 en: 'Contracts expiring within 60 days',
 ar: 'عقود تنتهي خلال 60 يوماً'
 }}
 backPath="/organization/hr/employees-profiles"
 showAddButton={false}
 />
 );
}
