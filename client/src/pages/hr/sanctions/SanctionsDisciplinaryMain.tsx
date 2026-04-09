/**
 * ============================================================================
 * SANCTIONS & DISCIPLINARY - MAIN VIEW (EMPLOYEES LIST)
 * ============================================================================
 * 
 * PURPOSE:
 * Entry point for disciplinary case management
 * 
 * FEATURES:
 * - Tab 1: Employees List (Active + Archived staff)
 * - Tab 2: Policies & Guidelines
 * - Filters: Department, Position, Status
 * - Action: Start Disciplinary Case
 * 
 * DATA SOURCE:
 * - Auto-loaded from Staff Dictionary (hr_staff_members)
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
 AlertTriangle,
 Users,
 FileText,
 Filter,
 Search,
 Plus,
 Eye,
 Shield,
 BookOpen,
 ChevronRight
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StaffMember {
 staffId: string;
 fullName: string;
 position: string;
 department: string;
 status: 'active' | 'archived' | 'exited';
 contractType?: string;
 grade?: string;
 hireDate?: string;
}

interface Filters {
 department: string;
 position: string;
 status: string;
 searchTerm: string;
}

// ============================================================================
// STAFF SERVICE
// ============================================================================

const staffService = {
 getAll(): StaffMember[] {
 try {
 const data = localStorage.getItem('hr_staff_members');
 return data ? JSON.parse(data) : [];
 } catch {
 return [];
 }
 }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SanctionsDisciplinaryMain() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();

 const [activeTab, setActiveTab] = useState<'employees' | 'policies'>('employees');
 const [staff, setStaff] = useState<StaffMember[]>([]);
 const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
 const [showFilters, setShowFilters] = useState(false);
 
 const [filters, setFilters] = useState<Filters>({
 department: '',
 position: '',
 status: '',
 searchTerm: ''
 });

 useEffect(() => {
 loadStaff();
 }, []);

 useEffect(() => {
 applyFilters();
 }, [staff, filters]);

 const loadStaff = () => {
 const allStaff = staffService.getAll();
 // Only show Active and Archived staff (not Exited)
 const activeOrArchived = allStaff.filter(s => 
 s.status === 'active' || s.status === 'archived'
 );
 setStaff(activeOrArchived);
 };

 const applyFilters = () => {
 let filtered = [...staff];

 // Search term
 if (filters.searchTerm) {
 const term = filters.searchTerm.toLowerCase();
 filtered = filtered.filter(s =>
 s.staffId.toLowerCase().includes(term) ||
 s.fullName.toLowerCase().includes(term) ||
 s.position.toLowerCase().includes(term) ||
 s.department.toLowerCase().includes(term)
 );
 }

 // Department filter
 if (filters.department) {
 filtered = filtered.filter(s => s.department === filters.department);
 }

 // Position filter
 if (filters.position) {
 filtered = filtered.filter(s => 
 s.position.toLowerCase().includes(filters.position.toLowerCase())
 );
 }

 // Status filter
 if (filters.status) {
 filtered = filtered.filter(s => s.status === filters.status);
 }

 setFilteredStaff(filtered);
 };

 const resetFilters = () => {
 setFilters({
 department: '',
 position: '',
 status: '',
 searchTerm: ''
 });
 };

 const handleStartDisciplinaryCase = (staffMember: StaffMember) => {
 // Navigate to Form 1 - Disciplinary Case Initiation
 navigate(`/organization/hr/sanctions/form1/${staffMember.staffId}`);
 };

 // Get unique departments
 const departments = Array.from(new Set(staff.map(s => s.department))).filter(Boolean);

 const labels = {
 title: t.hrSanctions.sanctionsDisciplinary,
 subtitle: t.hr.sanctionsSubtitle,
 
 // Tabs
 employeesTab: t.hrSanctions.employeesList,
 policiesTab: t.hrSanctions.policiesGuidelines,
 
 // Actions
 startCase: t.hrSanctions.startDisciplinaryCase,
 filters: t.hrSanctions.filters,
 search: t.hrSanctions.searchByNameStaffIdPosition,
 resetFilters: t.hrSanctions.reset,
 showFilters: t.hrSanctions.showFilters,
 hideFilters: t.hrSanctions.hideFilters,
 
 // Filters
 filterByDepartment: t.hrSanctions.department,
 filterByPosition: t.hrSanctions.position,
 filterByStatus: t.hrSanctions.status,
 allDepartments: t.hrSanctions.allDepartments,
 allStatuses: t.hrSanctions.allStatuses,
 
 // Table headers
 staffId: t.hrSanctions.staffId,
 fullName: t.hrSanctions.fullName,
 position: t.hrSanctions.position,
 department: t.hrSanctions.department,
 status: t.hrSanctions.status,
 actions: t.hrSanctions.actions,
 
 // Empty state
 noStaff: t.hrSanctions.noStaffMembersFound,
 noStaffDesc: 'Try adjusting your filters or search term',
 
 // Info banner
 importantNote: t.hrSanctions.importantNote,
 noteText: 'All disciplinary cases must follow the official 6-step workflow. Each step is documented with official HR forms. Cases become read-only after submission at each stage.',
 
 // Policies tab
 policiesTitle: t.hrSanctions.disciplinaryPoliciesProcedures,
 policiesDesc: 'Upload and manage disciplinary policies, code of conduct, and internal procedures',
 uploadPolicy: t.hrSanctions.uploadPolicyDocument,
 noPolicies: t.hrSanctions.noPoliciesUploadedYet,
 noPoliciesDesc: language === 'en'
 ? 'Upload your organization\'s disciplinary policies and procedures'
 : 'قم بتحميل السياسات والإجراءات التأديبية لمنظمتك',
 
 // Status labels
 active: t.hrSanctions.active,
 archived: t.hrSanctions.archived,
 
 // Statistics
 totalStaff: t.hrSanctions.totalStaff,
 activeStaff: t.hrSanctions.active,
 archivedStaff: t.hrSanctions.archived
 };

 // Calculate statistics
 const stats = {
 total: filteredStaff.length,
 active: filteredStaff.filter(s => s.status === 'active').length,
 archived: filteredStaff.filter(s => s.status === 'archived').length
 };

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hrSanctions.hrDashboard} />

 {/* Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 
 
 <div className={`flex items-center justify-between mt-4`}>
 <div className={'text-start'}>
 <div className={`flex items-center gap-3`}>
 <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 {/* Important Note Banner */}
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
 <div className={`flex items-start gap-3`}>
 <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <h3 className="text-sm font-semibold text-amber-900">{labels.importantNote}</h3>
 <p className="text-sm text-amber-700 mt-1">{labels.noteText}</p>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-lg border border-gray-200 mb-6">
 <div className={`flex border-b border-gray-200`}>
 <button
 onClick={() => setActiveTab('employees')}
 className={`flex-1 px-6 py-3 text-sm font-medium ${ activeTab === 'employees' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900' }`}
 >
 <div className={`flex items-center justify-center gap-2`}>
 <Users className="w-4 h-4" />
 <span>{labels.employeesTab}</span>
 </div>
 </button>
 <button
 onClick={() => setActiveTab('policies')}
 className={`flex-1 px-6 py-3 text-sm font-medium ${ activeTab === 'policies' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900' }`}
 >
 <div className={`flex items-center justify-center gap-2`}>
 <BookOpen className="w-4 h-4" />
 <span>{labels.policiesTab}</span>
 </div>
 </button>
 </div>

 {/* Tab Content */}
 <div className="p-6">
 {activeTab === 'employees' ? (
 <>
 {/* Statistics */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
 <div className={`flex items-center gap-3`}>
 <Users className="w-8 h-8 text-blue-600" />
 <div className={'text-start'}>
 <p className="text-xs text-blue-700">{labels.totalStaff}</p>
 <p className="text-xl font-bold text-blue-900">{stats.total}</p>
 </div>
 </div>
 </div>

 <div className="bg-green-50 rounded-lg border border-green-200 p-4">
 <div className={`flex items-center gap-3`}>
 <Shield className="w-8 h-8 text-green-600" />
 <div className={'text-start'}>
 <p className="text-xs text-green-700">{labels.activeStaff}</p>
 <p className="text-xl font-bold text-green-900">{stats.active}</p>
 </div>
 </div>
 </div>

 <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
 <div className={`flex items-center gap-3`}>
 <FileText className="w-8 h-8 text-gray-600" />
 <div className={'text-start'}>
 <p className="text-xs text-gray-700">{labels.archivedStaff}</p>
 <p className="text-xl font-bold text-gray-900">{stats.archived}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Search and Filters */}
 <div className={`flex flex-col md:flex-row gap-4 mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
 {/* Search */}
 <div className="flex-1">
 <div className="relative">
 <Search className={`absolute top-3 ${'start-3'} w-5 h-5 text-gray-400`} />
 <input
 type="text"
 value={filters.searchTerm}
 onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
 placeholder={labels.search}
 className={`w-full ps-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent`}
 />
 </div>
 </div>

 {/* Filter Toggle */}
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50`}
 >
 <Filter className="w-5 h-5 text-gray-600" />
 <span className="text-sm font-medium text-gray-700">
 {showFilters ? labels.hideFilters : labels.showFilters}
 </span>
 </button>
 </div>

 {/* Filters Panel */}
 {showFilters && (
 <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Department Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByDepartment}
 </label>
 <select
 value={filters.department}
 onChange={(e) => setFilters({ ...filters, department: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
 >
 <option value="">{labels.allDepartments}</option>
 {departments.map(dept => (
 <option key={dept} value={dept}>{dept}</option>
 ))}
 </select>
 </div>

 {/* Position Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByPosition}
 </label>
 <input
 type="text"
 value={filters.position}
 onChange={(e) => setFilters({ ...filters, position: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
 placeholder={labels.filterByPosition}
 />
 </div>

 {/* Status Filter */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-end' : ''}`}>
 {labels.filterByStatus}
 </label>
 <select
 value={filters.status}
 onChange={(e) => setFilters({ ...filters, status: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
 >
 <option value="">{labels.allStatuses}</option>
 <option value="active">{labels.active}</option>
 <option value="archived">{labels.archived}</option>
 </select>
 </div>
 </div>

 <div className="mt-4">
 <button
 onClick={resetFilters}
 className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {labels.resetFilters}
 </button>
 </div>
 </div>
 )}

 {/* Staff Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {filteredStaff.length === 0 ? (
 <div className="p-12 text-center">
 <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{labels.noStaff}</h3>
 <p className="text-sm text-gray-600">{labels.noStaffDesc}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.staffId}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.fullName}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.position}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.department}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.status}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredStaff.map((member) => (
 <tr key={member.staffId} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-gray-900 font-mono">{member.staffId}</td>
 <td className="px-4 py-3 text-sm text-gray-900 font-medium">
 {member.fullName}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700">{member.position}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{member.department}</td>
 <td className="px-4 py-3">
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${ member.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200' }`}>
 {member.status === 'active' ? labels.active : labels.archived}
 </span>
 </td>
 <td className="px-4 py-3">
 <button
 onClick={() => handleStartDisciplinaryCase(member)}
 className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg`}
 >
 <Plus className="w-4 h-4" />
 <span>{labels.startCase}</span>
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </>
 ) : (
 // Policies Tab
 <div>
 <div className={'text-start'}>
 <h2 className="text-xl font-bold text-gray-900 mb-2">{labels.policiesTitle}</h2>
 <p className="text-sm text-gray-600 mb-6">{labels.policiesDesc}</p>
 </div>

 <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
 <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{labels.noPolicies}</h3>
 <p className="text-sm text-gray-600 mb-4">{labels.noPoliciesDesc}</p>
 <button className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}>
 <Plus className="w-4 h-4" />
 <span>{labels.uploadPolicy}</span>
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}