import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayoutNew from "@/layouts/DashboardLayoutNew";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function GrantNew() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  const [formData, setFormData] = useState({
    grantCode: "",
    title: "",
    titleAr: "",
    donorName: "",
    amount: "",
    totalBudget: "",
    currency: "USD",
    startDate: "",
    endDate: "",
    description: "",
    descriptionAr: "",
  });

  const createMutation = trpc.grants.create.useMutation({
    onSuccess: (data) => {
      toast.success(t('grants.createdSuccess'));
      // Navigate to the newly created grant detail page
      navigate(`/grants/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || t('grants.createdError'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.grantCode || !formData.title || !formData.donorName || !formData.amount) {
      toast.error(t('grants.requiredFields'));
      return;
    }

    createMutation.mutate({
      grantCode: formData.grantCode,
      title: formData.title,
      titleAr: formData.titleAr || undefined,
      donorName: formData.donorName,
      amount: formData.amount,
      totalBudget: formData.totalBudget || formData.amount,
      currency: formData.currency,
      description: formData.description || undefined,
      descriptionAr: formData.descriptionAr || undefined,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
    });
  };

  const handleCancel = () => {
    navigate('/grants/active');
  };

  if (!user?.organizationId) {
    return (
      <DashboardLayoutNew>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('grants.organizationRequired')}</CardTitle>
              <CardDescription>{t('grants.organizationRequiredDesc')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayoutNew>
    );
  }

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('grants.createGrant')}</h1>
            <p className="text-muted-foreground">
              {t('grants.createGrantDesc')}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('grants.grantInformation')}</CardTitle>
            <CardDescription>{t('grants.fillGrantDetails')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grant Code */}
              <div className="grid gap-2">
                <Label htmlFor="grantCode">
                  {t('grants.grantCode')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="grantCode"
                  value={formData.grantCode}
                  onChange={(e) => setFormData({ ...formData, grantCode: e.target.value })}
                  placeholder="e.g., GRANT-2025-001"
                  required
                />
              </div>

              {/* Title (English & Arabic) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">
                    {t('grants.grantTitleEn')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="titleAr">{t('grants.grantTitleAr')}</Label>
                  <Input
                    id="titleAr"
                    value={formData.titleAr}
                    onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Donor, Amount, Currency */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="donorName">
                    {t('grants.donor')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="donorName"
                    value={formData.donorName}
                    onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                    placeholder={t('grants.donorPlaceholder')}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">
                    {t('grants.amount')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value, totalBudget: e.target.value })}
                    placeholder="100000"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">{t('grants.currency')}</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                      <SelectItem value="YER">YER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">{t('grants.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">{t('grants.endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Description (English & Arabic) */}
              <div className="grid gap-2">
                <Label htmlFor="description">{t('grants.descriptionEn')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder={t('grants.descriptionPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descriptionAr">{t('grants.descriptionAr')}</Label>
                <Textarea
                  id="descriptionAr"
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  rows={3}
                  dir="rtl"
                  placeholder={t('grants.descriptionPlaceholder')}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createMutation.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('common.saving') : t('grants.createGrantButton')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayoutNew>
  );
}
