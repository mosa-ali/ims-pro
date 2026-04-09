import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Download, Upload } from "lucide-react";
import * as XLSX from 'xlsx';

interface ActivitiesManagementProps {
  projectId: number;
}

export default function ActivitiesManagement({ projectId }: ActivitiesManagementProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [bucketFilter, setFilterBucket] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    bucketName: "",
    location: "",
    startDate: "",
    endDate: "",
    targetBeneficiaries: 0,
    actualBeneficiaries: 0,
    status: "planned",
    notes: "",
  });

  const { data: activities = [], isLoading } = trpc.projectActivities.list.useQuery({ projectId });

  const createMutation = trpc.projectActivities.create.useMutation({
    onSuccess: () => {
      toast.success("Activity created successfully");
      utils.projectActivities.list.invalidate();
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create activity: ${error.message}`);
    },
  });

  const updateMutation = trpc.projectActivities.update.useMutation({
    onSuccess: () => {
      toast.success("Activity updated successfully");
      utils.projectActivities.list.invalidate();
      setIsUpdateModalOpen(false);
      setSelectedActivity(null);
    },
    onError: (error) => {
      toast.error(`Failed to update activity: ${error.message}`);
    },
  });

  const deleteMutation = trpc.projectActivities.delete.useMutation({
    onSuccess: () => {
      toast.success("Activity deleted successfully");
      utils.projectActivities.list.invalidate();
      setSelectedActivity(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete activity: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      bucketName: "",
      location: "",
      startDate: "",
      endDate: "",
      targetBeneficiaries: 0,
      actualBeneficiaries: 0,
      status: "planned",
      notes: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast.error("Activity name is required");
      return;
    }
    createMutation.mutate({
      projectId,
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedActivity || !formData.name) return;
    updateMutation.mutate({
      id: selectedActivity.id,
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
    });
  };

  const handleDelete = (activityId: number) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      deleteMutation.mutate({ id: activityId });
    }
  };

  const openUpdateModal = (activity: any) => {
    setSelectedActivity(activity);
    setFormData({
      name: activity.name || "",
      description: activity.description || "",
      bucketName: activity.bucketName || "",
      location: activity.location || "",
      startDate: activity.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : "",
      endDate: activity.endDate ? new Date(activity.endDate).toISOString().split('T')[0] : "",
      targetBeneficiaries: activity.targetBeneficiaries || 0,
      actualBeneficiaries: activity.actualBeneficiaries || 0,
      status: activity.status || "planned",
      notes: activity.notes || "",
    });
    setIsUpdateModalOpen(true);
  };

  const handleExport = () => {
    const exportData = activities.map(a => ({
      "Activity Name": a.name,
      "Description": a.description || "",
      "Bucket": a.bucketName || "",
      "Location": a.location || "",
      "Start Date": a.startDate ? new Date(a.startDate).toLocaleDateString() : "",
      "End Date": a.endDate ? new Date(a.endDate).toLocaleDateString() : "",
      "Target Beneficiaries": a.targetBeneficiaries,
      "Actual Beneficiaries": a.actualBeneficiaries,
      "Status": a.status,
      "Notes": a.notes || "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activities");
    XLSX.writeFile(wb, `Project_${projectId}_Activities.xlsx`);
    toast.success("Activities exported successfully");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of jsonData) {
          try {
            await createMutation.mutateAsync({
              projectId,
              name: row['Activity Name'] || row['name'] || '',
              description: row['Description'] || row['description'] || '',
              bucketName: row['Bucket'] || row['bucketName'] || '',
              location: row['Location'] || row['location'] || '',
              startDate: row['Start Date'] || row['startDate'] ? new Date(row['Start Date'] || row['startDate']) : undefined,
              endDate: row['End Date'] || row['endDate'] ? new Date(row['End Date'] || row['endDate']) : undefined,
              targetBeneficiaries: parseInt(row['Target Beneficiaries'] || row['targetBeneficiaries'] || '0'),
              actualBeneficiaries: parseInt(row['Actual Beneficiaries'] || row['actualBeneficiaries'] || '0'),
              status: row['Status'] || row['status'] || 'planned',
              notes: row['Notes'] || row['notes'] || '',
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }
        
        if (successCount > 0) {
          toast.success(`Imported ${successCount} activity(ies) successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
          utils.projectActivities.list.invalidate();
        } else {
          toast.error(`Import failed: ${errorCount} activity(ies) could not be imported`);
        }
      } catch (error) {
        toast.error("Import failed: Invalid file format");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredActivities = activities.filter((activity: any) => {
    const matchesSearch = activity.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBucket = bucketFilter === "all" || activity.bucketName === bucketFilter;
    return matchesSearch && matchesBucket;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "outline";
      case "ongoing": return "default";
      case "planned": return "secondary";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const uniqueBuckets = Array.from(new Set(activities.map((a: any) => a.bucketName).filter(Boolean)));

  if (isLoading) {
    return <div className="p-8 text-center">Loading activities...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Activities Management</h2>
          <p className="text-sm text-muted-foreground">Manage project activities and events</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 p-4 border-b">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={bucketFilter} onValueChange={setFilterBucket}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Buckets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buckets</SelectItem>
            {uniqueBuckets.map((bucket: string) => (
              <SelectItem key={bucket} value={bucket}>{bucket}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity List Sidebar */}
        <div className="w-1/3 border-r overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No activities found
            </div>
          ) : (
            <div className="divide-y">
              {filteredActivities.map((activity: any) => (
                <div
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedActivity?.id === activity.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{activity.name}</h3>
                    <Badge variant={getStatusColor(activity.status)} className="text-xs">
                      {activity.status}
                    </Badge>
                  </div>
                  {activity.bucketName && (
                    <p className="text-xs text-muted-foreground mb-2">
                      📦 {activity.bucketName}
                    </p>
                  )}
                  {activity.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {activity.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{activity.location || "No location"}</span>
                    <span>{activity.actualBeneficiaries || 0} / {activity.targetBeneficiaries || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Detail Panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedActivity ? (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{selectedActivity.name}</h2>
                  <div className="flex gap-2">
                    <Badge variant={getStatusColor(selectedActivity.status)}>
                      {selectedActivity.status}
                    </Badge>
                    {selectedActivity.bucketName && (
                      <Badge variant="outline">📦 {selectedActivity.bucketName}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => openUpdateModal(selectedActivity)} variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(selectedActivity.id)} variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedActivity.description || "No description provided"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <p className="mt-1">{selectedActivity.location || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Bucket</Label>
                      <p className="mt-1">{selectedActivity.bucketName || "Not assigned"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedActivity.startDate && (
                      <div>
                        <Label className="text-muted-foreground">Start Date</Label>
                        <p className="mt-1">{new Date(selectedActivity.startDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedActivity.endDate && (
                      <div>
                        <Label className="text-muted-foreground">End Date</Label>
                        <p className="mt-1">{new Date(selectedActivity.endDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Target Beneficiaries</Label>
                      <p className="mt-1 text-2xl font-bold">{selectedActivity.targetBeneficiaries || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Actual Beneficiaries</Label>
                      <p className="mt-1 text-2xl font-bold text-primary">{selectedActivity.actualBeneficiaries || 0}</p>
                    </div>
                  </div>

                  {selectedActivity.notes && (
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="mt-1">{selectedActivity.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select an activity to view details
            </div>
          )}
        </div>
      </div>

      {/* Create Activity Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Activity</DialogTitle>
            <DialogDescription>Add a new activity with all details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Activity Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter activity name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter activity description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bucketName">Bucket Name</Label>
                <Input
                  id="bucketName"
                  value={formData.bucketName}
                  onChange={(e) => setFormData({ ...formData, bucketName: e.target.value })}
                  placeholder="e.g., Education, Health"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="targetBeneficiaries">Target Beneficiaries</Label>
                <Input
                  id="targetBeneficiaries"
                  type="number"
                  value={formData.targetBeneficiaries}
                  onChange={(e) => setFormData({ ...formData, targetBeneficiaries: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="actualBeneficiaries">Actual Beneficiaries</Label>
                <Input
                  id="actualBeneficiaries"
                  type="number"
                  value={formData.actualBeneficiaries}
                  onChange={(e) => setFormData({ ...formData, actualBeneficiaries: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Activity Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Activity</DialogTitle>
            <DialogDescription>Edit activity details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Activity Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter activity name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter activity description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-bucketName">Bucket Name</Label>
                <Input
                  id="edit-bucketName"
                  value={formData.bucketName}
                  onChange={(e) => setFormData({ ...formData, bucketName: e.target.value })}
                  placeholder="e.g., Education, Health"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-targetBeneficiaries">Target Beneficiaries</Label>
                <Input
                  id="edit-targetBeneficiaries"
                  type="number"
                  value={formData.targetBeneficiaries}
                  onChange={(e) => setFormData({ ...formData, targetBeneficiaries: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-actualBeneficiaries">Actual Beneficiaries</Label>
                <Input
                  id="edit-actualBeneficiaries"
                  type="number"
                  value={formData.actualBeneficiaries}
                  onChange={(e) => setFormData({ ...formData, actualBeneficiaries: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
