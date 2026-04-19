/**
 * ============================================================================
 * STAFF DICTIONARY - READ-ONLY INDEX VIEW
 * ============================================================================
 * 
 * ⚠️ STRUCTURE UPDATE (MANDATORY):
 * This is a READ-ONLY navigation layer ONLY.
 * 
 * PRIMARY DATA SOURCE: Employees Directory (inside Employees Profiles)
 * 
 * FEATURES:
 * - Quick HR overview + navigation entry point
 * - View button ONLY (navigates to Employees Directory → Employee Profile)
 * - NO Edit, NO Delete, NO Add from this view
 * - Auto-synced from Employees Directory
 * - Excel export only (no import)
 * - Full bilingual support
 * - Data filtered by Organization ID and Operating Unit ID
 * 
 * All data modifications must occur in:
 * HR → Employees Profiles → Employees Directory
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
 Download, 
 Search,
 Eye,
 AlertCircle,
 Loader2,
 ArrowLeft, ArrowRight
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { exportStaffToExcel } from '@/app/utils/staffExcel';
import { Link } from 'wouter';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Staff member interface for display
interface StaffMember {
 id: string;
 staffId: string;
 fullName: string;
 gender: string;
 nationality: string;
 position: string;
 department: string;
 projects: string[];
 contractType: string;
 status: 'active' | 'archived' | 'exited';
 hireDate: string;
 contractStartDate: string;
 contractEndDate?: string;
}

export function StaffDictionary() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const { user } = useAuth();
 
 const [searchTerm, setSearchTerm] = useState('');
 const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived' | 'exited'>('all');

 // Get organizationId and operatingUnitId from user context
 const organizationId = currentOrganizationId!;
 const operatingUnitId = currentOperatingUnitId!;

 // Fetch employees from database using tRPC with organization/OU filtering
 const { data: employees, isLoading, error } = trpc.hrEmployees.getAll.useQuery(
 {},
 { enabled: organizationId > 0 && operatingUnitId > 0 }
 );

 // Transform database employees to StaffMember format
 const staff: StaffMember[] = (employees || []).map(emp => ({
 id: String(emp.id),
 staffId: emp.employeeCode || `EMP-${emp.id}`,
 fullName: emp.fullName,
 gender: emp.gender || 'Other',
 nationality: emp.nationality || '',
 position: emp.position || '',
 department: emp.department || '',
 projects: emp.department ? [emp.department] : [],
 contractType: emp.employmentType || 'Full-Time',
 status: (emp.status as 'active' | 'archived' | 'exited') || 'active',
 hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
 contractStartDate: emp.contractStartDate ? new Date(emp.contractStartDate).toISOString().split('T')[0] : '',
 contractEndDate: emp.contractEndDate ? new Date(emp.contractEndDate).toISOString().split('T')[0] : undefined,
 }));

 // Translations
 const labels = {
 title: t.hrStaff.staffDictionary,
 subtitle: t.hrStaff.masterStaffRegistryAndProfiles,
 readOnlyWarning: '📌 Read-only view. To add, edit, or delete employees, go to Employees Profiles → Employees Directory',
 
 // Actions
 exportStaff: t.hrStaff.exportStaff,
 search: t.hrStaff.searchStaff,
 
 // Table headers
 staffId: t.hrStaff.staffId,
 fullName: t.hrStaff.fullName,
 gender: t.hrStaff.gender,
 nationality: t.hrStaff.nationality,
 position: t.hrStaff.position,
 hireDate: t.hrStaff.hireDate,
 department: t.hrStaff.department,
 projects: t.hrStaff.projects,
 contractType: t.hrStaff.contractType,
 status: t.hrStaff.status,
 startedDate: t.hrStaff.startedDate,
 endDate: t.hrStaff.endDate,
 actions: t.hrStaff.actions,
 
 // Status
 active: t.hrStaff.active,
 archived: t.hrStaff.archived,
 exited: t.hrStaff.exited2,
 all: t.hrStaff.all,
 
 // Gender translations
 male: t.hrStaff.male,
 female: t.hrStaff.female,
 
 // Contract type translations
 fixedTerm: t.hrStaff.fixedterm,
 shortTerm: t.hrStaff.shortterm,
 consultancy: t.hrStaff.consultancy,
 permanent: t.hrStaff.permanent,
 fullTime: t.hrStaff.fulltime,
 partTime: t.hrStaff.parttime,
 
 // Action button
 view: t.hrStaff.viewProfile,
 
 // Messages
 noStaff: t.hrStaff.noStaffMembersFound,
 loading: t.hrStaff.loadingStaff,
 error: t.hrStaff.errorLoadingStaff,
 showing: t.hrStaff.showing,
 of: t.hrStaff.of,
 staffMembers: t.hrStaff.staffMembers,
 };

 // Handle View (Navigate to Employee Profile in Employees Directory)
 const handleView = (staffMember: StaffMember) => {
 navigate(`hr/employees-profiles/directory/${staffMember.id}`);
 };

 // Get status color
 const getStatusColor = (status: string) => {
 switch (status) {
 case 'active': return 'bg-green-50 text-green-700 border border-green-200';
 case 'archived': return 'bg-gray-50 text-gray-600 border border-gray-300';
 case 'exited': return 'bg-red-50 text-red-600 border border-red-200';
 default: return 'bg-gray-50 text-gray-700 border border-gray-200';
 }
 };
 
 // Get status label
 const getStatusLabel = (status: string) => {
 switch (status) {
 case 'active': return labels.active;
 case 'archived': return labels.archived;
 case 'exited': return labels.exited;
 default: return status;
 }
 };
 
 // Get gender label
 const getGenderLabel = (gender: string) => {
 if (language === 'ar') {
 return gender.toLowerCase() === 'male' ? labels.male : labels.female;
 }
 return gender;
 };
 
 // Get contract type label
 const getContractTypeLabel = (contractType: string) => {
 if (language === 'ar') {
 switch (contractType.toLowerCase()) {
 case 'fixed-term': return labels.fixedTerm;
 case 'short-term': return labels.shortTerm;
 case 'consultancy': return labels.consultancy;
 case 'permanent': return labels.permanent;
 case 'full-time': return labels.fullTime;
 case 'part-time': return labels.partTime;
 default: return contractType;
 }
 }
 return contractType;
 };

 // Format date
 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrStaff.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 // Filter staff
 const filteredStaff = staff.filter(s => {
 const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 s.staffId.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
 return matchesSearch && matchesStatus;
 });

 // Loading state
 if (isLoading) {
 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hrStaff.hrDashboard} />
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
 <span className="ms-2 text-gray-600">{labels.loading}</span>
 </div>
 </div>
 );
 }

 // Error state
 if (error) {
 return (
 <div className="space-y-6">
 <BackButton href="/organization/hr" label={t.hrStaff.hrDashboard} />
 <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-red-900">{labels.error}: {error.message}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Finance-style back button */}
 <BackButton href="/organization/hr" label={t.hrStaff.hrDashboard} />

 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-gray-600 mt-1">{labels.subtitle}</p>
 </div>

 {/* Read-Only Warning */}
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-amber-900">{labels.readOnlyWarning}</p>
 </div>

 {/* Actions Bar */}
 <div className="flex items-center justify-between gap-4">
 <div className={`flex items-center gap-4`}>
 {/* Search */}
 <div className="relative">
 <Search className={`absolute top-2.5 ${'start-3'} w-5 h-5 text-gray-400`} />
 <input
 type="text"
 placeholder={labels.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`ps-10 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64`}
 />
 </div>
 
 {/* Status Filter */}
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value as any)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="all">{labels.all}</option>
 <option value="active">{labels.active}</option>
 <option value="archived">{labels.archived}</option>
 <option value="exited">{labels.exited}</option>
 </select>
 </div>

 {/* Export Button Only */}
 <div className={`flex items-center gap-2`}>
 <button
 onClick={() => exportStaffToExcel(staff as any)}
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50`}
 >
 <Download className="w-5 h-5" />
 <span>{labels.exportStaff}</span>
 </button>
 </div>
 </div>

 {/* Table with 10 Columns */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {filteredStaff.length === 0 ? (
 <div className="px-6 py-12 text-center text-gray-500">
 <p>{labels.noStaff}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`} style={{ minWidth: '100px' }}>{labels.staffId}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`} style={{ minWidth: '180px' }}>{labels.fullName}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.gender}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.position}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`} style={{ minWidth: '150px' }}>{labels.projects}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.contractType}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center">{labels.status}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '110px' }}>{labels.startedDate}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '110px' }}>{labels.endDate}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '100px' }}>{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredStaff.map((staffMember) => (
 <tr key={staffMember.id} className="hover:bg-gray-50">
 {/* 1. Staff ID */}
 <td className="px-3 py-2 text-xs text-blue-600 font-mono">{staffMember.staffId}</td>
 
 {/* 2. Full Name */}
 <td className="px-3 py-2 text-xs text-gray-900 font-medium">{staffMember.fullName}</td>
 
 {/* 3. Gender */}
 <td className="px-3 py-2 text-xs text-gray-700">{getGenderLabel(staffMember.gender)}</td>
 
 {/* 4. Position */}
 <td className="px-3 py-2 text-xs text-gray-700">{staffMember.position}</td>
 
 {/* 5. Project(s) - Display as tags */}
 <td className="px-3 py-2 text-xs">
 <div className="flex flex-wrap gap-1">
 {staffMember.projects.map((project, idx) => (
 <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
 {project}
 </span>
 ))}
 </div>
 </td>
 
 {/* 6. Contract Type */}
 <td className="px-3 py-2 text-xs text-gray-700">{getContractTypeLabel(staffMember.contractType)}</td>
 
 {/* 7. Status */}
 <td className="px-3 py-2 text-center">
 <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(staffMember.status)}`}>
 {getStatusLabel(staffMember.status)}
 </span>
 </td>
 
 {/* 8. Started Date */}
 <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(staffMember.contractStartDate || staffMember.hireDate)}</td>
 
 {/* 9. End Date */}
 <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(staffMember.contractEndDate)}</td>
 
 {/* 10. Actions - View Only */}
 <td className="px-3 py-2 text-center">
 <button
 onClick={() => handleView(staffMember)}
 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
 title={labels.view}
 >
 <Eye className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Footer with count */}
 <div className="text-sm text-gray-500">
 {labels.showing} {filteredStaff.length} {labels.of} {staff.length} {labels.staffMembers}
 </div>
 </div>
 );
}
