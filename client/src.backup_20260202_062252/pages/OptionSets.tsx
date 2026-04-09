import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const CATEGORIES = [
  { value: "grant_type", label: "Grant Types" },
  { value: "grant_status", label: "Grant Statuses" },
  { value: "project_status", label: "Project Statuses" },
  { value: "case_category", label: "Case Categories" },
  { value: "case_priority", label: "Case Priorities" },
  { value: "document_type", label: "Document Types" },
  { value: "beneficiary_type", label: "Beneficiary Types" },
  { value: "vulnerability_category", label: "Vulnerability Categories" },
];

interface OptionSet {
  id: number;
  category: string;
  value: string;
  label: string;
  labelAr?: string | null;
  displayOrder: number | null;
  isActive: boolean;
  isSystem: boolean;
}

export default function OptionSets() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("grant_type");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<OptionSet>>({});
  const [newOption, setNewOption] = useState({
    value: "",
    label: "",
    labelAr: "",
    displayOrder: 0,
  });

  const organizationId = user?.currentOrganizationId;

  const { data: options = [], isLoading, refetch } = trpc.optionSets.list.useQuery(
    { organizationId: organizationId || undefined, category: selectedCategory },
    { enabled: !!organizationId && user?.role === 'admin' }
  );

  const createMutation = trpc.optionSets.create.useMutation({
    onSuccess: () => {
      toast.success("Option added successfully");
      setIsAddDialogOpen(false);
      setNewOption({ value: "", label: "", labelAr: "", displayOrder: 0 });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add option: ${error.message}`);
    },
  });

  const updateMutation = trpc.optionSets.update.useMutation({
    onSuccess: () => {
      toast.success("Option updated successfully");
      setEditingId(null);
      setEditForm({});
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update option: ${error.message}`);
    },
  });

  const deleteMutation = trpc.optionSets.delete.useMutation({
    onSuccess: () => {
      toast.success("Option deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete option: ${error.message}`);
    },
  });

  const handleAdd = () => {
    if (!organizationId) {
      toast.error("Organization ID is required");
      return;
    }

    if (!newOption.value || !newOption.label) {
      toast.error("Value and Label are required");
      return;
    }

    createMutation.mutate({
      organizationId,
      category: selectedCategory,
      ...newOption,
    });
  };

  const startEdit = (option: OptionSet) => {
    if (option.isSystem) {
      toast.info("System options cannot be edited");
      return;
    }
    setEditingId(option.id);
    setEditForm(option);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      label: editForm.label,
      labelAr: editForm.labelAr || undefined,
      displayOrder: editForm.displayOrder ?? undefined,
      isActive: editForm.isActive,
    });
  };

  const handleDelete = (id: number, isSystem: boolean) => {
    if (isSystem) {
      toast.error("System options cannot be deleted");
      return;
    }

    if (confirm("Are you sure you want to delete this option?")) {
      deleteMutation.mutate({ id, hard: false });
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Only administrators can access option sets settings.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings2 className="h-8 w-8" />
              Option Sets & Lookups
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage dropdown values and lookup options used throughout the system
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Manage Options</CardTitle>
                <CardDescription>Select a category to view and edit its options</CardDescription>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading options...</div>
            ) : options.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No options found for {getCategoryLabel(selectedCategory)}. Click "Add Option" to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {options.map((option: OptionSet) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/30"
                  >
                    {editingId === option.id ? (
                      <>
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <Input
                            value={editForm.label || ""}
                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                            placeholder="Label (English)"
                          />
                          <Input
                            value={editForm.labelAr || ""}
                            onChange={(e) => setEditForm({ ...editForm, labelAr: e.target.value })}
                            placeholder="Label (Arabic)"
                          />
                          <Input
                            type="number"
                            value={editForm.displayOrder || 0}
                            onChange={(e) => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) })}
                            placeholder="Display Order"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">Value: {option.value}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {option.labelAr || <span className="italic">No Arabic label</span>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Order: {option.displayOrder}
                            {option.isSystem && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                System
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(option)}
                            disabled={option.isSystem}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(option.id, option.isSystem)}
                            disabled={option.isSystem || deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Grant Types</h3>
              <p className="text-sm text-muted-foreground">Types of grants (e.g., Emergency Relief, Development, Capacity Building)</p>
            </div>
            <div>
              <h3 className="font-semibold">Project Statuses</h3>
              <p className="text-sm text-muted-foreground">Project lifecycle stages (e.g., Planning, Active, On Hold, Completed)</p>
            </div>
            <div>
              <h3 className="font-semibold">Case Categories</h3>
              <p className="text-sm text-muted-foreground">Types of beneficiary cases (e.g., Health, Education, Shelter, Protection)</p>
            </div>
            <div>
              <h3 className="font-semibold">Document Types</h3>
              <p className="text-sm text-muted-foreground">Classification of documents (e.g., Proposal, Report, Agreement, Invoice)</p>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Option</DialogTitle>
              <DialogDescription>
                Add a new option to {getCategoryLabel(selectedCategory)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="value">Value (Internal ID)</Label>
                <Input
                  id="value"
                  value={newOption.value}
                  onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                  placeholder="e.g., emergency_relief"
                />
              </div>
              <div>
                <Label htmlFor="label">Label (English)</Label>
                <Input
                  id="label"
                  value={newOption.label}
                  onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                  placeholder="e.g., Emergency Relief"
                />
              </div>
              <div>
                <Label htmlFor="labelAr">Label (Arabic)</Label>
                <Input
                  id="labelAr"
                  value={newOption.labelAr}
                  onChange={(e) => setNewOption({ ...newOption, labelAr: e.target.value })}
                  placeholder="e.g., الإغاثة الطارئة"
                />
              </div>
              <div>
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={newOption.displayOrder}
                  onChange={(e) => setNewOption({ ...newOption, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Option"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
