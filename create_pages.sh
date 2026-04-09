#!/bin/bash

# Create Grants.tsx
cat > client/src/pages/Grants.tsx << 'EOF'
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
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

const GRANT_STATUSES = [
  { value: "draft", label: "Draft", variant: "secondary" as const },
  { value: "submitted", label: "Submitted", variant: "default" as const },
  { value: "under_review", label: "Under Review", variant: "default" as const },
  { value: "approved", label: "Approved", variant: "default" as const },
  { value: "rejected", label: "Rejected", variant: "destructive" as const },
  { value: "closed", label: "Closed", variant: "outline" as const },
];

export default function Grants() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    titleAr: "",
    donorName: "",
    amount: "",
    currency: "USD",
    startDate: "",
    endDate: "",
    description: "",
    descriptionAr: "",
  });

  const { data: grants, isLoading, refetch } = trpc.grants.list.useQuery(undefined, { enabled: !!user?.organizationId });

  const createMutation = trpc.grants.create.useMutation({
    onSuccess: () => {
      toast.success("Grant created successfully");
      setOpen(false);
      setFormData({ title: "", titleAr: "", donorName: "", amount: "", currency: "USD", startDate: "", endDate: "", description: "", descriptionAr: "" });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create grant");
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
    return <DashboardLayout><div className="p-6"><Card><CardHeader><CardTitle>Organization Required</CardTitle><CardDescription>You need to be assigned to an organization to access grants.</CardDescription></CardHeader></Card></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Grants Management</h1>
            <p className="text-muted-foreground mt-2">Track grant proposals, approvals, and lifecycle</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Grant</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader><DialogTitle>Create New Grant</DialogTitle><DialogDescription>Add a new grant proposal with bilingual support</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="title">Grant Title (English) *</Label><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                    <div className="grid gap-2"><Label htmlFor="titleAr">Grant Title (Arabic)</Label><Input id="titleAr" value={formData.titleAr} onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })} dir="rtl" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2"><Label htmlFor="donorName">Donor *</Label><Input id="donorName" value={formData.donorName} onChange={(e) => setFormData({ ...formData, donorName: e.target.value })} placeholder="e.g., EU, UNICEF, ECHO" required /></div>
                    <div className="grid gap-2"><Label htmlFor="amount">Amount *</Label><Input id="amount" type="text" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required /></div>
                    <div className="grid gap-2"><Label htmlFor="currency">Currency</Label><Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}><SelectTrigger id="currency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="YER">YER</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></div>
                    <div className="grid gap-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></div>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="description">Description (English)</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
                  <div className="grid gap-2"><Label htmlFor="descriptionAr">Description (Arabic)</Label><Textarea id="descriptionAr" value={formData.descriptionAr} onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })} rows={3} dir="rtl" /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Grant"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search grants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Filter by status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{GRANT_STATUSES.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}</SelectContent></Select>
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
                        <Badge variant={statusConfig?.variant || "default"} className="shrink-0 ml-2">{statusConfig?.label || grant.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Donor:</span><span className="font-medium">{grant.donorName}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-medium">{parseFloat(grant.amount).toLocaleString()} {grant.currency}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Period:</span><span className="text-xs">{grant.startDate ? new Date(grant.startDate).toLocaleDateString() : 'N/A'} - {grant.endDate ? new Date(grant.endDate).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card><CardHeader><CardTitle>No Grants Found</CardTitle><CardDescription>{searchQuery || statusFilter !== "all" ? "No grants match your search criteria" : "Get started by creating your first grant proposal"}</CardDescription></CardHeader>{!searchQuery && statusFilter === "all" && (<CardContent><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Grant</Button></CardContent>)}</Card>
        )}
      </div>
    </DashboardLayout>
  );
}
EOF

echo "Created Grants.tsx"
