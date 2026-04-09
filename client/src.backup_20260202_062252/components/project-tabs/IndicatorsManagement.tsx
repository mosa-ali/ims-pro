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
import { Plus, Search, Download } from "lucide-react";
import * as XLSX from 'xlsx';

interface IndicatorsManagementProps {
  projectId: number;
}

export default function IndicatorsManagement({ projectId }: IndicatorsManagementProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [bucketFilter, setFilterBucket] = useState("all");
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    bucketName: "",
    unit: "",
    targetValue: 0,
    actualValue: 0,
    status: "on_track",
    notes: "",
  });

  const { data: indicators = [], isLoading } = trpc.projectIndicators.list.useQuery({ projectId });

  const createMutation = trpc.projectIndicators.create.useMutation({
    onSuccess: () => {
      toast.success("Indicator created successfully");
      utils.projectIndicators.list.invalidate();
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create indicator: ${error.message}`);
    },
  });

  const updateMutation = trpc.projectIndicators.update.useMutation({
    onSuccess: () => {
      toast.success("Indicator updated successfully");
      utils.projectIndicators.list.invalidate();
      setIsUpdateModalOpen(false);
      setSelectedIndicator(null);
    },
    onError: (error) => {
      toast.error(`Failed to update indicator: ${error.message}`);
    },
  });

  const deleteMutation = trpc.projectIndicators.delete.useMutation({
    onSuccess: () => {
      toast.success("Indicator deleted successfully");
      utils.projectIndicators.list.invalidate();
      setSelectedIndicator(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete indicator: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      bucketName: "",
      unit: "",
      targetValue: 0,
      actualValue: 0,
      status: "on_track",
      notes: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast.error("Indicator name is required");
      return;
    }
    createMutation.mutate({
      projectId,
      ...formData,
    });
  };

  const handleUpdate = () => {
    if (!selectedIndicator || !formData.name) return;
    updateMutation.mutate({
      id: selectedIndicator.id,
      ...formData,
    });
  };

  const handleDelete = (indicatorId: number) => {
    if (confirm("Are you sure you want to delete this indicator?")) {
      deleteMutation.mutate({ id: indicatorId });
    }
  };

  const openUpdateModal = (indicator: any) => {
    setSelectedIndicator(indicator);
    setFormData({
      name: indicator.name || "",
      description: indicator.description || "",
      bucketName: indicator.bucketName || "",
      unit: indicator.unit || "",
      targetValue: indicator.targetValue || 0,
      actualValue: indicator.actualValue || 0,
      status: indicator.status || "on_track",
      notes: indicator.notes || "",
    });
    setIsUpdateModalOpen(true);
  };

  const handleExport = () => {
    const exportData = indicators.map(i => ({
      "Indicator Name": i.name,
      "Description": i.description || "",
      "Bucket": i.bucketName || "",
      "Unit": i.unit || "",
      "Target Value": i.targetValue,
      "Actual Value": i.actualValue,
      "Achievement %": i.targetValue > 0 ? ((i.actualValue / i.targetValue) * 100).toFixed(1) : 0,
      "Status": i.status,
      "Notes": i.notes || "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indicators");
    XLSX.writeFile(wb, `Project_${projectId}_Indicators.xlsx`);
    toast.success("Indicators exported successfully");
  };

  const handleExportTemplate = () => {
    const templateData = [{
      "Indicator Name": "Sample Indicator",
      "Description": "Description of the indicator",
      "Bucket": "Bucket Name",
      "Unit": "Number/Percentage/etc",
      "Target Value": 100,
      "Actual Value": 0,
      "Status": "on_track",
      "Notes": "Optional notes",
    }];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indicators Template");
    XLSX.writeFile(wb, `Indicators_Import_Template.xlsx`);
    toast.success("Template downloaded successfully");
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
              name: row['Indicator Name'] || row['name'] || '',
              description: row['Description'] || row['description'] || '',
              bucketName: row['Bucket'] || row['bucketName'] || '',
              unit: row['Unit'] || row['unit'] || '',
              targetValue: parseFloat(row['Target Value'] || row['targetValue'] || '0'),
              actualValue: parseFloat(row['Actual Value'] || row['actualValue'] || '0'),
              status: row['Status'] || row['status'] || 'on_track',
              notes: row['Notes'] || row['notes'] || '',
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }
        
        if (successCount > 0) {
          toast.success(`Imported ${successCount} indicator(s) successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
          utils.projectIndicators.list.invalidate();
        } else {
          toast.error(`Import failed: ${errorCount} indicator(s) could not be imported`);
        }
      } catch (error) {
        toast.error("Import failed: Invalid file format");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredIndicators = indicators.filter((indicator: any) => {
    const matchesSearch = indicator.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         indicator.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBucket = bucketFilter === "all" || indicator.bucketName === bucketFilter;
    return matchesSearch && matchesBucket;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "achieved": return "outline";
      case "on_track": return "default";
      case "at_risk": return "secondary";
      case "off_track": return "destructive";
      default: return "secondary";
    }
  };

  const getAchievementPercentage = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(((actual / target) * 100), 100);
  };

  const uniqueBuckets = Array.from(new Set(indicators.map((i: any) => i.bucketName).filter(Boolean)));

  if (isLoading) {
    return <div className="p-8 text-center">Loading indicators...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Indicators Management</h2>
          <p className="text-sm text-muted-foreground">Track project indicators and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportTemplate} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
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
            New Indicator
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 p-4 border-b">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search indicators..."
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
        {/* Indicator List Sidebar */}
        <div className="w-1/3 border-r overflow-y-auto">
          {filteredIndicators.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No indicators found
            </div>
          ) : (
            <div className="divide-y">
              {filteredIndicators.map((indicator: any) => (
                <div
                  key={indicator.id}
                  onClick={() => setSelectedIndicator(indicator)}
                  className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedIndicator?.id === indicator.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{indicator.name}</h3>
                    <Badge variant={getStatusColor(indicator.status)} className="text-xs">
                      {indicator.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {indicator.bucketName && (
                    <p className="text-xs text-muted-foreground mb-2">
                      📦 {indicator.bucketName}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{indicator.actualValue || 0} / {indicator.targetValue || 0} {indicator.unit}</span>
                    <span>{getAchievementPercentage(indicator.actualValue, indicator.targetValue).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${getAchievementPercentage(indicator.actualValue, indicator.targetValue)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicator Detail Panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedIndicator ? (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{selectedIndicator.name}</h2>
                  <div className="flex gap-2">
                    <Badge variant={getStatusColor(selectedIndicator.status)}>
                      {selectedIndicator.status.replace('_', ' ')}
                    </Badge>
                    {selectedIndicator.bucketName && (
                      <Badge variant="outline">📦 {selectedIndicator.bucketName}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => openUpdateModal(selectedIndicator)} variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(selectedIndicator.id)} variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedIndicator.description || "No description provided"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Unit</Label>
                      <p className="mt-1">{selectedIndicator.unit || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Bucket</Label>
                      <p className="mt-1">{selectedIndicator.bucketName || "Not assigned"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Target Value</Label>
                      <p className="mt-1 text-2xl font-bold">{selectedIndicator.targetValue || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Actual Value</Label>
                      <p className="mt-1 text-2xl font-bold text-primary">{selectedIndicator.actualValue || 0}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Achievement: {getAchievementPercentage(selectedIndicator.actualValue, selectedIndicator.targetValue).toFixed(1)}%</Label>
                    <div className="mt-2 h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${getAchievementPercentage(selectedIndicator.actualValue, selectedIndicator.targetValue)}%` }}
                      />
                    </div>
                  </div>

                  {selectedIndicator.notes && (
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="mt-1">{selectedIndicator.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select an indicator to view details
            </div>
          )}
        </div>
      </div>

      {/* Create Indicator Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Indicator</DialogTitle>
            <DialogDescription>Add a new indicator with all details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Indicator Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter indicator name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter indicator description"
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
                  placeholder="e.g., Output, Outcome"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., people, sessions"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="targetValue">Target Value</Label>
                <Input
                  id="targetValue"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="actualValue">Actual Value</Label>
                <Input
                  id="actualValue"
                  type="number"
                  value={formData.actualValue}
                  onChange={(e) => setFormData({ ...formData, actualValue: parseInt(e.target.value) || 0 })}
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
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="off_track">Off Track</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
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
              {createMutation.isPending ? "Creating..." : "Create Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Indicator Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Indicator</DialogTitle>
            <DialogDescription>Edit indicator details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Indicator Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter indicator name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter indicator description"
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
                  placeholder="e.g., Output, Outcome"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., people, sessions"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-targetValue">Target Value</Label>
                <Input
                  id="edit-targetValue"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-actualValue">Actual Value</Label>
                <Input
                  id="edit-actualValue"
                  type="number"
                  value={formData.actualValue}
                  onChange={(e) => setFormData({ ...formData, actualValue: parseInt(e.target.value) || 0 })}
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
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="off_track">Off Track</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
