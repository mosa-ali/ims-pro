import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface AccessRequest {
  id: string;
  fullName: string;
  email: string;
  organization: string;
  operatingUnit: string;
  jobTitle: string;
  reasonForAccess: string;
  status: 'new' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

const translations = {
  en: {
    title: 'Access Requests Management',
    description: 'Review and manage user access requests',
    searchPlaceholder: 'Search by name or email...',
    filterLabel: 'Filter by Status',
    allStatus: 'All Status',
    newStatus: 'New Requests',
    approvedStatus: 'Approved',
    rejectedStatus: 'Rejected',
    nameColumn: 'Name',
    emailColumn: 'Email',
    organizationColumn: 'Organization',
    jobTitleColumn: 'Job Title',
    statusColumn: 'Status',
    dateColumn: 'Requested On',
    actionsColumn: 'Actions',
    viewButton: 'View Details',
    approveButton: 'Approve',
    rejectButton: 'Reject',
    detailsTitle: 'Access Request Details',
    reasonForAccess: 'Reason for Access',
    rejectionReason: 'Rejection Reason (Optional)',
    confirmApprove: 'Are you sure you want to approve this request?',
    confirmReject: 'Are you sure you want to reject this request?',
    approveSuccess: 'Request approved successfully',
    rejectSuccess: 'Request rejected successfully',
    error: 'An error occurred. Please try again.',
    noRequests: 'No access requests found',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  ar: {
    title: 'إدارة طلبات الوصول',
    description: 'مراجعة وإدارة طلبات وصول المستخدمين',
    searchPlaceholder: 'البحث بالاسم أو البريد الإلكتروني...',
    filterLabel: 'التصفية حسب الحالة',
    allStatus: 'جميع الحالات',
    newStatus: 'طلبات جديدة',
    approvedStatus: 'موافق عليه',
    rejectedStatus: 'مرفوض',
    nameColumn: 'الاسم',
    emailColumn: 'البريد الإلكتروني',
    organizationColumn: 'المنظمة',
    jobTitleColumn: 'المسمى الوظيفي',
    statusColumn: 'الحالة',
    dateColumn: 'تاريخ الطلب',
    actionsColumn: 'الإجراءات',
    viewButton: 'عرض التفاصيل',
    approveButton: 'الموافقة',
    rejectButton: 'الرفض',
    detailsTitle: 'تفاصيل طلب الوصول',
    reasonForAccess: 'سبب الطلب',
    rejectionReason: 'سبب الرفض (اختياري)',
    confirmApprove: 'هل أنت متأكد من رغبتك في الموافقة على هذا الطلب؟',
    confirmReject: 'هل أنت متأكد من رغبتك في رفض هذا الطلب؟',
    approveSuccess: 'تمت الموافقة على الطلب بنجاح',
    rejectSuccess: 'تم رفض الطلب بنجاح',
    error: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    noRequests: 'لم يتم العثور على طلبات وصول',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
  },
};

export default function AccessRequestsDashboard() {  const { language, isRTL } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Mock data - replace with actual API call
  const [requests] = useState<AccessRequest[]>([
    {
      id: 'RAR-1',
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      organization: 'Test Organization',
      operatingUnit: 'Test OU',
      jobTitle: 'Manager',
      reasonForAccess: 'Need access to manage projects',
      status: 'new',
      createdAt: new Date('2026-03-10'),
    },
    {
      id: 'RAR-2',
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      organization: 'Test Organization',
      operatingUnit: 'Test OU',
      jobTitle: 'Analyst',
      reasonForAccess: 'Need access for data analysis',
      status: 'new',
      createdAt: new Date('2026-03-09'),
    },
  ]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            {t.pending}
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t.approved}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            {t.rejected}
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsApproving(true);
    try {
      // TODO: Call API to approve request
      // await trpc.admin.approveAccessRequest.mutate({ requestId: selectedRequest.id });
      console.log('Approving request:', selectedRequest.id);
      // Show success message
      setIsDetailsOpen(false);
      setSelectedRequest(null);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setIsRejecting(true);
    try {
      // TODO: Call API to reject request
      // await trpc.admin.rejectAccessRequest.mutate({
      //   requestId: selectedRequest.id,
      //   reason: rejectionReason,
      // });
      console.log('Rejecting request:', selectedRequest.id, rejectionReason);
      // Show success message
      setIsDetailsOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleViewDetails = (request: AccessRequest) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-slate-600 mt-1">{t.description}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">{t.newStatus}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests.filter((r) => r.status === 'new').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">{t.approvedStatus}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests.filter((r) => r.status === 'approved').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">{t.rejectedStatus}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests.filter((r) => r.status === 'rejected').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.filterLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-lg"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-48 h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allStatus}</SelectItem>
                  <SelectItem value="new">{t.newStatus}</SelectItem>
                  <SelectItem value="approved">{t.approvedStatus}</SelectItem>
                  <SelectItem value="rejected">{t.rejectedStatus}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Access Requests</CardTitle>
            <CardDescription>
              {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600">{t.noRequests}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.nameColumn}</TableHead>
                      <TableHead>{t.emailColumn}</TableHead>
                      <TableHead>{t.organizationColumn}</TableHead>
                      <TableHead>{t.jobTitleColumn}</TableHead>
                      <TableHead>{t.statusColumn}</TableHead>
                      <TableHead>{t.dateColumn}</TableHead>
                      <TableHead>{t.actionsColumn}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.fullName}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>{request.organization}</TableCell>
                        <TableCell>{request.jobTitle}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{request.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleViewDetails(request)}
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg"
                          >
                            {t.viewButton}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.detailsTitle}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.fullName} ({selectedRequest?.email})
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Info */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-slate-600">{t.organizationColumn}</p>
                  <p className="text-sm text-slate-900">{selectedRequest.organization}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">{t.jobTitleColumn}</p>
                  <p className="text-sm text-slate-900">{selectedRequest.jobTitle}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">{t.reasonForAccess}</p>
                  <p className="text-sm text-slate-900">{selectedRequest.reasonForAccess}</p>
                </div>
              </div>

              {/* Rejection Reason (if rejecting) */}
              {isRejecting && (
                <div>
                  <label className="text-sm font-medium text-slate-700">{t.rejectionReason}</label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 rounded-lg"
                    rows={3}
                  />
                </div>
              )}

              {/* Action Buttons */}
              {selectedRequest.status === 'new' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t.approveButton}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t.approveButton}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={isRejecting}
                    variant="outline"
                    className="flex-1 h-9 rounded-lg"
                  >
                    {isRejecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t.rejectButton}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        {t.rejectButton}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
