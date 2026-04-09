import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FolderKanban, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Projects() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    titleEn: "",
    titleAr: "",
    projectCode: "",
    description: "",
    descriptionAr: "",
    startDate: "",
    endDate: "",
    location: "",
    locationAr: "",
    grantId: "",
  });

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(undefined, { enabled: !!user?.organizationId });
  const { data: grants } = trpc.grants.list.useQuery(undefined, { enabled: !!user?.organizationId });

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully");
      setOpen(false);
      setFormData({ titleEn: "", titleAr: "", projectCode: "", description: "", descriptionAr: "", startDate: "", endDate: "", location: "", locationAr: "", grantId: "" });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      titleEn: formData.titleEn,
      titleAr: formData.titleAr || undefined,
      projectCode: formData.projectCode,
      grantId: formData.grantId ? parseInt(formData.grantId) : undefined,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      location: formData.location || undefined,
      locationAr: formData.locationAr || undefined,
      description: formData.description || undefined,
      descriptionAr: formData.descriptionAr || undefined,
    });
  };

  const filteredProjects = projects?.filter((project) =>
    project.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.projectCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user?.organizationId) {
    return <DashboardLayout><div className="p-6"><Card><CardHeader><CardTitle>Organization Required</CardTitle></CardHeader></Card></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects Management</h1>
            <p className="text-muted-foreground mt-2">Manage humanitarian projects and programs</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Project</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader><DialogTitle>Create New Project</DialogTitle><DialogDescription>Add a new humanitarian project</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="titleEn">Project Name (English) *</Label><Input id="titleEn" value={formData.titleEn} onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })} required /></div>
                    <div className="grid gap-2"><Label htmlFor="titleAr">Project Name (Arabic)</Label><Input id="titleAr" value={formData.titleAr} onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })} dir="rtl" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="projectCode">Project Code *</Label><Input id="projectCode" value={formData.projectCode} onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })} placeholder="e.g., YEM-2024-001" required /></div>
                    <div className="grid gap-2"><Label htmlFor="grantId">Linked Grant</Label><Select value={formData.grantId} onValueChange={(value) => setFormData({ ...formData, grantId: value })}><SelectTrigger id="grantId"><SelectValue placeholder="Select grant (optional)" /></SelectTrigger><SelectContent><SelectItem value="">No Grant</SelectItem>{grants?.map((grant) => (<SelectItem key={grant.id} value={grant.id.toString()}>{grant.title}</SelectItem>))}</SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="startDate">Start Date *</Label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required /></div>
                    <div className="grid gap-2"><Label htmlFor="endDate">End Date *</Label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="location">Location (English)</Label><Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Sana'a, Yemen" /></div>
                    <div className="grid gap-2"><Label htmlFor="locationAr">Location (Arabic)</Label><Input id="locationAr" value={formData.locationAr} onChange={(e) => setFormData({ ...formData, locationAr: e.target.value })} dir="rtl" /></div>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="description">Description (English)</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
                  <div className="grid gap-2"><Label htmlFor="descriptionAr">Description (Arabic)</Label><Textarea id="descriptionAr" value={formData.descriptionAr} onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })} rows={3} dir="rtl" /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Project"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => (<Card key={i} className="animate-pulse"><CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader></Card>))}</div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10"><FolderKanban className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{project.titleEn}</CardTitle>
                        {project.titleAr && <p className="text-sm text-muted-foreground mt-1 truncate" dir="rtl">{project.titleAr}</p>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-medium">{project.projectCode}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Location:</span><span className="font-medium">{project.location || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Period:</span><span className="text-xs">{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card><CardHeader><CardTitle>No Projects Found</CardTitle><CardDescription>{searchQuery ? "No projects match your search" : "Get started by creating your first project"}</CardDescription></CardHeader>{!searchQuery && <CardContent><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Project</Button></CardContent>}</Card>
        )}
      </div>
    </DashboardLayout>
  );
}
