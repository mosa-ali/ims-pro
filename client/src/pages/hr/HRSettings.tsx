import { Link } from 'wouter';
/**
 * ============================================================================
 * HR SETTINGS MODULE - GOVERNANCE & MASTER DATA
 * ============================================================================
 * 
 * ⚠️ STRUCTURAL UPDATE (MANDATORY):
 * Organization branding (logo, name) removed - managed in Global Settings only
 * 
 * FOCUS AREAS:
 * 1. HR Permissions & Roles - Who can do what
 * 2. Master Data - Departments, Positions, Contracts, Leave, Exit
 * 3. Workflow Rules - Approval flows, policy controls
 * 4. Document Templates - Standardized HR forms
 * 5. System Rules - Audit controls, data integrity
 * 6. Audit Log - Track HR activities
 * 
 * NO DUPLICATION WITH GLOBAL SETTINGS
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
 Settings, 
 Users, 
 FileText, 
 Briefcase, 
 Calendar, 
 LogOut, 
 Shield, 
 Save, 
 Plus, 
 Trash2, 
 Edit, 
 ArrowLeft, ArrowRight,
 UserCog,
 GitBranch,
 FileStack,
 Lock,
 Activity,
 Eye,
 X,
 Download,
 Printer,
 Filter,
 Database
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { hrSettingsService, Department, Position, ContractType, LeaveType, ExitReason } from '@/app/services/hrSettingsService';
import { HRAuditLogTab } from './HRAuditLogTab';
import { MasterDataSection } from '@/app/components/hr/MasterDataSection';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type SettingsTab = 'permissions' | 'masterData' | 'workflow' | 'templates' | 'systemRules' | 'auditLog';

// HR Role Types
interface HRRole {
 roleId: string;
 roleName: string;
 roleDescription: string; // For tooltips
 dataScope?: 'Global' | 'Project' | 'Department'; // Scope-based visibility
 permissions: HRPermissions;
 active: boolean;
}

interface HRPermissions {
 viewEmployeeProfiles: boolean;
 editIdentityPersonal: boolean;
 manageContracts: boolean;
 manageSalaryScale: boolean;
 accessDisciplinary: boolean;
 approveLeave: boolean;
 approveAttendance: boolean;
 viewPayroll: boolean;
 accessHRReports: boolean;
 accessHRArchive: boolean;
 printExport: boolean; // NEW - Print / Export PDF & Excel permission
}

// Workflow Rules
interface WorkflowRules {
 attendance: {
 approvalFlow: string;
 lockPeriodDays: number;
 overtimeEligibleContracts: string[];
 };
 leave: {
 annualLeaveAccrualRate: number;
 carryOverDays: number;
 approvalFlow: string;
 maxEmergencyDaysWithoutJustification: number;
 };
 disciplinary: {
 canInitiate: string[];
 requiredApprovalLevels: number;
 visibilityRules: string;
 };
}

// Document Template
interface DocumentTemplate {
 templateId: string;
 name: string;
 type: string;
 version: string;
 uploadDate: string;
 active: boolean;
}

// System Rules
interface SystemRules {
 enableBackdatedEdits: boolean;
 lockPayrollAfterCutoff: boolean;
 preventHRRecordDeletion: boolean;
 enforceReadOnlyAfterApproval: boolean;
}

export function HRSettings() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState<SettingsTab>('permissions');
 
 // Master Data States
 const [departments, setDepartments] = useState<Department[]>([]);
 const [positions, setPositions] = useState<Position[]>([]);
 const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
 const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
 const [exitReasons, setExitReasons] = useState<ExitReason[]>([]);
 
 // New States
 const [roles, setRoles] = useState<HRRole[]>([]);
 const [workflowRules, setWorkflowRules] = useState<WorkflowRules | null>(null);
 const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
 const [systemRules, setSystemRules] = useState<SystemRules | null>(null);

 useEffect(() => {
 loadData();
 }, []);

 const loadData = () => {
 hrSettingsService.initializeAllSettings();
 setDepartments(hrSettingsService.getAllDepartments());
 setPositions(hrSettingsService.getAllPositions());
 setContractTypes(hrSettingsService.getAllContractTypes());
 setLeaveTypes(hrSettingsService.getAllLeaveTypes());
 setExitReasons(hrSettingsService.getAllExitReasons());
 
 // Initialize new data
 initializeRoles();
 initializeWorkflowRules();
 initializeTemplates();
 initializeSystemRules();
 };

 const initializeRoles = () => {
 const defaultRoles: HRRole[] = [
 {
 roleId: 'admin',
 roleName: 'Admin',
 roleDescription: 'System administrator with full access to all HR modules and settings. Can override HR rules and manage permissions.',
 dataScope: 'Global',
 permissions: {
 viewEmployeeProfiles: true,
 editIdentityPersonal: true,
 manageContracts: true,
 manageSalaryScale: true,
 accessDisciplinary: true,
 approveLeave: true,
 approveAttendance: true,
 viewPayroll: true,
 accessHRReports: true,
 accessHRArchive: true,
 printExport: true
 },
 active: true
 },
 {
 roleId: 'hr-manager',
 roleName: 'HR Manager',
 roleDescription: 'Manages HR policies, approves leave, oversees payroll, and handles disciplinary cases. Full operational HR access.',
 dataScope: 'Global',
 permissions: {
 viewEmployeeProfiles: true,
 editIdentityPersonal: true,
 manageContracts: true,
 manageSalaryScale: true,
 accessDisciplinary: true,
 approveLeave: true,
 approveAttendance: true,
 viewPayroll: true,
 accessHRReports: true,
 accessHRArchive: true,
 printExport: true
 },
 active: true
 },
 {
 roleId: 'hr-officer',
 roleName: 'HR Officer',
 roleDescription: 'Handles employee records, manages contracts, and assists with leave approvals. Cannot access salary or payroll.',
 dataScope: 'Global',
 permissions: {
 viewEmployeeProfiles: true,
 editIdentityPersonal: true,
 manageContracts: true,
 manageSalaryScale: false,
 accessDisciplinary: true,
 approveLeave: false,
 approveAttendance: true,
 viewPayroll: false,
 accessHRReports: true,
 accessHRArchive: true,
 printExport: true
 },
 active: true
 },
 {
 roleId: 'hr-assistant',
 roleName: 'HR Assistant',
 roleDescription: 'Supports HR operations, views employee data, and manages templates. Read-only for most functions.',
 dataScope: 'Global',
 permissions: {
 viewEmployeeProfiles: true,
 editIdentityPersonal: false,
 manageContracts: false,
 manageSalaryScale: false,
 accessDisciplinary: false,
 approveLeave: false,
 approveAttendance: false,
 viewPayroll: false,
 accessHRReports: true,
 accessHRArchive: true,
 printExport: false
 },
 active: true
 },
 {
 roleId: 'program-manager',
 roleName: 'Program Manager',
 roleDescription: 'Approves leave and attendance for project staff only. Cannot view salaries or manage contracts. Scope limited to assigned projects.',
 dataScope: 'Project',
 permissions: {
 viewEmployeeProfiles: true, // Project staff only
 editIdentityPersonal: false,
 manageContracts: false,
 manageSalaryScale: false,
 accessDisciplinary: false, // View only if involved
 approveLeave: true,
 approveAttendance: true,
 viewPayroll: false,
 accessHRReports: true, // Project-level reports only
 accessHRArchive: false,
 printExport: true // Project documents only
 },
 active: true
 },
 {
 roleId: 'supervisor',
 roleName: 'Supervisor',
 roleDescription: 'Oversees team performance, approves leave and attendance for direct reports. Limited to team scope.',
 dataScope: 'Department',
 permissions: {
 viewEmployeeProfiles: true,
 editIdentityPersonal: false,
 manageContracts: false,
 manageSalaryScale: false,
 accessDisciplinary: false,
 approveLeave: true,
 approveAttendance: true,
 viewPayroll: false,
 accessHRReports: false,
 accessHRArchive: false,
 printExport: false
 },
 active: true
 },
 {
 roleId: 'finance-hr-read',
 roleName: 'Finance (HR-Read)',
 roleDescription: 'Accesses payroll data and HR reports for financial analysis. Can export financial documents.',
 dataScope: 'Global',
 permissions: {
 viewEmployeeProfiles: true,
 editIdentityPersonal: false,
 manageContracts: false,
 manageSalaryScale: false,
 accessDisciplinary: false,
 approveLeave: false,
 approveAttendance: false,
 viewPayroll: true,
 accessHRReports: true, // Reports & payroll only
 accessHRArchive: false,
 printExport: true // Reports & payroll only
 },
 active: true
 },
 {
 roleId: 'viewer',
 roleName: 'Viewer',
 roleDescription: 'Views employee profiles and basic HR information. No editing, approval, or export capabilities.',
 dataScope: 'Global',
 permissions: {
 viewEmployeeProfiles: true,
 editIdentityPersonal: false,
 manageContracts: false,
 manageSalaryScale: false,
 accessDisciplinary: false,
 approveLeave: false,
 approveAttendance: false,
 viewPayroll: false,
 accessHRReports: false,
 accessHRArchive: false,
 printExport: false
 },
 active: true
 }
 ];
 setRoles(defaultRoles);
 };

 const initializeWorkflowRules = () => {
 const defaultRules: WorkflowRules = {
 attendance: {
 approvalFlow: 'Supervisor → HR',
 lockPeriodDays: 7,
 overtimeEligibleContracts: ['Fixed-Term', 'Permanent']
 },
 leave: {
 annualLeaveAccrualRate: 2.5,
 carryOverDays: 10,
 approvalFlow: 'Supervisor → HR Manager',
 maxEmergencyDaysWithoutJustification: 2
 },
 disciplinary: {
 canInitiate: ['HR Manager', 'Supervisor', 'Line Manager'],
 requiredApprovalLevels: 2,
 visibilityRules: 'Restricted to HR Manager and concerned parties'
 }
 };
 setWorkflowRules(defaultRules);
 };

 const initializeTemplates = () => {
 const defaultTemplates: DocumentTemplate[] = [
 { templateId: 'tpl-001', name: 'Offer Letter', type: 'Recruitment', version: '1.0', uploadDate: '2024-01-15', active: true },
 { templateId: 'tpl-002', name: 'Contract Template', type: 'Contract', version: '1.2', uploadDate: '2024-01-15', active: true },
 { templateId: 'tpl-003', name: 'Appraisal Form', type: 'Performance', version: '2.0', uploadDate: '2024-01-15', active: true },
 { templateId: 'tpl-004', name: 'Disciplinary Letter', type: 'Disciplinary', version: '1.0', uploadDate: '2024-01-15', active: true },
 { templateId: 'tpl-005', name: 'Reference Letter', type: 'General', version: '1.0', uploadDate: '2024-01-15', active: true },
 { templateId: 'tpl-006', name: 'Clearance Form', type: 'Exit', version: '1.1', uploadDate: '2024-01-15', active: true }
 ];
 setTemplates(defaultTemplates);
 };

 const initializeSystemRules = () => {
 const defaultSystemRules: SystemRules = {
 enableBackdatedEdits: false,
 lockPayrollAfterCutoff: true,
 preventHRRecordDeletion: true,
 enforceReadOnlyAfterApproval: true
 };
 setSystemRules(defaultSystemRules);
 };

 const labels = {
 title: t.hrSettings.hrSettings,
 subtitle: t.hrSettings.configureHrPoliciesRulesAndPreferences,
 back: t.hrSettings.overview,
 
 // Tabs
 permissionsRoles: t.hrSettings.permissionsRoles,
 masterData: t.hrSettings.masterData,
 workflowRules: t.hrSettings.workflowRules,
 documentTemplates: t.hrSettings.documentTemplates,
 systemRules: t.hrSettings.systemRules,
 auditLog: t.hrSettings.auditLog,
 
 // Common
 name: t.hrSettings.name,
 active: t.hrSettings.active,
 inactive: t.hrSettings.inactive,
 createdDate: t.hrSettings.createdDate,
 actions: t.hrSettings.actions,
 
 save: t.hrSettings.saveChanges,
 add: t.hrSettings.addNew,
 edit: t.hrSettings.edit,
 delete: t.hrSettings.delete,
 upload: t.hrSettings.upload,
 
 // Permissions
 roleName: t.hrSettings.roleName,
 permissions: t.hrSettings.permissions,
 viewEmployeeProfiles: t.hrSettings.viewEmployeeProfiles,
 editIdentityPersonal: t.hrSettings.editIdentityPersonal,
 manageContracts: t.hrSettings.manageContracts,
 manageSalaryScale: t.hrSettings.manageSalaryScale,
 accessDisciplinary: t.hrSettings.accessDisciplinaryModule,
 approveLeave: t.hrSettings.approveLeave,
 approveAttendance: t.hrSettings.approveAttendance,
 viewPayroll: t.hrSettings.viewPayroll,
 accessHRReports: t.hrSettings.accessHrReports,
 accessHRArchive: t.hrSettings.accessHrArchive,
 printExport: t.hrSettings.printexport,
 
 // Workflow
 attendanceRules: t.hrSettings.attendanceRules,
 leaveRules: t.hrSettings.leaveRules,
 disciplinaryRules: t.hrSettings.disciplinaryRules,
 approvalFlow: t.hrSettings.approvalFlow,
 lockPeriodDays: t.hrSettings.lockPeriodDays,
 overtimeEligible: t.hrSettings.overtimeEligibleContracts,
 annualLeaveAccrual: t.hrSettings.annualLeaveAccrualRateDaysmonth,
 carryOverDays: t.hrSettings.carryoverDays,
 maxEmergencyDays: t.hrSettings.maxEmergencyDaysWithoutJustification,
 canInitiate: t.hrSettings.whoCanInitiate,
 requiredApprovals: t.hrSettings.requiredApprovalLevels,
 visibilityRules: t.hrSettings.visibilityRules,
 
 // Templates
 templateName: t.hrSettings.templateName,
 type: t.hrSettings.type,
 version: t.hrSettings.version,
 uploadDate: t.hrSettings.uploadDate,
 uploadTemplate: t.hrSettings.uploadTemplate,
 
 // System Rules
 enableBackdatedEdits: t.hrSettings.enableBackdatedEdits,
 lockPayrollAfterCutoff: t.hrSettings.lockPayrollAfterCutoff,
 preventHRRecordDeletion: t.hrSettings.preventHrRecordDeletion,
 enforceReadOnlyAfterApproval: t.hrSettings.enforceReadonlyAfterApproval,
 
 addDepartment: t.hrSettings.addDepartment,
 addPosition: t.hrSettings.addPosition,
 addContractType: t.hrSettings.addContractType,
 addLeaveType: t.hrSettings.addLeaveType,
 addExitReason: t.hrSettings.addExitReason,
 
 deductibleFromAnnual: t.hrSettings.deductibleFromAnnualLeave,
 usedByEmployees: t.hrSettings.usedByXEmployees,
 
 saved: t.hrSettings.settingsSavedSuccessfully,
 adminNote: t.hrSettings.adminhrManagerOnlyChangesAffectAll,
 noBrandingNote: '📌 Organization branding (logo, name) is managed in Global Settings (sidebar) only'
 };

 const handleSaveWorkflowRules = () => {
 if (workflowRules) {
 localStorage.setItem('hr_workflow_rules', JSON.stringify(workflowRules));
 alert(labels.saved);
 }
 };

 const handleSaveSystemRules = () => {
 if (systemRules) {
 localStorage.setItem('hr_system_rules', JSON.stringify(systemRules));
 alert(labels.saved);
 }
 };

 const handleAddDepartment = () => {
 const name = prompt(labels.addDepartment);
 if (name) {
 hrSettingsService.addDepartment(name);
 loadData();
 }
 };

 const handleAddPosition = () => {
 const name = prompt(labels.addPosition);
 if (name) {
 hrSettingsService.addPosition(name);
 loadData();
 }
 };

 const handleAddContractType = () => {
 const name = prompt(labels.addContractType);
 if (name) {
 hrSettingsService.addContractType(name);
 loadData();
 }
 };

 const handleAddLeaveType = () => {
 const name = prompt(labels.addLeaveType);
 if (name) {
 hrSettingsService.addLeaveType(name, false);
 loadData();
 }
 };

 const handleAddExitReason = () => {
 const name = prompt(labels.addExitReason);
 if (name) {
 hrSettingsService.addExitReason(name);
 loadData();
 }
 };

 const handleDeleteDepartment = (id: string) => {
 if (confirm('Are you sure you want to delete this department?')) {
 hrSettingsService.deleteDepartment(id);
 loadData();
 }
 };

 const handleDeletePosition = (id: string) => {
 if (confirm('Are you sure you want to delete this position?')) {
 hrSettingsService.deletePosition(id);
 loadData();
 }
 };

 const handleUploadTemplate = () => {
 const input = document.createElement('input');
 input.type = 'file';
 input.accept = '.docx,.pdf';
 input.onchange = (e: any) => {
 const file = e.target.files?.[0];
 if (file) {
 alert(t.hrSettings.templateUploadedSuccessfully);
 }
 };
 input.click();
 };

 const tabs = [
 { id: 'permissions' as SettingsTab, name: labels.permissionsRoles, icon: UserCog },
 { id: 'masterData' as SettingsTab, name: labels.masterData, icon: Database },
 { id: 'workflow' as SettingsTab, name: labels.workflowRules, icon: GitBranch },
 { id: 'templates' as SettingsTab, name: labels.documentTemplates, icon: FileStack },
 { id: 'systemRules' as SettingsTab, name: labels.systemRules, icon: Lock },
 { id: 'auditLog' as SettingsTab, name: labels.auditLog, icon: Activity }
 ];

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton href="/organization/hr" label={t.hrSettings.hrDashboard} />

 {/* Header */}
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Admin Note */}
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <p className="text-sm text-amber-900">{labels.adminNote}</p>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="border-b border-gray-200">
 <div className="flex overflow-x-auto">
 {tabs.map(tab => {
 const Icon = tab.icon;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${ activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}
 >
 <Icon className="w-4 h-4" />
 {tab.name}
 </button>
 );
 })}
 </div>
 </div>

 <div className="p-6">
 {/* HR Permissions & Roles Tab */}
 {activeTab === 'permissions' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.permissionsRoles}</h3>
 <p className="text-sm text-gray-600 mb-6">
 {'Control who can perform actions across HR modules. Changes affect system-wide access.'
 }
 </p>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full border border-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase border-b text-start`}>{labels.roleName}</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">View Profiles</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Edit Personal</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Contracts</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Salary</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Disciplinary</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Approve Leave</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Approve Attend.</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Payroll</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Reports</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Archive</th>
 <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">Print/Export</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {roles.map(role => (
 <tr key={role.roleId} className={!role.active ? 'opacity-50' : ''}>
 <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b">{role.roleName}</td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.viewEmployeeProfiles} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.editIdentityPersonal} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.manageContracts} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.manageSalaryScale} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.accessDisciplinary} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.approveLeave} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.approveAttendance} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.viewPayroll} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.accessHRReports} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.accessHRArchive} readOnly className="rounded" />
 </td>
 <td className="px-3 py-3 text-center border-b border-l">
 <input type="checkbox" checked={role.permissions.printExport} readOnly className="rounded" />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Master Data Tab */}
 {activeTab === 'masterData' && (
 <MasterDataSection
 departments={departments}
 positions={positions}
 contractTypes={contractTypes}
 leaveTypes={leaveTypes}
 exitReasons={exitReasons}
 onAddDepartment={handleAddDepartment}
 onAddPosition={handleAddPosition}
 onAddContractType={handleAddContractType}
 onAddLeaveType={handleAddLeaveType}
 onAddExitReason={handleAddExitReason}
 onDeleteDepartment={handleDeleteDepartment}
 onDeletePosition={handleDeletePosition}
 />
 )}

 {/* Workflow Rules Tab */}
 {activeTab === 'workflow' && workflowRules && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-gray-900">{labels.workflowRules}</h3>
 
 {/* Attendance Rules */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h4 className="font-medium text-gray-900 mb-4">{labels.attendanceRules}</h4>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.approvalFlow}</label>
 <input
 type="text"
 value={workflowRules.attendance.approvalFlow}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 attendance: { ...workflowRules.attendance, approvalFlow: e.target.value }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.lockPeriodDays}</label>
 <input
 type="number"
 value={workflowRules.attendance.lockPeriodDays}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 attendance: { ...workflowRules.attendance, lockPeriodDays: parseInt(e.target.value) }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 </div>
 </div>

 {/* Leave Rules */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h4 className="font-medium text-gray-900 mb-4">{labels.leaveRules}</h4>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.annualLeaveAccrual}</label>
 <input
 type="number"
 step="0.1"
 value={workflowRules.leave.annualLeaveAccrualRate}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 leave: { ...workflowRules.leave, annualLeaveAccrualRate: parseFloat(e.target.value) }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.carryOverDays}</label>
 <input
 type="number"
 value={workflowRules.leave.carryOverDays}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 leave: { ...workflowRules.leave, carryOverDays: parseInt(e.target.value) }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.approvalFlow}</label>
 <input
 type="text"
 value={workflowRules.leave.approvalFlow}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 leave: { ...workflowRules.leave, approvalFlow: e.target.value }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.maxEmergencyDays}</label>
 <input
 type="number"
 value={workflowRules.leave.maxEmergencyDaysWithoutJustification}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 leave: { ...workflowRules.leave, maxEmergencyDaysWithoutJustification: parseInt(e.target.value) }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 </div>
 </div>

 {/* Disciplinary Rules */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h4 className="font-medium text-gray-900 mb-4">{labels.disciplinaryRules}</h4>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.requiredApprovals}</label>
 <input
 type="number"
 value={workflowRules.disciplinary.requiredApprovalLevels}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 disciplinary: { ...workflowRules.disciplinary, requiredApprovalLevels: parseInt(e.target.value) }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.visibilityRules}</label>
 <input
 type="text"
 value={workflowRules.disciplinary.visibilityRules}
 onChange={(e) => setWorkflowRules({
 ...workflowRules,
 disciplinary: { ...workflowRules.disciplinary, visibilityRules: e.target.value }
 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 </div>
 </div>

 <div className="flex justify-end">
 <button
 onClick={handleSaveWorkflowRules}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Save className="w-4 h-4" />
 {labels.save}
 </button>
 </div>
 </div>
 )}

 {/* Document Templates Tab */}
 {activeTab === 'templates' && (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-semibold text-gray-900">{labels.documentTemplates}</h3>
 <button
 onClick={handleUploadTemplate}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
 >
 <Plus className="w-4 h-4" />
 {labels.uploadTemplate}
 </button>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.templateName}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.type}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.version}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.uploadDate}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.active}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 bg-white">
 {templates.map(template => (
 <tr key={template.templateId}>
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{template.name}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{template.type}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{template.version}</td>
 <td className="px-4 py-3 text-sm text-gray-500">
 {new Date(template.uploadDate).toLocaleDateString()}
 </td>
 <td className="px-4 py-3 text-sm">
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {template.active ? labels.active : labels.inactive}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* System Rules Tab */}
 {activeTab === 'systemRules' && systemRules && (
 <div className="space-y-6">
 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.systemRules}</h3>
 <p className="text-sm text-gray-600 mb-6">
 {'Critical audit and data integrity controls. Changes affect HR operations system-wide.'
 }
 </p>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
 <div>
 <h4 className="font-medium text-gray-900">{labels.enableBackdatedEdits}</h4>
 <p className="text-sm text-gray-500">
 {'Allow users to edit records with past dates'
 }
 </p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={systemRules.enableBackdatedEdits}
 onChange={(e) => setSystemRules({ ...systemRules, enableBackdatedEdits: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>

 <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
 <div>
 <h4 className="font-medium text-gray-900">{labels.lockPayrollAfterCutoff}</h4>
 <p className="text-sm text-gray-500">
 {'Prevent changes to payroll after cutoff date'
 }
 </p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={systemRules.lockPayrollAfterCutoff}
 onChange={(e) => setSystemRules({ ...systemRules, lockPayrollAfterCutoff: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>

 <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
 <div>
 <h4 className="font-medium text-gray-900">{labels.preventHRRecordDeletion}</h4>
 <p className="text-sm text-gray-500">
 {'Soft-delete only, prevent permanent deletion'
 }
 </p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={systemRules.preventHRRecordDeletion}
 onChange={(e) => setSystemRules({ ...systemRules, preventHRRecordDeletion: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>

 <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
 <div>
 <h4 className="font-medium text-gray-900">{labels.enforceReadOnlyAfterApproval}</h4>
 <p className="text-sm text-gray-500">
 {'Lock approved records from further editing'
 }
 </p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={systemRules.enforceReadOnlyAfterApproval}
 onChange={(e) => setSystemRules({ ...systemRules, enforceReadOnlyAfterApproval: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>
 </div>

 <div className="flex justify-end">
 <button
 onClick={handleSaveSystemRules}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Save className="w-4 h-4" />
 {labels.save}
 </button>
 </div>
 </div>
 )}

 {/* Audit Log Tab */}
 {activeTab === 'auditLog' && <HRAuditLogTab />}
 </div>
 </div>
 </div>
 );
}