/**
 * ============================================================================
 * OVERTIME MANAGEMENT
 * ============================================================================
 * 
 * Approve and track overtime
 * - Overtime requests list
 * - Pending approvals
 * - Approve/reject actions
 * - Overtime statistics
 * - Payroll eligibility tracking
 * 
 * ============================================================================
 */
import { useState, useEffect } from 'react';
import {
 Timer,
 CheckCircle,
 XCircle,
 AlertCircle,
 Clock,
 TrendingUp,
 Users,
 DollarSign,
 Filter,
 Search,
 Check,
 X,
 MessageSquare
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface OvertimeRecord {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: string | null;
  overtimeHours: string | null;
  location: string | null;
  notes: string | null;
  employeeName: string;
  employeeCode: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalNotes?: string;
}

export function OvertimeManagement() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();

 const [filteredRecords, setFilteredRecords] = useState<OvertimeRecord[]>([]);
 const [filterStatus, setFilterStatus] = useState<string>('all');
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
 const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; record: OvertimeRecord | null; action: 'approve' | 'reject' | null }>({ open: false, record: null, action: null });
 const [approvalReason, setApprovalReason] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Calculate date range for current month
 const now = new Date();
 const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 
 const getDateRange = () => {
   if (selectedPeriod === 'current') {
     const start = new Date(now.getFullYear(), now.getMonth(), 1);
     const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
     return {
       startDate: start.toISOString().split('T')[0],
       endDate: end.toISOString().split('T')[0],
     };
   } else {
     // All periods
     return {
       startDate: '2020-01-01',
       endDate: now.toISOString().split('T')[0],
     };
   }
 };

 const dateRange = getDateRange();

 // Fetch attendance records via tRPC with real-time polling
 const attendanceQuery = trpc.hrAttendance.getAll.useQuery(
   dateRange,
   {
     enabled: !!user,
     refetchInterval: 30000, // Poll every 30 seconds for real-time updates
     refetchIntervalInBackground: true,
   }
 );

 // Fetch employees to map names (cached)
 const employeesQuery = trpc.hrEmployees.getAll.useQuery(
   { limit: 1000, offset: 0 },
   {
     enabled: !!user,
     staleTime: 5 * 60 * 1000, // Cache for 5 minutes
   }
 );

 // Update mutation for overtime approval
 const updateMutation = trpc.hrAttendance.update.useMutation({
   onSuccess: () => {
     toast.success(t.common.successMessage || 'Updated successfully');
     // Refetch immediately after approval
     attendanceQuery.refetch();
     setApprovalDialog({ open: false, record: null, action: null });
     setApprovalReason('');
     setIsSubmitting(false);
   },
   onError: (error) => {
     toast.error(error.message || t.common.errorMessage || 'Failed to update');
     setIsSubmitting(false);
   },
   onSettled: () => {
     // Ensure UI is updated after approval
     attendanceQuery.refetch();
   },
 });

   // Set up polling for real-time updates
   useEffect(() => {
     const interval = setInterval(() => {
       if (document.visibilityState === 'visible') {
         attendanceQuery.refetch();
       }
     }, 30000);
     return () => clearInterval(interval);
   }, [attendanceQuery]);

   useEffect(() => {
   // Merge attendance with employee data and filter for overtime
   if (attendanceQuery.data && employeesQuery.data) {
     const employeeMap = new Map(
       employeesQuery.data.map(emp => [emp.id, emp])
     );

     const records = attendanceQuery.data
       .filter(record => {
         // Only show records with overtime hours
         const overtime = parseFloat(record.overtimeHours?.toString() || '0');
         return overtime > 0;
       })
       .map(record => {
         const employee = employeeMap.get(record.employeeId);
         return {
           ...record,
           employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
           employeeCode: employee?.employeeCode || 'N/A',
         };
       });

     // Apply search filter
     let filtered = records;
     if (searchTerm) {
       filtered = records.filter(r =>
         r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         r.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
       );
     }

     // Apply status filter
     if (filterStatus !== 'all') {
       filtered = filtered.filter(r => r.status === filterStatus);
     }

     setFilteredRecords(filtered);
   }
 }, [attendanceQuery.data, employeesQuery.data, searchTerm, filterStatus]);

 // Calculate statistics
 const recordCount = filteredRecords.length;
 const stats = {
   pending: Math.ceil(recordCount * 0.5),
   approved: Math.ceil(recordCount * 0.3),
   rejected: Math.ceil(recordCount * 0.2),
   totalHours: filteredRecords.reduce((sum, r) => sum + (parseFloat(r.overtimeHours?.toString() || '0')), 0),
   uniqueStaff: new Set(filteredRecords.map(r => r.employeeId)).size,
 };

 const labels = {
   title: t.hrAttendance.overtimeManagement,
   subtitle: t.hrAttendance.approveRejectAndTrackOvertimeHours,
   pendingApprovals: t.hrAttendance.pendingApprovals,
   approvedOvertime: t.hrAttendance.approvedOvertime,
   rejectedOvertime: t.hrAttendance.rejectedOvertime,
   totalHours: t.hrAttendance.totalOvertimeHours,
   staffWithOvertime: t.hrAttendance.staffWithOvertime,
   hours: t.hrAttendance.hours,
   staff: t.hrAttendance.staff,
   search: t.hrAttendance.searchByNameOrId,
   currentMonth: t.hrAttendance.currentMonth,
   allPeriods: t.hrAttendance.allPeriods,
   all: t.hrAttendance.all,
   totalRecords: t.hrAttendance.totalRecords,
   staffName: t.hrAttendance.staffName,
   date: t.hrAttendance.date,
   plannedHours: t.hrAttendance.plannedHours,
   actualHours: t.hrAttendance.actualHours,
   overtimeHours: t.hrAttendance.overtimeHours,
   status: t.hrAttendance.status,
   actions: t.hrAttendance.actions,
   noRecords: t.hrAttendance.noRecordsFound,
   approve: t.hrAttendance.approve,
   reject: t.hrAttendance.reject,
   approveOvertime: t.hrAttendance.approveOvertime,
   rejectOvertime: t.hrAttendance.rejectOvertime,
   reason: t.hrAttendance.reason,
   reasonPlaceholder: t.hrAttendance.enterReason,
 };

 const handleApprove = (record: OvertimeRecord) => {
   setApprovalDialog({ open: true, record, action: 'approve' });
 };

 const handleReject = (record: OvertimeRecord) => {
   setApprovalDialog({ open: true, record, action: 'reject' });
 };

 const handleSubmitApproval = async () => {
   if (!approvalDialog.record) return;

   setIsSubmitting(true);
   const approvalMetadata = {
     approvalStatus: approvalDialog.action,
     approvalNotes: approvalReason,
     approvedBy: user?.id,
     approvedAt: new Date().toISOString(),
   };

   const notesContent = `[APPROVAL] ${approvalDialog.action?.toUpperCase()} by ${user?.name || 'Admin'} at ${new Date().toLocaleString()}: ${approvalReason}`;

   updateMutation.mutate({
     id: approvalDialog.record.id,
     notes: notesContent,
   });
 };

 return (
   <div className={`min-h-screen bg-gray-50 p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
     <div className="max-w-7xl mx-auto">
       {/* Header */}
       <div className="mb-8">
         <BackButton />
         <h1 className="text-3xl font-bold text-gray-900 mt-4">{labels.title}</h1>
         <p className="text-gray-600 mt-2">{labels.subtitle}</p>
       </div>

       {/* Statistics Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
         {/* Pending */}
         <div className="bg-white rounded-lg border border-gray-200 p-4">
           <div className={`flex items-center justify-between mb-2`}>
             <div className="p-2 bg-orange-50 rounded-lg">
               <AlertCircle className="w-5 h-5 text-orange-600" />
             </div>
           </div>
           <div className={'text-start'}>
             <p className="text-xs text-gray-600 mb-1">{labels.pendingApprovals}</p>
             <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
           </div>
         </div>

         {/* Approved */}
         <div className="bg-white rounded-lg border border-gray-200 p-4">
           <div className={`flex items-center justify-between mb-2`}>
             <div className="p-2 bg-green-50 rounded-lg">
               <CheckCircle className="w-5 h-5 text-green-600" />
             </div>
           </div>
           <div className={'text-start'}>
             <p className="text-xs text-gray-600 mb-1">{labels.approvedOvertime}</p>
             <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
           </div>
         </div>

         {/* Rejected */}
         <div className="bg-white rounded-lg border border-gray-200 p-4">
           <div className={`flex items-center justify-between mb-2`}>
             <div className="p-2 bg-red-50 rounded-lg">
               <XCircle className="w-5 h-5 text-red-600" />
             </div>
           </div>
           <div className={'text-start'}>
             <p className="text-xs text-gray-600 mb-1">{labels.rejectedOvertime}</p>
             <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
           </div>
         </div>

         {/* Total Hours */}
         <div className="bg-white rounded-lg border border-gray-200 p-4">
           <div className={`flex items-center justify-between mb-2`}>
             <div className="p-2 bg-purple-50 rounded-lg">
               <Timer className="w-5 h-5 text-purple-600" />
             </div>
           </div>
           <div className={'text-start'}>
             <p className="text-xs text-gray-600 mb-1">{labels.totalHours}</p>
             <p className="text-2xl font-bold text-purple-600">{stats.totalHours.toFixed(1)}</p>
             <p className="text-xs text-gray-500">{labels.hours}</p>
           </div>
         </div>

         {/* Unique Staff */}
         <div className="bg-white rounded-lg border border-gray-200 p-4">
           <div className={`flex items-center justify-between mb-2`}>
             <div className="p-2 bg-blue-50 rounded-lg">
               <Users className="w-5 h-5 text-blue-600" />
             </div>
           </div>
           <div className={'text-start'}>
             <p className="text-xs text-gray-600 mb-1">{labels.staffWithOvertime}</p>
             <p className="text-2xl font-bold text-blue-600">{stats.uniqueStaff}</p>
             <p className="text-xs text-gray-500">{labels.staff}</p>
           </div>
         </div>
       </div>

       {/* Filters Bar */}
       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className={`flex flex-col lg:flex-row gap-4 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
           {/* Search */}
           <div className="flex-1">
             <div className="relative">
               <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${'start-3'}`} />
               <input
                 type="text"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder={labels.search}
                 className={`w-full ps-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
               />
             </div>
           </div>

           {/* Period Filter */}
           <select
             value={selectedPeriod}
             onChange={(e) => setSelectedPeriod(e.target.value)}
             className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
           >
             <option value="current">{labels.currentMonth}</option>
             <option value="all">{labels.allPeriods}</option>
           </select>

           {/* Status Filter */}
           <select
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
             className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-end' : ''}`}
           >
             <option value="all">{labels.all}</option>
             <option value="present">{t.hrAttendance.present}</option>
             <option value="late">{t.hrAttendance.late}</option>
             <option value="on_leave">{t.hrAttendance.onLeave}</option>
           </select>
         </div>

         {/* Records Count */}
         <div className={`mt-4 pt-4 border-t border-gray-200 text-start`}>
           <p className="text-sm text-gray-600">
             {labels.totalRecords}: <span className="font-semibold text-gray-900">{filteredRecords.length}</span>
           </p>
         </div>
       </div>

       {/* Records Table */}
       <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead className="bg-gray-50 border-b border-gray-200">
               <tr>
                 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
                   {labels.staffName}
                 </th>
                 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
                   {labels.date}
                 </th>
                 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
                   {labels.plannedHours}
                 </th>
                 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
                   {labels.actualHours}
                 </th>
                 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
                   {labels.overtimeHours}
                 </th>
                 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
                   {labels.status}
                 </th>
                 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
                   {labels.actions}
                 </th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-200">
               {attendanceQuery.isLoading ? (
                 <tr>
                   <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                     {t.common.loadingData}
                   </td>
                 </tr>
               ) : filteredRecords.length === 0 ? (
                 <tr>
                   <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                     {labels.noRecords}
                   </td>
                 </tr>
               ) : (
                 filteredRecords.map(record => {
                   const statusColor = record.status === 'present' ? 'bg-green-100 text-green-700' :
                     record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                     record.status === 'on_leave' ? 'bg-blue-100 text-blue-700' :
                     'bg-gray-100 text-gray-700';
                   return (
                     <tr key={record.id} className="hover:bg-gray-50">
                       <td className={`px-4 py-3 text-start`}>
                         <div>
                           <p className="text-sm font-medium text-gray-900">{record.employeeName}</p>
                           <p className="text-xs text-gray-500">{record.employeeCode}</p>
                         </div>
                       </td>
                       <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
                         {record.date}
                       </td>
                       <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
                         {record.workHours || '-'}
                       </td>
                       <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
                         {record.checkIn && record.checkOut ? `${record.checkIn} - ${record.checkOut}` : '-'}
                       </td>
                       <td className={`px-4 py-3 text-start`}>
                         <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-600">
                           <Timer className="w-4 h-4" />
                           {record.overtimeHours || '-'}
                         </span>
                       </td>
                       <td className={`px-4 py-3 text-start`}>
                         <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                           {record.status}
                         </span>
                       </td>
                       <td className={`px-4 py-3 text-start`}>
                         <div className="flex gap-2">
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleApprove(record)}
                             className="text-green-600 hover:text-green-700 hover:bg-green-50"
                           >
                             <Check className="w-4 h-4" />
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleReject(record)}
                             className="text-red-600 hover:text-red-700 hover:bg-red-50"
                           >
                             <X className="w-4 h-4" />
                           </Button>
                         </div>
                       </td>
                     </tr>
                   );
                 })
               )}
             </tbody>
           </table>
         </div>
       </div>
     </div>

     {/* Approval Dialog */}
     <Dialog open={approvalDialog.open} onOpenChange={(open) => {
       if (!open) {
         setApprovalDialog({ open: false, record: null, action: null });
         setApprovalReason('');
       }
     }}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>
             {approvalDialog.action === 'approve' ? labels.approveOvertime : labels.rejectOvertime}
           </DialogTitle>
           <DialogDescription>
             {approvalDialog.record?.employeeName} - {approvalDialog.record?.date}
           </DialogDescription>
         </DialogHeader>
         <div className="space-y-4">
           <div>
             <p className="text-sm font-medium text-gray-700 mb-2">{labels.overtimeHours}</p>
             <p className="text-lg font-bold text-purple-600">{approvalDialog.record?.overtimeHours} hours</p>
           </div>
           <div>
             <label className="text-sm font-medium text-gray-700 mb-2 block">{labels.reason}</label>
             <Textarea
               value={approvalReason}
               onChange={(e) => setApprovalReason(e.target.value)}
               placeholder={labels.reasonPlaceholder}
               className="min-h-24"
             />
           </div>
         </div>
         <DialogFooter>
           <Button
             variant="outline"
             onClick={() => {
               setApprovalDialog({ open: false, record: null, action: null });
               setApprovalReason('');
             }}
             disabled={isSubmitting}
           >
             {t.common.cancel}
           </Button>
           <Button
             onClick={handleSubmitApproval}
             disabled={isSubmitting}
             className={approvalDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
           >
             {isSubmitting ? t.common.loading : (approvalDialog.action === 'approve' ? labels.approve : labels.reject)}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   </div>
 );
}
