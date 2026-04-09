import { useTranslation } from '@/i18n/useTranslation';
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
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

export default function DeletedRecords() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const { user, loading: authLoading } = useAuth();
 const [, setLocation] = useLocation();
 
 // Get user's organizations
 const { data: userOrgs, isLoading: orgsLoading } = trpc.ims.userAssignments.myOrganizations.useQuery(undefined, {
 enabled: !!user,
 });
 
 // Get organization ID from user's first organization (or handle multiple orgs)
 const organizationId = userOrgs?.[0]?.organizationId;
 const [searchTerm, setSearchTerm] = useState("");
 const [moduleFilter, setModuleFilter] = useState<string>("all");
 const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [selectedRecord, setSelectedRecord] = useState<{
 recordType: string;
 recordId: number;
 recordName: string;
 } | null>(null);

 const { data: deletedRecords, isLoading, refetch } = trpc.ims.deletedRecords.list.useQuery(
 { organizationId: organizationId! },
 { enabled: !!organizationId }
 );

 // Show loading state while fetching user organizations
 if (authLoading || orgsLoading) {
 return (
 <Card>
 <CardContent className="flex items-center justify-center py-12">
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
 <p className="text-muted-foreground">Loading...</p>
 </div>
 </CardContent>
 </Card>
 );
 }

 // Show error if user has no organization
 if (!organizationId) {
 return (
 <Card>
 <CardHeader>
 <CardTitle>{t.system.deletedRecords.noOrganizationAccess}</CardTitle>
 <CardDescription>
 {t.system.deletedRecords.mustBeAssignedToOrganization}
 </CardDescription>
 </CardHeader>
 </Card>
 );
 }
 const restoreMutation = trpc.ims.deletedRecords.restore.useMutation({
 onSuccess: () => {
 toast.success(t.system.deletedRecords.recordRestoredSuccessfully);
 refetch();
 setRestoreDialogOpen(false);
 setSelectedRecord(null);
 },
 onError: (error: any) => {
 toast.error(`${t.system.deletedRecords.failedToRestoreRecord} ${error.message}`);
 },
 });

 const permanentDeleteMutation = trpc.ims.deletedRecords.permanentDelete.useMutation({
 onSuccess: () => {
 toast.success(t.system.deletedRecords.recordPermanentlyDeleted);
 refetch();
 setDeleteDialogOpen(false);
 setSelectedRecord(null);
 },
 onError: (error: any) => {
 toast.error(`${t.system.deletedRecords.failedToDeleteRecord} ${error.message}`);
 },
 });

 // Organization admins can access their own deleted records
 if (authLoading || isLoading) {
 return (
 <div className="flex items-center justify-center h-64" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 if (!user) {
 return null;
 }

 const filteredRecords = deletedRecords?.filter((record: any) => {
 const matchesSearch = record.recordName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 record.recordType.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesModule = moduleFilter === "all" || record.module === moduleFilter;
 return matchesSearch && matchesModule;
 }) || [];

 const modules = Array.from(new Set(deletedRecords?.map((r: any) => r.module) || [])) as string[];

 const handleRestore = (record: typeof selectedRecord) => {
 setSelectedRecord(record);
 setRestoreDialogOpen(true);
 };

 const handlePermanentDelete = (record: typeof selectedRecord) => {
 setSelectedRecord(record);
 setDeleteDialogOpen(true);
 };

 const confirmRestore = () => {
 if (selectedRecord && organizationId) {
 restoreMutation.mutate({
 recordType: selectedRecord.recordType,
 recordId: selectedRecord.recordId,
 organizationId,
 });
 }
 };

 const confirmPermanentDelete = () => {
 if (selectedRecord && organizationId) {
 permanentDeleteMutation.mutate({
 recordType: selectedRecord.recordType,
 recordId: selectedRecord.recordId,
 organizationId,
 });
 }
 };

 return (
 <div className="container mx-auto py-8">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="text-3xl font-bold flex items-center gap-3">
 <Archive className="h-8 w-8" />
 {t.system.deletedRecords.deletedRecordsArchive}
 </h1>
 <p className="text-muted-foreground mt-2">
 {t.system.deletedRecords.manageDeletedRecords}
 </p>
 </div>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>{t.system.deletedRecords.archivedRecords}</CardTitle>
 <CardDescription>
 {t.system.deletedRecords.allSoftDeletedRecords}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex gap-4 mb-6">
 <div className="flex-1 relative">
 <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.placeholders.searchByNameOrType}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="ps-10"
 />
 </div>
 <Select value={moduleFilter} onValueChange={setModuleFilter}>
 <SelectTrigger className="w-[200px]">
 <Filter className="h-4 w-4 me-2" />
 <SelectValue placeholder={t.placeholders.filterByModule} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.common.all}</SelectItem>
 {modules.map((module: string) => (
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
 <p>{t.system.deletedRecords.noDeletedRecordsFound}</p>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.system.deletedRecords.recordType}</TableHead>
 <TableHead>{t.system.deletedRecords.recordName}</TableHead>
 <TableHead>{t.system.deletedRecords.module}</TableHead>
 <TableHead>{t.system.deletedRecords.deletedBy}</TableHead>
 <TableHead>{t.system.deletedRecords.deletedAt}</TableHead>
 <TableHead>{t.common.status}</TableHead>
 <TableHead className="text-center">{t.common.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredRecords.map((record: any) => (
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
 <TableCell className="text-end">
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
 <RotateCcw className="h-4 w-4 me-1" />
 {t.system.deletedRecords.restore}
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
 <Trash2 className="h-4 w-4 me-1" />
 {t.system.deletedRecords.permanentlyDelete}
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
 {/* Restore Confirmation Dialog */}
 <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{t.system.deletedRecords.restoreRecord}</AlertDialogTitle>
 <AlertDialogDescription>
 {t.system.deletedRecords.areYouSureRestore.replace('{recordName}', selectedRecord?.recordName || '').replace('{recordType}', selectedRecord?.recordType || '')}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
 <AlertDialogAction onClick={confirmRestore}>{t.system.deletedRecords.restore}</AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>

 {/* Permanent Delete Confirmation Dialog */}
 <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{t.system.deletedRecords.permanentlyDelete}</AlertDialogTitle>
 <AlertDialogDescription>
 ⚠️ <strong>{t.common.warning}:</strong> {t.system.deletedRecords.recordPermanentlyDeleted}. {t.system.deletedRecords.areYouSureRestore.replace('{recordName}', selectedRecord?.recordName || '').replace('{recordType}', selectedRecord?.recordType || '')}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
 <AlertDialogAction
 onClick={confirmPermanentDelete}
 className="bg-red-600 hover:bg-red-700"
 >
 {t.system.deletedRecords.permanentlyDelete}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 );
}
