/**
 * Vendor Management Page
 * Manage suppliers, contractors, and service providers
 * Features: CRUD, Import/Export, Bank Details, Payment Terms, RTL/LTR support
 */

import { BackButton } from "@/components/BackButton";
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Dialog,
 DialogContent,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VendorFormWizard from '@/components/VendorFormWizard';
import VendorCreateForm from '@/components/VendorCreateForm';
import { toast } from 'sonner';
import {
 ArrowLeft, ArrowRight,
 Plus,
 Pencil,
 Trash2,
 Search,
 Building2,
 Users,
 Phone,
 Mail,
 MapPin,
 CreditCard,
 FileText,
 Loader2,
 Download,
 Upload,
 Eye,
 MoreHorizontal,
 ShieldCheck,
 ShieldAlert,
 ShieldX,
} from 'lucide-react';
import { Link } from 'wouter';
import { useTranslation } from '@/i18n/useTranslation';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Translations
const vendorTypeOptions = [
 { value: 'supplier', labelEn: 'Supplier', labelAr: 'مورد' },
 { value: 'contractor', labelEn: 'Contractor', labelAr: 'مقاول' },
 { value: 'service_provider', labelEn: 'Service Provider', labelAr: 'مقدم خدمات' },
 { value: 'consultant', labelEn: 'Consultant', labelAr: 'استشاري' },
 { value: 'other', labelEn: 'Other', labelAr: 'أخرى' },
];

const paymentMethodOptions = [
 { value: 'bank_transfer', labelEn: 'Bank Transfer', labelAr: 'تحويل بنكي' },
 { value: 'check', labelEn: 'Check', labelAr: 'شيك' },
 { value: 'cash', labelEn: 'Cash', labelAr: 'نقدي' },
 { value: 'credit_card', labelEn: 'Credit Card', labelAr: 'بطاقة ائتمان' },
];

const statusOptions = [
 { value: 'active', labelEn: 'Active', labelAr: 'نشط' },
 { value: 'inactive', labelEn: 'Inactive', labelAr: 'غير نشط' },
 { value: 'blocked', labelEn: 'Blocked', labelAr: 'محظور' },
];

const initialVendorForm = {
 vendorCode: '',
 name: '',
 vendorType: 'supplier',
 taxId: '',
 registrationNumber: '',
 contactPerson: '',
 email: '',
 phone: '',
 website: '',
 address: '',
 addressAr: '',
 city: '',
 country: '',
 postalCode: '',
 bankName: '',
 bankBranch: '',
 accountNumber: '',
 iban: '',
 swiftCode: '',
 accountHolderName: '',
 paymentMethod: 'bank_transfer',
 paymentDays: 30,
 creditLimit: 0,
 currency: 'USD',
 notes: '',
 status: 'active',
};

interface VendorListProps {
 vendorType?: 'supplier' | 'contractor' | 'service_provider';
}

export default function VendorList({
 vendorType: initialVendorType }: VendorListProps = {}) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const { selectedOrganization, selectedOperatingUnit } = useOrganization();
 const organizationId = selectedOrganization?.id || 0;
 const operatingUnitId = selectedOperatingUnit?.id;

 // State
 const [activeTab, setActiveTab] = useState(initialVendorType || 'all');
 const [searchQuery, setSearchQuery] = useState('');
 const [showVendorDialog, setShowVendorDialog] = useState(false);
 const [showDetailDialog, setShowDetailDialog] = useState(false);
 const [editingVendor, setEditingVendor] = useState<any>(null);
 const [selectedVendor, setSelectedVendor] = useState<any>(null);
 const [vendorForm, setVendorForm] = useState(initialVendorForm);
 const [formStep, setFormStep] = useState(1); // Multi-step wizard: 1=Basic, 2=Bank, 3=Payment

 // Handle URL query params (action=create, vendorType=supplier|service_provider)
 useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const vendorTypeParam = params.get('vendorType');
  if (action === 'create') {
   // Set vendor type tab if specified
   if (vendorTypeParam && ['supplier', 'contractor', 'service_provider'].includes(vendorTypeParam)) {
    setActiveTab(vendorTypeParam);
    setVendorForm(prev => ({ ...prev, vendorType: vendorTypeParam }));
   }
   // Open the creation dialog
   setShowVendorDialog(true);
   // Clean up URL params so refresh doesn't re-open
   window.history.replaceState({}, '', window.location.pathname);
  }
 }, []);

 // Queries
 const vendorsQuery = trpc.vendors.list.useQuery(
 {
 vendorType: activeTab !== 'all' ? activeTab : undefined,
 search: searchQuery || undefined,
 limit: 100,
 }
 );

 // Batch-fetch qualification statuses for all displayed vendors
 const displayedVendorIds = useMemo(() => {
 return (vendorsQuery.data?.vendors || []).map((v: any) => v.id as number);
 }, [vendorsQuery.data]);

 const { data: qualificationMap = {} } = trpc.vendors.getQualificationBatch.useQuery(
 { vendorIds: displayedVendorIds },
 { enabled: displayedVendorIds.length > 0 }
 );

 const getQualBadge = (vendorId: number) => {
 const qual = (qualificationMap as any)[vendorId];
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

 // Mutations
 const createVendorMutation = trpc.vendors.create.useMutation({
 onSuccess: () => {
 toast.success(t.vendorList.createSuccess);
 setShowVendorDialog(false);
 vendorsQuery.refetch();
 resetForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateVendorMutation = trpc.vendors.update.useMutation({
 onSuccess: () => {
 toast.success(t.vendorList.updateSuccess);
 setShowVendorDialog(false);
 vendorsQuery.refetch();
 resetForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteVendorMutation = trpc.vendors.delete.useMutation({
 onSuccess: () => {
 toast.success(t.vendorList.deleteSuccess);
 vendorsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const resetForm = () => {
 setVendorForm(initialVendorForm);
 setEditingVendor(null);
 };

 const handleCreateVendor = () => {
 resetForm();
 setFormStep(1); // Reset to first step
 setShowVendorDialog(true);
 };

 const handleEditVendor = (vendor: any) => {
 setEditingVendor(vendor);
 setVendorForm({
 vendorCode: vendor.vendorCode || '',
 name: vendor.name || '',
 vendorType: vendor.vendorType || 'supplier',
 taxId: vendor.taxId || '',
 registrationNumber: vendor.registrationNumber || '',
 contactPerson: vendor.contactPerson || '',
 email: vendor.email || '',
 phone: vendor.phone || '',
 website: vendor.website || '',
 address: vendor.address || '',
 addressAr: vendor.addressAr || '',
 city: vendor.city || '',
 country: vendor.country || '',
 postalCode: vendor.postalCode || '',
 bankName: vendor.bankName || '',
 bankBranch: vendor.bankBranch || '',
 accountNumber: vendor.accountNumber || '',
 iban: vendor.iban || '',
 swiftCode: vendor.swiftCode || '',
 accountHolderName: vendor.accountHolderName || '',
 paymentMethod: vendor.paymentMethod || 'bank_transfer',
 paymentDays: vendor.paymentDays || 30,
 creditLimit: vendor.creditLimit || 0,
 currency: vendor.currency || 'USD',
 notes: vendor.notes || '',
 status: vendor.status || 'active',
 });
 setShowVendorDialog(true);
 };

 const navigate = useNavigate();
 const handleViewVendor = (vendor: any) => {
 navigate(`/organization/logistics/vendors/${vendor.id}`);
 };

 const handleDeleteVendor = (id: number) => {
 if (confirm(t.vendorList.confirmDelete)) {
 deleteVendorMutation.mutate({ id });
 }
 };

 // Generate vendor code based on type
 const generateVendorCode = async (vendorType: string): Promise<string> => {
 const prefix = vendorType === 'supplier' ? 'SUP' : vendorType === 'contractor' ? 'CON' : 'SRV';
 const vendors = vendorsQuery.data?.vendors || [];
 const existingCodes = vendors
 .filter((v: any) => v.vendorCode?.startsWith(prefix))
 .map((v: any) => {
 const match = v.vendorCode.match(/\d+$/);
 return match ? parseInt(match[0], 10) : 0;
 });
 const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
 const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
 return `${prefix}-${nextNumber}`;
 };

 const handleSaveVendor = (formData: any) => {
 console.log('VendorList handleSaveVendor called with formData:', formData);
 
 if (editingVendor) {
 updateVendorMutation.mutate({ id: editingVendor.id, ...formData });
 } else {
 createVendorMutation.mutate(formData);
 }
 };

 const getVendorTypeLabel = (type: string) => {
 const option = vendorTypeOptions.find(o => o.value === type);
 return language === 'ar' ? option?.labelAr : option?.labelEn;
 };

 const getStatusBadge = (status: string) => {
 const statusColors: Record<string, string> = {
 active: 'bg-green-100 text-green-800',
 inactive: 'bg-gray-100 text-gray-800',
 blocked: 'bg-red-100 text-red-800',
 };
 const option = statusOptions.find(o => o.value === status);
 const label = language === 'ar' ? option?.labelAr : option?.labelEn;
 return <Badge className={statusColors[status] || 'bg-gray-100'}>{label}</Badge>;
 };

 // Statistics
 const stats = useMemo(() => {
 const vendors = vendorsQuery.data?.vendors || [];
 return {
 total: vendors.length,
 active: vendors.filter((v: any) => v.isActive).length,
 };
 }, [vendorsQuery.data]);

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <Link href="/organization/logistics/vendors">
 <BackButton label={t.vendorList.backToLogistics} />
 </Link>
 </div>
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground">
 {initialVendorType === 'supplier' ? t.vendorList.suppliersList :
 initialVendorType === 'contractor' ? t.vendorList.contractorsList :
 initialVendorType === 'service_provider' ? t.vendorList.serviceProvidersList :
 t.vendorList.title}
 </h1>
 <p className="text-muted-foreground mt-1">
 {initialVendorType === 'supplier' ? t.vendorList.suppliersSubtitle :
 initialVendorType === 'contractor' ? t.vendorList.contractorsSubtitle :
 initialVendorType === 'service_provider' ? t.vendorList.serviceProvidersSubtitle :
 t.vendorList.subtitle}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline">
 <Upload className="h-4 w-4 me-2" />
 {t.vendorList.import}
 </Button>
 <Button variant="outline">
 <Download className="h-4 w-4 me-2" />
 {t.vendorList.export}
 </Button>
 <Button onClick={handleCreateVendor}>
 <Plus className="h-4 w-4 me-2" />
 {initialVendorType === 'supplier' ? t.vendorList.newSupplier :
 initialVendorType === 'contractor' ? t.vendorList.newContractor :
 initialVendorType === 'service_provider' ? t.vendorList.newServiceProvider :
 t.vendorList.newVendor}
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="container py-8">
 {/* Statistics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.vendorList.totalVendors}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{stats.total}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.vendorList.activeVendors}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">{stats.active}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.vendorList.totalPayables}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">$0.00</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.vendorList.pendingPayments}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-yellow-600">0</div>
 </CardContent>
 </Card>
 </div>

 {/* Tabs and Search */}
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <div className="flex items-center justify-between mb-4">
 {/* Only show tabs if no vendorType prop (i.e., not filtering by category) */}
 {!initialVendorType && (
 <TabsList>
 <TabsTrigger value="all" className="flex items-center gap-2">
 <Building2 className="h-4 w-4" />
 {t.vendorList.allVendors}
 </TabsTrigger>
 <TabsTrigger value="supplier" className="flex items-center gap-2">
 {t.vendorList.suppliers}
 </TabsTrigger>
 <TabsTrigger value="contractor" className="flex items-center gap-2">
 {t.vendorList.contractors}
 </TabsTrigger>
 <TabsTrigger value="service_provider" className="flex items-center gap-2">
 {t.vendorList.serviceProviders}
 </TabsTrigger>
 </TabsList>
 )}
 <div className="relative w-64">
 <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.vendorList.search}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-10"
 />
 </div>
 </div>

 <TabsContent value={activeTab}>
 <Card>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.vendorList.vendorCode}</TableHead>
 <TableHead>{t.vendorList.vendorName}</TableHead>
 <TableHead>{t.vendorList.vendorType}</TableHead>
 <TableHead>{t.vendorList.contactPerson}</TableHead>
 <TableHead>{t.vendorList.phone}</TableHead>
 <TableHead>{t.vendorList.email}</TableHead>
 <TableHead>{t.vendorList.status}</TableHead>
 <TableHead>{isRTL ? 'التأهيل' : 'Qualification'}</TableHead>
 <TableHead className="w-[100px]"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {vendorsQuery.isLoading ? (
 <TableRow>
 <TableCell colSpan={9} className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto" />
 </TableCell>
 </TableRow>
 ) : !vendorsQuery.data?.vendors?.length ? (
 <TableRow>
 <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
 {t.vendorList.noData}
 </TableCell>
 </TableRow>
 ) : (
 vendorsQuery.data.vendors.map((vendor: any) => (
 <TableRow key={vendor.id}>
 <TableCell className="font-mono">{vendor.vendorCode}</TableCell>
 <TableCell>
 <div>
 <div className="font-medium">{vendor.name}</div>
 </div>
 </TableCell>
 <TableCell>{getVendorTypeLabel(vendor.vendorType)}</TableCell>
 <TableCell>{vendor.contactPerson || '-'}</TableCell>
 <TableCell>{vendor.phone || '-'}</TableCell>
 <TableCell>{vendor.email || '-'}</TableCell>
 <TableCell>{getStatusBadge(vendor.status)}</TableCell>
 <TableCell>{getQualBadge(vendor.id)}</TableCell>
 <TableCell>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon">
 <MoreHorizontal className="h-4 w-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align={'end'}>
 <DropdownMenuItem onClick={() => handleViewVendor(vendor)}>
 <Eye className="h-4 w-4 me-2" />
 {t.vendorList.viewDetails}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => handleEditVendor(vendor)}>
 <Pencil className="h-4 w-4 me-2" />
 {t.vendorList.update}
 </DropdownMenuItem>
 <DropdownMenuItem 
 onClick={() => handleDeleteVendor(vendor.id)}
 className="text-destructive"
 >
 <Trash2 className="h-4 w-4 me-2" />
 {t.vendorList.delete}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>
 </TabsContent>
 </Tabs>
 </div>

 {/* Vendor Form Dialog */}
 <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {editingVendor ? t.vendorList.editVendor :
 initialVendorType === 'supplier' ? t.vendorList.newSupplier :
 initialVendorType === 'contractor' ? t.vendorList.newContractor :
 initialVendorType === 'service_provider' ? t.vendorList.newServiceProvider :
 t.vendorList.newVendor}
 </DialogTitle>
 </DialogHeader>
 {editingVendor ? (
 <VendorFormWizard
 initialData={vendorForm}
 vendorType={initialVendorType}
 isRTL={isRTL}
 language={language}
 translations={t}
 vendorTypeOptions={vendorTypeOptions}
 onSubmit={handleSaveVendor}
 onCancel={() => setShowVendorDialog(false)}
 isSubmitting={updateVendorMutation.isPending}
 isEditing={true}
 />
 ) : (
 <VendorCreateForm
 vendorType={initialVendorType}
 isRTL={isRTL}
 language={language}
 translations={t}
 vendorTypeOptions={vendorTypeOptions}
 onSubmit={handleSaveVendor}
 onCancel={() => setShowVendorDialog(false)}
 isSubmitting={createVendorMutation.isPending}
 generateVendorCode={generateVendorCode}
 />
 )}
 </DialogContent>
 </Dialog>

 {/* Vendor Detail Dialog */}
 <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{t.vendorList.viewDetails}</DialogTitle>
 </DialogHeader>
 {selectedVendor && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorList.vendorCode}</Label>
 <p className="font-mono">{selectedVendor.vendorCode}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.vendorType}</Label>
 <p>{getVendorTypeLabel(selectedVendor.vendorType)}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.vendorName}</Label>
 <p>{selectedVendor.name}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.status}</Label>
 <p>{getStatusBadge(selectedVendor.status)}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.contactPerson}</Label>
 <p>{selectedVendor.contactPerson || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.email}</Label>
 <p>{selectedVendor.email || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.phone}</Label>
 <p>{selectedVendor.phone || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.taxId}</Label>
 <p>{selectedVendor.taxId || '-'}</p>
 </div>
 </div>
 
 {selectedVendor.bankName && (
 <div className="border-t pt-4">
 <h4 className="font-medium mb-2">{t.vendorList.bankDetails}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorList.bankName}</Label>
 <p>{selectedVendor.bankName}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.accountNumber}</Label>
 <p>{selectedVendor.accountNumber || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.iban}</Label>
 <p>{selectedVendor.iban || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorList.swiftCode}</Label>
 <p>{selectedVendor.swiftCode || '-'}</p>
 </div>
 </div>
 </div>
 )}
 </div>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
 {t.vendorList.cancel}
 </Button>
 <Button onClick={() => { setShowDetailDialog(false); handleEditVendor(selectedVendor); }}>
 {t.vendorList.update}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
