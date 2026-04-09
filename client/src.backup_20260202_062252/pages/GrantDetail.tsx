import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, DollarSign, FileText, Building2, Edit, Upload, Download, Eye, Trash2 } from "lucide-react";
import { useParams, Link } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const GRANT_STATUSES = [
  { value: "draft", label: "Draft", variant: "secondary" as const },
  { value: "submitted", label: "Submitted", variant: "default" as const },
  { value: "under_review", label: "Under Review", variant: "default" as const },
  { value: "approved", label: "Approved", variant: "default" as const },
  { value: "rejected", label: "Rejected", variant: "destructive" as const },
  { value: "closed", label: "Closed", variant: "outline" as const },
];

export default function GrantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", category: "", description: "", file: null as File | null });
  
  const { data: grant, isLoading, refetch } = trpc.grants.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id && !!user?.organizationId }
  );

  const { data: documents = [] } = trpc.documents.listByGrant.useQuery(
    { grantId: parseInt(id!) },
    { enabled: !!id && !!user?.organizationId }
  );

  const updateStatusMutation = trpc.grants.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Grant status updated successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      setUploadForm({ title: "", category: "", description: "", file: null });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload document");
    },
  });

  const deleteMutation = trpc.grants.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete document");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast.error("Please provide a title and select a file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) {
        uploadMutation.mutate({
          grantId: parseInt(id!),
          title: uploadForm.title,
          category: uploadForm.category || undefined,
          description: uploadForm.description || undefined,
          fileData: base64,
          fileName: uploadForm.file!.name,
          mimeType: uploadForm.file!.type,
        });
      }
    };
    reader.readAsDataURL(uploadForm.file);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!grant) return;
    updateStatusMutation.mutate({ id: grant.id, status: newStatus as any });
  };

  if (!user?.organizationId) {
    return <DashboardLayout><div className="p-6"><Card><CardHeader><CardTitle>Organization Required</CardTitle></CardHeader></Card></div></DashboardLayout>;
  }

  if (isLoading) {
    return <DashboardLayout><div className="p-6 space-y-6"><div className="h-8 bg-muted rounded w-48 animate-pulse" /></div></DashboardLayout>;
  }

  if (!grant) {
    return <DashboardLayout><div className="p-6"><Card><CardHeader><CardTitle>Grant Not Found</CardTitle></CardHeader><CardContent><Link href="/grants"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Grants</Button></Link></CardContent></Card></div></DashboardLayout>;
  }

  const statusConfig = GRANT_STATUSES.find((s) => s.value === grant.status);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/grants/active"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{grant.title}</h1>
              {grant.titleAr && <p className="text-lg text-muted-foreground mt-1" dir="rtl">{grant.titleAr}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/grants/${grant.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Grant
              </Button>
            </Link>
            <Select value={grant.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{GRANT_STATUSES.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}</SelectContent>
            </Select>
            <Badge variant={statusConfig?.variant || "default"}>{statusConfig?.label || grant.status}</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Donor</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{grant.donorName}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Grant Amount</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{parseFloat(grant.amount).toLocaleString()} {grant.currency}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Start Date</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{grant.startDate ? new Date(grant.startDate).toLocaleDateString() : 'N/A'}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">End Date</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{grant.endDate ? new Date(grant.endDate).toLocaleDateString() : 'N/A'}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger></TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Card><CardHeader><CardTitle>Description</CardTitle></CardHeader><CardContent className="space-y-4">{grant.description && <div><h4 className="font-medium mb-2">English</h4><p className="text-muted-foreground whitespace-pre-wrap">{grant.description}</p></div>}{grant.descriptionAr && <div><h4 className="font-medium mb-2">Arabic</h4><p className="text-muted-foreground whitespace-pre-wrap" dir="rtl">{grant.descriptionAr}</p></div>}{!grant.description && !grant.descriptionAr && <p className="text-muted-foreground italic">No description provided</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle>Grant Information</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between"><span className="text-muted-foreground">Currency:</span><span className="font-medium">{grant.currency}</span></div><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Created:</span><span className="font-medium">{new Date(grant.createdAt).toLocaleDateString()}</span></div></CardContent></Card>
          </TabsContent>
          <TabsContent value="timeline" className="space-y-4">
            <Card><CardHeader><CardTitle>Status Timeline</CardTitle><CardDescription>Track grant lifecycle changes</CardDescription></CardHeader><CardContent><div className="space-y-4"><div className="flex items-start gap-4"><div className="p-2 rounded-full bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div><div className="flex-1"><p className="font-medium">Grant Created</p><p className="text-sm text-muted-foreground">{new Date(grant.createdAt).toLocaleString()}</p></div></div></div></CardContent></Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Grant Documents</CardTitle>
                  <CardDescription>Upload and manage grant-related documents</CardDescription>
                </div>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Document</DialogTitle>
                      <DialogDescription>Add a new document to this grant</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={uploadForm.title}
                          onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                          placeholder="Document title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={uploadForm.category}
                          onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                          placeholder="e.g., Agreement, Report, Budget"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          placeholder="Document description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="file">File *</Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {doc.category && <span className="mr-2">Category: {doc.category}</span>}
                              Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} download>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteMutation.mutate({ documentId: doc.id });
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
