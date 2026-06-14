/**
 * ============================================================================
 * EMPLOYEE SELECTOR - LEAVE REQUEST MODAL
 * ============================================================================
 * 
 * Purpose: Select an active employee for creating a leave request
 * 
 * Features:
 * - Fetches active employees from tRPC (hr_employees table)
 * - Search/filter by name, staff ID, or position
 * - Shows "No active employees found" when list is empty
 * - Bilingual support (EN/AR/IT)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { X, Search, Users } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  onSelect: (employee: StaffMember) => void;
  onClose: () => void;
}

export function EmployeeSelector({ onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch active employees from tRPC
  const { data: employees = [], isLoading, error } = trpc.hrEmployees.getAll.useQuery({
    status: 'active'
  });

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    
    const term = searchTerm.toLowerCase();
    return employees.filter(emp =>
      emp.fullName?.toLowerCase().includes(term) ||
      emp.employeeCode?.toLowerCase().includes(term) ||
      emp.jobTitle?.toLowerCase().includes(term) ||
      emp.department?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const labels = {
    title: t.hrLeave.selectEmployee || 'Select Employee',
    subtitle: t.hrLeave.chooseAnEmployeeToCreateALeaveRequest || 'Choose an employee to create a leave request for',
    search: t.hrLeave.searchByNameIdOrPosition || 'Search by name, ID, or position...',
    noEmployees: t.hrLeave.noActiveEmployeesFound || 'No active employees found',
    noEmployeesDesc: t.hrLeave.thereAreNoActiveEmployeesInTheSystem || 'There are no active employees in the system',
    loading: t.common.loading || 'Loading employees...',
    error: t.hrLeave.errorLoadingEmployees || 'Error loading employees',
    cancel: t.hrLeave.cancel || 'Cancel',
    staffId: t.hrLeave.staffId || 'Staff ID',
    name: t.hrLeave.name || 'Name',
    position: t.hrLeave.position || 'Position',
    department: t.hrLeave.department || 'Department'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{labels.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={labels.search}
              className={`w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600">{labels.loading}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{labels.error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredEmployees.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-900 font-medium">{labels.noEmployees}</p>
              <p className="text-gray-600 text-sm mt-1">{labels.noEmployeesDesc}</p>
            </div>
          )}

          {/* Employee List */}
          {!isLoading && !error && filteredEmployees.length > 0 && (
            <div className="space-y-2 max-h-[calc(90vh-300px)] overflow-y-auto">
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => onSelect(employee)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{employee.fullName}</p>
                      <p className="text-sm text-gray-600">
                        {labels.staffId}: {employee.id}
                      </p>
                    </div>
                    <div className={`text-right ${isRTL ? 'mr-4' : 'ml-4'}`}>
                      <p className="text-sm text-gray-700">{employee.jobTitle || '-'}</p>
                      <p className="text-xs text-gray-500">{employee.department || '-'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}