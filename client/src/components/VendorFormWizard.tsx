import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface VendorFormData {
 vendorCode: string;
 name: string;
 vendorType: string;
 taxId: string;
 registrationNumber: string;
 contactPerson: string;
 email: string;
 phone: string;
 mobile: string;
 website: string;
 addressLine1: string;
 addressLine2: string;
 city: string;
 state: string;
 country: string;
 postalCode: string;
 bankName: string;
 bankBranch: string;
 bankAccountNumber: string;
 bankAccountName: string;
 iban: string;
 swiftCode: string;
 paymentTerms: string;
 creditLimit: string;
 currencyId: number | null;
 isActive: boolean;
 isPreferred: boolean;
 notes: string;
}

interface VendorFormWizardProps {
 initialData?: Partial<VendorFormData>;
 vendorType?: 'supplier' | 'contractor' | 'service_provider';
 isRTL: boolean;
 language: string;
 translations: any;
 vendorTypeOptions: Array<{ value: string; labelEn: string; labelAr: string }>;
 onSubmit: (data: VendorFormData) => void;
 onCancel: () => void;
 isSubmitting: boolean;
 isEditing: boolean;
}

export default function VendorFormWizard({
 initialData,
 vendorType: lockedVendorType,
 isRTL,
 language,
 translations: t,
 vendorTypeOptions,
 onSubmit,
 onCancel,
 isSubmitting,
 isEditing,
}: VendorFormWizardProps) {
 const [currentStep, setCurrentStep] = useState(1);
 const [formData, setFormData] = useState<VendorFormData>({
 vendorCode: initialData?.vendorCode || '',
 name: initialData?.name || '',
 vendorType: lockedVendorType || initialData?.vendorType || 'supplier',
 taxId: initialData?.taxId || '',
 registrationNumber: initialData?.registrationNumber || '',
 contactPerson: initialData?.contactPerson || '',
 email: initialData?.email || '',
 phone: initialData?.phone || '',
 mobile: initialData?.mobile || '',
 website: initialData?.website || '',
 addressLine1: initialData?.addressLine1 || '',
 addressLine2: initialData?.addressLine2 || '',
 city: initialData?.city || '',
 state: initialData?.state || '',
 country: initialData?.country || '',
 postalCode: initialData?.postalCode || '',
 bankName: initialData?.bankName || '',
 bankBranch: initialData?.bankBranch || '',
 bankAccountNumber: initialData?.bankAccountNumber || '',
 bankAccountName: initialData?.bankAccountName || '',
 iban: initialData?.iban || '',
 swiftCode: initialData?.swiftCode || '',
 paymentTerms: initialData?.paymentTerms || '',
 creditLimit: initialData?.creditLimit || '0',
 currencyId: initialData?.currencyId || null,
 isActive: initialData?.isActive ?? true,
 isPreferred: initialData?.isPreferred ?? false,
 notes: initialData?.notes || '',
 });

 const updateField = (field: keyof VendorFormData, value: any) => {
 setFormData((prev) => ({ ...prev, [field]: value }));
 };

 const handleNext = () => {
 if (currentStep < 3) {
 setCurrentStep((prev) => prev + 1);
 }
 };

 const handlePrevious = () => {
 if (currentStep > 1) {
 setCurrentStep((prev) => prev - 1);
 }
 };

 const handleSubmit = (e?: React.FormEvent) => {
 if (e) {
 e.preventDefault();
 }
 console.log('VendorFormWizard handleSubmit called with data:', formData);
 onSubmit(formData);
 };

 const renderStepIndicator = () => (
 <div className="flex items-center justify-center mb-6 gap-2">
 {[1, 2, 3].map((step) => (
 <div key={step} className="flex items-center">
 <div
 className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${ currentStep === step ? 'bg-primary text-primary-foreground' : currentStep > step ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground' }`}
 >
 {step}
 </div>
 {step < 3 && (
 <div
 className={`w-12 h-0.5 mx-1 ${ currentStep > step ? 'bg-green-500' : 'bg-muted' }`}
 />
 )}
 </div>
 ))}
 </div>
 );

 const renderStep1 = () => (
 <div className="space-y-4">
 <h3 className="text-lg font-semibold mb-4">{t.vendorDetails || 'Vendor Details'}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.vendorCode}</Label>
 <Input
 value={formData.vendorCode}
 onChange={(e) => updateField('vendorCode', e.target.value)}
 placeholder="VND-001"
 />
 </div>
 
 {/* Lock vendor type if coming from category page */}
 {lockedVendorType ? (
 <div className="space-y-2">
 <Label>{t.vendorType}</Label>
 <Input
 value={vendorTypeOptions.find(opt => opt.value === lockedVendorType)?.[t.components.labelen] || ''}
 disabled
 className="bg-muted"
 />
 </div>
 ) : (
 <div className="space-y-2">
 <Label>{t.vendorType}</Label>
 <Select
 value={formData.vendorType}
 onValueChange={(v) => updateField('vendorType', v)}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {vendorTypeOptions.map((opt) => (
 <SelectItem key={opt.value} value={opt.value}>
 {language === 'ar' ? opt.labelAr : opt.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 <div className="space-y-2 col-span-2">
 <Label>{t.vendorName} *</Label>
 <Input
 value={formData.name}
 onChange={(e) => updateField('name', e.target.value)}
 required
 />
 </div>

 <div className="space-y-2">
 <Label>{t.taxId}</Label>
 <Input
 value={formData.taxId}
 onChange={(e) => updateField('taxId', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.registrationNumber}</Label>
 <Input
 value={formData.registrationNumber}
 onChange={(e) => updateField('registrationNumber', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.contactPerson}</Label>
 <Input
 value={formData.contactPerson}
 onChange={(e) => updateField('contactPerson', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.email}</Label>
 <Input
 type="email"
 value={formData.email}
 onChange={(e) => updateField('email', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.phone}</Label>
 <Input
 value={formData.phone}
 onChange={(e) => updateField('phone', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.mobile || 'Mobile'}</Label>
 <Input
 value={formData.mobile}
 onChange={(e) => updateField('mobile', e.target.value)}
 />
 </div>

 <div className="space-y-2 col-span-2">
 <Label>{t.website}</Label>
 <Input
 value={formData.website}
 onChange={(e) => updateField('website', e.target.value)}
 placeholder="https://"
 />
 </div>

 <div className="space-y-2 col-span-2">
 <Label>{t.address}</Label>
 <Input
 value={formData.addressLine1}
 onChange={(e) => updateField('addressLine1', e.target.value)}
 placeholder={t.addressLine1 || 'Address Line 1'}
 />
 </div>

 <div className="space-y-2 col-span-2">
 <Input
 value={formData.addressLine2}
 onChange={(e) => updateField('addressLine2', e.target.value)}
 placeholder={t.addressLine2 || 'Address Line 2'}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.city}</Label>
 <Input
 value={formData.city}
 onChange={(e) => updateField('city', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.state || 'State/Province'}</Label>
 <Input
 value={formData.state}
 onChange={(e) => updateField('state', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.country}</Label>
 <Input
 value={formData.country}
 onChange={(e) => updateField('country', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.postalCode}</Label>
 <Input
 value={formData.postalCode}
 onChange={(e) => updateField('postalCode', e.target.value)}
 />
 </div>
 </div>
 </div>
 );

 const renderStep2 = () => (
 <div className="space-y-4">
 <h3 className="text-lg font-semibold mb-4">{t.bankDetails}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.bankName}</Label>
 <Input
 value={formData.bankName}
 onChange={(e) => updateField('bankName', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.bankBranch}</Label>
 <Input
 value={formData.bankBranch}
 onChange={(e) => updateField('bankBranch', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.accountNumber}</Label>
 <Input
 value={formData.bankAccountNumber}
 onChange={(e) => updateField('bankAccountNumber', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.accountHolderName}</Label>
 <Input
 value={formData.bankAccountName}
 onChange={(e) => updateField('bankAccountName', e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.iban}</Label>
 <Input
 value={formData.iban}
 onChange={(e) => updateField('iban', e.target.value)}
 placeholder="SA00 0000 0000 0000 0000 0000"
 />
 </div>

 <div className="space-y-2">
 <Label>{t.swiftCode}</Label>
 <Input
 value={formData.swiftCode}
 onChange={(e) => updateField('swiftCode', e.target.value)}
 placeholder="AAAA BB CC DDD"
 />
 </div>
 </div>
 </div>
 );

 const renderStep3 = () => (
 <div className="space-y-4">
 <h3 className="text-lg font-semibold mb-4">{t.paymentTerms}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.paymentTerms}</Label>
 <Input
 value={formData.paymentTerms}
 onChange={(e) => updateField('paymentTerms', e.target.value)}
 placeholder={t.placeholders.net30}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.creditLimit}</Label>
 <Input
 type="number"
 value={formData.creditLimit}
 onChange={(e) => updateField('creditLimit', e.target.value)}
 placeholder="0.00"
 />
 </div>

 <div className="space-y-2">
 <Label>{t.currency}</Label>
 <Select
 value={formData.currencyId?.toString() || ''}
 onValueChange={(v) => updateField('currencyId', v ? parseInt(v) : null)}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.selectCurrency || 'Select Currency'} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="1">USD - US Dollar</SelectItem>
 <SelectItem value="2">EUR - Euro</SelectItem>
 <SelectItem value="3">SAR - Saudi Riyal</SelectItem>
 <SelectItem value="4">YER - Yemeni Rial</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label>{t.status}</Label>
 <Select
 value={formData.isActive ? 'active' : 'inactive'}
 onValueChange={(v) => updateField('isActive', v === 'active')}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="active">{t.active || 'Active'}</SelectItem>
 <SelectItem value="inactive">{t.inactive || 'Inactive'}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2 col-span-2">
 <Label>{t.notes}</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => updateField('notes', e.target.value)}
 rows={4}
 placeholder={t.notesPlaceholder || 'Additional notes...'}
 />
 </div>
 </div>
 </div>
 );

 return (
 <form onSubmit={handleSubmit} className="w-full">
 {renderStepIndicator()}
 
 <div className="min-h-[400px]">
 {currentStep === 1 && renderStep1()}
 {currentStep === 2 && renderStep2()}
 {currentStep === 3 && renderStep3()}
 </div>

 <div className="flex justify-between mt-6 pt-4 border-t">
 <div>
 {currentStep > 1 && (
 <Button
 type="button"
 variant="outline"
 onClick={handlePrevious}
 disabled={isSubmitting} data-back-nav>
 {isRTL ? <ChevronRight className="h-4 w-4 me-2" /> : <ChevronLeft className="h-4 w-4 me-2" />}
 {t.previous}
 </Button>
 )}
 </div>

 <div className="flex gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={onCancel}
 disabled={isSubmitting} data-back-nav>
 {t.cancel}
 </Button>

 {currentStep < 3 ? (
 <Button
 type="button"
 onClick={handleNext}
 disabled={isSubmitting}>
 {t.next}
 <ChevronRight className="h-4 w-4 ms-2" />
 </Button>
 ) : (
 <button
 type="button"
 disabled={isSubmitting}
 style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
 onClick={() => {
 console.log("✅ NATIVE BUTTON CLICKED - Calling handleSubmit");
 handleSubmit();
 }}
 >
 {isSubmitting ? (
 "Loading..."
 ) : isEditing ? (
 t.update
 ) : (
 "NATIVE CREATE"
 )}
 </button>
 )}
 </div>
 </div>
 </form>
 );
}
