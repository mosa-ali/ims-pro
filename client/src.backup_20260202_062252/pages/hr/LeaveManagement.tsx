/**
 * ============================================================================
 * LEAVE MANAGEMENT - MAIN VIEW
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
 * - Reads from Staff Dictionary
 * - Blocks archived/exited staff
 * - Uses contract dates for calculations
 * 
 * ============================================================================
 */

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
  Printer
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { staffService, StaffMember } from '@/app/services/hrService';
import { leaveRequestService, leaveBalanceService } from './leave/leaveService';
import { LeaveRequest, LeaveBalance } from './leave/types';
import { LeaveRequestForm } from './leave/LeaveRequestForm';
import { LeaveBalancesView } from './leave/LeaveBalancesView';
import { LeaveRequestPrint } from './leave/LeaveRequestPrint';
import { emailNotificationService } from './leave/emailNotificationService';
import { BackToModulesButton } from './BackToModulesButton';

export function LeaveManagement() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
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
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<LeaveBalance[]>([]);
  const [balanceSearchTerm, setBalanceSearchTerm] = useState('');
  
  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRequest, setPrintRequest] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, activeTab, searchTerm, filterType, filterStatus]);

  const loadData = () => {
    const allRequests = leaveRequestService.getAll();
    
    // Sort by created date (most recent first)
    allRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    setRequests(allRequests);
    
    // Recalculate all balances
    leaveBalanceService.recalculateAllBalances();
    setBalances(leaveBalanceService.getAll());
  };

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
      alert(t.archivedBlocked);
      return;
    }

    setSelectedEmployee(employee);
    setShowEmployeeSelector(false);
    setShowRequestForm(true);
  };

  const handleApprove = (requestId: string) => {
    if (confirm(t.confirmApprove)) {
      leaveRequestService.approve(requestId, 'HR Manager'); // TODO: Get from auth
      // ⚠️ MOCK EMAIL - Log approval notification
      const updatedRequest = leaveRequestService.getById(requestId);
      if (updatedRequest) {
        emailNotificationService.notifyLeaveRequestApproved(updatedRequest);
      }
      loadData();
    }
  };

  const handleReject = (requestId: string) => {
    const reason = prompt(t.rejectionReason);
    if (reason) {
      leaveRequestService.reject(requestId, 'HR Manager', reason); // TODO: Get from auth
      // ⚠️ MOCK EMAIL - Log rejection notification
      const updatedRequest = leaveRequestService.getById(requestId);
      if (updatedRequest) {
        emailNotificationService.notifyLeaveRequestRejected(updatedRequest);
      }
      loadData();
    }
  };

  const handleEdit = (request: LeaveRequest) => {
    // Find the employee for this request
    const employee = staffService.getByStaffId(request.staffId);
    if (!employee) {
      alert(t.noEmployee);
      return;
    }
    
    setEditingRequest(request);
    setSelectedEmployee(employee);
    setShowRequestForm(true);
  };

  const handleDelete = (requestId: string) => {
    const confirmMsg = language === 'en' 
      ? 'Are you sure you want to delete this leave request?' 
      : 'هل أنت متأكد من حذف طلب الإجازة هذا؟';
    
    if (confirm(confirmMsg)) {
      leaveRequestService.delete(requestId);
      loadData();
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
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Statistics
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Submitted').length,
    approved: requests.filter(r => r.status === 'Approved').length,
    rejected: requests.filter(r => r.status === 'Rejected').length
  };

  const t = {
    title: language === 'en' ? 'Leave Management' : 'إدارة الإجازات',
    subtitle: language === 'en' ? 'Manage leave requests, approvals, and balances' : 'إدارة طلبات الإجازات والموافقات والأرصدة',
    
    newRequest: language === 'en' ? 'New Leave Request' : 'طلب إجازة جديد',
    export: language === 'en' ? 'Export' : 'تصدير',
    
    leaveBalances: language === 'en' ? 'Leave Balances' : 'أرصدة الإجازات',
    allLeave: language === 'en' ? 'All Requests' : 'جميع الطلبات',
    pendingLeave: language === 'en' ? 'Pending' : 'قيد الانتظار',
    approvedLeave: language === 'en' ? 'Approved' : 'معتمدة',
    
    search: language === 'en' ? 'Search by Staff ID, Name, Position...' : 'البحث برقم الموظف، الاسم، الوظيفة...',
    filterByType: language === 'en' ? 'Filter by Type' : 'تصفية حسب النوع',
    filterByStatus: language === 'en' ? 'Filter by Status' : 'تصفية حسب الحالة',
    allTypes: language === 'en' ? 'All Types' : 'جميع الأنواع',
    allStatuses: language === 'en' ? 'All Statuses' : 'جميع الحالات',
    
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    name: language === 'en' ? 'Name' : 'الاسم',
    position: language === 'en' ? 'Position' : 'الوظيفة',
    leaveType: language === 'en' ? 'Leave Type' : 'نوع الإجازة',
    dates: language === 'en' ? 'Dates' : 'التواريخ',
    days: language === 'en' ? 'Days' : 'الأيام',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    approve: language === 'en' ? 'Approve' : 'موافقة',
    reject: language === 'en' ? 'Reject' : 'رفض',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    view: language === 'en' ? 'View' : 'عرض',
    
    noRequests: language === 'en' ? 'No leave requests found' : 'لم يتم العثور على طلبات إجازة',
    noRequestsDesc: language === 'en' ? 'Start by creating a new leave request' : 'ابدأ بإنشاء طلب إجازة جديد',
    
    totalRequests: language === 'en' ? 'Total Requests' : 'إجمالي الطلبات',
    pendingApproval: language === 'en' ? 'Pending Approval' : 'في انتظار الموافقة',
    approvedRequests: language === 'en' ? 'Approved' : 'معتمد',
    rejectedRequests: language === 'en' ? 'Rejected' : 'مرفوض',
    
    confirmApprove: language === 'en' ? 'Are you sure you want to approve this leave request?' : 'هل أنت متأكد من الموافقة على طلب الإجازة هذا؟',
    rejectionReason: language === 'en' ? 'Please provide a reason for rejection:' : 'الرجاء تقديم سبب الرفض:',
    
    noEmployee: language === 'en' ? 'No active employee found' : 'لم يتم العثور على م��ظف نشط',
    archivedBlocked: language === 'en' ? 'Archived or exited staff cannot request leave' : 'لا يمكن للموظفين المؤرشفين أو المغادرين طلب الإجازة',
    
    reason: language === 'en' ? 'Reason' : 'السبب'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackToModulesButton 
            targetPath="/organization/hr"
            parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
          />
        </div>

        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-gray-600 mt-1">{t.subtitle}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleNewRequest}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-5 h-5" />
            <span>{t.newRequest}</span>
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
                <p className="text-sm text-gray-600">{t.totalRequests}</p>
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
                <p className="text-sm text-gray-600">{t.pendingApproval}</p>
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
                <p className="text-sm text-gray-600">{t.approvedRequests}</p>
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
                <p className="text-sm text-gray-600">{t.rejectedRequests}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setActiveMainTab('balances')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeMainTab === 'balances'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.leaveBalances} ({balances.length})
              </button>
              <button
                onClick={() => setActiveMainTab('requests')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeMainTab === 'requests'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.pendingLeave} ({stats.pending})
              </button>
              <button
                onClick={() => setActiveMainTab('approved')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeMainTab === 'approved'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.approvedLeave} ({stats.approved})
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
                    placeholder={t.search}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t.allTypes}</option>
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
                    <option value="">{t.allStatuses}</option>
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
                    <p className="text-gray-600 font-medium">{t.noRequests}</p>
                    <p className="text-sm text-gray-500 mt-1">{t.noRequestsDesc}</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.staffId}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.name}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.leaveType}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.dates}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.days}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.status}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{request.staffId}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{request.staffName}</p>
                              <p className="text-xs text-gray-500">{request.position}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getLeaveTypeColor(request.leaveType)}`}>
                              {request.leaveType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <p>{formatDate(request.startDate)}</p>
                              <p className="text-xs text-gray-500">to {formatDate(request.endDate)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{request.totalDays}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* View/Print button - available for all statuses */}
                              <button
                                onClick={() => {
                                  setPrintRequest(request);
                                  setShowPrintModal(true);
                                }}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                title={t.view}
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              
                              {request.status === 'Submitted' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(request.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title={t.approve}
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(request.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title={t.reject}
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
                                    title={t.edit}
                                  >
                                    <Edit2 className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(request.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title={t.delete}
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
            loadData();
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
}

function EmployeeSelectorModal({ language, isRTL, onSelect, onClose }: EmployeeSelectorModalProps) {
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

  const t = {
    title: language === 'en' ? 'Select Employee' : 'اختر الموظف',
    subtitle: language === 'en' ? 'Choose an employee to create a leave request for' : 'اختر موظفًا لإنشاء طلب إجازة له',
    search: language === 'en' ? 'Search by Staff ID, Name, Position, Department...' : 'البحث برقم الموظف، الاسم، الوظيفة، القسم...',
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    name: language === 'en' ? 'Name' : 'الاسم',
    position: language === 'en' ? 'Position' : 'الوظيفة',
    department: language === 'en' ? 'Department' : 'القسم',
    select: language === 'en' ? 'Select' : 'اتيار',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    noEmployees: language === 'en' ? 'No active employees found' : 'لم يتم العثور على موظفين نشطين',
    activeStaff: language === 'en' ? 'Active Staff' : 'الموظفون النشطون'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.search}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">{t.noEmployees}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                {t.activeStaff} ({filteredEmployees.length})
              </p>
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => onSelect(employee)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
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
                      {t.select} →
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
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}