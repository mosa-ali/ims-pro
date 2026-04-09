import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Indicator {
  id: number;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  type: string;
  category?: string | null;
  unit: string;
  baseline?: string | null;
  target: string;
  achieved: string;
  dataSource?: string | null;
  collectionFrequency?: string | null;
  responsiblePerson?: string | null;
  status: string;
}

interface IndicatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  indicator?: Indicator | null;
  onSave: (data: any) => Promise<void>;
}

export function IndicatorDialog({ open, onOpenChange, mode, indicator, onSave }: IndicatorDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "output",
    category: "",
    unit: "",
    baseline: 0,
    target: 0,
    achieved: 0,
    dataSource: "",
    collectionFrequency: "",
    responsiblePerson: "",
    status: "not_started",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (indicator && (mode === "view" || mode === "edit")) {
      setFormData({
        name: indicator.name,
        description: indicator.description || "",
        type: indicator.type,
        category: indicator.category || "",
        unit: indicator.unit,
        baseline: parseFloat(indicator.baseline || "0"),
        target: parseFloat(indicator.target),
        achieved: parseFloat(indicator.achieved),
        dataSource: indicator.dataSource || "",
        collectionFrequency: indicator.collectionFrequency || "",
        responsiblePerson: indicator.responsiblePerson || "",
        status: indicator.status,
      });
    } else if (mode === "create") {
      setFormData({
        name: "",
        description: "",
        type: "output",
        category: "",
        unit: "",
        baseline: 0,
        target: 0,
        achieved: 0,
        dataSource: "",
        collectionFrequency: "",
        responsiblePerson: "",
        status: "not_started",
      });
    }
  }, [indicator, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unit || formData.target <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save indicator");
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = mode === "view";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "view" && "Indicator Details"}
            {mode === "edit" && "Edit Indicator"}
            {mode === "create" && "Create New Indicator"}
          </DialogTitle>
          <DialogDescription>
            {mode === "view" && "View indicator information"}
            {mode === "edit" && "Update indicator information"}
            {mode === "create" && "Add a new MEAL indicator to the project"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Indicator Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isReadOnly}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={isReadOnly}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="output">Output</option>
                <option value="outcome">Outcome</option>
                <option value="impact">Impact</option>
                <option value="process">Process</option>
              </select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isReadOnly}
                placeholder="e.g., Education, Health"
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                disabled={isReadOnly}
                placeholder="e.g., percentage, number"
                required
              />
            </div>

            <div>
              <Label htmlFor="baseline">Baseline</Label>
              <Input
                id="baseline"
                type="number"
                step="0.01"
                value={formData.baseline}
                onChange={(e) => setFormData({ ...formData, baseline: parseFloat(e.target.value) || 0 })}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="target">Target *</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) || 0 })}
                disabled={isReadOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="achieved">Achieved</Label>
              <Input
                id="achieved"
                type="number"
                step="0.01"
                value={formData.achieved}
                onChange={(e) => setFormData({ ...formData, achieved: parseFloat(e.target.value) || 0 })}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="dataSource">Data Source</Label>
              <Input
                id="dataSource"
                value={formData.dataSource}
                onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="collectionFrequency">Collection Frequency</Label>
              <Input
                id="collectionFrequency"
                value={formData.collectionFrequency}
                onChange={(e) => setFormData({ ...formData, collectionFrequency: e.target.value })}
                disabled={isReadOnly}
                placeholder="e.g., monthly, quarterly"
              />
            </div>

            <div>
              <Label htmlFor="responsiblePerson">Responsible Person</Label>
              <Input
                id="responsiblePerson"
                value={formData.responsiblePerson}
                onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={isReadOnly}
                className="w-full p-2 border rounded-md"
              >
                <option value="not_started">Not Started</option>
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="achieved">Achieved</option>
                <option value="not_achieved">Not Achieved</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
