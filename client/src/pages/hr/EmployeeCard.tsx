/**
 * ============================================================================
 * EMPLOYEE CARD - MASTER STRUCTURE (8 SUB-CARDS)
 * ============================================================================
 * 
 * ✅ NEW DESIGN: Cards Grid Navigation (No Horizontal Scrolling)
 * 
 * ONE CARD PER EMPLOYEE - Full Lifecycle Management
 * 
 * SUB-CARDS (accessed via Cards Grid):
 * 1. Identity & Personal Profile (Base Card)
 * 2. Employment & Contract Card
 * 3. Salary & Compensation Card
 * 4. Performance & Appraisal Card
 * 5. Sanctions & Disciplinary Card
 * 6. Training & Development Card
 * 7. Exit & Offboarding Card
 * 8. Reference & Verification Card (Post-Exit)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import {
 ArrowLeft, ArrowRight,
 User,
 FileText,
 DollarSign,
 BarChart3,
 AlertTriangle,
 GraduationCap,
 DoorOpen,
 FileCheck,
 Archive,
 Printer,
 Download,
 Eye,
 ChevronRight,
 Lock,
 FolderOpen
} from 'lucide-react';
import { EvidencePanel } from '@/components/EvidencePanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { staffService, StaffMember } from '@/app/services/hrService';
import { ConfirmActionModal } from './modals/ConfirmActionModal';
import { FullEmployeeProfilePDF } from './modals/FullEmployeeProfilePDF';

// Sub-card components
import { IdentityPersonalCard } from './employee-cards/IdentityPersonalCard';
import { EmploymentContractCard } from './employee-cards/EmploymentContractCard';
import { SalaryCompensationCard } from './employee-cards/SalaryCompensationCard';
import { PerformanceAppraisalCard } from './employee-cards/PerformanceAppraisalCard';
import { SanctionsDisciplinaryCard } from './employee-cards/SanctionsDisciplinaryCard';
import { TrainingDevelopmentCard } from './employee-cards/TrainingDevelopmentCard';
import { ExitOffboardingCard } from './employee-cards/ExitOffboardingCard';
import { ReferenceVerificationCard } from './employee-cards/ReferenceVerificationCard';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface SubCard {
 id: string;
 label: { en: string; ar: string };
 description: { en: string; ar: string };
 icon: any;
 readOnly?: boolean;
 restricted?: boolean;
}

export function EmployeeCard() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 
 const [employee, setEmployee] = useState<StaffMember | null>(null);
 const [activeSection, setActiveSection] = useState<string | null>(null);
 const [showArchiveModal, setShowArchiveModal] = useState(false);
 const [showPDFModal, setShowPDFModal] = useState(false);

 useEffect(() => {
 if (id) {
 loadEmployee();
 }
 }, [id]);

 const loadEmployee = () => {
 if (id) {
 const emp = staffService.getById(id);
 setEmployee(emp || null);
 }
 };

 const handleEmployeeUpdated = (updated: StaffMember) => {
 setEmployee(updated);
 // Reload from storage to ensure fresh data
 loadEmployee();
 };

 const handleArchive = () => {
 if (employee) {
 staffService.update(employee.id, { status: 'archived' });
 navigate('/organization/hr/employees-profiles/archived');
 }
 };

 const handlePrint = () => {
 window.print();
 };

 const handleExport = () => {
 // Excel export functionality will be added
 alert(t.hr.excelExportComingSoon);
 };

 const labels = {
 back: t.hr.employeesDirectory,
 
 // Global actions
 viewProfile: t.hr.viewProfile,
 editProfile: t.hr.editProfile,
 archiveEmployee: t.hr.archiveEmployee,
 printSummary: t.hr.printSummary,
 exportData: t.hr.exportData,
 
 // Status
 active: t.hr.active,
 archived: t.hr.archived,
 exited: t.hr.exited,
 
 // Section navigation
 selectSection: t.hr.selectASectionToViewDetails,
 readOnly: t.hr.readOnly,
 restricted: t.hr.restricted,
 
 notFound: t.hr.employeeNotFound1
 };

 const subCards: SubCard[] = [
 {
 id: 'identity',
 label: { en: 'Identity & Personal', ar: 'الهوية والبيانات الشخصية' },
 description: { en: 'Personal & contact info', ar: 'المعلومات الشخصية والتواصل' },
 icon: User
 },
 {
 id: 'employment',
 label: { en: 'Employment & Contract', ar: 'التوظيف والعقد' },
 description: { en: 'Contracts & assignments', ar: 'العقود والمهام' },
 icon: FileText
 },
 {
 id: 'salary',
 label: { en: 'Salary & Compensation', ar: 'الراتب والتعويضات' },
 description: { en: 'Grade, step, salary history', ar: 'الدرجة والخطوة وسجل الرواتب' },
 icon: DollarSign
 },
 {
 id: 'performance',
 label: { en: 'Performance & Appraisal', ar: 'الأداء والتقييم' },
 description: { en: 'Annual & periodic reviews', ar: 'المراجعات السنوية والدورية' },
 icon: BarChart3
 },
 {
 id: 'sanctions',
 label: { en: 'Sanctions & Disciplinary', ar: 'العقوبات والإجراءات التأديبية' },
 description: { en: 'Disciplinary actions', ar: 'الإجراءات التأديبية' },
 icon: AlertTriangle,
 restricted: true
 },
 {
 id: 'training',
 label: { en: 'Training & Development', ar: 'التدريب والتطوير' },
 description: { en: 'Trainings & certificates', ar: 'التدريبات والشهادات' },
 icon: GraduationCap
 },
 {
 id: 'exit',
 label: { en: 'Exit & Offboarding', ar: 'الخروج والإنهاء' },
 description: { en: 'Exit process & clearance', ar: 'عملية الخروج والمخالصة' },
 icon: DoorOpen
 },
 {
 id: 'reference',
 label: { en: 'Reference & Verification', ar: 'المراجع والتحقق' },
 description: { en: 'Post-exit reference data', ar: 'بيانات المراجع بعد الخروج' },
 icon: FileCheck
 // ✅ REMOVED readOnly: true - This card allows uploads of external reference forms
 },
 {
 id: 'evidence',
 label: { en: 'Evidence Documents', ar: 'مستندات الإثبات' },
 description: { en: 'Auto-synced approval evidence', ar: 'مستندات الموافقة التلقائية' },
 icon: FolderOpen
 }
 ];

 if (!employee) {
 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton onClick={() => navigate('/organization/hr/employees-profiles/directory')} iconOnly />
 <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
 <p className="text-gray-600">{labels.notFound}</p>
 </div>
 </div>
 );
 }

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'active': return 'bg-green-50 text-green-700 border-green-200';
 case 'archived': return 'bg-gray-50 text-gray-600 border-gray-200';
 case 'exited': return 'bg-red-50 text-red-600 border-red-200';
 default: return 'bg-gray-50 text-gray-600 border-gray-200';
 }
 };

 const isReadOnly = employee.status === 'exited';

 const renderSectionContent = () => {
 if (!activeSection) {
 return (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
 <p className="text-blue-800">{labels.selectSection}</p>
 </div>
 );
 }

 switch (activeSection) {
 case 'identity':
 return <IdentityPersonalCard employee={employee} language={language} isRTL={isRTL} onEmployeeUpdate={loadEmployee} />;
 case 'employment':
 return <EmploymentContractCard employee={employee} language={language} isRTL={isRTL} onEmployeeUpdate={loadEmployee} />;
 case 'salary':
 return <SalaryCompensationCard employee={employee} language={language} isRTL={isRTL} onEmployeeUpdate={loadEmployee} />;
 case 'performance':
 return <PerformanceAppraisalCard employee={employee} language={language} isRTL={isRTL} />;
 case 'sanctions':
 return <SanctionsDisciplinaryCard employee={employee} language={language} isRTL={isRTL} />;
 case 'training':
 return <TrainingDevelopmentCard employee={employee} language={language} isRTL={isRTL} />;
 case 'exit':
 return <ExitOffboardingCard employee={employee} language={language} isRTL={isRTL} onEmployeeUpdate={loadEmployee} />;
 case 'reference':
 return <ReferenceVerificationCard employee={employee} language={language} isRTL={isRTL} />;
 case 'evidence':
 return <EvidencePanel entityType="Employee" entityId={employee.id} />;
 default:
 return null;
 }
 };

 return (
 <div className="space-y-6">
 {/* Back Button */}
 <BackButton onClick={() => navigate('/organization/hr/employees-profiles/directory')} label={labels.back} />

 {/* Employee Header Card */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-start justify-between`}>
 {/* Employee Info */}
 <div className={`flex items-start gap-4`}>
 <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
 <User className="w-8 h-8 text-blue-600" />
 </div>
 <div className={'text-start'}>
 <h1 className="text-2xl font-bold text-gray-900">{employee.fullName}</h1>
 <p className="text-gray-600 mt-1">{employee.position}</p>
 <div className={`flex items-center gap-3 mt-2`}>
 <span className="text-sm text-gray-500">
 {t.hr.id} <span className="font-mono text-blue-600">{employee.staffId}</span>
 </span>
 <span className={`text-xs px-2 py-1 rounded border font-medium ${getStatusColor(employee.status)}`}>
 {t[employee.status as keyof typeof t] || employee.status}
 </span>
 </div>
 </div>
 </div>

 {/* Global Actions */}
 <div className={`flex items-center gap-2`}>
 <button
 className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
 title={labels.viewProfile}
 onClick={() => setShowPDFModal(true)}
 >
 <Eye className="w-4 h-4" />
 <span className="hidden md:inline">{labels.viewProfile}</span>
 </button>
 <button
 className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
 title={labels.archiveEmployee}
 onClick={() => setShowArchiveModal(true)}
 >
 <Archive className="w-4 h-4" />
 </button>
 <button
 className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 title={labels.printSummary}
 onClick={() => window.print()}
 >
 <Printer className="w-4 h-4" />
 <span className="hidden md:inline">{labels.printSummary}</span>
 </button>
 <button
 className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
 title={labels.exportData}
 onClick={handleExport}
 >
 <Download className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>

 {/* ✅ NEW: Section Cards Grid (Replaces Horizontal Tabs) */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {subCards.map((card) => {
 const Icon = card.icon;
 const isActive = activeSection === card.id;
 
 return (
 <button
 key={card.id}
 onClick={() => setActiveSection(card.id)}
 className={`bg-white rounded-lg border-2 p-4 text-left transition-all ${isActive ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm' } text-start`}
 >
 {/* Icon & Status Badge */}
 <div className={`flex items-start justify-between mb-3`}>
 <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
 </div>
 
 {/* Status Indicators */}
 <div className="flex flex-col gap-1 items-end">
 {card.readOnly && (
 <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
 <Lock className="w-3 h-3" />
 {labels.readOnly}
 </span>
 )}
 {card.restricted && (
 <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3" />
 {labels.restricted}
 </span>
 )}
 </div>
 </div>

 {/* Card Content */}
 <div className="space-y-1">
 <h3 className="text-sm font-semibold text-gray-900">
 {card.label[language]}
 </h3>
 <p className="text-xs text-gray-600 leading-relaxed">
 {card.description[language]}
 </p>
 </div>

 {/* Arrow Indicator */}
 <div className={`flex items-center justify-end mt-3`}>
 <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'} ${isRTL ? 'rotate-180' : ''}`} />
 </div>
 </button>
 );
 })}
 </div>

 {/* Section Content */}
 <div className="bg-white rounded-lg border border-gray-200">
 {renderSectionContent()}
 </div>

 {/* Archive Employee Modal */}
 <ConfirmActionModal
 isOpen={showArchiveModal}
 onClose={() => setShowArchiveModal(false)}
 onConfirm={handleArchive}
 title={t.hr.archiveEmployee}
 message={`Are you sure you want to archive ${employee.fullName}? They will be removed from active lists and payroll.`}
 actionType="archive"
 employeeName={employee.fullName}
 />

 {/* Full Employee Profile PDF Modal */}
 <FullEmployeeProfilePDF
 isOpen={showPDFModal}
 onClose={() => setShowPDFModal(false)}
 employee={employee}
 language={language}
 isRTL={isRTL}
 />
 </div>
 );
}