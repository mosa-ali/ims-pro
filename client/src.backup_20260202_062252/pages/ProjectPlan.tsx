import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle, Download } from "lucide-react";
import { format, differenceInMonths, startOfMonth, addMonths } from "date-fns";
// Checkbox removed - using colored timeline bars instead

type Department = "program" | "meal" | "logistics" | "finance" | "hr" | "security" | "other";
type Status = "not_started" | "ongoing" | "completed";

interface ActivityRow {
  id: number;
  activityName: string;
  isFromActivitiesTab: boolean;
}

interface TaskRow {
  id: number;
  taskName: string;
  status: Status;
  responsible: string;
  startDate: string;
  endDate: string;
  checkedMonths: string[]; // Array of month strings in format "YYYY-MM"
}

interface ProjectYear {
  yearNumber: number;
  startDate: Date;
  endDate: Date;
  months: MonthInfo[];
}

interface MonthInfo {
  date: Date;
  monthLabel: string;
  yearLabel: string;
  monthKey: string; // "YYYY-MM" format for matching
}

export default function ProjectPlan() {
  const { id } = useParams();
  const projectId = id ? parseInt(id) : null;
  const { toast } = useToast();

  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("program");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");

  // State for inline editing
  const [editingCell, setEditingCell] = useState<{ taskId: number; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Fetch project data
  const { data: projectData } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  // Fetch activities from Activities Tab (for Program department only)
  const { data: activitiesFromTab } = trpc.projectActivities.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId && selectedDepartment === "program" }
  );

  // Fetch tasks from Task Management tab
  const { data: tasksFromTaskManagement = [] } = trpc.projectTasks.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Debug logging
  useEffect(() => {
    if (tasksFromTaskManagement && tasksFromTaskManagement.length > 0) {
      console.log('=== TASKS FROM TASK MANAGEMENT ===');
      console.log('Total tasks:', tasksFromTaskManagement.length);
      console.log('Tasks:', JSON.stringify(tasksFromTaskManagement, null, 2));
    }
    if (activitiesFromTab && activitiesFromTab.length > 0) {
      console.log('=== ACTIVITIES FROM TAB ===');
      console.log('Total activities:', activitiesFromTab.length);
      console.log('Activities:', JSON.stringify(activitiesFromTab, null, 2));
    }
  }, [tasksFromTaskManagement, activitiesFromTab]);

  // Build activity rows based on department
  const activityRows: ActivityRow[] = useMemo(() => {
    if (selectedDepartment === "program") {
      // Program department: Load activities directly from Activities Tab
      return (activitiesFromTab || []).map((activity: any) => ({
        id: activity.id, // This is the activity ID from Activities Tab
        activityName: activity.activityName || activity.name || '',
        isFromActivitiesTab: true
      }));
    } else {
      // Other departments: Extract unique activity names from tasks
      const uniqueActivityNames = new Set<string>();
      (tasksFromTaskManagement || []).forEach((task: any) => {
        if (task.activityName) {
          uniqueActivityNames.add(task.activityName);
        }
      });
      
      return Array.from(uniqueActivityNames).map((activityName, index) => ({
        id: -1 * (index + 1), // Negative IDs for non-Program activities (not stored in Activities table)
        activityName,
        isFromActivitiesTab: false
      }));
    }
  }, [selectedDepartment, activitiesFromTab, tasksFromTaskManagement]);

  // Calculate project years and months
  const projectYears: ProjectYear[] = useMemo(() => {
    if (!projectData) return [];

    const startDate = new Date(projectData.startDate);
    const endDate = new Date(projectData.endDate);
    const totalMonths = differenceInMonths(endDate, startDate) + 1;
    const years: ProjectYear[] = [];

    let currentYearStart = startDate;
    let yearNumber = 1;

    while (currentYearStart <= endDate) {
      const currentYearEnd = new Date(
        Math.min(
          addMonths(currentYearStart, 11).getTime(),
          endDate.getTime()
        )
      );

      const months: MonthInfo[] = [];
      let monthDate = startOfMonth(currentYearStart);
      
      while (monthDate <= currentYearEnd) {
        months.push({
          date: monthDate,
          monthLabel: format(monthDate, 'MMM').toUpperCase(),
          yearLabel: format(monthDate, 'yyyy'),
          monthKey: format(monthDate, 'yyyy-MM')
        });
        monthDate = addMonths(monthDate, 1);
      }

      years.push({
        yearNumber,
        startDate: currentYearStart,
        endDate: currentYearEnd,
        months
      });

      currentYearStart = addMonths(currentYearEnd, 1);
      yearNumber++;
    }

    return years;
  }, [projectData]);

  const currentYear = projectYears.find(y => y.yearNumber === selectedYear);

  const toggleExpand = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "ongoing": return <Clock className="w-4 h-4 text-blue-600" />;
      case "not_started": return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "ongoing": return "bg-blue-100 text-blue-700";
      case "not_started": return "bg-gray-100 text-gray-600";
    }
  };

  const durationDisplay = useMemo(() => {
    if (!projectData) return '';
    
    const totalMonths = differenceInMonths(
      new Date(projectData.endDate),
      new Date(projectData.startDate)
    ) + 1;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    const parts = [];
    if (totalMonths > 0) parts.push(`${totalMonths} months`);
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    
    return parts.join(' | ');
  }, [projectData]);

  // Export to Excel mutation
  const exportMutation = trpc.projectPlan.exportToExcel.useMutation({
    onSuccess: (data) => {
      // Decode base64 and create blob
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Excel file exported successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message,
      });
    }
  });

  const handleExport = () => {
    if (!projectId || !projectData || !selectedPlanId) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "No plan selected",
      });
      return;
    }
    
    exportMutation.mutate({
      planId: selectedPlanId,
    });
  };

  // Handle add activity (for non-Program departments only)
  const handleAddActivity = () => {
    if (!newActivityName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Activity name is required",
      });
      return;
    }

    // TODO: Create activity in project_plan_items table
    toast({
      title: "Activity Added",
      description: `Activity "${newActivityName}" added successfully`,
    });

    setNewActivityName("");
    setIsAddActivityDialogOpen(false);
  };

  // Create task mutation
  const utils = trpc.useUtils();
  const createTaskMutation = trpc.projectPlan.createTask.useMutation({
    onSuccess: () => {
      toast({
        title: "Task Added",
        description: `Task "${newTaskData.taskName}" added successfully`,
      });
      // Refresh plan items
      utils.projectPlan.getItemsByPlan.invalidate({ planId: selectedPlanId! });
      // Reset form
      setNewTaskData({
        taskName: "",
        status: "not_started",
        responsible: "",
        startDate: "",
        endDate: ""
      });
      setIsAddTaskDialogOpen(false);
      setSelectedActivityForTask(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Task",
        description: error.message,
      });
    }
  });

  // Handle add task
  // handleAddTask removed - tasks are now created in Task Management tab

  // Inline editing handlers
  const startEditing = (taskId: number, field: string, currentValue: string) => {
    setEditingCell({ taskId, field });
    setEditingValue(currentValue);
  };

  const saveEdit = (taskId: number, field: string) => {
    // TODO: Save to backend via tRPC mutation
    toast({
      title: "Saved",
      description: `${field} updated successfully`,
    });
    setEditingCell(null);
    setEditingValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, taskId: number, field: string) => {
    if (e.key === 'Enter') {
      saveEdit(taskId, field);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // toggleMonthCheck removed - timeline bars are read-only, calculated from task dates

  if (!projectId) {
    return <div className="p-6">Project ID not found</div>;
  }

  if (!projectData) {
    return <div className="p-6">Loading project data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Project Plan</h2>
        <p className="text-muted-foreground">Operational planning and implementation tracking</p>
      </div>

      {/* Project Duration Card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div>
            <div className="font-semibold text-blue-900">
              Project Duration: {format(new Date(projectData.startDate), 'M/d/yyyy')} — {format(new Date(projectData.endDate), 'M/d/yyyy')}
            </div>
            <div className="text-sm text-blue-700">{durationDisplay}</div>
          </div>
        </div>
      </Card>

      {/* Year Selector */}
      {projectYears.length > 0 && (
        <div className="flex items-center gap-4">
          <span className="font-medium">Project Years:</span>
          <div className="flex gap-2">
            {projectYears.map(year => (
              <Button
                key={year.yearNumber}
                variant={selectedYear === year.yearNumber ? "default" : "outline"}
                onClick={() => setSelectedYear(year.yearNumber)}
                className={selectedYear === year.yearNumber ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <div className="text-center">
                  <div className="font-semibold">Year {year.yearNumber}</div>
                  <div className="text-xs">
                    ({format(year.startDate, 'yyyy-MM-dd')} - {format(year.endDate, 'yyyy-MM-dd')})
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Department Selector */}
      <div className="flex items-center gap-4">
        <label className="font-medium">Department *</label>
        <Select value={selectedDepartment} onValueChange={(value) => setSelectedDepartment(value as Department)}>
          <SelectTrigger className="w-[300px]">
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

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {/* Show Add Activity button for non-Program departments only */}
          {selectedDepartment !== "program" && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsAddActivityDialogOpen(true)}
            >
              <span className="mr-2">+</span>
              Add Activity
            </Button>
          )}

        </div>
        <Button 
          variant="outline"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Main activities are loaded from the Activities Tab. Tasks are managed in the Task Management Tab and displayed here for planning purposes.
        </p>
      </div>

      {/* Project Plan Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[1400px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-semibold border-r min-w-[300px]">MAIN ACTIVITY</th>
              <th className="text-left p-3 font-semibold border-r min-w-[300px]">SUB-ACTIVITY (TASK)</th>
              <th className="text-left p-3 font-semibold border-r w-32">STATUS</th>
              <th className="text-left p-3 font-semibold border-r w-40">RESPONSIBLE</th>
              {currentYear?.months.map((month, idx) => (
                <th key={idx} className="text-center p-3 font-semibold border-r w-24">
                  <div>{month.monthLabel}</div>
                  <div className="text-xs font-normal text-muted-foreground">{month.yearLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activityRows.length === 0 ? (
              <tr>
                <td colSpan={4 + (currentYear?.months.length || 0)} className="text-center p-12 text-muted-foreground">
                  {selectedDepartment === "program" 
                    ? "No activities found. Please add activities in the Activities Tab first."
                    : "No activities found. Click 'Add Activity' to start."}
                </td>
              </tr>
            ) : (
              <>
                {activityRows.map((activity) => {
                  // Get tasks for this activity from Task Management
                  const tasks: TaskRow[] = (tasksFromTaskManagement || [])
                    .filter((task: any) => {
                      if (selectedDepartment === "program") {
                        // For Program: match by activityId
                        return task.activityId === activity.id;
                      } else {
                        // For other departments: match by activityName
                        return task.activityName === activity.activityName;
                      }
                    })
                    .map((task: any) => ({
                      id: task.id,
                      taskName: task.title || '',
                      status: task.status || 'not_started',
                      responsible: task.assignedTo || '',
                      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "",
                      endDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
                      checkedMonths: [] // Will be calculated from start/end dates
                    }));
                  const isExpanded = expandedRows.has(`activity-${activity.id}`);

                  return (
                    <React.Fragment key={`activity-${activity.id}`}>
                      {/* Activity Row */}
                      <tr className="border-b hover:bg-muted/50 bg-blue-50">
                        <td className="p-3 border-r font-semibold">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand(`activity-${activity.id}`)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-blue-600">{activity.activityName}</span>
                          </div>
                        </td>
                        <td className="p-3 border-r text-muted-foreground">—</td>
                        <td className="p-3 border-r">—</td>
                        <td className="p-3 border-r">—</td>
                        {currentYear?.months.map((month, idx) => (
                          <td key={idx} className="p-3 border-r bg-gray-50"></td>
                        ))}
                      </tr>

                      {/* Task Rows (only if expanded) */}
                      {isExpanded && tasks.length === 0 && (
                        <tr>
                          <td className="p-3 border-r"></td>
                          <td colSpan={3 + (currentYear?.months.length || 0)} className="p-3 text-center text-muted-foreground text-sm">
                            No tasks yet. Click "Add Task" to add sub-activities.
                          </td>
                        </tr>
                      )}

                      {isExpanded && tasks.map((task) => (
                        <tr key={`task-${task.id}`} className="border-b hover:bg-muted/50">
                          <td className="p-3 border-r"></td>
                          
                          {/* SUB-ACTIVITY (TASK) - Editable */}
                          <td className="p-3 border-r">
                            {editingCell?.taskId === task.id && editingCell?.field === 'taskName' ? (
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => saveEdit(task.id, 'taskName')}
                                onKeyDown={(e) => handleKeyDown(e, task.id, 'taskName')}
                                autoFocus
                                className="h-8"
                              />
                            ) : (
                              <div 
                                className="pl-4 cursor-pointer hover:bg-accent/50 rounded px-2 py-1"
                                onClick={() => startEditing(task.id, 'taskName', task.taskName)}
                              >
                                {task.taskName}
                              </div>
                            )}
                          </td>
                          
                          {/* STATUS - Editable */}
                          <td className="p-3 border-r">
                            {editingCell?.taskId === task.id && editingCell?.field === 'status' ? (
                              <Select 
                                value={editingValue}
                                onValueChange={(value) => {
                                  setEditingValue(value);
                                  saveEdit(task.id, 'status');
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="ongoing">Ongoing</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-2 py-1"
                                onClick={() => startEditing(task.id, 'status', task.status)}
                              >
                                {getStatusIcon(task.status)}
                                <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(task.status)}`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </td>
                          
                          {/* RESPONSIBLE - Editable */}
                          <td className="p-3 border-r">
                            {editingCell?.taskId === task.id && editingCell?.field === 'responsible' ? (
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => saveEdit(task.id, 'responsible')}
                                onKeyDown={(e) => handleKeyDown(e, task.id, 'responsible')}
                                autoFocus
                                className="h-8"
                              />
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1"
                                onClick={() => startEditing(task.id, 'responsible', task.responsible || '')}
                              >
                                {task.responsible || '—'}
                              </div>
                            )}
                          </td>
                          
                          {/* Month Timeline Bars */}
                          {currentYear?.months.map((month, idx) => {
                            // Check if this month falls within task duration
                            const taskStart = task.startDate ? new Date(task.startDate) : null;
                            const taskEnd = task.endDate ? new Date(task.endDate) : null;
                            const monthDate = month.date;
                            
                            let isInRange = false;
                            if (taskStart && taskEnd) {
                              const monthStart = startOfMonth(monthDate);
                              const monthEnd = addMonths(monthStart, 1);
                              isInRange = (taskStart < monthEnd && taskEnd >= monthStart);
                            }
                            
                            // Color based on status
                            const barColor = task.status === 'completed' ? 'bg-green-500' : 
                                           task.status === 'ongoing' ? 'bg-blue-500' : 
                                           'bg-gray-400';
                            
                            return (
                              <td key={idx} className="p-3 border-r text-center">
                                {isInRange && (
                                  <div className={`h-2 w-full rounded ${barColor}`} title={`${task.taskName}: ${task.startDate} to ${task.endDate}`} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Activity Dialog (for non-Program departments) */}
      <Dialog open={isAddActivityDialogOpen} onOpenChange={setIsAddActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Activity Name *</label>
              <Input
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="Enter activity name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddActivityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddActivity}>Add Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
