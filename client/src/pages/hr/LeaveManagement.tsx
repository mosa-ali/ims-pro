/**
 * ============================================================================
 * LEAVE MANAGEMENT - MAIN VIEW (tRPC VERSION)
 * ============================================================================
 * 
 * Purpose: Centralized leave management for all employees
 * 
 * Features:
 * - My Leave (for current employee)
 * - Team Leave (for supervisors)
 * - All Leave (for HR)
 * - Leave requests table
 * - Approve/Reject functionality
 * - Balance overview
 * 
 * Integration:
 * - Full tRPC integration (NO localStorage)
 * - Reads from Staff Dictionary
 * - Blocks archived/exited staff
 * - Uses contract dates for calculations
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
 Calendar,
 Plus,
 Filter,
 Download,
 CheckCircle,
 XCircle,
 Clock,
 FileText,
 AlertCircle,
 Users,
 TrendingUp,
 Edit2,
 Trash2,
 Eye,
 Printer,
 ArrowLeft,
 ArrowRight,
 X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { hrAnnualLeaveTranslations } from '@/i18n/hrAnnualLeave-i18n';
import { BackButton } from "@/components/BackButton";

// tRPC hooks
import { 
  useLeaveRequests, 
  useLeaveBalances, 
  useLeaveRequestCounts,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useDeleteLeaveRequest,
  useCreateLeaveRequest,
  useUpdateLeaveRequest
} from '@/hooks/useLeave';

// Types
import { LeaveRequest, LeaveBalance, LeaveStatus } from './leave/types';
import type { StaffMember } from './types/hrTypes';

// Components
import { LeaveRequestForm } from './leave/LeaveRequestForm';
import { LeaveBalancesView } from './leave/LeaveBalancesView';
import { LeaveRequestPrint } from './leave/LeaveRequestPrint';
import { EmployeeSelector } from './leave/EmployeeSelector';
import { EmployeesAnnualLeaveView } from './leave/EmployeesAnnualLeaveView';
import { emailNotificationService } from './leave/emailNotificationService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';

// tRPC
import { trpc } from '@/lib/trpc';

export function LeaveManagement() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();

 const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved'>('all');
 const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
 const [showRequestForm, setShowRequestForm] = useState(false);
 const [selectedEmployee, setSelectedEmployee] = useState<StaffMember | null>(null);
 const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterType, setFilterType] = useState('');
 const [filterStatus, setFilterStatus] = useState('');
 const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
 const [showRejectModal, setShowRejectModal] = useState(false);
 const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);
 const [rejectionReason, setRejectionReason] = useState('');
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 0;
  const operatingUnitId = useOperatingUnit();
 
 // Get current user from auth (will be implemented with proper auth context)
 // For now, we rely on the tRPC context to provide the current user
 const currentUser = null; // TODO: Get from useAuth() hook

 // New state for balances tab
 const [activeMainTab, setActiveMainTab] = useState<'requests' | 'balances' | 'approved' | 'annualLeave'>('balances');
 const [filteredBalances, setFilteredBalances] = useState<LeaveBalance[]>([]);
 const [balanceSearchTerm, setBalanceSearchTerm] = useState('');
 
 // Print modal state
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [printRequest, setPrintRequest] = useState<LeaveRequest | null>(null);

 // tRPC hooks
 const { data: requests = [], isLoading: requestsLoading, refetch: refetchRequests } = useLeaveRequests();
 const { data: balances = [], isLoading: balancesLoading, refetch: refetchBalances } = useLeaveBalances();
 const { data: counts = { pending: 0, approved: 0, rejected: 0, total: 0 } } = useLeaveRequestCounts();

 // Mutations
 const { mutate: approveRequest, isPending: approvePending } = useApproveLeaveRequest();
 const { mutate: rejectRequest, isPending: rejectPending } = useRejectLeaveRequest();
 const { mutate: deleteRequest, isPending: deletePending } = useDeleteLeaveRequest();
 const { mutate: createRequest, isPending: createPending } = useCreateLeaveRequest();
 const { mutate: updateRequest, isPending: updatePending } = useUpdateLeaveRequest();

 useEffect(() => {
 applyFilters();
 }, [requests, activeTab, searchTerm, filterType, filterStatus]);

 const applyFilters = () => {
 let filtered = [...requests];

 // Tab filter
 if (activeTab === 'pending') {
 filtered = filtered.filter(r => r.status === 'pending');
 } else if (activeTab === 'approved') {
 filtered = filtered.filter(r => r.status === 'approved');
 }

 // Search filter
 if (searchTerm) {
 const term = searchTerm.toLowerCase();
 filtered = filtered.filter(r =>
 r.staffId.toLowerCase().includes(term) ||
 r.staffName.toLowerCase().includes(term) ||
 r.position.toLowerCase().includes(term) ||
 r.department.toLowerCase().includes(term)
 );
 }

 // Type filter
 if (filterType) {
 filtered = filtered.filter(r => r.leaveType === filterType);
 }

 // Status filter
 if (filterStatus) {
 filtered = filtered.filter(r => r.status === filterStatus);
 }

 setFilteredRequests(filtered);
 };

 const handleNewRequest = () => {
 // Show employee selector instead of auto-selecting
 setShowEmployeeSelector(true);
 };

 const handleEmployeeSelected = (employee: StaffMember) => {
 // Check if employee is active
 if (employee.status !== 'active') {
 alert(t.hrLeave.archivedOrExitedStaffCannotRequest);
 return;
 }

 setSelectedEmployee(employee);
 setShowEmployeeSelector(false);
 setShowRequestForm(true);
 };

 const handleApprove = (request: LeaveRequest) => {
 if (confirm(t.hrLeave.areYouSureYouWantTo)) {
 approveRequest(
   { id: parseInt(request.id as any) },
   {
     onSuccess: () => {
       refetchRequests();
       emailNotificationService.notifyLeaveRequestApproved(request);
     },
   }
 );
 }
 };

 const handleRejectClick = (request: LeaveRequest) => {
 setRejectingRequest(request);
 setRejectionReason('');
 setShowRejectModal(true);
 };

 const handleRejectSubmit = () => {
 if (!rejectingRequest || !rejectionReason.trim()) {
 alert(t.hrLeave.pleaseProvideAReasonForRejection);
 return;
 }

 rejectRequest(
   { id: parseInt(rejectingRequest.id as any), rejectionReason: rejectionReason },
   {
     onSuccess: () => {
       refetchRequests();
       setShowRejectModal(false);
       setRejectingRequest(null);
       setRejectionReason('');
       emailNotificationService.notifyLeaveRequestRejected(rejectingRequest);
     },
   }
 );
 };

 const handleEdit = (request: LeaveRequest) => {
 // Create a minimal employee object from request data
 // In production, this would fetch the full employee via tRPC
 const minimalEmployee: StaffMember = {
 id: String(request.employeeId),
 staffId: request.staffId,
 fullName: request.staffName,
 jobTitle: request.position,
 department: request.department,
 status: 'active',
 email: '',
 phone: '',
 gender: 'other',
 dateOfBirth: '',
 nationality: '',
 contractStartDate: '',
 contractEndDate: '',
 employmentType: 'full-time',
 reportingTo: null,
 createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
 updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
 organizationId: 0,
 operatingUnitId: 0,
 };
 
 setEditingRequest(request);
 setSelectedEmployee(minimalEmployee);
 setShowRequestForm(true);
 };

 const handleDelete = (requestId: string) => {
 const confirmMsg = 'Are you sure you want to delete this leave request?';
 
 if (confirm(confirmMsg)) {
 deleteRequest(
   { id: parseInt(requestId) },
   {
     onSuccess: () => {
       refetchRequests();
     },
   }
 );
 }
 };

const getStatusColor = (status: LeaveStatus) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';

    case 'pending':
      return 'bg-yellow-100 text-yellow-700';

    case 'approved':
      return 'bg-green-100 text-green-700';

    case 'rejected':
      return 'bg-red-100 text-red-700';

    case 'cancelled':
      return 'bg-gray-100 text-gray-700';

    default:
      return 'bg-gray-100 text-gray-700';
  }
};

 const getLeaveTypeColor = (type: string) => {
 switch (type) {
 case 'annual': return 'bg-blue-100 text-blue-700 border-blue-200';
 case 'sick': return 'bg-red-100 text-red-700 border-red-200';
 case 'maternity': return 'bg-pink-100 text-pink-700 border-pink-200';
 case 'paternity': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
 case 'unpaid': return 'bg-orange-100 text-orange-700 border-orange-200';
 case 'compassionate': return 'bg-purple-100 text-purple-700 border-purple-200';
 case 'study': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
 case 'other': return 'bg-gray-100 text-gray-700 border-gray-200';
 default: return 'bg-gray-100 text-gray-700 border-gray-200';
 }
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 // Statistics
 const stats = {
 total: counts.total,
 pending: counts.pending,
 approved: counts.approved,
 rejected: counts.rejected
 };

 const labels = {
 title: t.hrLeave.leaveManagement,
 subtitle: t.hrLeave.manageLeaveRequestsApprovalsAndBalances,
 
 newRequest: t.hrLeave.newLeaveRequest,
 export: t.hrLeave.export,
 
 leaveBalances: t.hrLeave.leaveBalances,
 allLeave: t.hrLeave.allRequests,
 pendingLeave: t.hrLeave.pending,
 approvedLeave: t.hrLeave.approved,
 
 search: t.hrLeave.searchByStaffIdNamePosition,
 filterByType: t.hrLeave.filterByType,
 filterByStatus: t.hrLeave.filterByStatus,
 allTypes: t.hrLeave.allTypes,
 allStatuses: t.hrLeave.allStatuses,
 
 staffId: t.hrLeave.staffId,
 name: t.hrLeave.name,
 position: t.hrLeave.position,
 leaveType: t.hrLeave.leaveType,
 dates: t.hrLeave.dates,
 days: t.hrLeave.days,
 status: t.hrLeave.status,
 actions: t.hrLeave.actions,
 
 approve: t.hrLeave.approve,
 reject: t.hrLeave.reject,
 edit: t.hrLeave.edit,
 delete: t.hrLeave.delete,
 view: t.hrLeave.view,
 print: 'Print',
 
 noRequests: t.hrLeave.noLeaveRequestsFound,
 noRequestsDesc: t.hrLeave.startByCreatingANewLeave,
 
 totalRequests: t.hrLeave.totalRequests,
 pendingApproval: t.hrLeave.pendingApproval,
 approvedRequests: t.hrLeave.approved1,
 rejectedRequests: t.hrLeave.rejected,
 
 confirmApprove: t.hrLeave.areYouSureYouWantTo,
 rejectionReason: t.hrLeave.pleaseProvideAReasonForRejection,
 
 noEmployee: t.hrLeave.noActiveEmployeeFound,
 archivedBlocked: t.hrLeave.archivedOrExitedStaffCannotRequest,
 
 reason: t.hrLeave.reason,
 rejectRequest: 'Reject Leave Request',
 reasonForRejection: 'Reason for Rejection',
 save: 'Save',
 cancel: 'Cancel'
 };

 return (
 <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto">
 
 {/* Employee Selector Modal */}
 {showEmployeeSelector && (
 <EmployeeSelector
 onSelect={handleEmployeeSelected}
 onClose={() => setShowEmployeeSelector(false)}
 />
 )}

 {/* Leave Request Form Modal */}
 {showRequestForm && selectedEmployee && (
 <LeaveRequestForm
 employee={selectedEmployee}
 language={language}
 isRTL={isRTL}
 onClose={() => {
 setShowRequestForm(false);
 setEditingRequest(null);
 setSelectedEmployee(null);
 }}
 onSave={() => {
 setShowRequestForm(false);
 setEditingRequest(null);
 setSelectedEmployee(null);
 refetchRequests();
 }}
 editingRequest={editingRequest}
 />
 )}

 {/* Reject Modal */}
 {showRejectModal && rejectingRequest && (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-md w-full" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">{labels.rejectRequest}</h2>
 <button
 onClick={() => setShowRejectModal(false)}
 className="text-gray-400 hover:text-gray-600"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 <div>
 <p className="text-sm text-gray-600 mb-2">
 {labels.reasonForRejection} <span className="text-red-600">*</span>
 </p>
 <textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="Enter reason for rejection..."
 />
 </div>
 </div>

 <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
 <button
 onClick={() => setShowRejectModal(false)}
 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
 >
 {labels.cancel}
 </button>
 <button
 onClick={handleRejectSubmit}
 disabled={rejectPending}
 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
 >
 {labels.reject}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Print Modal */}
 {showPrintModal && printRequest && (
 <LeaveRequestPrint
 request={printRequest}
 onClose={() => {
 setShowPrintModal(false);
 setPrintRequest(null);
 }}
 language={language}
 isRTL={isRTL}
 />
 )}

 {/* Header */}
 <div className="mb-6">
 <BackButton href="/organization/hr" label={t.hrLeave.hrDashboard} />
 </div>

 <div className="flex items-center justify-between mb-6">
 <div className={'text-start'}>
 <div className="flex items-center gap-3">
 <Calendar className="w-8 h-8 text-blue-600" />
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>
 </div>
 <button
 onClick={handleNewRequest}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Plus className="w-5 h-5" />
 <span>{labels.newRequest}</span>
 </button>
 </div>

 {/* Statistics Cards */}
 <div className="grid grid-cols-4 gap-4 mb-6">
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
 <FileText className="w-6 h-6 text-blue-600" />
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.totalRequests}</p>
 <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
 <Clock className="w-6 h-6 text-yellow-600" />
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.pendingApproval}</p>
 <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
 <CheckCircle className="w-6 h-6 text-green-600" />
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.approvedRequests}</p>
 <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
 <XCircle className="w-6 h-6 text-red-600" />
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.rejectedRequests}</p>
 <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="bg-white rounded-lg border border-gray-200">
 {/* Tabs */}
 <div className="border-b border-gray-200">
 <div className={`flex`}>
 <button
 onClick={() => setActiveMainTab('balances')}
 className={`px-6 py-3 text-sm font-medium border-b-2 ${ activeMainTab === 'balances' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900' }`}
 >
 {labels.leaveBalances} ({balances.length})
 </button>
 <button
 onClick={() => setActiveMainTab('annualLeave')}
 className={`px-6 py-3 text-sm font-medium border-b-2 ${ activeMainTab === 'annualLeave' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900' }`}
 >
 {hrAnnualLeaveTranslations[language].annualLeaveView.title}
 </button>
 <button
 onClick={() => setActiveMainTab('requests')}
 className={`px-6 py-3 text-sm font-medium border-b-2 ${ activeMainTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900' }`}
 >
 {labels.allLeave} ({requests.length})
 </button>
 </div>
 </div>

 {/* Tab Content */}
 <div className="p-6">
 {/* Balances Tab */}
 {activeMainTab === 'balances' && (
 <LeaveBalancesView
 language={language}
 isRTL={isRTL}
 onRequestLeave={(employee) => {
 setSelectedEmployee(employee);
 setShowRequestForm(true);
 }}
 />
 )}

 {/* Annual Leave Tab */}
 {activeMainTab === 'annualLeave' && (
 <EmployeesAnnualLeaveView
 />
 )}

 {/* Requests Tab */}
 {activeMainTab === 'requests' && (
 <>
 {/* Sub-tabs for requests */}
 <div className="mb-4 border-b border-gray-200">
 <div className="flex gap-4">
 <button
 onClick={() => setActiveTab('all')}
 className={`pb-2 px-2 font-medium text-sm border-b-2 transition-colors ${
 activeTab === 'all'
 ? 'border-blue-600 text-blue-600'
 : 'border-transparent text-gray-600 hover:text-gray-900'
 }`}
 >
 {labels.allLeave}
 </button>
 <button
 onClick={() => setActiveTab('pending')}
 className={`pb-2 px-2 font-medium text-sm border-b-2 transition-colors ${
 activeTab === 'pending'
 ? 'border-blue-600 text-blue-600'
 : 'border-transparent text-gray-600 hover:text-gray-900'
 }`}
 >
 {labels.pendingLeave}
 </button>
 <button
 onClick={() => setActiveTab('approved')}
 className={`pb-2 px-2 font-medium text-sm border-b-2 transition-colors ${
 activeTab === 'approved'
 ? 'border-blue-600 text-blue-600'
 : 'border-transparent text-gray-600 hover:text-gray-900'
 }`}
 >
 {labels.approvedLeave}
 </button>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="mb-4 space-y-3">
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={labels.search}
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 <div className="grid grid-cols-2 gap-3">
 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">{labels.allTypes}</option>
 <option value="annual">Annual Leave</option>
 <option value="sick">Sick Leave</option>
 <option value="maternity">Maternity Leave</option>
 <option value="paternity">Paternity Leave</option>
 <option value="unpaid">Unpaid Leave</option>
 <option value="compassionate">Compassionate Leave</option>
 <option value="study">Study Leave</option>
 <option value="other">Other Leave</option>
 </select>
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 {requestsLoading ? (
 <div className="text-center py-12">
 <Clock className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
 <p className="text-gray-600 font-medium">Loading...</p>
 </div>
 ) : filteredRequests.length === 0 ? (
 <div className="text-center py-12">
 <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-gray-600 font-medium">{labels.noRequests}</p>
 <p className="text-gray-500 text-sm mt-1">{labels.noRequestsDesc}</p>
 </div>
 ) : (
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start">{labels.staffId}</th>
 <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start">{labels.name}</th>
 <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start">{labels.leaveType}</th>
 <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start">{labels.dates}</th>
 <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase text-center">{labels.days}</th>
 <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start">{labels.status}</th>
 <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start">{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredRequests.map((request) => (
 <tr key={request.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-mono text-gray-900">{request.staffId}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{request.staffName}</td>
 <td className="px-4 py-3 text-sm">
 <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getLeaveTypeColor(request.leaveType || '')}`}>
 {request.leaveType}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">
 {formatDate(request.startDate)} → {formatDate(request.endDate)}
 </td>
 <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">{request.totalDays}</td>
 <td className="px-4 py-3 text-sm">
 <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(request.status || '')}`}>
 {request.status}
 </span>
 </td>
 <td className="px-4 py-3 text-sm">
 <div className="flex items-center gap-2">
 <button
 onClick={() => {}}
 title={labels.view}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 >
 <Eye className="w-4 h-4" />
 </button>
 
 {(request.status === 'draft' || request.status === 'pending') && (
 <button
 onClick={() => handleEdit(request)}
 title={labels.edit}
 className="p-1 text-green-600 hover:bg-green-50 rounded"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 )}
 
 {request.status === 'draft' && (
 <button
 onClick={() => handleDelete(request.id as any)}
 title={labels.delete}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 
 {request.status === 'pending' && (
 <>
 <button
 onClick={() => handleApprove(request)}
 title={labels.approve}
 className="p-1 text-green-600 hover:bg-green-50 rounded"
 >
 <CheckCircle className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleRejectClick(request)}
 title={labels.reject}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 >
 <XCircle className="w-4 h-4" />
 </button>
 </>
 )}
 
 <button
 onClick={() => {
 setPrintRequest(request);
 setShowPrintModal(true);
 }}
 title={labels.print}
 className="p-1 text-purple-600 hover:bg-purple-50 rounded"
 >
 <Printer className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}