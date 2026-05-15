import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Printer, AlertCircle, CheckCircle, PenTool, ShieldCheck, RotateCcw, RefreshCw, FileText, Download, ChevronDown, ChevronUp, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from '@/i18n/useTranslation';
import SignatureCanvas from "@/components/SignatureCanvas";
import { BackButton } from "@/components/BackButton";


/**
 * Bid Opening Minutes (BOM) - Official record of bid opening ceremony
 * 
 * Purpose:
 * - Document the formal bid opening process
 * - Record attendees and witnesses
 * - List all bids received (without prices)
 * - Capture any observations or issues
 * - Obtain committee signatures
 * 
 * Note: This is a legal document required for tenders >$25K
 * BOM is linked to Purchase Request (PR), not Bid Analysis
 */

interface Attendee {
 id: string;
 name: string;
 title: string;
 organization: string;
}

export default function BidOpeningMinutes() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const [, navigate] = useLocation();
 const prId = parseInt(id || "0");

   // ========== TRANSLATION OBJECT ==========
  const localT = {
    // Header & Navigation
    backToWorkspace: t.logistics.backToWorkspace,
    documentTitle: t.bidOpeningMinutes?.documentTitle || "Bid Opening Minutes",
    officialRecord: t.bidOpeningMinutes.officialRecord,
    
    // Meeting Details
    meetingDetails: t.bidOpeningMinutes.meetingDetails,
    openingDate: t.bidOpeningMinutes.openingDate,
    openingTime: t.bidOpeningMinutes.openingTime,
    venue: t.bidOpeningMinutes.venue,
    conferenceRoomExample: t.bidOpeningMinutes.conferenceRoomExample,
    openingMode: t.bidOpeningMinutes.openingMode,
    openingModePhysical: t.bidOpeningMinutes.openingModePhysical,
    openingModeOnline: t.bidOpeningMinutes.openingModeOnline,
    openingModeHybrid: t.bidOpeningMinutes.openingModeHybrid,
    
    // Committee
    openingCommittee: t.bidOpeningMinutes.openingCommittee,
    chairperson: t.bidOpeningMinutes.chairperson,
    member: t.bidOpeningMinutes.member,
    nameAndRole: t.bidOpeningMinutes.nameAndRole,
    
    // Bid Summary
    bidSummary: t.bidOpeningMinutes.bidSummary,
    totalBidsReceived: t.bidOpeningMinutes.totalBidsReceived,
    bidsOpened: t.bidOpeningMinutes.bidsOpened,
    
    // Notes & Observations
    openingNotes: t.bidOpeningMinutes.openingNotes,
    observationsDuringBidOpening: t.bidOpeningMinutes.observationsDuringBidOpening,
    irregularities: t.bidOpeningMinutes.irregularities,
    issuesOrIrregularities: t.bidOpeningMinutes.issuesOrIrregularities,
    
    // Approval
    approval: t.bidOpeningMinutes.approval,
    approveBom: t.bidOpeningMinutes.approveBom,
    approverCommentsOptional: t.bidOpeningMinutes.approverCommentsOptional,
    addCommentsAboutApproval: t.bidOpeningMinutes.addCommentsAboutApproval,
    
    // Signatures
    digitalSignatures: t.bidOpeningMinutes.digitalSignatures,
    committeeSignatures: t.bidOpeningMinutes.committeeSignatures,
    signatureRequired: t.bidOpeningMinutes.signatureRequired,
    allMembersMustSign: t.bidOpeningMinutes.allMembersMustSign,
    signedMembers: t.bidOpeningMinutes.signedMembers,
    pendingSignatures: t.bidOpeningMinutes.pendingSignatures,
    signatureCollected: t.bidOpeningMinutes.signatureCollected,
    awaitingSignature: t.bidOpeningMinutes.awaitingSignature,
    signNow: t.bidOpeningMinutes.signNow,
    verificationCode: t.bidOpeningMinutes.verificationCode,
    allSignaturesCollected: t.bidOpeningMinutes.allSignaturesCollected,
    cannotApproveUnsigned: t.bidOpeningMinutes.cannotApproveUnsigned,
    revokeSignature: t.bidOpeningMinutes.revokeSignature,
    revokeSignatureTitle: t.bidOpeningMinutes.revokeSignatureTitle,
    confirmRevoke: t.bidOpeningMinutes.confirmRevoke,
    
    // Actions
    printPdf: t.bidOpeningMinutes.printPdf,
    finalizeBom: t.bidOpeningMinutes.finalizeBom,
    createBidOpeningMinutes: t.bidOpeningMinutes.createBidOpeningMinutes,
    saveBidSummary: t.bidOpeningMinutes.saveBidSummary,
    
    // Status
    status: t.bidOpeningMinutes.status,
    statusFinalized: t.bidOpeningMinutes.statusFinalized,
    optional: t.bidOpeningMinutes.optional,
    
    // Loading & Messages
    loading: t.bidOpeningMinutes.loading,
    generating: t.bidOpeningMinutes.generating,
    
    // Common
    save: t.common.save,
    cancel: t.common.cancel,
    delete: t.common.delete,
    edit: t.common.edit,
    add: t.common.add,
    submit: t.common.submit,
    required: t.common.required,
    error: t.common.error,
  };

  
 // Fetch PR data
 const { data: pr, isLoading: prLoading } = trpc.procurementPhaseA.purchaseRequest.getById.useQuery({ id: prId });

 // Auto-create or get existing BOM on first access
 const autoCreateBOM = trpc.procurementPhaseA.bidOpeningMinutes.autoCreateOrGet.useMutation({
 onSuccess: (createdBom) => {
 refetchBom();
 },
 onError: (error) => {
 console.log("BOM auto-create failed:", error.message);
 },
 });

 // Fetch existing BOM by PR ID (returns null if not found)
 const { data: bom, isLoading: bomLoading, refetch: refetchBom } = trpc.procurementPhaseA.bidOpeningMinutes.getByPurchaseRequestId.useQuery({ purchaseRequestId: prId });

 // Auto-create BOM on first access if it doesn't exist
 useEffect(() => {
 console.log('[BOM Auto-Create] useEffect triggered:', {
 hasPR: !!pr,
 hasBOM: !!bom,
 bomLoading,
 prTotalUsd: pr?.prTotalUsd,
 prTotalParsed: pr?.prTotalUsd ? parseFloat(pr.prTotalUsd) : null,
 isAbove25K: pr?.prTotalUsd ? parseFloat(pr.prTotalUsd) > 25000 : false,
 });
 
 if (pr && !bom && !bomLoading && pr.prTotalUsd && parseFloat(pr.prTotalUsd) > 25000) {
 console.log('[BOM Auto-Create] Calling autoCreateBOM mutation...');
 autoCreateBOM.mutate({ purchaseRequestId: prId });
 }
 }, [pr, bom, bomLoading, prId]);

 // Fetch bidders from bid analysis
 const { data: bidders = [], isLoading: biddersLoading } = trpc.logistics.bidAnalysis.getBidders.useQuery(
 { bidAnalysisId: pr?.bidAnalysisId || 0 },
 { enabled: !!pr?.bidAnalysisId }
 );

 // Form state
 const [meetingDate, setMeetingDate] = useState("");
 const [meetingTime, setMeetingTime] = useState("");
 const [location, setLocation] = useState("");
 const [openingMode, setOpeningMode] = useState<"physical" | "online" | "hybrid">("physical");
 const [chairpersonName, setChairpersonName] = useState("");
 const [member1Name, setMember1Name] = useState("");
 const [member2Name, setMember2Name] = useState("");
 const [member3Name, setMember3Name] = useState("");
 const [totalBidsReceived, setTotalBidsReceived] = useState("");
 const [bidsOpenedCount, setBidsOpenedCount] = useState("");
 const [openingNotes, setOpeningNotes] = useState("");
 const [irregularities, setIrregularities] = useState("");
 const [approverComments, setApproverComments] = useState("");

 // Get current user for authorization checks
 const { user } = useAuth();
 
 // Get language for RTL/LTR support and translations
 const { language, isRTL} = useLanguage();

 // Fetch BOM signatures (only when BOM exists and is finalized or approved)
 const { data: bomSignatures = [], refetch: refetchSignatures } = trpc.procurementPhaseA.bidOpeningMinutes.getBomSignatures.useQuery(
   { bomId: bom?.id || 0 },
   { enabled: !!bom && (bom.status === 'finalized' || bom.status === 'approved') }
 );

 // Initialize signature slots mutation
 const initSignatureSlots = trpc.procurementPhaseA.bidOpeningMinutes.initSignatureSlots.useMutation({
   onSuccess: () => {
     refetchSignatures();
   },
 });

 // Save signature mutation
 const saveSignature = trpc.procurementPhaseA.bidOpeningMinutes.saveBomSignature.useMutation({
   onSuccess: () => {
     toast.success(language === 'ar' ? 'تم حفظ التوقيع بنجاح' : 'Signature saved successfully');
     refetchSignatures();
   },
   onError: (error) => {
     toast.error(error.message);
   },
 });

 // Revoke signature mutation (admin only)
 const revokeSignature = trpc.procurementPhaseA.bidOpeningMinutes.revokeBomSignature.useMutation({
   onSuccess: (data) => {
     toast.success(language === 'ar'
       ? `تم إلغاء توقيع ${data.memberName} بنجاح. يمكن للعضو إعادة التوقيع.`
       : `Signature of ${data.memberName} has been revoked. Member can re-sign.`);
     refetchSignatures();
   },
   onError: (error) => {
     toast.error(error.message);
   },
 });

 // Auto-initialize signature slots when BOM is finalized
 useEffect(() => {
   if (bom && bom.status === 'finalized' && bomSignatures.length === 0) {
     initSignatureSlots.mutate({ bomId: bom.id });
   }
 }, [bom?.id, bom?.status, bomSignatures.length]);

 // Calculate signature status
 const totalSignatureSlots = bomSignatures.length;
 const signedCount = bomSignatures.filter((s: any) => s.signatureDataUrl).length;
 const allSigned = totalSignatureSlots > 0 && signedCount === totalSignatureSlots;

 // Check if current user is admin (for signature revocation)
 const isAdmin = user?.role === 'platform_super_admin' || user?.role === 'platform_admin' || user?.role === 'organization_admin' || user?.role === 'admin';

 // State for active signature slot (which member is currently signing)
 const [activeSignatureSlot, setActiveSignatureSlot] = useState<number | null>(null);

 // Initialize form with current date/time
 useEffect(() => {
 const now = new Date();
 setMeetingDate(now.toISOString().split("T")[0]);
 setMeetingTime(now.toTimeString().slice(0, 5));
 }, []);

 // Populate form with existing BOM data
 useEffect(() => {
 if (bom) {
 if (bom.openingDate) {
 setMeetingDate(new Date(bom.openingDate).toISOString().split("T")[0]);
 }
 if (bom.openingTime) setMeetingTime(bom.openingTime);
 if (bom.openingVenue) setLocation(bom.openingVenue);
 if (bom.openingMode) setOpeningMode(bom.openingMode);
 if (bom.chairpersonName) setChairpersonName(bom.chairpersonName);
 if (bom.member1Name) setMember1Name(bom.member1Name);
 if (bom.member2Name) setMember2Name(bom.member2Name);
 if (bom.member3Name) setMember3Name(bom.member3Name);
 if (bom.totalBidsReceived) setTotalBidsReceived(bom.totalBidsReceived.toString());
 if (bom.bidsOpenedCount) setBidsOpenedCount(bom.bidsOpenedCount.toString());
 if (bom.openingNotes) setOpeningNotes(bom.openingNotes || "");
 if (bom.irregularities) setIrregularities(bom.irregularities || "");
 }
 }, [bom]);

 // Create BOM mutation
 const createBOM = trpc.procurementPhaseA.bidOpeningMinutes.create.useMutation({
 onSuccess: () => {
 toast.success(language === 'ar' ? 'تم إنشاء محضر فتح العروض بنجاح' : 'Bid Opening Minutes created successfully');
 refetchBom();
 },
 onError: (error) => {
 toast.error(language === 'ar' ? `فشل في الإنشاء: ${error.message}` : `Failed to create: ${error.message}`);
 },
 });

 // Update bid summary mutation
 const updateBidSummary = trpc.procurementPhaseA.bidOpeningMinutes.updateBidSummary.useMutation({
 onSuccess: () => {
 toast.success(language === 'ar' ? 'تم تحديث ملخص العروض بنجاح' : 'Bid summary updated successfully');
 refetchBom();
 },
 onError: (error) => {
 toast.error(language === 'ar' ? `فشل في التحديث: ${error.message}` : `Failed to update: ${error.message}`);
 },
 });

 // Finalize BOM mutation
 const finalizeBOM = trpc.procurementPhaseA.bidOpeningMinutes.finalize.useMutation({
 onSuccess: () => {
 toast.success(language === 'ar' ? 'تم إنهاء محضر الفتح بنجاح' : 'BOM finalized successfully');
 refetchBom();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Approve BOM mutation
 const approveBOM = trpc.procurementPhaseA.bidOpeningMinutes.approve.useMutation({
 onSuccess: () => {
 toast.success(language === 'ar' ? 'تمت الموافقة على محضر الفتح بنجاح' : 'BOM approved successfully');
 refetchBom();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Generate PDF mutation
const generatePDF = trpc.logistics.generatePDF.useMutation({
  onSuccess: async (data) => {
    try {
      if (!data.success || !data.pdf) {
        throw new Error("Invalid PDF response");
      }

      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = data.filename || "bid-opening-minutes.pdf";

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      toast.success(
        language === "ar"
          ? "تم تحميل PDF بنجاح"
          : "PDF downloaded successfully"
      );
    } catch (err) {
      toast.error("Failed to process PDF");
    }
  },
});

 const handleCreateBOM = () => {
 if (!meetingDate || !meetingTime || !location) {
 toast.error(language === 'ar' ? 'يرجى ملء جميع تفاصيل الاجتماع' : 'Please fill in all meeting details');
 return;
 }

 if (!chairpersonName || !member1Name || !member2Name) {
 toast.error(language === 'ar' ? 'يرجى توفير 3 أعضاء لجنة على الأقل' : 'Please provide at least 3 committee members');
 return;
 }

 createBOM.mutate({
 purchaseRequestId: prId,
 bidAnalysisId: pr?.bidAnalysisId || 0,
 openingDate: new Date(meetingDate),
 openingTime: meetingTime,
 openingVenue: location,
 openingMode,
 chairpersonName,
 member1Name,
 member2Name,
 member3Name: member3Name || undefined,
 });
 };

 const handleUpdateBidSummary = () => {
 if (!bom) return;

 if (!totalBidsReceived || !bidsOpenedCount) {
 toast.error(language === 'ar' ? 'يرجى ملء معلومات ملخص العروض' : 'Please fill in bid summary information');
 return;
 }

 updateBidSummary.mutate({
 bomId: bom.id,
 totalBidsReceived: parseInt(totalBidsReceived),
 bidsOpenedCount: parseInt(bidsOpenedCount),
 openingNotes,
 irregularities,
 });
 };

 const handleFinalizeBOM = () => {
 if (!bom) return;

 finalizeBOM.mutate({
 bomId: bom.id,
 });
 };

 const handlePrintPDF = () => {
  if (!bom) return;

  generatePDF.mutate({
    documentType: "bom",
    documentId: bom.id,
    language: language === "ar" ? "ar" : "en",
    });
  }; // ✅ CLOSE FUNCTION HERE


  const handleApproveBOM = () => {
    if (!bom) return;

    approveBOM.mutate({
      bomId: bom.id,
      approverComments,
    });
  };

 // Loading state
 if (prLoading || bomLoading) {
 return (
 <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 );
 }

 // PR not found
 if (!pr) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <div className="text-center">
 <h2 className="text-2xl font-bold mb-2">{isRTL ? 'لم يتم العثور على طلب الشراء' : 'Purchase Request Not Found'}</h2>
 <p className="text-muted-foreground mb-4">The requested purchase request does not exist.</p>
 <BackButton onClick={() => navigate(`/organization/logistics/procurement-workspace/${prId}`)} label={t.logistics.backToWorkspace} />
 </div>
 </div>
 );
 }

 // BOM not created yet - show creation form
 if (!bom) {
 return (
 <div className="min-h-screen bg-gray-50 p-6">
 <div className="max-w-6xl mx-auto">
 {/* Header */}
 <div className="mb-6">
 <BackButton onClick={() => navigate(`/organization/logistics/procurement-workspace/${prId}`)} label={t.logistics.backToWorkspace} />
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold">{localT.documentTitle}</h1>
 <p className="text-muted-foreground mt-1">
 {localT.officialRecord} {pr.prNumber}
 </p>
 </div>
 </div>
 </div>

 {/* Not Created State */}
 <Card className="border-yellow-200 bg-yellow-50 mb-6">
 <CardContent className="pt-6">
 <div className="flex items-start gap-4">
 <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
 <div className="flex-1">
 <h3 className="font-semibold text-yellow-900 mb-1">{isRTL ? 'لم يتم إنشاء محضر فتح العروض' : 'Bid Opening Minutes Not Created'}</h3>
 <p className="text-sm text-yellow-800 mb-4">
 Create the Bid Opening Minutes document to formally record the bid opening ceremony. This document must be completed before proceeding with bid evaluation.
 </p>
 <p className="text-sm text-yellow-800">
 <strong>Requirements:</strong> PR amount &gt; USD 25,000 and Tender Announcement End Date has passed.
 </p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Create BOM Form */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{localT.meetingDetails}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="meetingDate">{localT.openingDate} *</Label>
 <Input
 id="meetingDate"
 type="date"
 value={meetingDate}
 onChange={(e) => setMeetingDate(e.target.value)}
 required
 />
 </div>
 <div>
 <Label htmlFor="meetingTime">{localT.openingTime} *</Label>
 <Input
 id="meetingTime"
 type="time"
 value={meetingTime}
 onChange={(e) => setMeetingTime(e.target.value)}
 required
 />
 </div>
 <div>
 <Label htmlFor="location">{localT.venue} *</Label>
 <Input
 id="location"
 placeholder={localT.conferenceRoomExample}
 value={location}
 onChange={(e) => setLocation(e.target.value)}
 required
 />
 </div>
 <div>
 <Label htmlFor="openingMode">{localT.openingMode} *</Label>
 <Select value={openingMode} onValueChange={(value) => setOpeningMode(value as "physical" | "online" | "hybrid")}>
 <SelectTrigger id="openingMode">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="physical">{localT.openingModePhysical}</SelectItem>
 <SelectItem value="online">{localT.openingModeOnline}</SelectItem>
 <SelectItem value="hybrid">{localT.openingModeHybrid}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Committee Members */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{localT.openingCommittee}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 <div>
 <Label htmlFor="chairperson">{localT.chairperson} *</Label>
 <Input
 id="chairperson"
 placeholder={localT.nameAndRole}
 value={chairpersonName}
 onChange={(e) => setChairpersonName(e.target.value)}
 required
 />
 </div>
 <div>
 <Label htmlFor="member1">{localT.member} 1 *</Label>
 <Input
 id="member1"
 placeholder={localT.nameAndRole}
 value={member1Name}
 onChange={(e) => setMember1Name(e.target.value)}
 required
 />
 </div>
 <div>
 <Label htmlFor="member2">{localT.member} 2 *</Label>
 <Input
 id="member2"
 placeholder={localT.nameAndRole}
 value={member2Name}
 onChange={(e) => setMember2Name(e.target.value)}
 required
 />
 </div>
 <div>
 <Label htmlFor="member3">{localT.member} 3 ({localT.optional})</Label>
 <Input
 id="member3"
 placeholder={localT.nameAndRole}
 value={member3Name}
 onChange={(e) => setMember3Name(e.target.value)}
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Action Button */}
 <div className="flex gap-2">
 <Button onClick={handleCreateBOM} disabled={createBOM.isPending} className="flex-1">
 {createBOM.isPending ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 {localT.loading}...
 </>
 ) : (
 <>
 <Plus className="w-4 h-4 me-2" />
 {localT.createBidOpeningMinutes}
 </>
 )}
 </Button>
 </div>
 </div>
 </div>
 );
 }

 // BOM exists - show view/edit form
 return (
 <div className="min-h-screen bg-gray-50 p-6">
 <div className="max-w-6xl mx-auto">
 {/* Header */}
 <div className="mb-6">
 <BackButton onClick={() => navigate(`/organization/logistics/procurement-workspace/${prId}`)} label={t.logistics.backToWorkspace} />
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold">{localT.documentTitle}</h1>
 <p className="text-muted-foreground mt-1">
 {localT.officialRecord} {pr.prNumber}
 </p>
 </div>
 <div className="flex gap-2">
 {(bom.status === "finalized" || bom.status === "approved") && (
 <Button onClick={handlePrintPDF} variant="outline" disabled={generatePDF.isPending}>
 {generatePDF.isPending ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 {localT.generating}
 </>
 ) : (
 <>
 <Printer className="w-4 h-4 me-2" />
 {localT.printPdf}
 </>
 )}
 </Button>
 )}
 </div>
 </div>
 </div>

 {/* Status Badge */}
 <div className="mb-6">
 <div className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={{
 backgroundColor: bom.status === "approved" ? "#d1fae5" : bom.status === "finalized" ? "#dbeafe" : "#fef3c7",
 color: bom.status === "approved" ? "#065f46" : bom.status === "finalized" ? "#1e40af" : "#92400e"
 }}>
 {localT.status}: {bom.status === 'finalized' ? localT.statusFinalized : bom.status === 'approved' ? (language === 'ar' ? 'معتمد' : 'Approved') : bom.status === 'draft' ? (language === 'ar' ? 'مسودة' : 'Draft') : (String(bom.status).charAt(0).toUpperCase() + String(bom.status).slice(1))}
 </div>
 </div>

 {/* Meeting Details */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{localT.meetingDetails}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="meetingDate">{localT.openingDate}</Label>
 <Input
 id="meetingDate"
 type="date"
 value={meetingDate}
 onChange={(e) => setMeetingDate(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 <div>
 <Label htmlFor="meetingTime">{localT.openingTime}</Label>
 <Input
 id="meetingTime"
 type="time"
 value={meetingTime}
 onChange={(e) => setMeetingTime(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 <div>
 <Label htmlFor="location">{localT.venue}</Label>
 <Input
 id="location"
 placeholder={t.placeholders.eGConferenceRoomA}
 value={location}
 onChange={(e) => setLocation(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 <div>
 <Label htmlFor="openingMode">{localT.openingMode}</Label>
 <Select value={openingMode} onValueChange={(value) => setOpeningMode(value as "physical" | "online" | "hybrid")} disabled={bom.status === "finalized"}>
 <SelectTrigger id="openingMode" disabled={bom.status === "finalized"}>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="physical">{localT.openingModePhysical}</SelectItem>
 <SelectItem value="online">{localT.openingModeOnline}</SelectItem>
 <SelectItem value="hybrid">{localT.openingModeHybrid}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Committee Members */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{localT.openingCommittee}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 <div>
 <Label htmlFor="chairperson">{localT.chairperson}</Label>
 <Input
 id="chairperson"
 placeholder={localT.nameAndRole}
 value={chairpersonName}
 onChange={(e) => setChairpersonName(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 <div>
 <Label htmlFor="member1">{localT.member} 1</Label>
 <Input
 id="member1"
 placeholder={localT.nameAndRole}
 value={member1Name}
 onChange={(e) => setMember1Name(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 <div>
 <Label htmlFor="member2">{localT.member} 2</Label>
 <Input
 id="member2"
 placeholder={localT.nameAndRole}
 value={member2Name}
 onChange={(e) => setMember2Name(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 <div>
 <Label htmlFor="member3">{localT.member} 3 ({localT.optional})</Label>
 <Input
 id="member3"
 placeholder={localT.nameAndRole}
 value={member3Name}
 onChange={(e) => setMember3Name(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Bidders List */}
 {bidders.length > 0 && (
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{language === 'ar' ? 'العروض المستلمة' : 'Bidders Received'}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{language === 'ar' ? 'اسم المتقدم' : 'Bidder Name'}</TableHead>
 <TableHead>{language === 'ar' ? 'حالة التقديم' : 'Submission Status'}</TableHead>
 <TableHead>{language === 'ar' ? 'تاريخ التقديم' : 'Submission Date'}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {bidders.map((bidder: any) => (
 <TableRow key={bidder.id}>
 <TableCell>{bidder.bidderName}</TableCell>
 <TableCell>{bidder.submissionStatus ? (language === 'ar' ? (bidder.submissionStatus === 'received' ? 'مستلم' : bidder.submissionStatus === 'pending' ? 'قيد الانتظار' : bidder.submissionStatus === 'rejected' ? 'مرفوض' : bidder.submissionStatus) : bidder.submissionStatus) : 'N/A'}</TableCell>
 <TableCell>{bidder.submissionDate ? new Date(bidder.submissionDate).toLocaleDateString() : "N/A"}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 )}

 {/* Bid Summary */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{localT.bidSummary}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div>
 <Label htmlFor="totalBidsReceived">{localT.totalBidsReceived}</Label>
 <Input
 id="totalBidsReceived"
 type="number"
 value={totalBidsReceived}
 onChange={(e) => setTotalBidsReceived(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 <div>
 <Label htmlFor="bidsOpenedCount">{localT.bidsOpened}</Label>
 <Input
 id="bidsOpenedCount"
 type="number"
 value={bidsOpenedCount}
 onChange={(e) => setBidsOpenedCount(e.target.value)}
 disabled={bom.status === "finalized" || bom.status === "approved"}
 />
 </div>
 </div>
 <div className="mb-4">
 <Label htmlFor="openingNotes">{localT.openingNotes}</Label>
 <Textarea
 id="openingNotes"
 placeholder={localT.observationsDuringBidOpening}
 value={openingNotes}
 onChange={(e) => setOpeningNotes(e.target.value)}
 disabled={bom.status === "finalized"}
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="irregularities">{localT.irregularities}</Label>
 <Textarea
 id="irregularities"
 placeholder={localT.issuesOrIrregularities}
 value={irregularities}
 onChange={(e) => setIrregularities(e.target.value)}
 disabled={bom.status === "finalized"}
 rows={3}
 />
 </div>
 </CardContent>
 </Card>

 {/* Digital Signatures Section (only for finalized BOMs) */}
 {(bom.status === 'finalized' || bom.status === 'approved') && bomSignatures.length > 0 && (
 <Card className="mb-6 border-blue-200">
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2">
 <PenTool className="w-5 h-5 text-blue-600" />
 {localT.digitalSignatures}
 </CardTitle>
 <div className="text-sm text-muted-foreground">
 {localT.signedMembers}: {signedCount}/{totalSignatureSlots}
 </div>
 </div>
 {bom.status === 'finalized' && !allSigned && (
 <p className="text-sm text-amber-600 mt-2">
 {localT.allMembersMustSign}
 </p>
 )}
 {allSigned && (
 <div className="flex items-center gap-2 mt-2 text-green-600">
 <ShieldCheck className="w-4 h-4" />
 <span className="text-sm font-medium">{localT.allSignaturesCollected}</span>
 </div>
 )}
 </CardHeader>
 <CardContent>
 <div className="space-y-6">
 {bomSignatures.map((sig: any) => (
 <div key={sig.id} className={`border rounded-lg p-4 ${
 sig.signatureDataUrl ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
 }`}>
 <div className="flex items-center justify-between mb-3">
 <div>
 <h4 className="font-semibold text-sm">
 {language === 'ar' ? sig.roleAr : sig.role}
 </h4>
 <p className="text-sm text-muted-foreground">{sig.memberName}</p>
 </div>
 {sig.signatureDataUrl ? (
 <div className="flex items-center gap-1 text-green-600">
 <CheckCircle className="w-4 h-4" />
 <span className="text-xs font-medium">{localT.signatureCollected}</span>
 </div>
 ) : (
 <span className="text-xs text-amber-600 font-medium">{localT.awaitingSignature}</span>
 )}
 </div>

 {/* Show existing signature or signature canvas */}
 {sig.signatureDataUrl ? (
 <div className="space-y-2">
 <div className="border rounded bg-white p-2 inline-block">
 <img src={sig.signatureDataUrl} alt={`${sig.memberName} signature`} className="h-[80px] object-contain" />
 </div>
 <div className="flex items-center gap-4 text-xs text-muted-foreground">
 {sig.signedAt && (
 <span>{localT.signedMembers}: {new Date(sig.signedAt).toLocaleString()}</span>
 )}
 {sig.verificationCode && (
 <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{sig.verificationCode}</span>
 )}
 </div>
 {sig.qrCodeDataUrl && (
 <div className="mt-1">
 <img src={sig.qrCodeDataUrl} alt="QR" className="w-[60px] h-[60px]" />
 </div>
 )}
 {/* Revoke Signature Button (admin only, finalized BOMs only) */}
 {isAdmin && bom.status === 'finalized' && (
 <AlertDialog>
 <AlertDialogTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 className="mt-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
 disabled={revokeSignature.isPending}
 >
 {revokeSignature.isPending ? (
 <Loader2 className="w-3 h-3 me-1 animate-spin" />
 ) : (
 <RotateCcw className="w-3 h-3 me-1" />
 )}
 {localT.revokeSignature}
 </Button>
 </AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{localT.revokeSignatureTitle}</AlertDialogTitle>
 <AlertDialogDescription>
 {language === 'ar'
 ? `هل أنت متأكد من إلغاء توقيع ${sig.memberName} (${language === 'ar' ? sig.roleAr : sig.role})؟ سيحتاج العضو إلى إعادة التوقيع قبل الموافقة على محضر فتح العطاءات.`
 : `Are you sure you want to revoke the signature of ${sig.memberName} (${sig.role})? The member will need to re-sign before the BOM can be approved.`}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
 <AlertDialogAction
 onClick={() => revokeSignature.mutate({ signatureId: sig.id })}
 className="bg-red-600 hover:bg-red-700 text-white"
 >
 {localT.confirmRevoke}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 )}
 </div>
 ) : bom.status === 'finalized' ? (
 <div>
 {activeSignatureSlot === sig.id ? (
 <div className="mt-2">
 <SignatureCanvas
 width={360}
 height={120}
 onSave={(dataUrl) => {
 saveSignature.mutate({
 signatureId: sig.id,
 signatureDataUrl: dataUrl,
 });
 setActiveSignatureSlot(null);
 }}
 onClear={() => {}}
 disabled={saveSignature.isPending}
 clearLabel={t.procurement.clearSignature}
 confirmLabel={t.procurement.confirmSignature}
 signHereLabel={t.procurement.signHere}
 />
 {saveSignature.isPending && (
 <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
 <Loader2 className="w-3 h-3 animate-spin" />
 {language === 'ar' ? 'جاري حفظ التوقيع...' : 'Saving signature...'}
 </div>
 )}
 </div>
 ) : (
 <Button
 variant="outline"
 size="sm"
 onClick={() => setActiveSignatureSlot(sig.id)}
 className="mt-2"
 >
 <PenTool className="w-3 h-3 me-1" />
 {localT.signNow}
 </Button>
 )}
 </div>
 ) : null}
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Approval Section (only for finalized BOMs and admin users) */}
 {bom.status === "finalized" && (user?.role === "platform_super_admin" || user?.role === "platform_admin" || user?.role === "organization_admin" || user?.role === "admin") && (
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{localT.approval}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="mb-4">
 <Label htmlFor="approverComments">{localT.approverCommentsOptional}</Label>
 <Textarea
 id="approverComments"
 placeholder={localT.addCommentsAboutApproval}
 value={approverComments}
 onChange={(e) => setApproverComments(e.target.value)}
 rows={3}
 />
 </div>
 {!allSigned && totalSignatureSlots > 0 && (
 <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
 <span className="text-sm text-amber-800">{localT.cannotApproveUnsigned}</span>
 </div>
 )}
 <Button 
 onClick={handleApproveBOM} 
 disabled={approveBOM.isPending || (!allSigned && totalSignatureSlots > 0)} 
 variant="default"
 >
 {approveBOM.isPending ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 {language === 'ar' ? 'جاري الموافقة...' : 'Approving...'}
 </>
 ) : (
 <>
 <CheckCircle className="w-4 h-4 me-2" />
 {localT.approveBom}
 </>
 )}
 </Button>
 </CardContent>
 </Card>
 )}

 {/* Approval Info (for approved BOMs) */}
 {bom.status === "approved" && bom.approvedAt && (
 <Card className="mb-6 border-green-200 bg-green-50">
 <CardHeader>
 <CardTitle className="text-green-900">{language === 'ar' ? 'معلومات الموافقة' : 'Approval Information'}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-green-600" />
 <span className="font-semibold text-green-900">{language === 'ar' ? 'تمت الموافقة على محضر فتح العروض' : 'This BOM has been approved'}</span>
 </div>
 <div className="text-sm text-green-800">
 <strong>{language === 'ar' ? 'تاريخ الموافقة:' : 'Approved At:'}</strong> {new Date(bom.approvedAt).toLocaleString()}
 </div>
 {bom.approverComments && (
 <div className="text-sm text-green-800">
 <strong>{language === 'ar' ? 'التعليقات:' : 'Comments:'}</strong> {bom.approverComments}
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Action Buttons */}
 <div className="flex gap-2">
 {bom.status !== "finalized" && bom.status !== "approved" && (
 <>
 <Button onClick={handleUpdateBidSummary} disabled={updateBidSummary.isPending}>
 {updateBidSummary.isPending ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 {localT.loading}...
 </>
 ) : (
 <>{localT.saveBidSummary}</>
 )}
 </Button>
 <Button onClick={handleFinalizeBOM} disabled={finalizeBOM.isPending} variant="default">
 {finalizeBOM.isPending ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 {localT.loading}...
 </>
 ) : (
 <>{localT.finalizeBom}</>
 )}
 </Button>
 </>
 )}
 </div>
 </div>
 </div>
 );
}