import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, User, Eye, Edit, Trash2, FileDown, Upload } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import * as XLSX from 'xlsx';
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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ActivityDialog } from "../dialogs/ActivityDialog";

interface ViewAllActivitiesProps {
  projectId: number;
}

export default function ViewAllActivities({ projectId }: ViewAllActivitiesProps) {
  const { t } = useTranslation();
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | "create" | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // Fetch activities from backend
  const { data: activities = [], isLoading } = trpc.projectActivities.list.useQuery({ projectId });

  // Mutations
  const createMutation = trpc.projectActivities.create.useMutation({
    onSuccess: () => {
      toast.success(t.messages.success.created);
      utils.projectActivities.list.invalidate();
    },
    onError: (error) => {
      toast.error(`${t.messages.error.createFailed}: ${error.message}`);
    },
  });

  const updateMutation = trpc.projectActivities.update.useMutation({
    onSuccess: () => {
      toast.success(t.messages.success.updated);
      utils.projectActivities.list.invalidate();
    },
    onError: (error) => {
      toast.error(`${t.messages.error.updateFailed}: ${error.message}`);
    },
  });

  const deleteMutation = trpc.projectActivities.delete.useMutation({
    onSuccess: () => {
      toast.success(t.messages.success.deleted);
      utils.projectActivities.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(`${t.messages.error.deleteFailed}: ${error.message}`);
    },
  });

  const getStatusColor = (progress: number) => {
    if (progress < 50) return "text-red-600";
    if (progress < 80) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "outline",
      ongoing: "default",
      delayed: "destructive",
      planned: "secondary",
      cancelled: "destructive",
    };
    return variants[status] || "default";
  };

  const handleExportToExcel = () => {
    const exportData = activities.length > 0 ? activities : [
      { name: "Example Activity", target: 100, achieved: 75, responsiblePerson: "John Doe", status: "ongoing", startDate: new Date(), endDate: new Date() }
    ];

    const ws = XLSX.utils.json_to_sheet(exportData.map(a => ({
      [t.projectDetail.activityName]: a.name,
      [t.projectDetail.target]: a.target,
      [t.projectDetail.achieved]: a.achieved,
      [t.projectDetail.responsible]: a.responsiblePerson || t.common.notAvailable,
      [t.common.status]: a.status,
      [t.projectDetail.activityStartDate]: new Date(a.startDate).toLocaleDateString(),
      [t.projectDetail.activityEndDate]: new Date(a.endDate).toLocaleDateString(),
      [t.common.progressPercent]: ((a.achieved / a.target) * 100).toFixed(1)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activities");
    XLSX.writeFile(wb, `Project_${projectId}_Activities.xlsx`);
    toast.success(t.messages.success.exported);
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
        
        toast.success(`${t.messages.success.imported}: ${jsonData.length} ${t.common.records}`);
      } catch (error) {
        toast.error(`${t.messages.error.importFailed}: ${t.messages.error.invalidFormat}`);
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
    } else if (dialogMode === "edit" && selectedActivity) {
      await updateMutation.mutateAsync({
        id: selectedActivity.id,
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
    return <div className="p-8 text-center">{t.common.loading}...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.projectDetail.tabViewAllActivities}</h3>
          <p className="text-sm text-muted-foreground">
            {t.projects.activitiesPageSubtitle}
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
            {t.importExport.exportData}
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
                {t.importExport.importData}
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
              setSelectedActivity(null);
              setDialogMode("create");
            }}
            size="sm"
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.projectDetail.addActivity}
          </Button>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid gap-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t.projectDetail.noActivitiesFound}
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => {
            const progress = activity.target > 0 ? (activity.achieved / activity.target) * 100 : 0;
            return (
              <Card key={activity.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{activity.name}</CardTitle>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusBadge(activity.status)}>
                      {activity.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>{t.common.progress}</span>
                      <span className={`font-semibold ${getStatusColor(progress)}`}>
                        {activity.achieved} / {activity.target} {activity.unit || t.common.units} ({progress.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Meta Information */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{activity.responsiblePerson || t.common.notAssigned}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(activity.startDate).toLocaleDateString()} - {new Date(activity.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setSelectedActivity(activity);
                        setDialogMode("view");
                      }}
                      size="sm"
                      variant="default"
                      className="h-8"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t.common.viewDetails}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedActivity(activity);
                        setDialogMode("edit");
                      }}
                      size="sm"
                      variant="outline"
                      className="h-8"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t.common.edit}
                    </Button>
                    <Button
                      onClick={() => setDeleteId(activity.id)}
                      size="sm"
                      variant="destructive"
                      className="h-8"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.common.delete}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Activity Dialog */}
      <ActivityDialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
            setSelectedActivity(null);
          }
        }}
        mode={dialogMode || "view"}
        activity={selectedActivity}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.projectDetail.deleteActivity}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.messages.confirm.delete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
