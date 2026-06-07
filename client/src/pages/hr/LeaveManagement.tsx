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
 ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/TranslationProvider';
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
import { LeaveRequest, LeaveBalance } from './leave/types';
import type { StaffMember } from '@/app/services/hrService';

// Components
import { LeaveRequestForm } from './leave/LeaveRequestForm';
import { LeaveBalancesView } from './leave/LeaveBalancesView';
import { LeaveRequestPrint } from './leave/LeaveRequestPrint';
import { emailNotificationService } from './leave/emailNotificationService';

// Services
import { staffService } from '@/app/services/hrService';

export function LeaveManagement() {
 const t = useTranslation();
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

 // Get current user (mock - in real app would come from auth)
 const currentUser = staffService.getAll().find(s => s.status === 'active') || null;

 // New state for balances tab
 const [activeMainTab, setActiveMainTab] = useState<'requests' | 'balances'>('balances');
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
 filtered = filtered.filter(r => r.status === 'Submitted');
 } else if (activeTab === 'approved') {
 filtered = filtered.filter(r => r.status === 'Approved');
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

 const handleApprove = (requestId: string) => {
 if (confirm(t.hrLeave.areYouSureYouWantTo)) {
 approveRequest(
   { id: parseInt(requestId) },
   {
     onSuccess: () => {
       refetchRequests();
       // Send notification
       const updatedRequest = requests.find(r => r.id === parseInt(requestId));
       if (updatedRequest) {
         emailNotificationService.notifyLeaveRequestApproved(updatedRequest);
       }
     },
   }
 );
 }
 };

 const handleReject = (requestId: string) => {
 const reason = prompt(t.hrLeave.pleaseProvideAReasonForRejection);
 if (reason) {
 rejectRequest(
   { id: parseInt(requestId), rejectionReason: reason },
   {
     onSuccess: () => {
       refetchRequests();
       // Send notification
       const updatedRequest = requests.find(r => r.id === parseInt(requestId));
       if (updatedRequest) {
         emailNotificationService.notifyLeaveRequestRejected(updatedRequest);
       }
     },
   }
 );
 }
 };

 const handleEdit = (request: LeaveRequest) => {
 // Find the employee for this request
 const employee = staffService.getByStaffId(request.staffId);
 if (!employee) {
 alert(t.hrLeave.noActiveEmployeeFound);
 return;
 }
 
 setEditingRequest(request);
 setSelectedEmployee(employee);
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

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'Draft': return 'bg-gray-100 text-gray-700 border-gray-200';
 case 'Submitted': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
 case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
 case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
 default: return 'bg-gray-100 text-gray-700 border-gray-200';
 }
 };

 const getLeaveTypeColor = (type: string) => {
 switch (type) {
 case 'Annual Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
 case 'Emergency Leave': return 'bg-orange-100 text-orange-700 border-orange-200';
 case 'Sick Leave': return 'bg-red-100 text-red-700 border-red-200';
 case 'Other Leave': return 'bg-purple-100 text-purple-700 border-purple-200';
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
 
 reason: t.hrLeave.reason
 };

 return (
 <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto">
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
 onClick={() => setActiveMainTab('requests')}
 className={`px-6 py-3 text-sm font-medium border-b-2 ${ activeMainTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900' }`}
 >
 {labels.pendingLeave} ({stats.pending})
 </button>
 <button
 onClick={() => setActiveMainTab('approved')}
 className={`px-6 py-3 text-sm font-medium border-b-2 ${ activeMainTab === 'approved' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900' }`}
 >
 {labels.approvedLeave} ({stats.approved})
 </button>
 </div>
 </div>

 {/* Content - Conditional based on active tab */}
 {activeMainTab === 'balances' ? (
 <LeaveBalancesView
 language={language}
 isRTL={isRTL}
 onRequestLeave={handleEmployeeSelected}
 />
 ) : (
 <>
 {/* Filters */}
 <div className="p-4 border-b border-gray-200">
 <div className="grid grid-cols-3 gap-4">
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={labels.search}
 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">{labels.allTypes}</option>
 <option value="Annual Leave">Annual Leave</option>
 <option value="Emergency Leave">Emergency Leave</option>
 <option value="Sick Leave">Sick Leave</option>
 <option value="Other Leave">Other Leave</option>
 </select>
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">{labels.allStatuses}</option>
 <option value="Draft">Draft</option>
 <option value="Submitted">Submitted</option>
 <option value="Approved">Approved</option>
 <option value="Rejected">Rejected</option>
 </select>
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 {filteredRequests.length === 0 ? (
 <div className="text-center py-12">
 <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-gray-600 font-medium">{labels.noRequests}</p>
 <p className="text-gray-500 text-sm">{labels.noRequestsDesc}</p>
 </div>
 ) : (
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.staffId}</th>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.name}</th>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.position}</th>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.leaveType}</th>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.dates}</th>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.days}</th>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.status}</th>
 <th className="px-6 py-3 text-left font-semibold text-gray-900">{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredRequests.map((request) => (
 <tr key={request.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 text-gray-900 font-mono">{request.staffId}</td>
 <td className="px-6 py-4 text-gray-900">{request.staffName}</td>
 <td className="px-6 py-4 text-gray-600">{request.position}</td>
 <td className="px-6 py-4">
 <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getLeaveTypeColor(request.leaveType)}`}>
 {request.leaveType}
 </span>
 </td>
 <td className="px-6 py-4 text-gray-600">
 {formatDate(request.startDate)} - {formatDate(request.endDate)}
 </td>
 <td className="px-6 py-4 text-gray-900 font-semibold">{request.totalDays}</td>
 <td className="px-6 py-4">
 <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
 {request.status}
 </span>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 {request.status === 'Submitted' && (
 <>
 <button
 onClick={() => handleApprove(request.id.toString())}
 className="p-1 text-green-600 hover:bg-green-50 rounded"
 title={labels.approve}
 disabled={approvePending}
 >
 <CheckCircle className="w-5 h-5" />
 </button>
 <button
 onClick={() => handleReject(request.id.toString())}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 title={labels.reject}
 disabled={rejectPending}
 >
 <XCircle className="w-5 h-5" />
 </button>
 </>
 )}
 {request.status === 'Draft' && (
 <>
 <button
 onClick={() => handleEdit(request)}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 title={labels.edit}
 >
 <Edit2 className="w-5 h-5" />
 </button>
 <button
 onClick={() => handleDelete(request.id.toString())}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 title={labels.delete}
 disabled={deletePending}
 >
 <Trash2 className="w-5 h-5" />
 </button>
 </>
 )}
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

 {/* Leave Request Form Modal */}
 {showRequestForm && selectedEmployee && (
 <LeaveRequestForm
 employee={selectedEmployee}
 language={language}
 isRTL={isRTL}
 onClose={() => {
 setShowRequestForm(false);
 setSelectedEmployee(null);
 setEditingRequest(null);
 }}
 onSave={() => {
 setShowRequestForm(false);
 setSelectedEmployee(null);
 setEditingRequest(null);
 refetchRequests();
 }}
 editingRequest={editingRequest}
 />
 )}

 {/* Employee Selector Modal */}
 {showEmployeeSelector && (
 <EmployeeSelectorModal
 language={language}
 isRTL={isRTL}
 onSelect={handleEmployeeSelected}
 onClose={() => setShowEmployeeSelector(false)}
 t={t}
 />
 )}

 {/* Print Modal */}
 {showPrintModal && printRequest && (
 <LeaveRequestPrint
 request={printRequest}
 language={language}
 isRTL={isRTL}
 onClose={() => {
 setShowPrintModal(false);
 setPrintRequest(null);
 }}
 />
 )}
 </div>
 );
}

// ============================================================================
// EMPLOYEE SELECTOR MODAL
// ============================================================================

interface EmployeeSelectorModalProps {
 language: string;
 isRTL: boolean;
 onSelect: (employee: StaffMember) => void;
 onClose: () => void;
 t: any;
}

function EmployeeSelectorModal({ language, isRTL, onSelect, onClose, t }: EmployeeSelectorModalProps) {
 const [searchTerm, setSearchTerm] = useState('');
 const [employees, setEmployees] = useState<StaffMember[]>([]);

 useEffect(() => {
 const allStaff = staffService.getAll();
 // Only show active staff
 const activeStaff = allStaff.filter(s => s.status === 'active');
 setEmployees(activeStaff);
 }, []);

 const filteredEmployees = employees.filter(emp => {
 if (!searchTerm) return true;
 const term = searchTerm.toLowerCase();
 return (
 emp.staffId.toLowerCase().includes(term) ||
 emp.fullName.toLowerCase().includes(term) ||
 emp.position.toLowerCase().includes(term) ||
 emp.department.toLowerCase().includes(term)
 );
 });

 const labels = {
 title: t.hrLeave.selectEmployee,
 subtitle: t.hrLeave.chooseAnEmployeeToCreateA,
 search: t.hrLeave.searchByStaffIdNamePosition2,
 staffId: t.hrLeave.staffId,
 name: t.hrLeave.name,
 position: t.hrLeave.position,
 department: t.hrLeave.department,
 select: t.hrLeave.select,
 cancel: t.hrLeave.cancel,
 noEmployees: t.hrLeave.noActiveEmployeesFound,
 activeStaff: t.hrLeave.activeStaff
 };

 return (
 <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">{labels.title}</h2>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>

 {/* Search */}
 <div className="px-6 py-4 border-b border-gray-200">
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={labels.search}
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 autoFocus
 />
 </div>

 {/* Employee List */}
 <div className="flex-1 overflow-y-auto p-6">
 {filteredEmployees.length === 0 ? (
 <div className="text-center py-12">
 <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-gray-600 font-medium">{labels.noEmployees}</p>
 </div>
 ) : (
 <div className="space-y-2">
 <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
 {labels.activeStaff} ({filteredEmployees.length})
 </p>
 {filteredEmployees.map((employee) => (
 <button
 key={employee.id}
 onClick={() => onSelect(employee)}
 className="w-full text-start p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
 >
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <span className="text-sm font-mono font-semibold text-blue-600">
 {employee.staffId}
 </span>
 <span className="text-base font-semibold text-gray-900">
 {employee.fullName}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-gray-600">
 <span>{employee.position}</span>
 <span>•</span>
 <span>{employee.department}</span>
 </div>
 </div>
 <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
 {labels.select} →
 </div>
 </div>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {labels.cancel}
 </button>
 </div>
 </div>
 </div>
 );
}
