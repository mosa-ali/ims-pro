/**
 * Finance Vendor Detail — Read-Only Mirror
 * 
 * Displays vendor details from the Logistics Vendor Master in read-only mode.
 * Navigates back to Finance vendor routes.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Lock,
  Globe,
  Landmark,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import { Link, useParams } from 'wouter';
import { BackButton } from "@/components/BackButton";

export default function FinanceVendorDetail() {
  const { isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
  const params = useParams<{ id: string }>();
  const vendorId = parseInt(params.id || '0', 10);

  const vendorQuery = trpc.vendors.getById.useQuery(
    { id: vendorId },
    { enabled: !!vendorId && !!currentOrganization?.id }
  );

  const vendor = vendorQuery.data;

  // Qualification status
  const qualQuery = trpc.vendors.getQualificationBatch.useQuery(
    { vendorIds: [vendorId] },
    { enabled: !!vendorId }
  );
  const qual = (qualQuery.data as any)?.[vendorId];

  const getQualBadge = () => {
    if (!qual) {
      return <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-muted"><ShieldAlert className="h-3 w-3" />{isRTL ? 'غير مقيّم' : 'Not Evaluated'}</Badge>;
    }
    const status = qual.qualificationStatus;
    if (status === 'qualified') {
      return <Badge className="text-xs gap-1 bg-green-100 text-green-800 border-green-200"><ShieldCheck className="h-3 w-3" />{isRTL ? 'مؤهل' : 'Qualified'}</Badge>;
    }
    if (status === 'conditional') {
      return <Badge className="text-xs gap-1 bg-yellow-100 text-yellow-800 border-yellow-200"><ShieldAlert className="h-3 w-3" />{isRTL ? 'مشروط' : 'Conditional'}</Badge>;
    }
    return <Badge className="text-xs gap-1 bg-red-100 text-red-800 border-red-200"><ShieldX className="h-3 w-3" />{isRTL ? 'غير مؤهل' : 'Not Qualified'}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-green-100 text-green-800">{isRTL ? 'نشط' : 'Active'}</Badge>;
    if (status === 'inactive') return <Badge className="bg-gray-100 text-gray-800">{isRTL ? 'غير نشط' : 'Inactive'}</Badge>;
    if (status === 'blocked') return <Badge className="bg-red-100 text-red-800">{isRTL ? 'محظور' : 'Blocked'}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getVendorTypeLabel = (type: string) => {
    if (type === 'supplier') return isRTL ? 'مورد' : 'Supplier';
    if (type === 'contractor') return isRTL ? 'مقاول' : 'Contractor';
    if (type === 'service_provider') return isRTL ? 'مزود خدمة' : 'Service Provider';
    return type;
  };

  if (vendorQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="border-b bg-card">
          <div className="container py-6">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/organization/finance/vendors">
                <BackButton label={isRTL ? 'العودة لإدارة الموردين' : 'Back to Vendor Management'} />
              </Link>
            </div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="container py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{isRTL ? 'المورد غير موجود' : 'Vendor Not Found'}</h2>
            <p className="text-muted-foreground mb-4">{isRTL ? 'لم يتم العثور على المورد المطلوب' : 'The requested vendor could not be found'}</p>
            <Link href="/organization/finance/vendors">
              <a className="text-primary hover:underline">{isRTL ? 'العودة لإدارة الموردين' : 'Back to Vendor Management'}</a>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/organization/finance/vendors">
              <BackButton label={isRTL ? 'العودة لإدارة الموردين' : 'Back to Vendor Management'} />
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{vendor.name}</h1>
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                  <Lock className="h-3 w-3" />
                  {isRTL ? 'للقراءة فقط' : 'Read-Only'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="font-mono">{vendor.vendorCode}</Badge>
                <Badge variant="outline" className="capitalize">{getVendorTypeLabel(vendor.vendorType)}</Badge>
                {getStatusBadge(vendor.status || (vendor.isActive ? 'active' : 'inactive'))}
                {getQualBadge()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={FileText} label={isRTL ? 'كود المورد' : 'Vendor Code'} value={vendor.vendorCode} />
              <InfoRow icon={Building2} label={isRTL ? 'الاسم' : 'Name'} value={vendor.name} />
              <InfoRow icon={FileText} label={isRTL ? 'الرقم الضريبي' : 'Tax ID'} value={vendor.taxId} />
              <InfoRow icon={FileText} label={isRTL ? 'رقم التسجيل' : 'Registration Number'} value={vendor.registrationNumber} />
              <InfoRow icon={Globe} label={isRTL ? 'الموقع الإلكتروني' : 'Website'} value={vendor.website} />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {isRTL ? 'معلومات الاتصال' : 'Contact Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={User} label={isRTL ? 'جهة الاتصال' : 'Contact Person'} value={vendor.contactPerson} />
              <InfoRow icon={Mail} label={isRTL ? 'البريد الإلكتروني' : 'Email'} value={vendor.email} />
              <InfoRow icon={Phone} label={isRTL ? 'الهاتف' : 'Phone'} value={vendor.phone} />
              <InfoRow icon={MapPin} label={isRTL ? 'العنوان' : 'Address'} value={vendor.address} />
              <InfoRow icon={MapPin} label={isRTL ? 'المدينة' : 'City'} value={vendor.city} />
              <InfoRow icon={MapPin} label={isRTL ? 'البلد' : 'Country'} value={vendor.country} />
            </CardContent>
          </Card>

          {/* Banking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                {isRTL ? 'المعلومات البنكية' : 'Banking Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={Landmark} label={isRTL ? 'اسم البنك' : 'Bank Name'} value={vendor.bankName} />
              <InfoRow icon={Landmark} label={isRTL ? 'فرع البنك' : 'Bank Branch'} value={vendor.bankBranch} />
              <InfoRow icon={CreditCard} label={isRTL ? 'رقم الحساب' : 'Account Number'} value={vendor.accountNumber} />
              <InfoRow icon={CreditCard} label={isRTL ? 'رقم IBAN' : 'IBAN'} value={vendor.iban} />
              <InfoRow icon={CreditCard} label={isRTL ? 'رمز SWIFT' : 'SWIFT Code'} value={vendor.swiftCode} />
              <InfoRow icon={User} label={isRTL ? 'اسم صاحب الحساب' : 'Account Holder'} value={vendor.accountHolderName} />
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {isRTL ? 'معلومات الدفع' : 'Payment Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={CreditCard} label={isRTL ? 'طريقة الدفع' : 'Payment Method'} value={vendor.paymentMethod} />
              <InfoRow icon={FileText} label={isRTL ? 'أيام الدفع' : 'Payment Days'} value={vendor.paymentDays?.toString()} />
              <InfoRow icon={FileText} label={isRTL ? 'حد الائتمان' : 'Credit Limit'} value={vendor.creditLimit ? `$${Number(vendor.creditLimit).toLocaleString()}` : null} />
              <InfoRow icon={FileText} label={isRTL ? 'العملة' : 'Currency'} value={vendor.currency} />
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {vendor.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {isRTL ? 'ملاحظات' : 'Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vendor.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Data Source Notice */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 mt-6">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {isRTL ? 'مصدر البيانات: السجل الرئيسي للموردين — الخدمات اللوجستية' : 'Data Source: Logistics Vendor Master'}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {isRTL
                    ? 'لتعديل بيانات هذا المورد، يرجى استخدام إدارة الموردين في الخدمات اللوجستية.'
                    : 'To edit this vendor\'s data, please use Vendor Management in Logistics.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
