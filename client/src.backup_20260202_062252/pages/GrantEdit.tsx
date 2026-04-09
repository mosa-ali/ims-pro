import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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

export default function GrantEdit() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  const { data: grant, isLoading } = trpc.grants.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id && !!user?.organizationId }
  );

  const [formData, setFormData] = useState({
    title: "",
    titleAr: "",
    donorName: "",
    grantNumber: "",
    amount: "",
    status: "draft" as "draft" | "submitted" | "under_review" | "approved" | "rejected" | "closed",
    startDate: "",
    endDate: "",
    description: "",
    objectives: "",
  });

  // Populate form when grant data is loaded
  useEffect(() => {
    if (grant) {
      setFormData({
        title: grant.title || "",
        titleAr: grant.titleAr || "",
        donorName: grant.donorName || "",
        grantNumber: grant.grantNumber || "",
        amount: grant.amount || "",
        status: grant.status as any,
        startDate: grant.startDate ? new Date(grant.startDate).toISOString().split('T')[0] : "",
        endDate: grant.endDate ? new Date(grant.endDate).toISOString().split('T')[0] : "",
        description: grant.description || "",
        objectives: grant.objectives || "",
      });
    }
  }, [grant]);

  const updateMutation = trpc.grants.update.useMutation({
    onSuccess: () => {
      toast.success(t('grants.updatedSuccess'));
      navigate(`/grants/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || t('grants.updatedError'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMutation.mutate({
      id: parseInt(id!),
      title: formData.title || undefined,
      titleAr: formData.titleAr || undefined,
      donorName: formData.donorName || undefined,
      grantNumber: formData.grantNumber || undefined,
      amount: formData.amount || undefined,
      status: formData.status,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      description: formData.description || undefined,
      objectives: formData.objectives || undefined,
    });
  };

  const handleCancel = () => {
    navigate(`/grants/${id}`);
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

  if (isLoading) {
    return (
      <DashboardLayoutNew>
        <div className="p-6 space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        </div>
      </DashboardLayoutNew>
    );
  }

  if (!grant) {
    return (
      <DashboardLayoutNew>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('grants.grantNotFound')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/grants/active')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('grants.backToGrants')}
              </Button>
            </CardContent>
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
            <h1 className="text-3xl font-bold">{t('grants.editGrant')}</h1>
            <p className="text-muted-foreground">
              {t('grants.updateGrantDetails')}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('grants.grantInformation')}</CardTitle>
            <CardDescription>{t('grants.updateGrantDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grant Number */}
              <div className="grid gap-2">
                <Label htmlFor="grantNumber">{t('grants.grantNumber')}</Label>
                <Input
                  id="grantNumber"
                  value={formData.grantNumber}
                  onChange={(e) => setFormData({ ...formData, grantNumber: e.target.value })}
                  placeholder="e.g., GR-2025-001"
                />
              </div>

              {/* Title (English & Arabic) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">{t('grants.grantTitleEn')}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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

              {/* Donor, Amount, Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="donorName">{t('grants.donor')}</Label>
                  <Input
                    id="donorName"
                    value={formData.donorName}
                    onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                    placeholder={t('grants.donorPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">{t('grants.amount')}</Label>
                  <Input
                    id="amount"
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">{t('grants.status')}</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('grants.draft')}</SelectItem>
                      <SelectItem value="submitted">{t('grants.submitted')}</SelectItem>
                      <SelectItem value="under_review">{t('grants.underReview')}</SelectItem>
                      <SelectItem value="approved">{t('grants.approved')}</SelectItem>
                      <SelectItem value="rejected">{t('grants.rejected')}</SelectItem>
                      <SelectItem value="closed">{t('grants.closed')}</SelectItem>
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

              {/* Description */}
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

              {/* Objectives */}
              <div className="grid gap-2">
                <Label htmlFor="objectives">{t('grants.objectivesEn')}</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  rows={3}
                  placeholder={t('grants.objectivesPlaceholder')}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t('common.saving') : t('grants.updateGrantButton')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayoutNew>
  );
}
