/**
 * Vendor Edit Page
 * Full form for editing vendor information including bank details and payment terms
 */

import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useNavigate } from '@/lib/router-compat';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import VendorFormWizard from '@/components/VendorFormWizard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function VendorEdit() {
  const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const vendorId = parseInt(id || '0');

 // Fetch vendor data
 const { data: vendor, isLoading, error } = trpc.vendors.getById.useQuery({ id: vendorId });

 // Update vendor mutation
 const updateVendorMutation = trpc.vendors.update.useMutation({
 onSuccess: () => {
 toast.success('تم تحديث المورد بنجاح');
 navigate(`/organization/logistics/vendors/suppliers/${vendorId}`);
 },
 onError: (error) => {
 toast.error(`فشل تحديث المورد: ${error.message}`);
 },
 });

 const handleUpdateVendor = (formData: any) => {
 console.log('📝 Updating vendor:', formData);
 updateVendorMutation.mutate({
 id: vendorId,
 ...formData,
 });
 };

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 );
 }

 if (error || !vendor) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <Card className="max-w-md">
 <CardHeader>
 <CardTitle>خطأ</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-muted-foreground mb-4">
 {error ? error.message : 'لم يتم العثور على المورد'}
 </p>
 <BackButton onClick={() => navigate('/organization/logistics/vendors/suppliers')} label={t.common.backToSuppliersList} />
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background p-6">
 <div className="max-w-5xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <BackButton onClick={() => navigate(`/organization/logistics/vendors/suppliers/${vendorId}`)} label={t.common.backToDetails} />
 <div>
 <h1 className="text-2xl font-bold">تعديل المورد</h1>
 <p className="text-muted-foreground">
 {vendor.name} ({vendor.vendorCode})
 </p>
 </div>
 </div>
 </div>

 {/* Edit Form */}
 <Card>
 <CardContent className="p-6">
 <VendorFormWizard
 vendor={vendor}
 onSubmit={handleUpdateVendor}
 isSubmitting={updateVendorMutation.isPending}
 />
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
