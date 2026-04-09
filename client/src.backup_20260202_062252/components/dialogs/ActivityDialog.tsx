import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Activity {
  id: number;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  target: number;
  achieved: number;
  unit?: string | null;
  responsiblePerson?: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
}

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  activity?: Activity | null;
  onSave: (data: any) => Promise<void>;
}

export function ActivityDialog({ open, onOpenChange, mode, activity, onSave }: ActivityDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    target: 0,
    achieved: 0,
    unit: "",
    responsiblePerson: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: "planned",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activity && (mode === "view" || mode === "edit")) {
      setFormData({
        name: activity.name,
        description: activity.description || "",
        target: activity.target,
        achieved: activity.achieved,
        unit: activity.unit || "",
        responsiblePerson: activity.responsiblePerson || "",
        startDate: new Date(activity.startDate).toISOString().split('T')[0],
        endDate: new Date(activity.endDate).toISOString().split('T')[0],
        status: activity.status,
      });
    } else if (mode === "create") {
      setFormData({
        name: "",
        description: "",
        target: 0,
        achieved: 0,
        unit: "",
        responsiblePerson: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        status: "planned",
      });
    }
  }, [activity, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.target <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save activity");
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
            {mode === "view" && "Activity Details"}
            {mode === "edit" && "Edit Activity"}
            {mode === "create" && "Create New Activity"}
          </DialogTitle>
          <DialogDescription>
            {mode === "view" && "View activity information"}
            {mode === "edit" && "Update activity information"}
            {mode === "create" && "Add a new activity to the project"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Activity Name *</Label>
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
              <Label htmlFor="target">Target *</Label>
              <Input
                id="target"
                type="number"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: parseInt(e.target.value) || 0 })}
                disabled={isReadOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="achieved">Achieved</Label>
              <Input
                id="achieved"
                type="number"
                value={formData.achieved}
                onChange={(e) => setFormData({ ...formData, achieved: parseInt(e.target.value) || 0 })}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                disabled={isReadOnly}
                placeholder="e.g., sessions, participants"
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
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={isReadOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={isReadOnly}
                className="w-full p-2 border rounded-md"
              >
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
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
