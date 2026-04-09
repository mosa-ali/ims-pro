import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

interface BudgetLine {
  id: number;
  budgetCode: string;
  categoryName: string;
  budgetedAmount: string;
  projectId: number;
}

interface BudgetLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetLine?: BudgetLine | null;
  projectId: number;
  mode: "view" | "edit" | "create";
  onSave?: (data: Partial<BudgetLine>) => void;
}

export default function BudgetLineDialog({
  open,
  onOpenChange,
  budgetLine,
  projectId,
  mode,
  onSave,
}: BudgetLineDialogProps) {
  const [formData, setFormData] = useState({
    budgetCode: "",
    categoryName: "",
    budgetedAmount: "",
  });

  useEffect(() => {
    if (budgetLine && (mode === "view" || mode === "edit")) {
      setFormData({
        budgetCode: budgetLine.budgetCode || "",
        categoryName: budgetLine.categoryName || "",
        budgetedAmount: budgetLine.budgetedAmount || "",
      });
    } else if (mode === "create") {
      setFormData({
        budgetCode: "",
        categoryName: "",
        budgetedAmount: "",
      });
    }
  }, [budgetLine, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...formData,
        projectId,
        id: budgetLine?.id,
      });
    }
  };

  const isReadOnly = mode === "view";
  const title = mode === "create" ? "Create New Budget Line" : mode === "edit" ? "Edit Budget Line" : "Budget Line Details";
  const description = mode === "create" ? "Add a new budget line to the project" : mode === "edit" ? "Update budget line information" : "View budget line information";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetCode">Budget Code *</Label>
              <Input
                id="budgetCode"
                value={formData.budgetCode}
                onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
                disabled={isReadOnly}
                required
                placeholder="e.g., BC-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetedAmount">Budgeted Amount *</Label>
              <Input
                id="budgetedAmount"
                type="number"
                step="0.01"
                value={formData.budgetedAmount}
                onChange={(e) => setFormData({ ...formData, budgetedAmount: e.target.value })}
                disabled={isReadOnly}
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryName">Category Name *</Label>
            <Input
              id="categoryName"
              value={formData.categoryName}
              onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
              disabled={isReadOnly}
              required
              placeholder="e.g., Personnel, Equipment, Travel"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {isReadOnly ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {mode === "create" ? "Create" : "Save"}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
