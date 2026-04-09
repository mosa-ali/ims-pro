import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
 Plus,
 Search,
 Edit,
 Trash2,
 Eye,
 Download,
 ArrowLeft, ArrowRight,
 RefreshCw,
 MessageSquare,
 Mail,
 Phone,
 Video,
 Users,
 Calendar,
 RotateCcw,
} from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
// DonorCombobox replaced with Select

// Communication channels
const CHANNELS = [
 { value: "email", label: "Email", labelAr: "بريد إلكتروني", icon: Mail },
 { value: "meeting", label: "Meeting", labelAr: "اجتماع", icon: Users },
 { value: "call", label: "Phone Call", labelAr: "مكالمة هاتفية", icon: Phone },
 { value: "visit", label: "Site Visit", labelAr: "زيارة ميدانية", icon: Users },
 { value: "letter", label: "Letter", labelAr: "رسالة", icon: MessageSquare },
 { value: "video_call", label: "Video Call", labelAr: "مكالمة فيديو", icon: Video },
 { value: "other", label: "Other", labelAr: "أخرى", icon: MessageSquare },
] as const;

const STATUSES = [
 { value: "completed", label: "Completed", labelAr: "مكتمل" },
 { value: "pending", label: "Pending", labelAr: "معلق" },
 { value: "cancelled", label: "Cancelled", labelAr: "ملغى" },
] as const;

type ChannelType = typeof CHANNELS[number]["value"];
type StatusType = typeof STATUSES[number]["value"];

interface CommunicationFormData {
 donorId: number | null;
 date: string;
 channel: ChannelType;
 subject: string;
 subjectAr: string;
 summary: string;
 summaryAr: string;
 participants: string;
 contactPerson: string;
 nextActionDate: string;
 nextActionDescription: string;
 status: StatusType;
}

const initialFormData: CommunicationFormData = {
 donorId: null,
 date: new Date().toISOString().split("T")[0],
 channel: "email",
 subject: "",
 subjectAr: "",
 summary: "",
 summaryAr: "",
 participants: "",
 contactPerson: "",
 nextActionDate: "",
 nextActionDescription: "",
 status: "completed",
};

export default function DonorCommunications() {
  const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
const utils = trpc.useUtils();

 // State
 const [page, setPage] = useState(1);
 const [search, setSearch] = useState("");
 const [donorFilter, setDonorFilter] = useState<number | "all">("all");
 const [channelFilter, setChannelFilter] = useState<ChannelType | "all">("all");
 const [statusFilter, setStatusFilter] = useState<StatusType | "all">("all");
 const [showDeleted, setShowDeleted] = useState(false);

 // Dialogs
 const [createDialogOpen, setCreateDialogOpen] = useState(false);
 const [editDialogOpen, setEditDialogOpen] = useState(false);
 const [viewDialogOpen, setViewDialogOpen] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [selectedComm, setSelectedComm] = useState<any>(null);
 const [formData, setFormData] = useState<CommunicationFormData>(initialFormData);

 // Queries
 const { data: commsData, isLoading, refetch } = trpc.donorCommunications.list.useQuery({
 page,
 pageSize: 20,
 search: search || undefined,
 donorId: donorFilter !== "all" ? donorFilter : undefined,
 channel: channelFilter !== "all" ? channelFilter : undefined,
 status: statusFilter !== "all" ? statusFilter : undefined,
 includeDeleted: showDeleted,
 });

 const { data: donorsData } = trpc.donors.list.useQuery({ page: 1, pageSize: 100 });
 const { data: kpis } = trpc.donorCommunications.getKPIs.useQuery();

 // Mutations
 const createMutation = trpc.donorCommunications.create.useMutation({
 onSuccess: () => {
 toast.success("Communication logged successfully");
 setCreateDialogOpen(false);
 setFormData(initialFormData);
 utils.donorCommunications.list.invalidate();
 utils.donorCommunications.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateMutation = trpc.donorCommunications.update.useMutation({
 onSuccess: () => {
 toast.success("Communication updated successfully");
 setEditDialogOpen(false);
 setSelectedComm(null);
 utils.donorCommunications.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteMutation = trpc.donorCommunications.softDelete.useMutation({
 onSuccess: () => {
 toast.success("Communication deleted successfully");
 setDeleteDialogOpen(false);
 setSelectedComm(null);
 utils.donorCommunications.list.invalidate();
 utils.donorCommunications.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const restoreMutation = trpc.donorCommunications.restore.useMutation({
 onSuccess: () => {
 toast.success("Communication restored successfully");
 utils.donorCommunications.list.invalidate();
 utils.donorCommunications.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Export query
 const { refetch: exportData } = trpc.donorCommunications.exportData.useQuery(
 {
 donorId: donorFilter !== "all" ? donorFilter : undefined,
 channel: channelFilter !== "all" ? channelFilter : undefined,
 status: statusFilter !== "all" ? statusFilter : undefined,
 },
 { enabled: false }
 );

 // Handlers
 const handleCreate = () => {
 if (!formData.donorId) {
 toast.error("Please select a donor");
 return;
 }
 createMutation.mutate({
 donorId: formData.donorId,
 date: new Date(formData.date),
 channel: formData.channel,
 subject: formData.subject,
 subjectAr: formData.subjectAr || null,
 summary: formData.summary,
 summaryAr: formData.summaryAr || null,
 participants: formData.participants || null,
 contactPerson: formData.contactPerson || null,
 nextActionDate: formData.nextActionDate ? new Date(formData.nextActionDate) : null,
 nextActionDescription: formData.nextActionDescription || null,
 status: formData.status,
 });
 };

 const handleUpdate = () => {
 if (!selectedComm) return;
 updateMutation.mutate({
 id: selectedComm.id,
 donorId: formData.donorId || undefined,
 date: new Date(formData.date),
 channel: formData.channel,
 subject: formData.subject,
 subjectAr: formData.subjectAr || null,
 summary: formData.summary,
 summaryAr: formData.summaryAr || null,
 participants: formData.participants || null,
 contactPerson: formData.contactPerson || null,
 nextActionDate: formData.nextActionDate ? new Date(formData.nextActionDate) : null,
 nextActionDescription: formData.nextActionDescription || null,
 status: formData.status,
 });
 };

 const handleDelete = () => {
 if (!selectedComm) return;
 deleteMutation.mutate({ id: selectedComm.id });
 };

 const handleRestore = (comm: any) => {
 restoreMutation.mutate({ id: comm.id });
 };

 const handleExport = async () => {
 const result = await exportData();
 if (result.data?.communications) {
 const exportRows = result.data.communications.map((c) => ({
 Date: c.date ? new Date(c.date).toLocaleDateString() : "",
 Donor: c.donorName || "",
 Channel: c.channel,
 Subject: c.subject,
 Summary: c.summary,
 "Contact Person": c.contactPerson || "",
 Status: c.status,
 "Next Action Date": c.nextActionDate ? new Date(c.nextActionDate).toLocaleDateString() : "",
 "Next Action": c.nextActionDescription || "",
 }));

 const ws = XLSX.utils.json_to_sheet(exportRows);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Communications");
 XLSX.writeFile(wb, `donor_communications_${new Date().toISOString().split("T")[0]}.xlsx`);

 toast.success("Communications exported to Excel");
 }
 };

 const openEditDialog = (comm: any) => {
 setSelectedComm(comm);
 setFormData({
 donorId: comm.donorId,
 date: comm.date ? new Date(comm.date).toISOString().split("T")[0] : "",
 channel: comm.channel || "email",
 subject: comm.subject || "",
 subjectAr: comm.subjectAr || "",
 summary: comm.summary || "",
 summaryAr: comm.summaryAr || "",
 participants: comm.participants || "",
 contactPerson: comm.contactPerson || "",
 nextActionDate: comm.nextActionDate ? new Date(comm.nextActionDate).toISOString().split("T")[0] : "",
 nextActionDescription: comm.nextActionDescription || "",
 status: comm.status || "completed",
 });
 setEditDialogOpen(true);
 };

 const openViewDialog = (comm: any) => {
 setSelectedComm(comm);
 setViewDialogOpen(true);
 };

 const openDeleteDialog = (comm: any) => {
 setSelectedComm(comm);
 setDeleteDialogOpen(true);
 };

 const getChannelLabel = (channel: string) => {
 const found = CHANNELS.find((c) => c.value === channel);
 return language === "en" ? found?.label || channel : found?.labelAr || channel;
 };

 const getStatusLabel = (status: string) => {
 const found = STATUSES.find((s) => s.value === status);
 return language === "en" ? found?.label || status : found?.labelAr || status;
 };

 const getChannelIcon = (channel: string) => {
 const found = CHANNELS.find((c) => c.value === channel);
 return found?.icon || MessageSquare;
 };

 const communications = commsData?.communications || [];
 const pagination = commsData?.pagination;
 const donors = donorsData?.donors || [];

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white border-b border-gray-200 px-8 py-6">
 <div className="max-w-7xl mx-auto">
 <div className="flex items-center gap-4 mb-4">
 <Link href="/organization/donor-crm">
 <BackButton label={t.donorCRM.back} />
 </Link>
 </div>
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">
 {t.donorCRM.donorCommunications}
 </h1>
 <p className="text-gray-600 mt-2">
 {'Track and manage all donor communications and interactions'}
 </p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport}>
 <Download className="w-4 h-4 me-2" />
 {t.donorCRM.export}
 </Button>
 <Button onClick={() => {
 setFormData(initialFormData);
 setCreateDialogOpen(true);
 }}>
 <Plus className="w-4 h-4 me-2" />
 {t.donorCRM.logCommunication}
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="max-w-7xl mx-auto px-8 py-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorCRM.totalCommunications}
 </p>
 <p className="text-2xl font-bold">{kpis?.totalCommunications || 0}</p>
 </div>
 <MessageSquare className="w-8 h-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorCRM.pendingFollowups}
 </p>
 <p className="text-2xl font-bold text-amber-600">{kpis?.pendingCommunications || 0}</p>
 </div>
 <Calendar className="w-8 h-8 text-amber-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorCRM.channelsUsed}
 </p>
 <p className="text-2xl font-bold">{kpis?.byChannel?.length || 0}</p>
 </div>
 <Users className="w-8 h-8 text-green-500" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Filters */}
 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="flex flex-wrap gap-4">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 placeholder={t.donorCRM.searchCommunications}
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(1);
 }}
 className="ps-10"
 />
 </div>
 </div>
 <Select
 value={donorFilter === "all" ? "all" : donorFilter.toString()}
 onValueChange={(v) => {
 setDonorFilter(v === "all" ? "all" : parseInt(v));
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder={t.donorCRM.allDonors} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorCRM.allDonors}</SelectItem>
 {donors.map((donor) => (
 <SelectItem key={donor.id} value={donor.id.toString()}>
 {language === "en" ? donor.name : donor.nameAr || donor.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select
 value={channelFilter}
 onValueChange={(v) => {
 setChannelFilter(v as ChannelType | "all");
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[150px]">
 <SelectValue placeholder={t.donorCRM.allChannels} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorCRM.allChannels}</SelectItem>
 {CHANNELS.map((channel) => (
 <SelectItem key={channel.value} value={channel.value}>
 {language === "en" ? channel.label : channel.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select
 value={statusFilter}
 onValueChange={(v) => {
 setStatusFilter(v as StatusType | "all");
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[150px]">
 <SelectValue placeholder={t.donorCRM.allStatus} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorCRM.allStatus}</SelectItem>
 {STATUSES.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {language === "en" ? status.label : status.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button
 variant={showDeleted ? "default" : "outline"}
 onClick={() => setShowDeleted(!showDeleted)}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.donorCRM.showDeleted}
 </Button>
 <Button variant="outline" onClick={() => refetch()}>
 <RefreshCw className="w-4 h-4" />
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.donorCRM.date}</TableHead>
 <TableHead>{t.donorCRM.donor}</TableHead>
 <TableHead>{t.donorCRM.channel}</TableHead>
 <TableHead>{t.donorCRM.subject}</TableHead>
 <TableHead>{t.donorCRM.contact}</TableHead>
 <TableHead>{t.donorCRM.status}</TableHead>
 <TableHead className="text-center">{t.donorCRM.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8">
 {t.donorCRM.loading}
 </TableCell>
 </TableRow>
 ) : communications.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {t.donorCRM.noCommunicationsFound}
 </TableCell>
 </TableRow>
 ) : (
 communications.map((comm) => {
 const ChannelIcon = getChannelIcon(comm.channel || "other");
 return (
 <TableRow key={comm.id} className={comm.deletedAt ? "opacity-50" : ""}>
 <TableCell>
 {comm.date ? new Date(comm.date).toLocaleDateString() : "-"}
 </TableCell>
 <TableCell>
 <div>
 <p className="font-medium">
 {language === "en" ? comm.donorName : comm.donorNameAr || comm.donorName}
 </p>
 {comm.donorCode && (
 <p className="text-xs text-muted-foreground">{comm.donorCode}</p>
 )}
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <ChannelIcon className="w-4 h-4 text-muted-foreground" />
 <span>{getChannelLabel(comm.channel || "other")}</span>
 </div>
 </TableCell>
 <TableCell className="max-w-[200px] truncate">
 {language === "en" ? comm.subject : comm.subjectAr || comm.subject}
 </TableCell>
 <TableCell>{comm.contactPerson || "-"}</TableCell>
 <TableCell>
 {comm.deletedAt ? (
 <Badge variant="destructive">{t.donorCRM.deleted}</Badge>
 ) : comm.status === "completed" ? (
 <Badge variant="default" className="bg-green-500">{getStatusLabel(comm.status)}</Badge>
 ) : comm.status === "pending" ? (
 <Badge variant="default" className="bg-amber-500">{getStatusLabel(comm.status)}</Badge>
 ) : (
 <Badge variant="secondary">{getStatusLabel(comm.status || "completed")}</Badge>
 )}
 </TableCell>
 <TableCell className="text-end">
 <div className="flex justify-end gap-2">
 <Button variant="ghost" size="sm" onClick={() => openViewDialog(comm)}>
 <Eye className="w-4 h-4" />
 </Button>
 {comm.deletedAt ? (
 <Button variant="ghost" size="sm" onClick={() => handleRestore(comm)}>
 <RotateCcw className="w-4 h-4" />
 </Button>
 ) : (
 <>
 <Button variant="ghost" size="sm" onClick={() => openEditDialog(comm)}>
 <Edit className="w-4 h-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(comm)}>
 <Trash2 className="w-4 h-4 text-destructive" />
 </Button>
 </>
 )}
 </div>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* Pagination */}
 {pagination && pagination.totalPages > 1 && (
 <div className="flex justify-center gap-2 mt-4">
 <Button
 variant="outline"
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 >
 {t.donorCRM.previous}
 </Button>
 <span className="flex items-center px-4">
 {`Page ${page} of ${pagination.totalPages}`}
 </span>
 <Button
 variant="outline"
 disabled={page === pagination.totalPages}
 onClick={() => setPage(page + 1)}
 >
 {t.donorCRM.next}
 </Button>
 </div>
 )}
 </div>

 {/* Create Dialog */}
 <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.donorCRM.logCommunication}</DialogTitle>
 <DialogDescription>
 {'Record a new communication with a donor'}
 </DialogDescription>
 </DialogHeader>
 <CommunicationForm
 formData={formData}
 setFormData={setFormData}
 donors={donors}
 language={language}
 />
 <DialogFooter>
 <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
 {t.donorCRM.cancel}
 </Button>
 <Button onClick={handleCreate} disabled={createMutation.isPending}>
 {createMutation.isPending
 ? (t.donorCRM.saving)
 : (t.donorCRM.logCommunication1)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Dialog */}
 <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.donorCRM.editCommunication}</DialogTitle>
 </DialogHeader>
 <CommunicationForm
 formData={formData}
 setFormData={setFormData}
 donors={donors}
 language={language}
 />
 <DialogFooter>
 <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
 {t.donorCRM.cancel}
 </Button>
 <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
 {updateMutation.isPending
 ? (t.donorCRM.saving)
 : (t.donorCRM.saveChanges)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* View Dialog */}
 <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{t.donorCRM.communicationDetails}</DialogTitle>
 </DialogHeader>
 {selectedComm && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.date}</Label>
 <p className="font-medium">
 {selectedComm.date ? new Date(selectedComm.date).toLocaleDateString() : "-"}
 </p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.channel}</Label>
 <p className="font-medium">{getChannelLabel(selectedComm.channel || "other")}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.donor}</Label>
 <p className="font-medium">{selectedComm.donorName || "-"}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.status}</Label>
 <p className="font-medium">{getStatusLabel(selectedComm.status || "completed")}</p>
 </div>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.subject}</Label>
 <p className="font-medium">{selectedComm.subject}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.summary}</Label>
 <p className="text-muted-foreground whitespace-pre-wrap">{selectedComm.summary}</p>
 </div>
 {selectedComm.participants && (
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.participants}</Label>
 <p className="text-muted-foreground">{selectedComm.participants}</p>
 </div>
 )}
 {selectedComm.nextActionDate && (
 <div className="border-t pt-4">
 <h4 className="font-medium mb-2">{t.donorCRM.nextAction}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.date}</Label>
 <p className="font-medium">
 {new Date(selectedComm.nextActionDate).toLocaleDateString()}
 </p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorCRM.description}</Label>
 <p className="text-muted-foreground">{selectedComm.nextActionDescription || "-"}</p>
 </div>
 </div>
 </div>
 )}
 </div>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
 {t.donorCRM.close}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.donorCRM.deleteCommunication}</DialogTitle>
 <DialogDescription>
 {'Are you sure you want to delete this communication? This action can be undone.'}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
 {t.donorCRM.cancel}
 </Button>
 <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
 {deleteMutation.isPending
 ? (t.donorCRM.deleting)
 : (t.donorCRM.delete)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

// Communication Form Component
function CommunicationForm({
 formData,
 setFormData,
 donors,
 language,
}: {
 formData: CommunicationFormData;
 setFormData: React.Dispatch<React.SetStateAction<CommunicationFormData>>;
 donors: any[];
 language: string;
}) {
 const { t } = useTranslation();
 return (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorCRM.donor2}</Label>
 <Select
 value={formData.donorId?.toString() || ""}
 onValueChange={(value) => setFormData({ ...formData, donorId: parseInt(value) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.donorCRM.selectDonor} />
 </SelectTrigger>
 <SelectContent>
 {donors.length === 0 ? (
 <SelectItem value="-1" disabled>
 {t.donorCRM.noDonorsAvailable}
 </SelectItem>
 ) : (
 donors.map((donor) => (
 <SelectItem key={donor.id} value={donor.id.toString()}>
 {language === "en" ? donor.name : donor.nameAr || donor.name} ({donor.code})
 </SelectItem>
 ))
 )}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.donorCRM.date3}</Label>
 <Input
 type="date"
 value={formData.date}
 onChange={(e) => setFormData({ ...formData, date: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorCRM.channel4}</Label>
 <Select
 value={formData.channel}
 onValueChange={(v) => setFormData({ ...formData, channel: v as ChannelType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CHANNELS.map((channel) => (
 <SelectItem key={channel.value} value={channel.value}>
 {language === "en" ? channel.label : channel.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.donorCRM.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(v) => setFormData({ ...formData, status: v as StatusType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {STATUSES.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {language === "en" ? status.label : status.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorCRM.subjectEnglish}</Label>
 <Input
 value={formData.subject}
 onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorCRM.subjectArabic}</Label>
 <Input
 value={formData.subjectAr}
 onChange={(e) => setFormData({ ...formData, subjectAr: e.target.value })}
 dir="rtl"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorCRM.summaryEnglish}</Label>
 <Textarea
 value={formData.summary}
 onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
 rows={4}
 />
 </div>
 <div>
 <Label>{t.donorCRM.summaryArabic}</Label>
 <Textarea
 value={formData.summaryAr}
 onChange={(e) => setFormData({ ...formData, summaryAr: e.target.value })}
 rows={4}
 dir="rtl"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorCRM.contactPerson}</Label>
 <Input
 value={formData.contactPerson}
 onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorCRM.participants}</Label>
 <Input
 value={formData.participants}
 onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
 placeholder={t.donorCRM.commaSeparatedNames}
 />
 </div>
 </div>

 <div className="border-t pt-4">
 <h4 className="font-medium mb-3">{t.donorCRM.nextActionOptional}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorCRM.nextActionDate}</Label>
 <Input
 type="date"
 value={formData.nextActionDate}
 onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorCRM.nextActionDescription}</Label>
 <Input
 value={formData.nextActionDescription}
 onChange={(e) => setFormData({ ...formData, nextActionDescription: e.target.value })}
 />
 </div>
 </div>
 </div>
 </div>
 );
}
