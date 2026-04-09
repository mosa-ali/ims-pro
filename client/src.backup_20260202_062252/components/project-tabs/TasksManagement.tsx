import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import { Plus, Search, Download, Upload, X } from "lucide-react";
import * as XLSX from 'xlsx';

interface TasksManagementProps {
  projectId: number;
}

export default function TasksManagement({ projectId }: TasksManagementProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: "program" as "program" | "meal" | "logistics" | "finance" | "hr" | "security" | "other",
    activityId: null as number | null, // For Program department
    activityName: "", // For other departments
    assignedTo: "",
    assignedToEmail: "",
    assignedBy: "",
    assignedByEmail: "",
    priority: "medium",
    status: "todo",
    riskLevel: "low",
    milestone: false,
    progressPercentage: 0,
    startDate: "",
    dueDate: "",
  });

  // Fetch activities from Activities Tab (for Program department)
  const { data: activitiesFromTab = [] } = trpc.projectActivities.list.useQuery(
    { projectId },
    { enabled: formData.department === "program" }
  );

  const { data: tasks = [], isLoading } = trpc.projectTasks.list.useQuery({ projectId });

  const createMutation = trpc.projectTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      utils.projectTasks.list.invalidate();
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const updateMutation = trpc.projectTasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      utils.projectTasks.list.invalidate();
      setIsUpdateModalOpen(false);
      setSelectedTask(null);
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const deleteMutation = trpc.projectTasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted successfully");
      utils.projectTasks.list.invalidate();
      setSelectedTask(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      department: "program" as "program" | "meal" | "logistics" | "finance" | "hr" | "security" | "other",
      activityId: null,
      activityName: "",
      assignedTo: "",
      assignedToEmail: "",
      assignedBy: "",
      assignedByEmail: "",
      priority: "medium",
      status: "todo",
      riskLevel: "low",
      milestone: false,
      progressPercentage: 0,
      startDate: "",
      dueDate: "",
    });
  };

  const handleCreate = () => {
    if (!formData.title) {
      toast.error("Task title is required");
      return;
    }
    // Destructure department out since it's not in the database schema
    const { department, ...taskData } = formData;
    createMutation.mutate({
      projectId,
      ...taskData,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedTask || !formData.title) return;
    updateMutation.mutate({
      id: selectedTask.id,
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    });
  };

  const handleDelete = (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate({ id: taskId });
    }
  };

  const openUpdateModal = (task: any) => {
    setSelectedTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo || "",
      assignedToEmail: task.assignedToEmail || "",
      assignedBy: task.assignedBy || "",
      assignedByEmail: task.assignedByEmail || "",
      priority: task.priority || "medium",
      status: task.status || "todo",
      riskLevel: task.riskLevel || "low",
      milestone: task.milestone || "",
      progressPercentage: task.progressPercentage || 0,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    });
    setIsUpdateModalOpen(true);
  };

  const handleExport = () => {
    const exportData = tasks.map(t => ({
      "Title": t.title,
      "Description": t.description || "",
      "Assigned To": t.assignedTo || "",
      "Assigned To Email": t.assignedToEmail || "",
      "Assigned By": t.assignedBy || "",
      "Assigned By Email": t.assignedByEmail || "",
      "Priority": t.priority,
      "Status": t.status,
      "Risk Level": t.riskLevel || "",
      "Milestone": t.milestone || "",
      "Progress %": t.progressPercentage,
      "Start Date": t.startDate ? new Date(t.startDate).toLocaleDateString() : "",
      "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `Project_${projectId}_Tasks.xlsx`);
    toast.success("Tasks exported successfully");
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
              title: row['Title'] || row['title'] || '',
              description: row['Description'] || row['description'] || '',
              assignedTo: row['Assigned To'] || row['assignedTo'] || '',
              assignedToEmail: row['Assigned To Email'] || row['assignedToEmail'] || '',
              assignedBy: row['Assigned By'] || row['assignedBy'] || '',
              assignedByEmail: row['Assigned By Email'] || row['assignedByEmail'] || '',
              priority: row['Priority'] || row['priority'] || 'medium',
              status: row['Status'] || row['status'] || 'todo',
              riskLevel: row['Risk Level'] || row['riskLevel'] || 'low',
              milestone: row['Milestone'] || row['milestone'] || '',
              progressPercentage: parseInt(row['Progress (%)'] || row['progressPercentage'] || '0'),
              startDate: row['Start Date'] || row['startDate'] ? new Date(row['Start Date'] || row['startDate']) : undefined,
              dueDate: row['Due Date'] || row['dueDate'] ? new Date(row['Due Date'] || row['dueDate']) : undefined,
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }
        
        if (successCount > 0) {
          toast.success(`Imported ${successCount} task(s) successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
          utils.projectTasks.list.invalidate();
        } else {
          toast.error(`Import failed: ${errorCount} task(s) could not be imported`);
        }
      } catch (error) {
        toast.error("Import failed: Invalid file format");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredTasks = tasks.filter((task: any) => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "outline";
      case "in_progress": return "default";
      case "review": return "secondary";
      case "blocked": return "destructive";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading tasks...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Tasks Management</h2>
          <p className="text-sm text-muted-foreground">Manage project tasks and assignments</p>
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
            New Task
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 p-4 border-b">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task List Sidebar */}
        <div className="w-1/3 border-r overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tasks found
            </div>
          ) : (
            <div className="divide-y">
              {filteredTasks.map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedTask?.id === task.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{task.title}</h3>
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{task.assignedTo || "Unassigned"}</span>
                    <Badge variant={getStatusColor(task.status)} className="text-xs">
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {task.progressPercentage !== null && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${task.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Detail Panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedTask ? (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{selectedTask.title}</h2>
                  <div className="flex gap-2">
                    <Badge variant={getPriorityColor(selectedTask.priority)}>
                      {selectedTask.priority}
                    </Badge>
                    <Badge variant={getStatusColor(selectedTask.status)}>
                      {selectedTask.status.replace('_', ' ')}
                    </Badge>
                    {selectedTask.riskLevel && (
                      <Badge variant="outline">Risk: {selectedTask.riskLevel}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => openUpdateModal(selectedTask)} variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(selectedTask.id)} variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedTask.description || "No description provided"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <p className="mt-1">{selectedTask.assignedTo || "Unassigned"}</p>
                      {selectedTask.assignedToEmail && (
                        <p className="text-sm text-muted-foreground">{selectedTask.assignedToEmail}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Assigned By</Label>
                      <p className="mt-1">{selectedTask.assignedBy || "N/A"}</p>
                      {selectedTask.assignedByEmail && (
                        <p className="text-sm text-muted-foreground">{selectedTask.assignedByEmail}</p>
                      )}
                    </div>
                  </div>

                  {selectedTask.milestone && (
                    <div>
                      <Label className="text-muted-foreground">Milestone</Label>
                      <p className="mt-1">{selectedTask.milestone}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-muted-foreground">Progress: {selectedTask.progressPercentage}%</Label>
                    <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${selectedTask.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedTask.startDate && (
                      <div>
                        <Label className="text-muted-foreground">Start Date</Label>
                        <p className="mt-1">{new Date(selectedTask.startDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedTask.dueDate && (
                      <div>
                        <Label className="text-muted-foreground">Due Date</Label>
                        <p className="mt-1">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a task to view details
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task with all details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Department Selection */}
            <div className="grid gap-2">
              <Label htmlFor="department">Department *</Label>
              <Select 
                value={formData.department} 
                onValueChange={(value: any) => setFormData({ ...formData, department: value, activityId: null, activityName: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="meal">MEAL</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activity Field - Conditional based on department */}
            {formData.department === "program" ? (
              <div className="grid gap-2">
                <Label htmlFor="activityId">Activity *</Label>
                <Select 
                  value={formData.activityId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, activityId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {activitiesFromTab.map((activity: any) => (
                      <SelectItem key={activity.id} value={activity.id.toString()}>
                        {activity.activityName || activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="activityName">Activity Name *</Label>
                <Input
                  id="activityName"
                  value={formData.activityName}
                  onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                  placeholder="Enter activity name"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignedToEmail">Assignee Email</Label>
                <Input
                  id="assignedToEmail"
                  type="email"
                  value={formData.assignedToEmail}
                  onChange={(e) => setFormData({ ...formData, assignedToEmail: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignedBy">Assigned By</Label>
                <Input
                  id="assignedBy"
                  value={formData.assignedBy}
                  onChange={(e) => setFormData({ ...formData, assignedBy: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignedByEmail">Assigner Email</Label>
                <Input
                  id="assignedByEmail"
                  type="email"
                  value={formData.assignedByEmail}
                  onChange={(e) => setFormData({ ...formData, assignedByEmail: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select value={formData.riskLevel} onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="milestone">Milestone</Label>
              <Input
                id="milestone"
                value={formData.milestone}
                onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
                placeholder="Enter milestone"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="progress">Progress: {formData.progressPercentage}%</Label>
              <Slider
                id="progress"
                value={[formData.progressPercentage]}
                onValueChange={([value]) => setFormData({ ...formData, progressPercentage: value })}
                max={100}
                step={5}
              />
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
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Task Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
            <DialogDescription>Edit task details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Same form fields as create modal */}
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Task Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-assignedTo">Assigned To</Label>
                <Input
                  id="edit-assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-assignedToEmail">Assignee Email</Label>
                <Input
                  id="edit-assignedToEmail"
                  type="email"
                  value={formData.assignedToEmail}
                  onChange={(e) => setFormData({ ...formData, assignedToEmail: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-riskLevel">Risk Level</Label>
                <Select value={formData.riskLevel} onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-progress">Progress: {formData.progressPercentage}%</Label>
              <Slider
                id="edit-progress"
                value={[formData.progressPercentage]}
                onValueChange={([value]) => setFormData({ ...formData, progressPercentage: value })}
                max={100}
                step={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
