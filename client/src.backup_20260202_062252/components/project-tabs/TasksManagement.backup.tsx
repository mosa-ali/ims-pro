import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, User, CheckCircle2, Clock, AlertCircle, Eye, Edit, Trash2, FileDown, Upload } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { TaskDialog } from "../dialogs/TaskDialog";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TasksManagementProps {
  projectId: number;
}

export default function TasksManagement({ projectId }: TasksManagementProps) {
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | "create" | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // Fetch tasks from backend
  const { data: tasks = [], isLoading } = trpc.projectTasks.list.useQuery({ projectId });

  // Mutations
  const createMutation = trpc.projectTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      utils.projectTasks.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const updateMutation = trpc.projectTasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      utils.projectTasks.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const deleteMutation = trpc.projectTasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted successfully");
      utils.projectTasks.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  // Calculate summary
  const tasksSummary = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length,
    pending: tasks.filter(t => t.status === 'todo').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in_progress":
      case "review":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "outline",
      in_progress: "default",
      review: "secondary",
      blocked: "destructive",
      todo: "secondary",
    };
    return variants[status] || "secondary";
  };

  const getPriorityBadge = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return variants[priority] || "secondary";
  };

  const handleExportToExcel = () => {
    const exportData = tasks.length > 0 ? tasks : [
      { title: "Example Task", assignedTo: "John Doe", dueDate: new Date(), status: "todo", priority: "medium", progressPercentage: 0 }
    ];

    const ws = XLSX.utils.json_to_sheet(exportData.map(t => ({
      "Task Title": t.title,
      "Assigned To": t.assignedTo || "N/A",
      "Due Date": new Date(t.dueDate).toLocaleDateString(),
      "Status": t.status,
      "Priority": t.priority,
      "Progress %": t.progressPercentage,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `Project_${projectId}_Tasks.xlsx`);
    toast.success("Export successful");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        toast.success(`Import successful: ${jsonData.length} records imported`);
      } catch (error) {
        toast.error("Import failed: Invalid file format");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async (data: any) => {
    if (dialogMode === "create") {
      await createMutation.mutateAsync({
        projectId,
        ...data,
      });
    } else if (dialogMode === "edit" && selectedTask) {
      await updateMutation.mutateAsync({
        id: selectedTask.id,
        ...data,
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{tasksSummary.total}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{tasksSummary.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{tasksSummary.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{tasksSummary.overdue}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{tasksSummary.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Task List</h3>
          <p className="text-sm text-muted-foreground">
            Manage all tasks for this project
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportToExcel}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <label>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>
          <Button
            onClick={() => {
              setSelectedTask(null);
              setDialogMode("create");
            }}
            size="sm"
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No tasks found. Click "Add Task" to create one.
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => {
            const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <CardTitle className="text-base">{task.title}</CardTitle>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getPriorityBadge(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge variant={getStatusBadge(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-semibold">{task.progressPercentage}%</span>
                    </div>
                    <Progress value={task.progressPercentage} className="h-2" />
                  </div>

                  {/* Meta Information */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{task.assignedTo || "Not assigned"}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                      <Calendar className="h-4 w-4" />
                      <span>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setSelectedTask(task);
                        setDialogMode("view");
                      }}
                      size="sm"
                      variant="default"
                      className="h-8"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedTask(task);
                        setDialogMode("edit");
                      }}
                      size="sm"
                      variant="outline"
                      className="h-8"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeleteId(task.id)}
                      size="sm"
                      variant="destructive"
                      className="h-8"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Task Dialog */}
      <TaskDialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
            setSelectedTask(null);
          }
        }}
        mode={dialogMode || "view"}
        task={selectedTask}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
