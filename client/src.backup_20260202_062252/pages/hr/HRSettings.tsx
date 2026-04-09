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
  ArrowLeft,
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

  const t = {
    title: language === 'en' ? 'HR Settings' : 'إعدادات الموارد البشرية',
    subtitle: language === 'en' ? 'Configure HR policies, rules, and preferences' : 'تكوين سياسات وقواعد وتفضيلات الموارد البشرية',
    back: language === 'en' ? 'Overview' : 'نظرة عامة',
    
    // Tabs
    permissionsRoles: language === 'en' ? 'Permissions & Roles' : 'الصلاحيات والأدوار',
    masterData: language === 'en' ? 'Master Data' : 'البيانات الأساسية',
    workflowRules: language === 'en' ? 'Workflow Rules' : 'قواعد سير العمل',
    documentTemplates: language === 'en' ? 'Document Templates' : 'نماذج المستندات',
    systemRules: language === 'en' ? 'System Rules' : 'قواعد النظام',
    auditLog: language === 'en' ? 'Audit Log' : 'سجل التدقيق',
    
    // Common
    name: language === 'en' ? 'Name' : 'الاسم',
    active: language === 'en' ? 'Active' : 'نشط',
    inactive: language === 'en' ? 'Inactive' : 'غير نشط',
    createdDate: language === 'en' ? 'Created Date' : 'تاريخ الإنشاء',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    save: language === 'en' ? 'Save Changes' : 'حفظ التغييرات',
    add: language === 'en' ? 'Add New' : 'إضافة جديد',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    upload: language === 'en' ? 'Upload' : 'رفع',
    
    // Permissions
    roleName: language === 'en' ? 'Role Name' : 'اسم الدور',
    permissions: language === 'en' ? 'Permissions' : 'الصلاحيات',
    viewEmployeeProfiles: language === 'en' ? 'View Employee Profiles' : 'عرض ملفات الموظفين',
    editIdentityPersonal: language === 'en' ? 'Edit Identity & Personal' : 'تعديل الهوية والبيانات الشخصية',
    manageContracts: language === 'en' ? 'Manage Contracts' : 'إدارة العقود',
    manageSalaryScale: language === 'en' ? 'Manage Salary Scale' : 'إدارة سلم الرواتب',
    accessDisciplinary: language === 'en' ? 'Access Disciplinary Module' : 'الوصول لوحدة التأديب',
    approveLeave: language === 'en' ? 'Approve Leave' : 'الموافقة على الإجازات',
    approveAttendance: language === 'en' ? 'Approve Attendance' : 'الموافقة على الحضور',
    viewPayroll: language === 'en' ? 'View Payroll' : 'عرض كشف الرواتب',
    accessHRReports: language === 'en' ? 'Access HR Reports' : 'الوصول للتقارير',
    accessHRArchive: language === 'en' ? 'Access HR Archive' : 'الوصول للأرشيف',
    printExport: language === 'en' ? 'Print/Export' : 'طباعة/تصدير',
    
    // Workflow
    attendanceRules: language === 'en' ? 'Attendance Rules' : 'قواعد الحضور',
    leaveRules: language === 'en' ? 'Leave Rules' : 'قواعد الإجازات',
    disciplinaryRules: language === 'en' ? 'Disciplinary Rules' : 'قواعد التأديب',
    approvalFlow: language === 'en' ? 'Approval Flow' : 'مسار الموافقة',
    lockPeriodDays: language === 'en' ? 'Lock Period (Days)' : 'فترة القفل (أيام)',
    overtimeEligible: language === 'en' ? 'Overtime Eligible Contracts' : 'العقود المؤهلة للعمل الإضافي',
    annualLeaveAccrual: language === 'en' ? 'Annual Leave Accrual Rate (Days/Month)' : 'معدل استحقاق الإجازة السنوية (أيام/شهر)',
    carryOverDays: language === 'en' ? 'Carry-Over Days' : 'أيام الترحيل',
    maxEmergencyDays: language === 'en' ? 'Max Emergency Days Without Justification' : 'الحد الأقصى لأيام الطوارئ بدون مبرر',
    canInitiate: language === 'en' ? 'Who Can Initiate' : 'من يمكنه البدء',
    requiredApprovals: language === 'en' ? 'Required Approval Levels' : 'مستويات الموافقة المطلوبة',
    visibilityRules: language === 'en' ? 'Visibility Rules' : 'قواعد الرؤية',
    
    // Templates
    templateName: language === 'en' ? 'Template Name' : 'اسم النموذج',
    type: language === 'en' ? 'Type' : 'النوع',
    version: language === 'en' ? 'Version' : 'الإصدار',
    uploadDate: language === 'en' ? 'Upload Date' : 'تاريخ الرفع',
    uploadTemplate: language === 'en' ? 'Upload Template' : 'رفع نموذج',
    
    // System Rules
    enableBackdatedEdits: language === 'en' ? 'Enable Backdated Edits' : 'السماح بالتعديلات بأثر رجعي',
    lockPayrollAfterCutoff: language === 'en' ? 'Lock Payroll After Cutoff' : 'قفل كشف الرواتب بعد الموعد النهائي',
    preventHRRecordDeletion: language === 'en' ? 'Prevent HR Record Deletion' : 'منع حذف سجلات الموارد البشرية',
    enforceReadOnlyAfterApproval: language === 'en' ? 'Enforce Read-Only After Approval' : 'فرض القراءة فقط بعد الموافقة',
    
    addDepartment: language === 'en' ? 'Add Department' : 'إضافة قسم',
    addPosition: language === 'en' ? 'Add Position' : 'إضافة منصب',
    addContractType: language === 'en' ? 'Add Contract Type' : 'إضافة نوع عقد',
    addLeaveType: language === 'en' ? 'Add Leave Type' : 'إضافة نوع إجازة',
    addExitReason: language === 'en' ? 'Add Exit Reason' : 'إضافة سبب مغادرة',
    
    deductibleFromAnnual: language === 'en' ? 'Deductible from Annual Leave' : 'يخصم من الإجازة السنوية',
    usedByEmployees: language === 'en' ? 'Used by X employees' : 'يستخدمه X موظف',
    
    saved: language === 'en' ? 'Settings saved successfully!' : 'تم حفظ الإعدادات بنجاح!',
    adminNote: language === 'en' ? '⚙️ Admin/HR Manager Only - Changes affect all modules' : '⚙️ المسؤول/مدير الموارد البشرية فقط - التغييرات تؤثر على جميع الوحدات',
    noBrandingNote: language === 'en' 
      ? '📌 Organization branding (logo, name) is managed in Global Settings (sidebar) only' 
      : '📌 العلامة التجارية للمنظمة (الشعار، الاسم) تُدار في الإعدادات العامة فقط'
  };

  const handleSaveWorkflowRules = () => {
    if (workflowRules) {
      localStorage.setItem('hr_workflow_rules', JSON.stringify(workflowRules));
      alert(t.saved);
    }
  };

  const handleSaveSystemRules = () => {
    if (systemRules) {
      localStorage.setItem('hr_system_rules', JSON.stringify(systemRules));
      alert(t.saved);
    }
  };

  const handleAddDepartment = () => {
    const name = prompt(t.addDepartment);
    if (name) {
      hrSettingsService.addDepartment(name);
      loadData();
    }
  };

  const handleAddPosition = () => {
    const name = prompt(t.addPosition);
    if (name) {
      hrSettingsService.addPosition(name);
      loadData();
    }
  };

  const handleAddContractType = () => {
    const name = prompt(t.addContractType);
    if (name) {
      hrSettingsService.addContractType(name);
      loadData();
    }
  };

  const handleAddLeaveType = () => {
    const name = prompt(t.addLeaveType);
    if (name) {
      hrSettingsService.addLeaveType(name, false);
      loadData();
    }
  };

  const handleAddExitReason = () => {
    const name = prompt(t.addExitReason);
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
        alert(language === 'en' ? 'Template uploaded successfully!' : 'تم رفع النموذج بنجاح!');
      }
    };
    input.click();
  };

  const tabs = [
    { id: 'permissions' as SettingsTab, name: t.permissionsRoles, icon: UserCog },
    { id: 'masterData' as SettingsTab, name: t.masterData, icon: Database },
    { id: 'workflow' as SettingsTab, name: t.workflowRules, icon: GitBranch },
    { id: 'templates' as SettingsTab, name: t.documentTemplates, icon: FileStack },
    { id: 'systemRules' as SettingsTab, name: t.systemRules, icon: Lock },
    { id: 'auditLog' as SettingsTab, name: t.auditLog, icon: Activity }
  ];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/organization/hr')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
        <span>{t.back}</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-base text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Admin Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">{t.adminNote}</p>
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
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.permissionsRoles}</h3>
                <p className="text-sm text-gray-600 mb-6">
                  {language === 'en' 
                    ? 'Control who can perform actions across HR modules. Changes affect system-wide access.'
                    : 'التحكم في من يمكنه تنفيذ الإجراءات عبر وحدات الموارد البشرية. التغييرات تؤثر على الوصول على مستوى النظام.'
                  }
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">{t.roleName}</th>
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
              <h3 className="text-lg font-semibold text-gray-900">{t.workflowRules}</h3>
              
              {/* Attendance Rules */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">{t.attendanceRules}</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.approvalFlow}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.lockPeriodDays}</label>
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
                <h4 className="font-medium text-gray-900 mb-4">{t.leaveRules}</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.annualLeaveAccrual}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.carryOverDays}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.approvalFlow}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.maxEmergencyDays}</label>
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
                <h4 className="font-medium text-gray-900 mb-4">{t.disciplinaryRules}</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.requiredApprovals}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.visibilityRules}</label>
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
                  {t.save}
                </button>
              </div>
            </div>
          )}

          {/* Document Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">{t.documentTemplates}</h3>
                <button
                  onClick={handleUploadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t.uploadTemplate}
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.templateName}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.type}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.version}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.uploadDate}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.active}</th>
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
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {template.active ? t.active : t.inactive}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.systemRules}</h3>
                <p className="text-sm text-gray-600 mb-6">
                  {language === 'en' 
                    ? 'Critical audit and data integrity controls. Changes affect HR operations system-wide.'
                    : 'ضوابط التدقيق وسلامة البيانات الحرجة. التغييرات تؤثر على عمليات الموارد البشرية على مستوى النظام.'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{t.enableBackdatedEdits}</h4>
                    <p className="text-sm text-gray-500">
                      {language === 'en' 
                        ? 'Allow users to edit records with past dates'
                        : 'السماح للمستخدمين بتعديل السجلات بتواريخ سابقة'
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
                    <h4 className="font-medium text-gray-900">{t.lockPayrollAfterCutoff}</h4>
                    <p className="text-sm text-gray-500">
                      {language === 'en' 
                        ? 'Prevent changes to payroll after cutoff date'
                        : 'منع التغييرات على كشف الرواتب بعد الموعد النهائي'
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
                    <h4 className="font-medium text-gray-900">{t.preventHRRecordDeletion}</h4>
                    <p className="text-sm text-gray-500">
                      {language === 'en' 
                        ? 'Soft-delete only, prevent permanent deletion'
                        : 'حذف مؤقت فقط، منع الحذف الدائم'
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
                    <h4 className="font-medium text-gray-900">{t.enforceReadOnlyAfterApproval}</h4>
                    <p className="text-sm text-gray-500">
                      {language === 'en' 
                        ? 'Lock approved records from further editing'
                        : 'قفل السجلات المعتمدة من المزيد من التعديل'
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
                  {t.save}
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