/**
 * ============================================================================
 * CLEARANCE FORM PRINT MODAL - Official Exit Clearance Document
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ A4 Layout, print-optimized
 * ✅ Department sign-off sections
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer, CheckCircle } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useState, useEffect } from 'react';

interface ClearanceData {
  id: string;
  staffId: string;
  exitDate: string;
  departments: {
    name: string;
    clearedBy?: string;
    clearedDate?: string;
    status: 'Pending' | 'Cleared' | 'N/A';
    comments?: string;
  }[];
}

interface Props {
  clearance: ClearanceData;
  onClose: () => void;
}

export function ClearancePrintModal({ clearance, onClose }: Props) {
  const [employee, setEmployee] = useState<StaffMember | null>(null);
  const [language] = useState('en');
  const [isRTL] = useState(false);

  useEffect(() => {
    const emp = staffService.getByStaffId(clearance.staffId);
    if (emp) setEmployee(emp);
  }, [clearance]);

  if (!employee) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Cleared': return 'bg-green-100 text-green-700 border-green-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'N/A': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const t = {
    title: language === 'en' ? 'Exit Clearance Form' : 'نموذج تصفية الخروج',
    
    ref: language === 'en' ? 'Reference' : 'المرجع',
    exitDate: language === 'en' ? 'Exit Date' : 'تاريخ المغادرة',
    
    employeeInfo: language === 'en' ? 'Employee Information' : 'معلومات الموظف',
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    
    instructions: language === 'en'
      ? 'Each department must verify that the employee has returned all company property and settled all obligations before signing below.'
      : 'يجب على كل قسم التحقق من أن الموظف قد أعاد جميع ممتلكات الشركة وسوّى جميع الالتزامات قبل التوقيع أدناه.',
    
    deptClearances: language === 'en' ? 'Department Clearances' : 'تصفيات الأقسام',
    deptName: language === 'en' ? 'Department' : 'القسم',
    status: language === 'en' ? 'Status' : 'الحالة',
    clearedBy: language === 'en' ? 'Cleared By' : 'تم التصفية بواسطة',
    clearedDate: language === 'en' ? 'Date' : 'التاريخ',
    signature: language === 'en' ? 'Signature' : 'التوقيع',
    comments: language === 'en' ? 'Comments' : 'تعليقات',
    
    pending: language === 'en' ? 'Pending' : 'قيد الانتظار',
    cleared: language === 'en' ? 'Cleared' : 'مصفى',
    notApplicable: language === 'en' ? 'N/A' : 'غير مطبق',
    
    finalApproval: language === 'en' ? 'Final Approval' : 'الموافقة النهائية',
    hrApproval: language === 'en' ? 'HR Manager Approval' : 'موافقة مدير الموارد البشرية',
    
    print: language === 'en' ? 'Print' : 'طباعة',
    close: language === 'en' ? 'Close' : 'إغلاق'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header (Print Hidden) */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50 print:hidden">
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[210mm] mx-auto bg-white print:p-0">
            
            {/* Form Header */}
            <div className="mb-8">
              <div className="flex justify-between items-start mb-4 text-sm">
                <div>
                  <strong>{t.ref}:</strong> CLR-{clearance.id}-{new Date(clearance.exitDate).getFullYear()}
                </div>
                <div>
                  <strong>{t.exitDate}:</strong> {formatDate(clearance.exitDate)}
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <div className="mb-8 border border-gray-300 rounded-lg p-4 bg-gray-50">
              <h3 className="text-base font-bold text-gray-900 mb-3">{t.employeeInfo}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">{t.staffId}:</span>
                  <p className="text-gray-900">{employee.staffId}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.fullName}:</span>
                  <p className="text-gray-900">{employee.fullName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.position}:</span>
                  <p className="text-gray-900">{employee.position}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.department}:</span>
                  <p className="text-gray-900">{employee.department}</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-8 bg-blue-50 border border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium">{t.instructions}</p>
            </div>

            {/* Department Clearances Table */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-900 mb-4">{t.deptClearances}</h3>
              
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 border-b border-gray-300">
                        {t.deptName}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 border-b border-gray-300">
                        {t.status}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 border-b border-gray-300">
                        {t.clearedBy}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 border-b border-gray-300">
                        {t.signature}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 border-b border-gray-300">
                        {t.clearedDate}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clearance.departments.map((dept, index) => (
                      <tr key={index} className="border-b border-gray-200 last:border-b-0">
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          {dept.name}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(dept.status)}`}>
                            {dept.status === 'Pending' ? t.pending : dept.status === 'Cleared' ? t.cleared : t.notApplicable}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800">
                          {dept.clearedBy || '-'}
                        </td>
                        <td className="px-4 py-4">
                          {dept.status === 'Cleared' ? (
                            <div className="h-8 border-b-2 border-gray-400"></div>
                          ) : (
                            <div className="h-8 border-b-2 border-dashed border-gray-300"></div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800 text-center">
                          {dept.clearedDate ? formatDate(dept.clearedDate) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Approval */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <h3 className="text-base font-bold text-gray-900 mb-6">{t.finalApproval}</h3>
              
              <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h4 className="text-sm font-bold text-green-900">{t.hrApproval}</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mt-6">
                  <div>
                    <p className="text-xs text-gray-700 mb-2">
                      {language === 'en' ? 'HR Manager Name' : 'اسم مدير الموارد البشرية'}
                    </p>
                    <div className="h-12 mb-2"></div>
                    <div className="border-t-2 border-gray-400 pt-2">
                      <p className="text-xs text-gray-500">
                        {language === 'en' ? 'Signature' : 'التوقيع'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700 mb-2">
                      {language === 'en' ? 'Date' : 'التاريخ'}
                    </p>
                    <div className="h-12 mb-2 flex items-center">
                      <p className="text-sm">_______________</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                {language === 'en'
                  ? 'This clearance form must be completed before final settlement can be processed.'
                  : 'يجب إكمال نموذج التصفية هذا قبل معالجة التسوية النهائية.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Print Hidden) */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-5 h-5" />
            <span>{t.print}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t.close}
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .fixed, .fixed * {
            visibility: visible;
          }
          
          .fixed {
            position: static;
            background: white;
          }
        }
      `}</style>
    </div>
  );
}