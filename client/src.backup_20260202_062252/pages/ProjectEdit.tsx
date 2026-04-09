import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectEdit() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/projects/:id/edit");
  const projectId = params?.id ? parseInt(params.id) : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: project, isLoading: projectLoading } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId && !!user?.organizationId }
  );

  const { data: grants } = trpc.grants.list.useQuery(undefined, {
    enabled: !!user?.organizationId,
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully!");
      setLocation(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const [formData, setFormData] = useState({
    title: "",
    titleAr: "",
    projectCode: "",
    grantId: "",
    status: "planning",
    startDate: "",
    endDate: "",
    location: "",
    locationAr: "",
    description: "",
    descriptionAr: "",
    objectives: "",
    objectivesAr: "",
    beneficiaryCount: "",
    projectManager: "",
  });

  // Pre-populate form with existing project data
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.titleEn || "",
        titleAr: project.titleAr || "",
        projectCode: project.projectCode || "",
        grantId: project.grantId?.toString() || "",
        status: project.status || "planning",
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
        location: project.location || "",
        locationAr: project.locationAr || "",
        description: project.description || "",
        descriptionAr: project.descriptionAr || "",
        objectives: project.objectives || "",
        objectivesAr: project.objectivesAr || "",
        beneficiaryCount: project.beneficiaryCount?.toString() || "",
        projectManager: project.projectManager?.toString() || "",
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.projectCode || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!projectId) {
      toast.error("Project ID is missing");
      return;
    }

    setIsSubmitting(true);

    updateProject.mutate({
      id: projectId,
      title: formData.title,
      titleAr: formData.titleAr || undefined,
      projectCode: formData.projectCode,
      grantId: formData.grantId && formData.grantId !== 'none' ? parseInt(formData.grantId) : undefined,
      status: formData.status as any,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      location: formData.location || undefined,
      locationAr: formData.locationAr || undefined,
      description: formData.description || undefined,
      descriptionAr: formData.descriptionAr || undefined,
      objectives: formData.objectives || undefined,
      objectivesAr: formData.objectivesAr || undefined,
      beneficiaryCount: formData.beneficiaryCount ? parseInt(formData.beneficiaryCount) : undefined,
      projectManager: formData.projectManager ? parseInt(formData.projectManager) : undefined,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
            <p className="text-muted-foreground mt-1">
              Update project details and information
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Core project details and identification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Project Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="Enter project title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="titleAr">Project Title (Arabic)</Label>
                    <Input
                      id="titleAr"
                      value={formData.titleAr}
                      onChange={(e) => handleChange("titleAr", e.target.value)}
                      placeholder="أدخل عنوان المشروع"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectCode">
                      Project Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="projectCode"
                      value={formData.projectCode}
                      onChange={(e) => handleChange("projectCode", e.target.value)}
                      placeholder="e.g., PROJ-2025-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grantId">Associated Grant</Label>
                    <Select
                      value={formData.grantId}
                      onValueChange={(value) => handleChange("grantId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a grant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Grant</SelectItem>
                        {grants?.map((grant) => (
                          <SelectItem key={grant.id} value={grant.id.toString()}>
                            {grant.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Project Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Details */}
            <Card>
              <CardHeader>
                <CardTitle>Location & Details</CardTitle>
                <CardDescription>
                  Project location and descriptive information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                      placeholder="City, Region, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationAr">Location (Arabic)</Label>
                    <Input
                      id="locationAr"
                      value={formData.locationAr}
                      onChange={(e) => handleChange("locationAr", e.target.value)}
                      placeholder="المدينة، المنطقة، البلد"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder="Describe the project purpose and scope"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionAr">Description (Arabic)</Label>
                    <Textarea
                      id="descriptionAr"
                      value={formData.descriptionAr}
                      onChange={(e) => handleChange("descriptionAr", e.target.value)}
                      placeholder="وصف غرض المشروع ونطاقه"
                      dir="rtl"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="objectives">Objectives</Label>
                    <Textarea
                      id="objectives"
                      value={formData.objectives}
                      onChange={(e) => handleChange("objectives", e.target.value)}
                      placeholder="List key project objectives"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objectivesAr">Objectives (Arabic)</Label>
                    <Textarea
                      id="objectivesAr"
                      value={formData.objectivesAr}
                      onChange={(e) => handleChange("objectivesAr", e.target.value)}
                      placeholder="قائمة أهداف المشروع الرئيسية"
                      dir="rtl"
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Management */}
            <Card>
              <CardHeader>
                <CardTitle>Project Management</CardTitle>
                <CardDescription>
                  Management and beneficiary information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectManager">Project Manager</Label>
                    <Input
                      id="projectManager"
                      value={formData.projectManager}
                      onChange={(e) => handleChange("projectManager", e.target.value)}
                      placeholder="Name of project manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beneficiaryCount">Target Beneficiary Count</Label>
                    <Input
                      id="beneficiaryCount"
                      type="number"
                      value={formData.beneficiaryCount}
                      onChange={(e) => handleChange("beneficiaryCount", e.target.value)}
                      placeholder="Expected number of beneficiaries"
                      min="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/projects/${projectId}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
