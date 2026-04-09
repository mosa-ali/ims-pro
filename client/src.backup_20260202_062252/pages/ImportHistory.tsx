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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { History, Download, Trash2, Search, Filter, FileText, AlertCircle } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ImportHistory() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedImport, setSelectedImport] = useState<number | null>(null);
  const [errorsDialogOpen, setErrorsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteImportId, setDeleteImportId] = useState<number | null>(null);

  const { data: imports, isLoading, refetch } = trpc.importHistory.list.useQuery();
  const { data: selectedImportErrors } = trpc.importHistory.getErrors.useQuery(
    { importHistoryId: selectedImport! },
    { enabled: !!selectedImport && errorsDialogOpen }
  );

  const deleteMutation = trpc.importHistory.delete.useMutation({
    onSuccess: () => {
      toast.success("Import history deleted");
      refetch();
      setDeleteDialogOpen(false);
      setDeleteImportId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Redirect non-members
  if (!authLoading && (!user || !user.organizationId)) {
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

  const filteredImports = imports?.filter((imp) => {
    const matchesSearch = imp.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imp.module.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === "all" || imp.module === moduleFilter;
    const matchesStatus = statusFilter === "all" || imp.status === statusFilter;
    return matchesSearch && matchesModule && matchesStatus;
  }) || [];

  const modules = Array.from(new Set(imports?.map((i) => i.module) || []));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "partial":
        return <Badge className="bg-yellow-600">Partial</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-600">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewErrors = (importId: number) => {
    setSelectedImport(importId);
    setErrorsDialogOpen(true);
  };

  const handleDelete = (importId: number) => {
    setDeleteImportId(importId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteImportId) {
      deleteMutation.mutate({ id: deleteImportId });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <History className="h-8 w-8" />
              Import History
            </h1>
            <p className="text-muted-foreground mt-2">
              Track all Excel/CSV imports with detailed error logs and retry capabilities
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import Records</CardTitle>
            <CardDescription>
              View import history, download error reports, and retry failed imports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by file name or module..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Module" />
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredImports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No import records found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Total Rows</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Imported At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredImports.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell>
                        <Badge variant="outline">{imp.module}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{imp.fileName}</TableCell>
                      <TableCell>{imp.totalRows}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {imp.successfulRows}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        {imp.failedRows}
                      </TableCell>
                      <TableCell>{getStatusBadge(imp.status)}</TableCell>
                      <TableCell>
                        {new Date(imp.importedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {imp.failedRows > 0 && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewErrors(imp.id)}
                              >
                                <AlertCircle className="h-4 w-4 mr-1" />
                                View Errors
                              </Button>
                              {imp.errorReportUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(imp.errorReportUrl!, "_blank")}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  CSV
                                </Button>
                              )}
                            </>
                          )}
                          {user?.role === "admin" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(imp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Errors Dialog */}
      <Dialog open={errorsDialogOpen} onOpenChange={setErrorsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Errors</DialogTitle>
            <DialogDescription>
              Detailed error information for failed rows
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedImportErrors && selectedImportErrors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row #</TableHead>
                    <TableHead>Error Field</TableHead>
                    <TableHead>Error Message</TableHead>
                    <TableHead>Row Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedImportErrors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="font-medium">{error.rowNumber}</TableCell>
                      <TableCell>
                        {error.errorField && (
                          <Badge variant="outline">{error.errorField}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-red-600">{error.errorMessage}</TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate">
                        {JSON.stringify(error.rowData)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No errors found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this import record? This will also delete all
              associated error logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
