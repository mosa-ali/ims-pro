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

import { useState } from 'react';
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
import { trpc } from '@/lib/trpc';
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
import { StaffMember } from './types/hrTypes';

interface LocalizedText {
  en: string;
  ar: string;
  it: string;
}

interface SubCard {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  icon: any;
  readOnly?: boolean;
  restricted?: boolean;
}

export function EmployeeCard() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 
 const [activeSection, setActiveSection] = useState<string | null>(null);
 const [showArchiveModal, setShowArchiveModal] = useState(false);
 const [showPDFModal, setShowPDFModal] = useState(false);

 // Fetch employee via tRPC
 const { data: employee, isLoading, error } = trpc.hrEmployees.getById.useQuery(
   { id: parseInt(id || '0') },
   { enabled: !!id }
 );

 const archiveMutation = trpc.hrEmployees.update.useMutation({
   onSuccess: () => {
     navigate('/organization/hr/employees-profiles/archived');
   },
 });

 const handleArchive = () => {
   if (employee) {
     archiveMutation.mutate({ id: employee.id, status: 'suspended' });
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
  label: {
    en: 'Identity & Personal',
    ar: 'الهوية والبيانات الشخصية',
    it: 'Identità e Dati Personali'
  },
  description: {
    en: 'Personal & contact info',
    ar: 'المعلومات الشخصية والتواصل',
    it: 'Informazioni personali e di contatto'
  },
  icon: User
},
{
  id: 'employment',
  label: {
    en: 'Employment & Contract',
    ar: 'التوظيف والعقد',
    it: 'Impiego e Contratto'
  },
  description: {
    en: 'Contracts & assignments',
    ar: 'العقود والمهام',
    it: 'Contratti e incarichi'
  },
  icon: FileText
},
{
  id: 'salary',
  label: {
    en: 'Salary & Compensation',
    ar: 'الراتب والتعويضات',
    it: 'Stipendio e Compensi'
  },
  description: {
    en: 'Grade, step, salary history',
    ar: 'الدرجة والخطوة وسجل الرواتب',
    it: 'Livello, scatto e storico salariale'
  },
  icon: DollarSign
},
{
  id: 'performance',
  label: {
    en: 'Performance & Appraisal',
    ar: 'الأداء والتقييم',
    it: 'Prestazioni e Valutazione'
  },
  description: {
    en: 'Annual & periodic reviews',
    ar: 'المراجعات السنوية والدورية',
    it: 'Valutazioni annuali e periodiche'
  },
  icon: BarChart3
},
{
  id: 'sanctions',
  label: {
    en: 'Sanctions & Disciplinary',
    ar: 'العقوبات والإجراءات التأديبية',
    it: 'Sanzioni e Procedimenti Disciplinari'
  },
  description: {
    en: 'Disciplinary actions',
    ar: 'الإجراءات التأديبية',
    it: 'Azioni disciplinari'
  },
  icon: AlertTriangle,
  restricted: true
},
{
  id: 'training',
  label: {
    en: 'Training & Development',
    ar: 'التدريب والتطوير',
    it: 'Formazione e Sviluppo'
  },
  description: {
    en: 'Trainings & certificates',
    ar: 'التدريبات والشهادات',
    it: 'Formazioni e certificazioni'
  },
  icon: GraduationCap
},
{
  id: 'exit',
  label: {
    en: 'Exit & Offboarding',
    ar: 'الخروج والإنهاء',
    it: 'Uscita e Offboarding'
  },
  description: {
    en: 'Exit process & clearance',
    ar: 'عملية الخروج والمخالصة',
    it: 'Processo di uscita e liquidazione'
  },
  icon: DoorOpen
},
{
  id: 'reference',
  label: {
    en: 'Reference & Verification',
    ar: 'المراجع والتحقق',
    it: 'Referenze e Verifiche'
  },
  description: {
    en: 'Post-exit reference data',
    ar: 'بيانات المراجع بعد الخروج',
    it: 'Dati di referenza post-uscita'
  },
  icon: FileCheck
},
{
  id: 'evidence',
  label: {
    en: 'Evidence Documents',
    ar: 'مستندات الإثبات',
    it: 'Documenti Giustificativi'
  },
  description: {
    en: 'Auto-synced approval evidence',
    ar: 'مستندات الموافقة التلقائية',
    it: 'Documentazione approvativa sincronizzata automaticamente'
  },
  icon: FolderOpen
}
 ];

 if (isLoading) {
   return (
     <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
       <BackButton onClick={() => navigate('/organization/hr/employees-profiles/directory')} iconOnly />
       <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
         <p className="text-gray-600">Loading employee profile...</p>
       </div>
     </div>
   );
 }

 if (error || !employee) {
   return (
     <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
       <BackButton onClick={() => navigate('/organization/hr/employees-profiles/directory')} iconOnly />
       <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
         <p className="text-gray-600">{error?.message || labels.notFound}</p>
       </div>
     </div>
   );
 }

 const getStatusColor = (status: string) => {
   switch (status) {
     case 'active': return 'bg-green-50 text-green-700 border-green-200';
     case 'suspended': return 'bg-gray-50 text-gray-600 border-gray-200';
     case 'terminated': return 'bg-red-50 text-red-600 border-red-200';
     case 'resigned': return 'bg-red-50 text-red-600 border-red-200';
     default: return 'bg-gray-50 text-gray-600 border-gray-200';
   }
 };

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
       return <IdentityPersonalCard employee={employee} language={language} isRTL={isRTL} />;
     case 'employment':
       return <EmploymentContractCard employee={employee} language={language} isRTL={isRTL} />;
     case 'salary':
       return <SalaryCompensationCard employee={employee} language={language} isRTL={isRTL} />;
     case 'performance':
       return <PerformanceAppraisalCard employee={employee} language={language} isRTL={isRTL} />;
     case 'sanctions':
       return <SanctionsDisciplinaryCard employee={employee} language={language} isRTL={isRTL} />;
     case 'training':
       return <TrainingDevelopmentCard employee={employee} language={language} isRTL={isRTL} />;
     case 'exit':
       return <ExitOffboardingCard employee={employee} language={language} isRTL={isRTL} />;
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
             <h1 className="text-2xl font-bold text-gray-900">{`${employee.firstName} ${employee.lastName}`.trim()}</h1>
             <p className="text-gray-600 mt-1">{employee.position}</p>
             <div className={`flex items-center gap-3 mt-2`}>
               <span className="text-sm text-gray-500">
                 {t.hr.id} <span className="font-mono text-blue-600">{employee.employeeCode}</span>
               </span>
               <span className={`text-xs px-2 py-1 rounded border font-medium ${getStatusColor(employee.status)}`}>
                 {employee.status}
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
                 {card.label[language as keyof LocalizedText]}
               </h3>
               <p className="text-xs text-gray-600 leading-relaxed">
                 {card.description[language as keyof LocalizedText]}
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
       message={`Are you sure you want to archive ${employee.firstName} ${employee.lastName}? They will be removed from active lists and payroll.`}
       actionType="archive"
       employeeName={`${employee.firstName} ${employee.lastName}`}
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
