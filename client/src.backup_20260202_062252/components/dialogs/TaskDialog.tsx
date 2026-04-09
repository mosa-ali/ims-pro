import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  assignedTo?: string | null;
  dueDate: Date;
  completedDate?: Date | null;
  priority: string;
  status: string;
  progressPercentage: number;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  task?: Task | null;
  onSave: (data: any) => Promise<void>;
}

export function TaskDialog({ open, onOpenChange, mode, task, onSave }: TaskDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: new Date().toISOString().split('T')[0],
    priority: "medium",
    status: "todo",
    progressPercentage: 0,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task && (mode === "view" || mode === "edit")) {
      setFormData({
        title: task.title,
        description: task.description || "",
        assignedTo: task.assignedTo || "",
        dueDate: new Date(task.dueDate).toISOString().split('T')[0],
        priority: task.priority,
        status: task.status,
        progressPercentage: task.progressPercentage,
      });
    } else if (mode === "create") {
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: new Date().toISOString().split('T')[0],
        priority: "medium",
        status: "todo",
        progressPercentage: 0,
      });
    }
  }, [task, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        dueDate: new Date(formData.dueDate),
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save task");
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
            {mode === "view" && "Task Details"}
            {mode === "edit" && "Edit Task"}
            {mode === "create" && "Create New Task"}
          </DialogTitle>
          <DialogDescription>
            {mode === "view" && "View task information"}
            {mode === "edit" && "Update task information"}
            {mode === "create" && "Add a new task to the project"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                disabled={isReadOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                disabled={isReadOnly}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
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
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="progressPercentage">Progress Percentage</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="progressPercentage"
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progressPercentage}
                  onChange={(e) => setFormData({ ...formData, progressPercentage: parseInt(e.target.value) })}
                  disabled={isReadOnly}
                  className="flex-1"
                />
                <span className="font-semibold w-12 text-right">{formData.progressPercentage}%</span>
              </div>
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
