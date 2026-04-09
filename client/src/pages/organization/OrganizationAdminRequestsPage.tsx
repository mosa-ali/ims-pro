import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Mail, Phone, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const translations = {
  en: {
    title: 'Organization Access Requests',
    description: 'Review and manage access requests for your organization',
    noRequests: 'No pending requests',
    noRequestsDesc: 'All access requests for your organization have been processed',
    organization: 'Organization',
    operatingUnit: 'Operating Unit',
    authProvider: 'Auth Provider',
    accountType: 'Account Type',
    email: 'Email',
    phone: 'Phone',
    jobTitle: 'Job Title',
    reason: 'Reason for Access',
    submittedOn: 'Submitted on',
    approve: 'Approve',
    reject: 'Reject',
    approving: 'Approving...',
    rejecting: 'Rejecting...',
    microsoft: 'Microsoft 365',
    local: 'Local Account',
    personal: 'Personal',
    shared: 'Shared',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    successApprove: 'Request approved successfully',
    successReject: 'Request rejected successfully',
    errorApprove: 'Failed to approve request',
    errorReject: 'Failed to reject request',
  },
  ar: {
    title: 'طلبات الوصول للمنظمة',
    description: 'مراجعة وإدارة طلبات الوصول لمنظمتك',
    noRequests: 'لا توجد طلبات معلقة',
    noRequestsDesc: 'تم معالجة جميع طلبات الوصول لمنظمتك',
    organization: 'المنظمة',
    operatingUnit: 'الوحدة التشغيلية',
    authProvider: 'مزود المصادقة',
    accountType: 'نوع الحساب',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    jobTitle: 'المسمى الوظيفي',
    reason: 'سبب طلب الوصول',
    submittedOn: 'تم الإرسال في',
    approve: 'الموافقة',
    reject: 'الرفض',
    approving: 'جاري الموافقة...',
    rejecting: 'جاري الرفض...',
    microsoft: 'Microsoft 365',
    local: 'حساب محلي',
    personal: 'شخصي',
    shared: 'مشترك',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    pending: 'معلق',
    successApprove: 'تمت الموافقة على الطلب بنجاح',
    successReject: 'تم رفض الطلب بنجاح',
    errorApprove: 'فشل في الموافقة على الطلب',
    errorReject: 'فشل في رفض الطلب',
  },
};

export default function OrganizationAdminRequestsPage() {  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { user } = useAuth();
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // Fetch organization admin requests
  const { data: requests, isLoading, refetch } = trpc.ims.getOrganizationAdminRequests.useQuery(
    { organizationId: user?.organizationId || 0 },
    { enabled: !!user?.organizationId }
  );

  // Approve mutation
  const approveMutation = trpc.ims.approveAccessRequest.useMutation({
    onSuccess: () => {
      toast.success(t.successApprove);
      refetch();
    },
    onError: () => {
      toast.error(t.errorApprove);
    },
    onSettled: () => {
      setApprovingId(null);
    },
  });

  // Reject mutation
  const rejectMutation = trpc.ims.rejectAccessRequest.useMutation({
    onSuccess: () => {
      toast.success(t.successReject);
      refetch();
    },
    onError: () => {
      toast.error(t.errorReject);
    },
    onSettled: () => {
      setRejectingId(null);
    },
  });

  const handleApprove = async (requestId: number) => {
    setApprovingId(requestId);
    await approveMutation.mutateAsync({ requestId });
  };

  const handleReject = async (requestId: number) => {
    setRejectingId(requestId);
    await rejectMutation.mutateAsync({ requestId });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-green-100 text-green-800">{t.approved}</Badge>;
    } else if (status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800">{t.rejected}</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">{t.pending}</Badge>;
  };

  const getAuthProviderLabel = (provider: string) => {
    return provider === 'microsoft' ? t.microsoft : t.local;
  };

  const getAccountTypeLabel = (type: string) => {
    return type === 'personal' ? t.personal : t.shared;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-slate-600 mt-2">{t.description}</p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">{t.noRequests}</h3>
            <p className="text-sm text-slate-600 mt-1">{t.noRequestsDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-slate-600 mt-2">{t.description}</p>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{request.fullName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {request.workEmail}
                  </CardDescription>
                </div>
                {getStatusBadge(request.status)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Organization & Operating Unit */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 font-medium">{t.organization}</p>
                  <p className="text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {request.organizationName}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">{t.operatingUnit}</p>
                  <p className="text-slate-900">{request.operatingUnitName}</p>
                </div>
              </div>

              {/* Request Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 font-medium">{t.authProvider}</p>
                  <p className="text-slate-900">{getAuthProviderLabel(request.requestedAuthProvider)}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">{t.accountType}</p>
                  <p className="text-slate-900">{getAccountTypeLabel(request.requestedAccountType)}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium">{t.jobTitle}</p>
                  <p className="text-slate-900">{request.jobTitle}</p>
                </div>
                {request.phoneNumber && (
                  <div>
                    <p className="text-slate-600 font-medium">{t.phone}</p>
                    <p className="text-slate-900 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {request.phoneNumber}
                    </p>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <p className="text-slate-600 font-medium text-sm">{t.reason}</p>
                <p className="text-slate-900 text-sm mt-1">{request.reasonForAccess}</p>
              </div>

              {/* Submitted Date */}
              <div className="text-xs text-slate-500">
                {t.submittedOn} {new Date(request.createdAt).toLocaleString()}
              </div>

              {/* Action Buttons */}
              {request.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                    disabled={rejectingId === request.id || approvingId === request.id}
                    className="flex-1"
                  >
                    {rejectingId === request.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.rejecting}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        {t.reject}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={approvingId === request.id || rejectingId === request.id}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {approvingId === request.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.approving}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t.approve}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
