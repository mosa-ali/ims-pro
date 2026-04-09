/**
 * ============================================================================
 * INDIVIDUAL EMPLOYEE PROFILE - 8 CLICKABLE CARDS LAYOUT
 * ============================================================================
 * 
 * ONE CARD PER EMPLOYEE - Full Lifecycle Management
 * 
 * SUB-CARDS (accessed via Cards Grid):
 * 1. Identity & Personal Profile (Base Card) - Edit button
 * 2. Employment & Contract Card - Edit button
 * 3. Salary & Compensation Card - READ-ONLY (auto-sync from Salary Scale)
 * 4. Performance & Appraisal Card - Add Appraisal Form / Add Review buttons
 * 5. Sanctions & Disciplinary Card - RESTRICTED (read-only from Sanctions Module)
 * 6. Training & Development Card - Add Training button
 * 7. Exit & Offboarding Card - Resignation/Clearance/Exit Interview buttons
 * 8. Reference & Verification Card - Upload Reference Form / Generate Reference Summary
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
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
 Loader2,
 AlertCircle,
 Calendar
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

export function IndividualEmployeeProfile() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const { user } = useAuth();
 const [, setLocation] = useLocation();
 const [activeSection, setActiveSection] = useState<string | null>(null);

 // Get employee ID from URL - support multiple route patterns
 const [, params] = useRoute('/organization/hr/employees-profiles/:id');
 const [, paramsAlt] = useRoute('/organization/hr/employees/profiles/:id');
 const [, paramsShort] = useRoute('/hr/employees-profiles/:id');
 const [, paramsShortAlt] = useRoute('/hr/employees/profiles/:id');
 const [, paramsView] = useRoute('/hr/employees-profiles/view/:id');
 const [, paramsViewOrg] = useRoute('/organization/hr/employees-profiles/view/:id');
 
 const employeeId = params?.id || paramsAlt?.id || paramsShort?.id || paramsShortAlt?.id || paramsView?.id || paramsViewOrg?.id;

 // Get user's organization from auth context
 const organizationId = currentOrganizationId!;
 const operatingUnitId = currentOperatingUnitId!;

 // Fetch employee details
 const { data: employee, isLoading: employeeLoading, error: employeeError, refetch: refetchEmployee } = trpc.hrEmployees.getById.useQuery(
 { 
 id: parseInt(employeeId || '0'),
 },
 { 
 enabled: !!employeeId && !!organizationId && !!operatingUnitId,
 }
 );

 // Fetch salary grade details based on employee's gradeLevel
 const { data: salaryGrade } = trpc.hrPayroll.getByGradeCode.useQuery(
 {
 organizationId: organizationId!,
 gradeCode: employee?.gradeLevel || '',
 },
 {
 enabled: !!organizationId && !!employee?.gradeLevel,
 }
 );

 // Handle back navigation
 const handleBack = () => {
 setLocation('/organization/hr/employees-profiles/directory');
 };

 // Handle employee data refresh
 const handleEmployeeUpdate = () => {
 refetchEmployee();
 };

 // Translations
 const labels = {
 back: t.hr.employeesDirectory,
 viewProfile: t.hr.viewProfile,
 archiveEmployee: t.hr.archiveEmployee,
 printSummary: t.hr.printSummary,
 exportData: t.hr.exportData,
 active: t.hr.active,
 archived: t.hr.archived,
 exited: t.hr.exited,
 selectSection: t.hr.selectASectionToViewDetails,
 readOnly: t.hr.readOnly,
 restricted: t.hr.restricted,
 notFound: t.hr.employeeNotFound1,
 loading: t.hr.loadingEmployeeProfile,
 noAccess: t.hr.theEmployeeProfileYoureLookingFor,
 backToEmployees: t.hr.backToEmployees
 };

 // Sub-cards configuration
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
 }
 ];

 // Loading state
 if (employeeLoading) {
 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
 <p className="text-gray-600">{labels.loading}</p>
 </div>
 </div>
 );
 }

 // Error state
 if (employeeError || !employee) {
 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center">
 <div className="text-center">
 <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
 <h2 className="text-xl font-semibold text-gray-800 mb-2">{labels.notFound}</h2>
 <p className="text-gray-600 mb-4">{labels.noAccess}</p>
 <BackButton label={labels.backToEmployees} />
 </div>
 </div>
 );
 }

 // Status color helper
 const getStatusColor = (status: string) => {
 switch (status?.toLowerCase()) {
 case 'active': return 'bg-green-50 text-green-700 border-green-200';
 case 'archived': return 'bg-gray-50 text-gray-600 border-gray-200';
 case 'exited': return 'bg-red-50 text-red-600 border-red-200';
 default: return 'bg-gray-50 text-gray-600 border-gray-200';
 }
 };

 // Render section content based on active card
 const renderSectionContent = () => {
 if (!activeSection) {
 return (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
 <p className="text-blue-800">{labels.selectSection}</p>
 </div>
 );
 }

 // Map database fields to component-expected fields
 const employeeData = {
 id: employee.id, // Database ID for salary lookup
 organizationId: employee.organizationId, // Organization ID for salary lookup
 staffId: employee.employeeCode,
 fullName: `${employee.firstName} ${employee.lastName}`,
 status: employee.status || 'active',
 hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString() : undefined,
 position: employee.jobTitle || '',
 department: employee.department || '',
 nationality: employee.nationality || '',
 gender: employee.gender || '',
 email: employee.email || '',
 phone: employee.phone || '',
 address: employee.address || '',
 supervisor: employee.reportingTo || '',
 contractType: employee.employmentType || '', // Use employmentType as contractType
 contractStartDate: employee.hireDate ? new Date(employee.hireDate).toISOString() : undefined,
 contractEndDate: undefined,
 employmentType: employee.employmentType || '',
 projects: '',
 gradeLevel: employee.gradeLevel || '',
 salaryStep: '',
 basicSalary: '0',
 housingAllowance: '0',
 transportAllowance: '0',
 representationAllowance: '0',
 otherAllowances: '0',
 currency: 'USD',
 };

 switch (activeSection) {
 case 'identity':
 return <IdentityPersonalCard employee={employeeData} language={language} isRTL={isRTL} onEmployeeUpdate={handleEmployeeUpdate} />;
 case 'employment':
 return <EmploymentContractCard employee={employeeData} language={language} isRTL={isRTL} onEmployeeUpdate={handleEmployeeUpdate} />;
 case 'salary':
 return <SalaryCompensationCard employee={employeeData} salaryGrade={salaryGrade || null} language={language} isRTL={isRTL} />;
 case 'performance':
 return <PerformanceAppraisalCard employee={employeeData} language={language} isRTL={isRTL} />;
 case 'sanctions':
 return <SanctionsDisciplinaryCard employee={employeeData} language={language} isRTL={isRTL} />;
 case 'training':
 return <TrainingDevelopmentCard employee={employeeData} language={language} isRTL={isRTL} />;
 case 'exit':
 return <ExitOffboardingCard employee={employeeData} language={language} isRTL={isRTL} onEmployeeUpdate={handleEmployeeUpdate} />;
 case 'reference':
 return <ReferenceVerificationCard employee={employeeData} language={language} isRTL={isRTL} />;
 default:
 return null;
 }
 };

 return (
 <div className={`min-h-screen bg-gray-50`}>
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
 {/* Back Button */}
 <BackButton onClick={handleBack} label={labels.back} />

 {/* Employee Header Card */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-start justify-between`}>
 {/* Employee Info */}
 <div className={`flex items-start gap-4`}>
 <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
 <User className="w-8 h-8 text-blue-600" />
 </div>
 <div className={'text-start'}>
 <h1 className="text-2xl font-bold text-gray-900">
 {`${employee.firstName} ${employee.lastName}`}
 </h1>
 <p className="text-gray-600 mt-1">{employee.jobTitle}</p>
 <div className={`flex items-center gap-3 mt-2`}>
 <span className="text-sm text-gray-500">
 {t.hr.id} <span className="font-mono text-blue-600">{employee.employeeCode}</span>
 </span>
 <span className={`text-xs px-2 py-1 rounded border font-medium ${getStatusColor(employee.status || 'active')}`}>
 {t[employee.status as keyof typeof t] || labels.active}
 </span>
 </div>
 </div>
 </div>

 {/* Global Actions */}
 <div className={`flex items-center gap-2`}>
 <Button
 variant="outline"
 size="sm"
 className="gap-1"
 title={labels.viewProfile}
 >
 <Eye className="w-4 h-4" />
 <span className="hidden md:inline">{labels.viewProfile}</span>
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="gap-1"
 title={labels.archiveEmployee}
 >
 <Calendar className="w-4 h-4" />
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="gap-1"
 title={labels.printSummary}
 >
 <Printer className="w-4 h-4" />
 <span className="hidden md:inline">{labels.printSummary}</span>
 </Button>
 <Button
 variant="outline"
 size="sm"
 title={labels.exportData}
 >
 <Download className="w-4 h-4" />
 </Button>
 </div>
 </div>
 </div>

 {/* Section Cards Grid (8 Cards in 2 rows of 4) */}
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
 {card.label[language as 'en' | 'ar']}
 </h3>
 <p className="text-xs text-gray-600 leading-relaxed">
 {card.description[language as 'en' | 'ar']}
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
 </div>
 </div>
 );
}

export default IndividualEmployeeProfile;
