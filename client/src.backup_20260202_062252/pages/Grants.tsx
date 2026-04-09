import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Search, Filter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const GRANT_STATUSES = [
  { value: "draft", variant: "secondary" as const },
  { value: "submitted", variant: "default" as const },
  { value: "under_review", variant: "default" as const },
  { value: "approved", variant: "default" as const },
  { value: "rejected", variant: "destructive" as const },
  { value: "closed", variant: "outline" as const },
];

export default function Grants() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Helper function to get translated status label
  const getStatusLabel = (status: string) => {
    const key = status as keyof typeof statusLabels;
    const statusLabels = {
      draft: t('grants.draft'),
      submitted: t('grants.submitted'),
      under_review: t('grants.underReview'),
      approved: t('grants.approved'),
      rejected: t('grants.rejected'),
      closed: t('grants.closed'),
    };
    return statusLabels[key] || status;
  };
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
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

  const { data: grants, isLoading, refetch } = trpc.grants.list.useQuery(undefined, { enabled: !!user?.organizationId });

  const createMutation = trpc.grants.create.useMutation({
    onSuccess: () => {
      toast.success(t('grants.createdSuccess'));
      setOpen(false);
      setFormData({ grantCode: "", title: "", titleAr: "", donorName: "", amount: "", totalBudget: "", currency: "USD", startDate: "", endDate: "", description: "", descriptionAr: "" });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || t('grants.createdError'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
    });
  };

  const filteredGrants = grants?.filter((grant) => {
    const matchesSearch = grant.title.toLowerCase().includes(searchQuery.toLowerCase()) || grant.donorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || grant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user?.organizationId) {
    return <DashboardLayout><div className="p-6"><Card><CardHeader><CardTitle>{t('grants.organizationRequired')}</CardTitle><CardDescription>{t('grants.organizationRequiredDesc')}</CardDescription></CardHeader></Card></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('grants.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('grants.description')}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />{t('grants.newGrant')}</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader><DialogTitle>{t('grants.createGrant')}</DialogTitle><DialogDescription>{t('grants.createGrantDesc')}</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="title">{t('grants.grantTitleEn')} {t('grants.required')}</Label><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                    <div className="grid gap-2"><Label htmlFor="titleAr">{t('grants.grantTitleAr')}</Label><Input id="titleAr" value={formData.titleAr} onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })} dir="rtl" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2"><Label htmlFor="donorName">{t('grants.donor')} {t('grants.required')}</Label><Input id="donorName" value={formData.donorName} onChange={(e) => setFormData({ ...formData, donorName: e.target.value })} placeholder={t('grants.donorPlaceholder')} required /></div>
                    <div className="grid gap-2"><Label htmlFor="amount">{t('grants.amount')} {t('grants.required')}</Label><Input id="amount" type="text" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required /></div>
                    <div className="grid gap-2"><Label htmlFor="currency">{t('grants.currency')}</Label><Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}><SelectTrigger id="currency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="YER">YER</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="startDate">{t('grants.startDate')}</Label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></div>
                    <div className="grid gap-2"><Label htmlFor="endDate">{t('grants.endDate')}</Label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></div>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="description">{t('grants.descriptionEn')}</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
                  <div className="grid gap-2"><Label htmlFor="descriptionAr">{t('grants.descriptionAr')}</Label><Textarea id="descriptionAr" value={formData.descriptionAr} onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })} rows={3} dir="rtl" /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? t('common.saving') : t('grants.createGrantButton')}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('grants.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder={t('grants.status')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('grants.allStatuses')}</SelectItem>{GRANT_STATUSES.map((status) => (<SelectItem key={status.value} value={status.value}>{getStatusLabel(status.value)}</SelectItem>))}</SelectContent></Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => (<Card key={i} className="animate-pulse"><CardHeader><div className="h-6 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-1/2 mt-2" /></CardHeader></Card>))}</div>
        ) : filteredGrants && filteredGrants.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGrants.map((grant) => {
              const statusConfig = GRANT_STATUSES.find((s) => s.value === grant.status);
              return (
                <Link key={grant.id} href={`/grants/${grant.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">{grant.title}</CardTitle>
                            {grant.titleAr && (<p className="text-sm text-muted-foreground mt-1 truncate" dir="rtl">{grant.titleAr}</p>)}
                          </div>
                        </div>
                        <Badge variant={statusConfig?.variant || "default"} className="shrink-0 ml-2">{getStatusLabel(grant.status)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('grants.donor')}:</span><span className="font-medium">{grant.donorName}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('grants.amount')}:</span><span className="font-medium">{parseFloat(grant.amount).toLocaleString()} {grant.currency}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('grants.period')}:</span><span className="text-xs">{grant.startDate ? new Date(grant.startDate).toLocaleDateString() : 'N/A'} - {grant.endDate ? new Date(grant.endDate).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card><CardHeader><CardTitle>{t('grants.noGrants')}</CardTitle><CardDescription>{searchQuery || statusFilter !== "all" ? t('common.noData') : t('grants.createFirst')}</CardDescription></CardHeader>{!searchQuery && statusFilter === "all" && (<CardContent><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />{t('grants.createGrantButton')}</Button></CardContent>)}</Card>
        )}
      </div>
    </DashboardLayout>
  );
}
