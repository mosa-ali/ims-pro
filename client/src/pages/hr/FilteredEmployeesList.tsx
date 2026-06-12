/**
 * ============================================================================
 * FILTERED EMPLOYEES LIST - Universal Component
 * ============================================================================
 * Handles all filtered views: Active, Archived, Exited, New Hires, Renewals, etc.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Search, Download, Upload, Eye, Plus, Archive, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { staffService, StaffMember } from '@/app/services/hrService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface FilteredEmployeesListProps {
  filter: 'active' | 'archived' | 'exited' | 'new-hires' | 'renewals' | 'exit-processing' | 'reference';
  title: { en: string; ar: string; it: string };
  subtitle: { en: string; ar: string; it: string };
  backPath: string;
  showAddButton?: boolean;
}

export function FilteredEmployeesList({
  filter, title, subtitle, backPath, showAddButton = false }: FilteredEmployeesListProps) {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // ========== HELPER FUNCTION TO GET TEXT BY LANGUAGE ==========
  const getText = (en: string, ar: string, it: string): string => {
    switch (language) {
      case "ar":
        return ar;
      case "it":
        return it;
      case "en":
      default:
        return en;
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [filter]);

  const loadEmployees = () => {
    const allStaff = staffService.getAll();
    const today = new Date();
    let filtered: StaffMember[] = [];

    switch (filter) {
      case 'active':
        // ✅ CANONICAL: Only active staff (payroll-eligible)
        filtered = allStaff.filter(s => s.status === 'active');
        break;
      
      case 'archived':
        // ✅ CANONICAL: Only archived staff (inactive but not exited)
        filtered = allStaff.filter(s => s.status === 'archived');
        break;
      
      case 'exited':
        // ✅ CANONICAL: Only exited staff (employment ended)
        filtered = allStaff.filter(s => s.status === 'exited');
        break;
      
      case 'new-hires':
        // ✅ DYNAMIC: Recently hired (last 90 days) AND active
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        filtered = allStaff.filter(s => {
          if (s.status !== 'active') return false;
          if (!s.hireDate) return false;
          const hireDate = new Date(s.hireDate);
          return hireDate >= ninetyDaysAgo;
        });
        break;
      
      case 'renewals':
        // ✅ DYNAMIC: Contracts expiring within 60 days AND active
        const sixtyDaysFromNow = new Date(today);
        sixtyDaysFromNow.setDate(today.getDate() + 60);
        filtered = allStaff.filter(s => {
          if (s.status !== 'active') return false;
          if (!s.contractEndDate) return false;
          const endDate = new Date(s.contractEndDate);
          return endDate <= sixtyDaysFromNow && endDate >= today;
        });
        break;
      
      case 'exit-processing':
        // ✅ WORKFLOW-DRIVEN: Exit started but not completed
        filtered = allStaff.filter(s => s.exitStarted === true && s.status !== 'exited');
        break;
      
      case 'reference':
        // ✅ CANONICAL: Only exited staff (for reference generation)
        filtered = allStaff.filter(s => s.status === 'exited');
        break;
    }

    setEmployees(filtered);
  };

  const localT = {
    search: getText(
      t.hr.searchEmployees || "Search employees",
      t.hr.searchEmployees || "البحث عن الموظفين",
      t.hr.searchEmployees || "Cerca dipendenti"
    ),
    addEmployee: getText(
      t.hr.addEmployee || "Add Employee",
      t.hr.addEmployee || "إضافة موظف",
      t.hr.addEmployee || "Aggiungi Dipendente"
    ),
    export: getText(
      t.hr.export || "Export",
      t.hr.export || "تصدير",
      t.hr.export || "Esporta"
    ),
    import: getText(
      t.hr.import || "Import",
      t.hr.import || "استيراد",
      t.hr.import || "Importa"
    ),
    
    staffId: getText(
      t.hr.staffId || "Staff ID",
      t.hr.staffId || "معرف الموظف",
      t.hr.staffId || "ID Personale"
    ),
    name: getText(
      t.hr.name || "Name",
      t.hr.name || "الاسم",
      t.hr.name || "Nome"
    ),
    position: getText(
      t.hr.position || "Position",
      t.hr.position || "المنصب",
      t.hr.position || "Posizione"
    ),
    department: getText(
      t.hr.department || "Department",
      t.hr.department || "القسم",
      t.hr.department || "Dipartimento"
    ),
    contractType: getText(
      t.hr.contractType || "Contract Type",
      t.hr.contractType || "نوع العقد",
      t.hr.contractType || "Tipo di Contratto"
    ),
    hireDate: getText(
      t.hr.hireDate6 || "Hire Date",
      t.hr.hireDate6 || "تاريخ التوظيف",
      t.hr.hireDate6 || "Data di Assunzione"
    ),
    contractEnd: getText(
      t.hr.contractEnd || "Contract End",
      t.hr.contractEnd || "نهاية العقد",
      t.hr.contractEnd || "Fine Contratto"
    ),
    exitDate: getText(
      t.hr.exitDate || "Exit Date",
      t.hr.exitDate || "تاريخ الخروج",
      t.hr.exitDate || "Data di Uscita"
    ),
    exitReason: getText(
      t.hr.exitReason || "Exit Reason",
      t.hr.exitReason || "سبب الخروج",
      t.hr.exitReason || "Motivo dell'Uscita"
    ),
    status: getText(
      t.hr.status || "Status",
      t.hr.status || "الحالة",
      t.hr.status || "Stato"
    ),
    actions: getText(
      t.hr.actions || "Actions",
      t.hr.actions || "الإجراءات",
      t.hr.actions || "Azioni"
    ),
    viewProfile: getText(
      t.hr.viewProfile || "View Profile",
      t.hr.viewProfile || "عرض الملف الشخصي",
      t.hr.viewProfile || "Visualizza Profilo"
    ),
    restoreStaff: getText(
      t.hr.restoreStaff || "Restore Staff",
      t.hr.restoreStaff || "استعادة الموظف",
      t.hr.restoreStaff || "Ripristina Personale"
    ),
    
    active: getText(
      t.hr.active || "Active",
      t.hr.active || "نشط",
      t.hr.active || "Attivo"
    ),
    archived: getText(
      t.hr.archived || "Archived",
      t.hr.archived || "مؤرشف",
      t.hr.archived || "Archiviato"
    ),
    exited: getText(
      t.hr.exited || "Exited",
      t.hr.exited || "خرج",
      t.hr.exited || "Uscito"
    ),
    
    restoreConfirm: getText(
      "Are you sure you want to restore this staff member to Active status?",
      "هل أنت متأكد أنك تريد استعادة هذا الموظف إلى حالة نشطة؟",
      "Sei sicuro di voler ripristinare questo dipendente allo stato Attivo?"
    ),
    restoreSuccess: getText(
      t.hr.staffMemberRestoredToActiveStatus || "Staff member restored to Active status",
      t.hr.staffMemberRestoredToActiveStatus || "تم استعادة الموظف إلى حالة نشطة",
      t.hr.staffMemberRestoredToActiveStatus || "Dipendente ripristinato allo stato Attivo"
    ),
    
    noEmployees: getText(
      t.hr.noEmployeesFound || "No employees found",
      t.hr.noEmployeesFound || "لم يتم العثور على موظفين",
      t.hr.noEmployeesFound || "Nessun dipendente trovato"
    ),
    showing: getText(
      t.hr.showing || "Showing",
      t.hr.showing || "عرض",
      t.hr.showing || "Visualizzazione"
    ),
    of: getText(
      t.hr.of || "of",
      t.hr.of || "من",
      t.hr.of || "di"
    ),
    employees: getText(
      t.hr.employees7 || "employees",
      t.hr.employees7 || "موظفون",
      t.hr.employees7 || "dipendenti"
    )
  };

  const filteredEmployees = employees.filter(e =>
    e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.staffId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'it' ? 'it-IT' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusDisplay = (employee: StaffMember) => {
    if (employee.status === 'exited') return localT.exited;
    if (employee.status === 'archived') return localT.archived;
    if (employee.status === 'active') return localT.active;
    return employee.status; // Fallback to raw status value
  };

  /**
   * ✅ RESTORE ARCHIVED STAFF TO ACTIVE
   * System-wide restore: Updates status and triggers re-sync
   */
  const handleRestore = (employee: StaffMember) => {
    if (!confirm(localT.restoreConfirm)) return;
    
    // Update status to active
    staffService.update(employee.id, { status: 'active' });
    
    // Reload employees list
    loadEmployees();
    
    // Show success notification
    alert(localT.restoreSuccess);
  };

  // ========== GET TITLE AND SUBTITLE WITH PROPER TYPE CASTING ==========
  const getLanguageKey = (): 'en' | 'ar' | 'it' => {
    if (language === 'ar') return 'ar';
    if (language === 'it') return 'it';
    return 'en';
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <BackButton onClick={() => navigate(backPath)} iconOnly />

      {/* Header */}
      <div className={'text-start'}>
        <h1 className="text-2xl font-bold text-gray-900">{title[getLanguageKey()]}</h1>
        <p className="text-gray-600 mt-1">{subtitle[getLanguageKey()]}</p>
      </div>

      {/* Actions Bar */}
      <div className={`flex items-center justify-between gap-4`}>
        <div className="relative">
          <Search className={`absolute top-2.5 ${'start-3'} w-5 h-5 text-gray-400`} />
          <input
            type="text"
            placeholder={localT.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`ps-10 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64`}
          />
        </div>
        <div className={`flex items-center gap-2`}>
          {showAddButton && (
            <button className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}>
              <Plus className="w-5 h-5" />
              <span>{localT.addEmployee}</span>
            </button>
          )}
          <button className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50`}>
            <Download className="w-5 h-5" />
            <span>{localT.export}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>{localT.noEmployees}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{localT.staffId}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{localT.name}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{localT.position}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{localT.department}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{localT.hireDate}</th>
                  {(filter === 'renewals' || filter === 'active') && (
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{localT.contractEnd}</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{localT.status}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{localT.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-blue-600 font-mono">{employee.staffId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{employee.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.position}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{formatDate(employee.hireDate)}</td>
                    {(filter === 'renewals' || filter === 'active') && (
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{formatDate(employee.contractEndDate)}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${employee.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : employee.status === 'archived' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {getStatusDisplay(employee)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/organization/hr/employees-profiles/view/${employee.id}`)}
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded inline-flex items-center gap-1"
                          title={localT.viewProfile}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {filter === 'archived' && (
                          <button
                            onClick={() => handleRestore(employee)}
                            className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded inline-flex items-center gap-1 ms-1"
                            title={localT.restoreStaff}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={`text-sm text-gray-600 text-start`}>
        {localT.showing} {filteredEmployees.length} {localT.of} {employees.length} {localT.employees}
      </div>
    </div>
  );
}
