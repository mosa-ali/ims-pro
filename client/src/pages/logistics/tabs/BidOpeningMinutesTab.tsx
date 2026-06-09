/**
 * Bid Opening Minutes (BOM) Tab - For Tenders Only
 * Records bid opening ceremony: NO PRICES, only receipt confirmation
 * Features: Committee members, bid summary, irregularities, declaration
 * Bilingual EN/AR support with RTL
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Printer, FileText, Users, CheckCircle, Clock, AlertTriangle, Shield } from "lucide-react";

interface BidOpeningMinutesTabProps { purchaseRequestId: number; prNumber?: string; }

export default function BidOpeningMinutesTab({ purchaseRequestId, prNumber }: BidOpeningMinutesTabProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();

 const [createDialogOpen, setCreateDialogOpen] = useState(false);
 const [sessionForm, setSessionForm] = useState({
 openingDate: "", openingTime: "", openingVenue: "",
 openingMode: "physical" as "physical" | "online" | "hybrid",
 });
 const [committeeForm, setCommitteeForm] = useState({
 chairpersonName: "", member1Name: "", member2Name: "", member3Name: "",
 });
 const [bidSummaryForm, setBidSummaryForm] = useState({ totalBidsReceived: "", bidsOpenedCount: "", irregularities: "" });

 const { data: bom, isLoading, refetch } = trpc.logistics.bidOpeningMinutes.getByPurchaseRequestId.useQuery(
 { purchaseRequestId }, { enabled: !!purchaseRequestId, retry: false }
 );

 // Also fetch the BA to get bidAnalysisId for BOM creation
 const { data: ba } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId }, { enabled: !!purchaseRequestId, retry: false }
 );

 const createMutation = trpc.logistics.bidOpeningMinutes.create.useMutation({
 onSuccess: () => { toast.success(t.bidOpeningMinutesTab.bomCreated); setCreateDialogOpen(false); refetch(); },
 onError: (e: any) => toast.error(`${t.bidOpeningMinutesTab.error}: ${e.message}`),
 });
 const updateCommitteeMutation = trpc.logistics.bidOpeningMinutes.updateCommittee.useMutation({
 onSuccess: () => { toast.success(t.bidOpeningMinutesTab.committeeSaved); refetch(); },
 onError: (e: any) => toast.error(`${t.bidOpeningMinutesTab.error}: ${e.message}`),
 });
 const updateBidSummaryMutation = trpc.logistics.bidOpeningMinutes.updateBidSummary.useMutation({
 onSuccess: () => { toast.success(t.bidOpeningMinutesTab.bidSummarySaved); refetch(); },
 onError: (e: any) => toast.error(`${t.bidOpeningMinutesTab.error}: ${e.message}`),
 });
 const finalizeMutation = trpc.logistics.bidOpeningMinutes.finalize.useMutation({
 onSuccess: () => { toast.success(t.bidOpeningMinutesTab.bomFinalized); refetch(); },
 onError: (e: any) => toast.error(`${t.bidOpeningMinutesTab.error}: ${e.message}`),
 });
 const approveMutation = trpc.logistics.bidOpeningMinutes.approve.useMutation({
 onSuccess: () => { toast.success(t.bidOpeningMinutesTab.bomApproved); refetch(); },
 onError: (e: any) => toast.error(`${t.bidOpeningMinutesTab.error}: ${e.message}`),
 });

 // Initialize committee form from existing BOM data
 useEffect(() => {
 if (bom) {
 setCommitteeForm({
 chairpersonName: bom.chairpersonName || "",
 member1Name: bom.member1Name || "",
 member2Name: bom.member2Name || "",
 member3Name: bom.member3Name || "",
 });
 }
 }, [bom]);

 if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

 const handleCreateBOM = () => {
 if (!ba?.id) {
 toast.error(t.bidOpeningMinutesTab.noBidAnalysis);
 return;
 }
 if (!sessionForm.openingDate || !sessionForm.openingTime || !sessionForm.openingVenue) {
 toast.error(t.bidOpeningMinutesTab.fillSessionDetails);
 return;
 }
 createMutation.mutate({
 purchaseRequestId,
 bidAnalysisId: ba.id,
 openingDate: new Date(sessionForm.openingDate),
 openingTime: sessionForm.openingTime,
 openingVenue: sessionForm.openingVenue,
 openingMode: sessionForm.openingMode,
 });
 };

 const handleSaveCommittee = () => {
 if (!bom?.id) return;
 updateCommitteeMutation.mutate({
 bomId: bom.id,
 chairpersonId: 1, // placeholder user ID
 chairpersonName: committeeForm.chairpersonName,
 member1Id: 2,
 member1Name: committeeForm.member1Name,
 member2Id: 3,
 member2Name: committeeForm.member2Name,
 ...(committeeForm.member3Name ? { member3Id: 4, member3Name: committeeForm.member3Name } : {}),
 });
 };

 const handleSaveBidSummary = () => {
 if (!bom?.id) return;
 updateBidSummaryMutation.mutate({
 bomId: bom.id,
 totalBidsReceived: parseInt(bidSummaryForm.totalBidsReceived) || bom.totalBidsReceived || 0,
 bidsOpenedCount: parseInt(bidSummaryForm.bidsOpenedCount) || bom.bidsOpenedCount || 0,
 irregularities: bidSummaryForm.irregularities || bom.irregularities || undefined,
 });
 };

 if (!bom) {
 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div><h3 className="text-xl font-bold">{t.bidOpeningMinutesTab.title}</h3><p className="text-sm text-muted-foreground">{t.bidOpeningMinutesTab.subtitle}</p></div>
 <Card><CardContent className="flex flex-col items-center justify-center py-16">
 <FileText className="h-16 w-16 text-gray-300 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.bidOpeningMinutesTab.noBOM}</h4>
 <p className="text-sm text-muted-foreground mb-6">{t.bidOpeningMinutesTab.noBOMDesc}</p>
 {!ba ? (
 <p className="text-sm text-red-500">{t.bidOpeningMinutesTab.noBidAnalysis}</p>
 ) : (
 <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
 <DialogTrigger asChild>
 <Button className="gap-2"><Plus className="h-4 w-4" />{t.bidOpeningMinutesTab.createBOM}</Button>
 </DialogTrigger>
 <DialogContent className="max-w-md">
 <DialogHeader><DialogTitle>{t.bidOpeningMinutesTab.createBOM}</DialogTitle></DialogHeader>
 <div className="space-y-4">
 <div><Label>{t.bidOpeningMinutesTab.openingDate} *</Label><Input type="date" value={sessionForm.openingDate} onChange={(e) => setSessionForm(p => ({ ...p, openingDate: e.target.value }))} /></div>
 <div><Label>{t.bidOpeningMinutesTab.openingTime} *</Label><Input type="time" value={sessionForm.openingTime} onChange={(e) => setSessionForm(p => ({ ...p, openingTime: e.target.value }))} /></div>
 <div><Label>{t.bidOpeningMinutesTab.openingVenue} *</Label><Input value={sessionForm.openingVenue} onChange={(e) => setSessionForm(p => ({ ...p, openingVenue: e.target.value }))} placeholder={t.placeholders.conferenceRoomA} /></div>
 <div>
 <Label>{t.bidOpeningMinutesTab.openingMode}</Label>
 <Select value={sessionForm.openingMode} onValueChange={(v) => setSessionForm(p => ({ ...p, openingMode: v as any }))}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="physical">{t.bidOpeningMinutesTab.modePhysical}</SelectItem>
 <SelectItem value="online">{t.bidOpeningMinutesTab.modeOnline}</SelectItem>
 <SelectItem value="hybrid">{t.bidOpeningMinutesTab.modeHybrid}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="flex justify-end gap-2">
 <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t.bidOpeningMinutesTab.cancel}</Button>
 <Button onClick={handleCreateBOM} disabled={createMutation.isPending}>{t.bidOpeningMinutesTab.create}</Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 )}
 </CardContent></Card>
 </div>
 );
 }

 const isEditable = bom.status === "draft";

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div><h3 className="text-xl font-bold">{t.bidOpeningMinutesTab.title}</h3><p className="text-sm text-muted-foreground">{t.bidOpeningMinutesTab.subtitle}</p></div>
 <div className="flex items-center gap-3">
 <Badge variant={bom.status === "approved" ? "default" : bom.status === "finalized" ? "default" : "secondary"}>
 {bom.status === "approved" ? t.bidOpeningMinutesTab.approved : bom.status === "finalized" ? t.bidOpeningMinutesTab.finalized : t.bidOpeningMinutesTab.draft}
 </Badge>
 <Button variant="outline" size="sm" onClick={() => bom && window.open(`/organization/logistics/bid-opening-minutes/${bom.id}/print`, '_blank')} className="gap-2"><Printer className="h-4 w-4" />{t.bidOpeningMinutesTab.print}</Button>
 </div>
 </div>

 {/* BOM Info */}
 <Card><CardContent className="py-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div><label className="text-xs font-medium text-gray-500">{t.bidOpeningMinutesTab.bomNumber}</label><div className="font-bold">{bom.minutesNumber || `BOM-${bom.id}`}</div></div>
 <div><label className="text-xs font-medium text-gray-500">{t.bidOpeningMinutesTab.status}</label><div><Badge variant={bom.status === "approved" ? "default" : "secondary"}>{bom.status}</Badge></div></div>
 <div><label className="text-xs font-medium text-gray-500">{t.bidOpeningMinutesTab.totalBidsReceived}</label><div className="font-bold">{bom.totalBidsReceived || 0}</div></div>
 <div><label className="text-xs font-medium text-gray-500">{t.bidOpeningMinutesTab.bidsOpenedCount}</label><div className="font-bold">{bom.bidsOpenedCount || 0}</div></div>
 </div>
 </CardContent></Card>

 {/* NO PRICES Warning */}
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
 <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
 <p className="text-sm text-yellow-800 font-medium">{t.bidOpeningMinutesTab.noPricesWarning}</p>
 </div>

 {/* Session Details (read-only after creation) */}
 <Card>
 <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />{t.bidOpeningMinutesTab.sessionDetails}</CardTitle></CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div><Label>{t.bidOpeningMinutesTab.openingDate}</Label><div className="mt-1 text-sm font-medium">{bom.openingDate ? new Date(bom.openingDate).toLocaleDateString() : "-"}</div></div>
 <div><Label>{t.bidOpeningMinutesTab.openingTime}</Label><div className="mt-1 text-sm font-medium">{bom.openingTime || "-"}</div></div>
 <div><Label>{t.bidOpeningMinutesTab.openingVenue}</Label><div className="mt-1 text-sm font-medium">{bom.openingVenue || "-"}</div></div>
 <div><Label>{t.bidOpeningMinutesTab.openingMode}</Label><div className="mt-1 text-sm font-medium capitalize">{bom.openingMode || "-"}</div></div>
 </div>
 </CardContent>
 </Card>

 {/* Committee */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t.bidOpeningMinutesTab.committee}</CardTitle><p className="text-xs text-muted-foreground mt-1">{t.bidOpeningMinutesTab.minCommittee}</p></div>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <Label>{t.bidOpeningMinutesTab.chairpersonName} *</Label>
 <Input value={committeeForm.chairpersonName} onChange={(e) => setCommitteeForm(p => ({ ...p, chairpersonName: e.target.value }))} disabled={!isEditable} />
 </div>
 <div>
 <Label>{t.bidOpeningMinutesTab.member1Name} *</Label>
 <Input value={committeeForm.member1Name} onChange={(e) => setCommitteeForm(p => ({ ...p, member1Name: e.target.value }))} disabled={!isEditable} />
 </div>
 <div>
 <Label>{t.bidOpeningMinutesTab.member2Name} *</Label>
 <Input value={committeeForm.member2Name} onChange={(e) => setCommitteeForm(p => ({ ...p, member2Name: e.target.value }))} disabled={!isEditable} />
 </div>
 <div>
 <Label>{t.bidOpeningMinutesTab.member3Name}</Label>
 <Input value={committeeForm.member3Name} onChange={(e) => setCommitteeForm(p => ({ ...p, member3Name: e.target.value }))} disabled={!isEditable} />
 </div>
 </div>
 {isEditable && (
 <div className="flex justify-end">
 <Button onClick={handleSaveCommittee} disabled={!committeeForm.chairpersonName || !committeeForm.member1Name || !committeeForm.member2Name || updateCommitteeMutation.isPending} className="gap-2">
 <CheckCircle className="h-4 w-4" />{t.bidOpeningMinutesTab.saveCommittee}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Bid Summary */}
 <Card>
 <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t.bidOpeningMinutesTab.bidSummary}</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-3 gap-4">
 <div><Label>{t.bidOpeningMinutesTab.totalBidsReceived}</Label><Input type="number" min="0" value={bidSummaryForm.totalBidsReceived || String(bom.totalBidsReceived || "")} onChange={(e) => setBidSummaryForm(p => ({ ...p, totalBidsReceived: e.target.value }))} disabled={!isEditable} /></div>
 <div><Label>{t.bidOpeningMinutesTab.bidsOpenedCount}</Label><Input type="number" min="0" value={bidSummaryForm.bidsOpenedCount || String(bom.bidsOpenedCount || "")} onChange={(e) => setBidSummaryForm(p => ({ ...p, bidsOpenedCount: e.target.value }))} disabled={!isEditable} /></div>
 <div><Label>{t.bidOpeningMinutesTab.bidsRejected}</Label><Input type="number" min="0" value={String(Math.max(0, (parseInt(bidSummaryForm.totalBidsReceived || String(bom.totalBidsReceived || 0))) - (parseInt(bidSummaryForm.bidsOpenedCount || String(bom.bidsOpenedCount || 0)))))} disabled className="bg-gray-50" /></div>
 </div>
 <div>
 <Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" />{t.bidOpeningMinutesTab.irregularities}</Label>
 <p className="text-xs text-muted-foreground mb-2">{t.bidOpeningMinutesTab.irregularitiesDesc}</p>
 <Textarea value={bidSummaryForm.irregularities || bom.irregularities || ""} onChange={(e) => setBidSummaryForm(p => ({ ...p, irregularities: e.target.value }))} disabled={!isEditable} rows={3} placeholder={t.bidOpeningMinutesTab.noIrregularities} />
 </div>
 {isEditable && (
 <div className="flex justify-end"><Button onClick={handleSaveBidSummary} disabled={updateBidSummaryMutation.isPending} className="gap-2"><CheckCircle className="h-4 w-4" />{t.bidOpeningMinutesTab.saveBidSummary}</Button></div>
 )}
 </CardContent>
 </Card>

 {/* Declaration */}
 <Card>
 <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t.bidOpeningMinutesTab.declaration}</CardTitle></CardHeader>
 <CardContent>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
 <p className="text-sm leading-relaxed text-gray-700 italic">{t.bidOpeningMinutesTab.declarationText}</p>
 </div>
 </CardContent>
 </Card>

 {/* Actions */}
 {isEditable && (
 <div className="flex justify-end gap-3">
 <Button variant="outline" onClick={() => { if (!bom?.id) return; finalizeMutation.mutate({ bomId: bom.id }); }} disabled={finalizeMutation.isPending} className="gap-2">
 <FileText className="h-4 w-4" />{t.bidOpeningMinutesTab.finalize}
 </Button>
 </div>
 )}
 {bom.status === "finalized" && (
 <div className="flex justify-end">
 <Button onClick={() => { if (!bom?.id) return; approveMutation.mutate({ bomId: bom.id }); }} disabled={approveMutation.isPending} className="gap-2 bg-green-600 hover:bg-green-700">
 <CheckCircle className="h-4 w-4" />{t.bidOpeningMinutesTab.approve}
 </Button>
 </div>
 )}
 </div>
 );
}
