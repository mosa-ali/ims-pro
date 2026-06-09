/**
 * Vendor Detail Workspace Page with Inline Editing
 * 
 * Full workspace page for viewing and editing a single vendor's details inline.
 * 
 * Route: /organization/logistics/vendors/:id
 * 
 * Features:
 * - Vendor info header with status badge
 * - Tabs: General Info, Bank Details, Payment Terms
 * - Inline editing - click Edit to enable edit mode on current tab
 * - Save/Cancel buttons when in edit mode
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
 ArrowLeft, ArrowRight, Building2, User, Mail, Phone, Globe,
 MapPin, CreditCard, DollarSign, Clock, Loader2, Pencil, Save, X,
 ClipboardCheck, CheckCircle2, AlertTriangle, XCircle, Star
} from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// TRANSLATIONS
// ============================================================================
// ============================================================================
// INFO FIELD COMPONENT (Read-only)
// ============================================================================
interface InfoFieldProps {
 label: string;
 value?: string | null;
 icon?: React.ElementType;
}

function InfoField({ label, value, icon: Icon }: InfoFieldProps) {
 return (
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
 <div className="flex items-center gap-2 text-sm">
 {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
 <span>{value || "—"}</span>
 </div>
 </div>
 );
}

// ============================================================================
// EDITABLE FIELD COMPONENT
// ============================================================================
interface EditableFieldProps {
 label: string;
 value: string;
 onChange: (value: string) => void;
 icon?: React.ElementType;
 type?: string;
 placeholder?: string;
}

function EditableField({ label, value, onChange, icon: Icon, type = "text", placeholder }: EditableFieldProps) {
 return (
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
 <div className="flex items-center gap-2">
 {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
 <Input
 type={type}
 value={value || ""}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder}
 className="flex-1"
 />
 </div>
 </div>
 );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function VendorDetail() {
 const { t } = useTranslation();
 const { id } = useParams();
 const vendorId = parseInt(id || "0", 10);
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
 const { currentOrganization } = useOrganization();
 

 const [activeTab, setActiveTab] = useState("general");
 const [isEditing, setIsEditing] = useState(false);
 const [formData, setFormData] = useState<any>({});

 // Fetch vendor data
 const { data: vendor, isLoading, refetch } = trpc.vendors.getById.useQuery(
 { id: vendorId },
 { enabled: vendorId > 0 }
 );

 // Update mutation
 const updateMutation = trpc.vendors.update.useMutation({
 onSuccess: () => {
 toast.success(t.vendorDetail.updateSuccess);
 setIsEditing(false);
 refetch();
 },
 onError: (error) => {
 toast.error(t.vendorDetail.updateError + ": " + error.message);
 },
 });

 // Initialize form data when vendor loads
 useEffect(() => {
 if (vendor) {
 setFormData({
 name: vendor.name || "",
 nameAr: vendor.nameAr || "",
 vendorType: vendor.vendorType || "",
 status: vendor.status || "active",
 taxId: vendor.taxId || "",
 registrationNumber: vendor.registrationNumber || "",
 contactPerson: vendor.contactPerson || "",
 email: vendor.email || "",
 phone: vendor.phone || "",
 mobile: vendor.mobile || "",
 fax: vendor.fax || "",
 website: vendor.website || "",
 addressLine1: vendor.addressLine1 || "",
 addressLine2: vendor.addressLine2 || "",
 city: vendor.city || "",
 state: vendor.state || "",
 country: vendor.country || "",
 postalCode: vendor.postalCode || "",
 bankName: vendor.bankName || "",
 bankBranch: vendor.bankBranch || "",
 accountNumber: vendor.accountNumber || "",
 iban: vendor.iban || "",
 swiftCode: vendor.swiftCode || "",
 accountHolderName: vendor.accountHolderName || "",
 paymentMethod: vendor.paymentMethod || "",
 paymentDays: vendor.paymentDays || "",
 creditLimit: vendor.creditLimit || "",
 currency: vendor.currency || "USD",
 notes: vendor.notes || "",
 });
 }
 }, [vendor]);

 const handleSave = () => {
 if (!vendor) return;
 
 updateMutation.mutate({
 id: vendor.id,
 ...formData,
 });
 };

 const handleCancel = () => {
 setIsEditing(false);
 // Reset form data to original vendor data
 if (vendor) {
 setFormData({
 name: vendor.name || "",
 nameAr: vendor.nameAr || "",
 vendorType: vendor.vendorType || "",
 status: vendor.status || "active",
 taxId: vendor.taxId || "",
 registrationNumber: vendor.registrationNumber || "",
 contactPerson: vendor.contactPerson || "",
 email: vendor.email || "",
 phone: vendor.phone || "",
 mobile: vendor.mobile || "",
 fax: vendor.fax || "",
 website: vendor.website || "",
 addressLine1: vendor.addressLine1 || "",
 addressLine2: vendor.addressLine2 || "",
 city: vendor.city || "",
 state: vendor.state || "",
 country: vendor.country || "",
 postalCode: vendor.postalCode || "",
 bankName: vendor.bankName || "",
 bankBranch: vendor.bankBranch || "",
 accountNumber: vendor.accountNumber || "",
 iban: vendor.iban || "",
 swiftCode: vendor.swiftCode || "",
 accountHolderName: vendor.accountHolderName || "",
 paymentMethod: vendor.paymentMethod || "",
 paymentDays: vendor.paymentDays || "",
 creditLimit: vendor.creditLimit || "",
 currency: vendor.currency || "USD",
 notes: vendor.notes || "",
 });
 }
 };

 const getStatusBadge = (status: string) => {
 const statusColors: Record<string, string> = {
 active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
 inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
 blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
 };
 const label = t[status as keyof typeof t] || status;
 return <Badge className={statusColors[status] || "bg-gray-100"}>{label}</Badge>;
 };

 const getTypeLabel = (type: string) => {
 return (t as any)[type] || type;
 };

 const getPaymentMethodLabel = (method: string) => {
 return (t as any)[method] || method;
 };

 const formatCurrency = (amount: string | number, currency: string = "USD") => {
 const num = typeof amount === "string" ? parseFloat(amount) : amount;
 return new Intl.NumberFormat(t.logistics?.enus || 'en-US', {
 style: "currency",
 currency,
 }).format(num || 0);
 };

 // Loading state
 if (isLoading) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center space-y-3">
 <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
 <p className="text-muted-foreground">{t.vendorDetail.loading}</p>
 </div>
 </div>
 </div>
 );
 }

 // Not found state
 if (!vendor) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
 <Building2 className="h-16 w-16 text-muted-foreground" />
 <h2 className="text-xl font-semibold">{t.vendorDetail.notFound}</h2>
 <p className="text-muted-foreground">{t.vendorDetail.notFoundDesc}</p>
 <BackButton onClick={() => navigate("/organization/logistics/vendors")} label={t.vendorDetail.goBack} />
 </div>
 </div>
 );
 }

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Back Button & Header */}
 <div>
 <BackButton onClick={() => navigate("/organization/logistics/vendors")} label={t.vendorDetail.backToVendors} />
 <div className="flex items-start justify-between">
 <div className="text-start">
 <h1 className="text-2xl font-bold tracking-tight">
 {isRTL && vendor.nameAr ? vendor.nameAr : vendor.name}
 </h1>
 <div className="flex items-center gap-3 mt-2 text-muted-foreground">
 <span className="font-mono text-sm">{vendor.vendorCode}</span>
 <span>•</span>
 <span>{getTypeLabel(vendor.vendorType)}</span>
 <span>•</span>
 {getStatusBadge(vendor.status)}
 </div>
 </div>
 <div className="flex gap-2">
 {isEditing ? (
 <>
 <Button
 variant="outline"
 onClick={handleCancel}
 disabled={updateMutation.isPending}
 >
 <X className="h-4 w-4 me-2" />
 {t.vendorDetail.cancel}
 </Button>
 <Button
 onClick={handleSave}
 disabled={updateMutation.isPending}
 >
 {updateMutation.isPending ? (
 <>
 <Loader2 className="h-4 w-4 me-2 animate-spin" />
 {t.vendorDetail.saving}
 </>
 ) : (
 <>
 <Save className="h-4 w-4 me-2" />
 {t.vendorDetail.save}
 </>
 )}
 </Button>
 </>
 ) : (
 <Button
 variant="outline"
 onClick={() => setIsEditing(true)}
 >
 <Pencil className="h-4 w-4 me-2" />
 {t.vendorDetail.edit}
 </Button>
 )}
 </div>
 </div>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList>
 <TabsTrigger value="general" className="flex items-center gap-2">
 <Building2 className="h-4 w-4" />
 {t.vendorDetail.generalInfo}
 </TabsTrigger>
 <TabsTrigger value="bank" className="flex items-center gap-2">
 <CreditCard className="h-4 w-4" />
 {t.vendorDetail.bankDetails}
 </TabsTrigger>
 <TabsTrigger value="payment-terms" className="flex items-center gap-2">
 <DollarSign className="h-4 w-4" />
 {t.vendorDetail.paymentTerms}
 </TabsTrigger>
 <TabsTrigger value="qualification" className="flex items-center gap-2">
 <ClipboardCheck className="h-4 w-4" />
 {isRTL ? 'التأهيل' : 'Qualification'}
 </TabsTrigger>
 </TabsList>

 {/* General Information Tab */}
 <TabsContent value="general" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.vendorDetail.generalInfo}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <InfoField label={t.vendorDetail.vendorCode} value={vendor.vendorCode} />
 {isEditing ? (
 <>
 <EditableField
 label={t.vendorDetail.vendorName}
 value={formData.name}
 onChange={(value) => setFormData({ ...formData, name: value })}
 icon={Building2}
 />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.vendorDetail.vendorType}</Label>
 <Select
 value={formData.vendorType}
 onValueChange={(value) => setFormData({ ...formData, vendorType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="supplier">{t.vendorDetail.supplier}</SelectItem>
 <SelectItem value="contractor">{t.vendorDetail.contractor}</SelectItem>
 <SelectItem value="service_provider">{t.vendorDetail.service_provider}</SelectItem>
 <SelectItem value="consultant">{t.vendorDetail.consultant}</SelectItem>
 <SelectItem value="other">{t.vendorDetail.other}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.vendorDetail.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(value) => setFormData({ ...formData, status: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="active">{t.vendorDetail.active}</SelectItem>
 <SelectItem value="inactive">{t.vendorDetail.inactive}</SelectItem>
 <SelectItem value="blocked">{t.vendorDetail.blocked}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <EditableField
 label={t.vendorDetail.taxId}
 value={formData.taxId}
 onChange={(value) => setFormData({ ...formData, taxId: value })}
 />
 <EditableField
 label={t.vendorDetail.registrationNumber}
 value={formData.registrationNumber}
 onChange={(value) => setFormData({ ...formData, registrationNumber: value })}
 />
 </>
 ) : (
 <>
 <InfoField label={t.vendorDetail.vendorName} value={isRTL && vendor.nameAr ? vendor.nameAr : vendor.name} icon={Building2} />
 <InfoField label={t.vendorDetail.vendorType} value={getTypeLabel(vendor.vendorType)} />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.vendorDetail.status}</Label>
 <div>{getStatusBadge(vendor.status)}</div>
 </div>
 <InfoField label={t.vendorDetail.taxId} value={vendor.taxId} />
 <InfoField label={t.vendorDetail.registrationNumber} value={vendor.registrationNumber} />
 </>
 )}
 </div>
 <Separator className="my-6" />
 {/* Contact Information */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {isEditing ? (
 <>
 <EditableField
 label={t.vendorDetail.contactPerson}
 value={formData.contactPerson}
 onChange={(value) => setFormData({ ...formData, contactPerson: value })}
 icon={User}
 />
 <EditableField
 label={t.vendorDetail.email}
 value={formData.email}
 onChange={(value) => setFormData({ ...formData, email: value })}
 icon={Mail}
 type="email"
 />
 <EditableField
 label={t.vendorDetail.phone}
 value={formData.phone}
 onChange={(value) => setFormData({ ...formData, phone: value })}
 icon={Phone}
 />
 <EditableField
 label={t.vendorDetail.mobile}
 value={formData.mobile}
 onChange={(value) => setFormData({ ...formData, mobile: value })}
 icon={Phone}
 />
 <EditableField
 label={t.vendorDetail.fax}
 value={formData.fax}
 onChange={(value) => setFormData({ ...formData, fax: value })}
 />
 <EditableField
 label={t.vendorDetail.website}
 value={formData.website}
 onChange={(value) => setFormData({ ...formData, website: value })}
 icon={Globe}
 />
 </>
 ) : (
 <>
 <InfoField label={t.vendorDetail.contactPerson} value={vendor.contactPerson} icon={User} />
 <InfoField label={t.vendorDetail.email} value={vendor.email} icon={Mail} />
 <InfoField label={t.vendorDetail.phone} value={vendor.phone} icon={Phone} />
 <InfoField label={t.vendorDetail.mobile} value={vendor.mobile} icon={Phone} />
 <InfoField label={t.vendorDetail.fax} value={vendor.fax} />
 <InfoField label={t.vendorDetail.website} value={vendor.website} icon={Globe} />
 </>
 )}
 </div>
 <Separator className="my-6" />
 {/* Address Information */}
 <h4 className="font-semibold mb-4 flex items-center gap-2">
 <MapPin className="h-4 w-4" />
 {t.vendorDetail.addressInfo}
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {isEditing ? (
 <>
 <EditableField
 label={t.vendorDetail.addressLine1}
 value={formData.addressLine1}
 onChange={(value) => setFormData({ ...formData, addressLine1: value })}
 />
 <EditableField
 label={t.vendorDetail.addressLine2}
 value={formData.addressLine2}
 onChange={(value) => setFormData({ ...formData, addressLine2: value })}
 />
 <EditableField
 label={t.vendorDetail.city}
 value={formData.city}
 onChange={(value) => setFormData({ ...formData, city: value })}
 />
 <EditableField
 label={t.vendorDetail.state}
 value={formData.state}
 onChange={(value) => setFormData({ ...formData, state: value })}
 />
 <EditableField
 label={t.vendorDetail.country}
 value={formData.country}
 onChange={(value) => setFormData({ ...formData, country: value })}
 />
 <EditableField
 label={t.vendorDetail.postalCode}
 value={formData.postalCode}
 onChange={(value) => setFormData({ ...formData, postalCode: value })}
 />
 </>
 ) : (
 <>
 <InfoField label={t.vendorDetail.addressLine1} value={vendor.addressLine1} />
 <InfoField label={t.vendorDetail.addressLine2} value={vendor.addressLine2} />
 <InfoField label={t.vendorDetail.city} value={vendor.city} />
 <InfoField label={t.vendorDetail.state} value={vendor.state} />
 <InfoField label={t.vendorDetail.country} value={vendor.country} />
 <InfoField label={t.vendorDetail.postalCode} value={vendor.postalCode} />
 </>
 )}
 </div>
 {(vendor.notes || isEditing) && (
 <>
 <Separator className="my-6" />
 <div>
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.vendorDetail.notes}</Label>
 {isEditing ? (
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 className="mt-1"
 rows={3}
 />
 ) : (
 <p className="mt-1 text-sm whitespace-pre-wrap">{vendor.notes}</p>
 )}
 </div>
 </>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Bank Details Tab */}
 <TabsContent value="bank" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.vendorDetail.bankDetails}</CardTitle>
 </CardHeader>
 <CardContent>
 {vendor.bankName || isEditing ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {isEditing ? (
 <>
 <EditableField
 label={t.vendorDetail.bankName}
 value={formData.bankName}
 onChange={(value) => setFormData({ ...formData, bankName: value })}
 icon={Building2}
 />
 <EditableField
 label={t.vendorDetail.bankBranch}
 value={formData.bankBranch}
 onChange={(value) => setFormData({ ...formData, bankBranch: value })}
 />
 <EditableField
 label={t.vendorDetail.accountNumber}
 value={formData.accountNumber}
 onChange={(value) => setFormData({ ...formData, accountNumber: value })}
 icon={CreditCard}
 />
 <EditableField
 label={t.vendorDetail.iban}
 value={formData.iban}
 onChange={(value) => setFormData({ ...formData, iban: value })}
 placeholder="SA00 0000 0000 0000 0000 0000"
 />
 <EditableField
 label={t.vendorDetail.swiftCode}
 value={formData.swiftCode}
 onChange={(value) => setFormData({ ...formData, swiftCode: value })}
 placeholder="AAAA BB CC DDD"
 />
 <EditableField
 label={t.vendorDetail.accountHolderName}
 value={formData.accountHolderName}
 onChange={(value) => setFormData({ ...formData, accountHolderName: value })}
 />
 </>
 ) : (
 <>
 <InfoField label={t.vendorDetail.bankName} value={vendor.bankName} icon={Building2} />
 <InfoField label={t.vendorDetail.bankBranch} value={vendor.bankBranch} />
 <InfoField label={t.vendorDetail.accountNumber} value={vendor.accountNumber} icon={CreditCard} />
 <InfoField label={t.vendorDetail.iban} value={vendor.iban} />
 <InfoField label={t.vendorDetail.swiftCode} value={vendor.swiftCode} />
 <InfoField label={t.vendorDetail.accountHolderName} value={vendor.accountHolderName} />
 </>
 )}
 </div>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.vendorDetail.noBankDetails}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Payment Terms Tab */}
 <TabsContent value="payment-terms" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.vendorDetail.paymentTerms}</CardTitle>
 </CardHeader>
 <CardContent>
 {vendor.paymentMethod || vendor.paymentDays || vendor.creditLimit || isEditing ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {isEditing ? (
 <>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.vendorDetail.paymentMethod}</Label>
 <Select
 value={formData.paymentMethod}
 onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="bank_transfer">{t.vendorDetail.bank_transfer}</SelectItem>
 <SelectItem value="check">{t.vendorDetail.check}</SelectItem>
 <SelectItem value="cash">{t.vendorDetail.cash}</SelectItem>
 <SelectItem value="credit_card">{t.vendorDetail.credit_card}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <EditableField
 label={t.vendorDetail.paymentDays}
 value={formData.paymentDays}
 onChange={(value) => setFormData({ ...formData, paymentDays: value })}
 icon={Clock}
 type="number"
 placeholder="30"
 />
 <EditableField
 label={t.vendorDetail.creditLimit}
 value={formData.creditLimit}
 onChange={(value) => setFormData({ ...formData, creditLimit: value })}
 icon={CreditCard}
 type="number"
 placeholder="0.00"
 />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.vendorDetail.currency}</Label>
 <Select
 value={formData.currency}
 onValueChange={(value) => setFormData({ ...formData, currency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </>
 ) : (
 <>
 <InfoField
 label={t.vendorDetail.paymentMethod}
 value={vendor.paymentMethod ? getPaymentMethodLabel(vendor.paymentMethod) : null}
 icon={DollarSign}
 />
 <InfoField
 label={t.vendorDetail.paymentDays}
 value={vendor.paymentDays ? `${vendor.paymentDays}` : null}
 icon={Clock}
 />
 <InfoField
 label={t.vendorDetail.creditLimit}
 value={vendor.creditLimit ? formatCurrency(vendor.creditLimit, vendor.currency || "USD") : null}
 icon={CreditCard}
 />
 <InfoField
 label={t.vendorDetail.currency}
 value={vendor.currency}
 />
 </>
 )}
 </div>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.vendorDetail.noPaymentTerms}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 {/* Qualification Tab */}
 <TabsContent value="qualification" className="space-y-6 mt-4">
 <VendorQualificationTab vendorId={vendorId} isRTL={isRTL} />
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}

// ============================================================================
// VENDOR QUALIFICATION TAB (Inline in Vendor Detail)
// ============================================================================
function VendorQualificationTab({ vendorId, isRTL }: { vendorId: number; isRTL: boolean }) {
 const qualQuery = trpc.vendors.getQualification.useQuery(
 { vendorId },
 { enabled: vendorId > 0 }
 );

 const SECTIONS = [
 {
 label: isRTL ? 'القانونية والإدارية' : 'Legal & Administrative',
 max: 12,
 items: [
 { label: isRTL ? 'تسجيل الشركة' : 'Company Registration', key: 's1_companyRegistration', max: 2 },
 { label: isRTL ? 'البطاقة الضريبية' : 'Tax Card', key: 's1_taxCard', max: 2 },
 { label: isRTL ? 'بطاقة التأمين' : 'Insurance Card', key: 's1_insuranceCard', max: 2 },
 { label: isRTL ? 'الإقرارات الموقعة' : 'Signed Declarations', key: 's1_signedDeclarations', max: 3 },
 { label: isRTL ? 'فحص العقوبات' : 'Sanctions Screening', key: 's1_sanctionsScreening', max: 3 },
 ],
 totalKey: 'section1Total',
 },
 {
 label: isRTL ? 'الخبرة والقدرة التقنية' : 'Experience & Technical Capacity',
 max: 10,
 items: [
 { label: isRTL ? 'ملف الشركة' : 'Company Profile', key: 's2_companyProfile', max: 3 },
 { label: isRTL ? 'سنوات الخبرة' : 'Years of Experience', key: 's2_yearsExperience', max: 4 },
 { label: isRTL ? 'خبرة المنظمات' : 'I/NGO Experience', key: 's2_ingoExperience', max: 3 },
 ],
 totalKey: 'section2Total',
 },
 {
 label: isRTL ? 'التواجد التشغيلي' : 'Operational Presence',
 max: 2,
 items: [
 { label: isRTL ? 'التواجد الجغرافي' : 'Target Geography', key: 's3_targetGeography', max: 1 },
 { label: isRTL ? 'تفاصيل الحساب البنكي' : 'Bank Account Details', key: 's3_bankAccountDetails', max: 1 },
 ],
 totalKey: 'section3Total',
 },
 {
 label: isRTL ? 'المراجع' : 'References',
 max: 6,
 items: [
 { label: isRTL ? 'المراجع' : 'References', key: 's4_references', max: 6 },
 ],
 totalKey: 'section4Total',
 },
 ];

 if (qualQuery.isLoading) {
 return (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="h-6 w-6 animate-spin text-primary" />
 </div>
 );
 }

 const qual = qualQuery.data;

 if (!qual) {
 return (
 <Card>
 <CardContent className="py-12 text-center">
 <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
 <p className="text-muted-foreground mb-4">
 {isRTL ? 'لم يتم تقييم تأهيل هذا المورد بعد' : 'No qualification evaluation has been completed for this vendor yet.'}
 </p>
 <Button variant="outline" asChild>
 <a href="/organization/logistics/evaluation-performance/checklist">
 <ClipboardCheck className="h-4 w-4 me-2" />
 {isRTL ? 'إجراء تقييم التأهيل' : 'Conduct Qualification Evaluation'}
 </a>
 </Button>
 </CardContent>
 </Card>
 );
 }

 const totalScore = Number(qual.totalScore) || 0;
 const status = qual.qualificationStatus;
 const statusConfig = {
 qualified: { label: isRTL ? 'مؤهل' : 'Qualified', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle2 },
 conditional: { label: isRTL ? 'مشروط' : 'Conditional', color: 'text-yellow-700', bg: 'bg-yellow-50', icon: AlertTriangle },
 not_qualified: { label: isRTL ? 'غير مؤهل' : 'Not Qualified', color: 'text-red-700', bg: 'bg-red-50', icon: XCircle },
 pending: { label: isRTL ? 'معلق' : 'Pending', color: 'text-gray-700', bg: 'bg-gray-50', icon: Clock },
 };
 const sc = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
 const StatusIcon = sc.icon;

 return (
 <div className="space-y-6">
 {/* Summary Card */}
 <Card className={`${sc.bg} border-2`}>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <StatusIcon className={`h-10 w-10 ${sc.color}`} />
 <div>
 <div className={`text-3xl font-bold ${sc.color}`}>
 {totalScore} <span className="text-lg font-normal">/ 30</span>
 </div>
 <Badge className={`mt-1 ${sc.bg} ${sc.color} border`}>{sc.label}</Badge>
 </div>
 </div>
 <div className="text-end text-sm text-muted-foreground">
 <div>{isRTL ? 'الإصدار' : 'Version'}: {qual.version}</div>
 <div>{isRTL ? 'تاريخ التقييم' : 'Evaluation Date'}: {qual.evaluationDate?.split('T')[0]}</div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Section Breakdown */}
 {SECTIONS.map((section, idx) => {
 const sectionTotal = Number((qual as any)[section.totalKey]) || 0;
 const pct = section.max > 0 ? (sectionTotal / section.max) * 100 : 0;
 return (
 <Card key={idx}>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-base">
 {isRTL ? `القسم ${idx + 1}` : `Section ${idx + 1}`}: {section.label}
 </CardTitle>
 <span className={`text-lg font-bold ${
 pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
 }`}>
 {sectionTotal} / {section.max}
 </span>
 </div>
 <div className="w-full bg-muted rounded-full h-1.5 mt-2">
 <div
 className={`h-1.5 rounded-full ${
 pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
 }`}
 style={{ width: `${pct}%` }}
 />
 </div>
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 {section.items.map(item => {
 const score = Number((qual as any)[item.key]) || 0;
 return (
 <div key={item.key} className="flex items-center justify-between py-1.5 px-3 rounded bg-muted/30">
 <span className="text-sm">{item.label}</span>
 <span className="text-sm font-medium">{score} / {item.max}</span>
 </div>
 );
 })}
 </div>
 </CardContent>
 </Card>
 );
 })}

 {/* Notes */}
 {qual.notes && (
 <Card>
 <CardHeader>
 <CardTitle className="text-base">{isRTL ? 'ملاحظات' : 'Notes'}</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{qual.notes}</p>
 </CardContent>
 </Card>
 )}

 {/* Link to edit */}
 <div className="text-center">
 <Button variant="outline" asChild>
 <a href="/organization/logistics/evaluation-performance/checklist">
 <Pencil className="h-4 w-4 me-2" />
 {isRTL ? 'تعديل تقييم التأهيل' : 'Edit Qualification Evaluation'}
 </a>
 </Button>
 </div>
 </div>
 );
}
