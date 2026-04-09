import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Archive, RotateCcw, Trash2, Search, Filter } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DeletedRecords() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{
    recordType: string;
    recordId: number;
    recordName: string;
  } | null>(null);

  const { data: deletedRecords, isLoading, refetch } = trpc.deletedRecords.list.useQuery();
  const restoreMutation = trpc.deletedRecords.restore.useMutation({
    onSuccess: () => {
      toast.success("Record restored successfully");
      refetch();
      setRestoreDialogOpen(false);
      setSelectedRecord(null);
    },
    onError: (error) => {
      toast.error(`Failed to restore record: ${error.message}`);
    },
  });

  const permanentDeleteMutation = trpc.deletedRecords.permanentDelete.useMutation({
    onSuccess: () => {
      toast.success("Record permanently deleted");
      refetch();
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete record: ${error.message}`);
    },
  });

  // Redirect non-admin users
  if (!authLoading && user && user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  const filteredRecords = deletedRecords?.filter((record) => {
    const matchesSearch = record.recordName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.recordType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === "all" || record.module === moduleFilter;
    return matchesSearch && matchesModule;
  }) || [];

  const modules = Array.from(new Set(deletedRecords?.map((r) => r.module) || []));

  const handleRestore = (record: typeof selectedRecord) => {
    setSelectedRecord(record);
    setRestoreDialogOpen(true);
  };

  const handlePermanentDelete = (record: typeof selectedRecord) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  const confirmRestore = () => {
    if (selectedRecord) {
      restoreMutation.mutate({
        recordType: selectedRecord.recordType,
        recordId: selectedRecord.recordId,
      });
    }
  };

  const confirmPermanentDelete = () => {
    if (selectedRecord) {
      permanentDeleteMutation.mutate({
        recordType: selectedRecord.recordType,
        recordId: selectedRecord.recordId,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Archive className="h-8 w-8" />
              Deleted Records / Archive
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage deleted records across all modules. Restore or permanently delete items.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Archived Records</CardTitle>
            <CardDescription>
              All soft-deleted records from your organization. You can restore them or permanently delete them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No deleted records found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Deleted By</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={`${record.recordType}-${record.id}`}>
                      <TableCell className="font-medium">{record.recordType}</TableCell>
                      <TableCell>{record.recordName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.module}</Badge>
                      </TableCell>
                      <TableCell>User #{record.deletedBy || "Unknown"}</TableCell>
                      <TableCell>
                        {record.deletedAt
                          ? new Date(record.deletedAt).toLocaleString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {record.originalStatus && (
                          <Badge variant="secondary">{record.originalStatus}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleRestore({
                                recordType: record.recordType,
                                recordId: record.id,
                                recordName: record.recordName,
                              })
                            }
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handlePermanentDelete({
                                recordType: record.recordType,
                                recordId: record.id,
                                recordName: record.recordName,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore "{selectedRecord?.recordName}"? This record will
              reappear in the {selectedRecord?.recordType} module.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              ⚠️ <strong>Warning:</strong> This action cannot be undone. Are you sure you want to
              permanently delete "{selectedRecord?.recordName}"? This will remove all data
              associated with this record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
