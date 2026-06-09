import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface VendorCreateFormData {
 vendorCode: string;
 name: string;
 vendorType: string;
 contactPerson: string;
 email: string;
 phone: string;
}

interface VendorCreateFormProps {
 vendorType?: 'supplier' | 'contractor' | 'service_provider';
 isRTL: boolean;
 language: string;
 translations: any;
 vendorTypeOptions: Array<{ value: string; labelEn: string; labelAr: string }>;
 onSubmit: (data: VendorCreateFormData) => void;
 onCancel: () => void;
 isSubmitting: boolean;
 generateVendorCode: (vendorType: string) => Promise<string>;
}

export default function VendorCreateForm({
 vendorType: lockedVendorType,
 isRTL,
 language,
 translations: localT,
 vendorTypeOptions,
 onSubmit,
 onCancel,
 isSubmitting,
 generateVendorCode,
}: VendorCreateFormProps) {
 const { t } = useTranslation();
 const [formData, setFormData] = useState<VendorCreateFormData>({
 vendorCode: '',
 name: '',
 vendorType: lockedVendorType || 'supplier',
 contactPerson: '',
 email: '',
 phone: '',
 });

 const [isGeneratingCode, setIsGeneratingCode] = useState(false);

 // Auto-generate vendor code when component mounts or vendor type changes
 useEffect(() => {
 const generateCode = async () => {
 setIsGeneratingCode(true);
 try {
 const code = await generateVendorCode(formData.vendorType);
 setFormData(prev => ({ ...prev, vendorCode: code }));
 } catch (error) {
 console.error('Failed to generate vendor code:', error);
 } finally {
 setIsGeneratingCode(false);
 }
 };

 generateCode();
 }, [formData.vendorType, generateVendorCode]);

 const handleChange = (field: keyof VendorCreateFormData, value: string) => {
 setFormData(prev => ({ ...prev, [field]: value }));
 };

 const handleSubmit = () => {
 console.log('✅ VendorCreateForm handleSubmit called with data:', formData);
 onSubmit(formData);
 };

 return (
 <form onSubmit={(e) => e.preventDefault()}>
 <div className="space-y-4">
 {/* Vendor Code - Read-only, Auto-generated */}
 <div>
 <Label htmlFor="vendorCode">
 {t.components.vendorCode} *
 </Label>
 <Input
 id="vendorCode"
 value={formData.vendorCode}
 disabled
 className="bg-muted"
 placeholder={isGeneratingCode ? 'Generating...' : ''}
 />
 </div>

 {/* Vendor Type */}
 {!lockedVendorType && (
 <div>
 <Label htmlFor="vendorType">
 {t.components.vendorType} *
 </Label>
 <Select
 value={formData.vendorType}
 onValueChange={(value) => handleChange('vendorType', value)}
 disabled={isSubmitting}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {vendorTypeOptions.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {language === 'ar' ? option.labelAr : option.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 {/* Vendor Name */}
 <div>
 <Label htmlFor="name">
 {t.components.vendorName} *
 </Label>
 <Input
 id="name"
 value={formData.name}
 onChange={(e) => handleChange('name', e.target.value)}
 disabled={isSubmitting}
 required
 />
 </div>

 {/* Contact Person */}
 <div>
 <Label htmlFor="contactPerson">
 {t.components.contactPerson} *
 </Label>
 <Input
 id="contactPerson"
 value={formData.contactPerson}
 onChange={(e) => handleChange('contactPerson', e.target.value)}
 disabled={isSubmitting}
 required
 />
 </div>

 {/* Email */}
 <div>
 <Label htmlFor="email">
 {t.components.email} *
 </Label>
 <Input
 id="email"
 type="email"
 value={formData.email}
 onChange={(e) => handleChange('email', e.target.value)}
 disabled={isSubmitting}
 required
 />
 </div>

 {/* Phone */}
 <div>
 <Label htmlFor="phone">
 {t.components.phone} *
 </Label>
 <Input
 id="phone"
 value={formData.phone}
 onChange={(e) => handleChange('phone', e.target.value)}
 disabled={isSubmitting}
 required
 />
 </div>
 </div>

 {/* Form Actions */}
 <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
 <Button
 type="button"
 variant="outline"
 onClick={onCancel}
 disabled={isSubmitting}
 >
 {t.cancel || (t.components.cancel)}
 </Button>

 <Button
 type="button"
 onClick={handleSubmit}
 disabled={isSubmitting || isGeneratingCode || !formData.name || !formData.contactPerson || !formData.email || !formData.phone}
 >
 {isSubmitting ? (
 <>
 <Loader2 className="h-4 w-4 me-2 animate-spin" />
 {t.components.creating}
 </>
 ) : (
 t.create || (t.components.create)
 )}
 </Button>
 </div>
 </form>
 );
}
