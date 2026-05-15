import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import SignatureCapture from "@/components/SignatureCapture";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import {
  Plus,
  Trash2,
  FileText,
  Calendar as CalendarIcon,
  Pen,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Printer,
} from "lucide-react";

interface Bidder {
 id?: number;
 bidderName: string;
 supplierId?: number;
 submissionDate: string;
 status: "received" | "valid" | "disqualified";
 totalOfferCost?: number;
 currency?: string;
 bidReceiptAcknowledgementPrinted?: boolean;
}

export default function TenderInformation() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const [, setLocation] = useLocation();
 const { language, isRTL } = useLanguage();
 const generatePDF = trpc.logistics.generatePDF.useMutation();
 const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
 const prId = parseInt(id!);

 // Fetch BA by PR ID
 const { data: ba, isLoading, refetch: refetchBA } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
  { purchaseRequestId: prId },
  { enabled: !!id }
 );

 // Auto-create BA if it doesn't exist
 const autoCreateBA = trpc.logistics.bidAnalysis.autoCreate.useMutation({
  onSuccess: () => {
   refetchBA();
  },
  onError: (error) => {
   toast.error(error.message);
  },
 });

 useEffect(() => {
  if (!isLoading && !ba && prId && !autoCreateBA.isPending) {
   autoCreateBA.mutate({ purchaseRequestId: prId });
  }
 }, [isLoading, ba, prId, autoCreateBA.isPending]);

 // Fetch bidders
 const { data: bidders = [], refetch: refetchBidders } = trpc.logistics.bidAnalysis.getBidders.useQuery(
  { bidAnalysisId: ba?.id || 0 },
  { enabled: !!ba?.id }
 );

 // Fetch signature statuses for all bidders
 const { data: signatureStatuses = {}, refetch: refetchSignatures } = trpc.logistics.bidAnalysis.getBidderSignatureStatuses.useQuery(
  { bidAnalysisId: ba?.id || 0 },
  { enabled: !!ba?.id }
 );

 // Mutations
 const updateTenderInfo = trpc.logistics.bidAnalysis.updateTenderInformation.useMutation({
  onSuccess: () => {
   toast.success(t.tenderInformation.saveTenderInfo);
  },
  onError: (error) => {
   toast.error(error.message);
  },
 });

 const addBidder = trpc.logistics.bidAnalysis.addBidder.useMutation({
  onSuccess: () => {
   toast.success(t.tenderInformation.bidderAdded);
   refetchBidders();
   setNewBidder({ bidderName: "", submissionDate: "", status: "received" });
  },
  onError: (error) => {
   toast.error(error.message);
  },
 });

 const updateBidder = trpc.logistics.bidAnalysis.updateBidder.useMutation({
  onSuccess: () => {
   toast.success(t.tenderInformation.bidderUpdated);
   refetchBidders();
  },
  onError: (error) => {
   toast.error(error.message);
  },
 });

 const deleteBidder = trpc.logistics.bidAnalysis.deleteBidder.useMutation({
  onSuccess: () => {
   toast.success(t.tenderInformation.bidderDeleted);
   refetchBidders();
  },
  onError: (error) => {
   toast.error(error.message);
  },
 });

 // Form state
 const [announcementStartDate, setAnnouncementStartDate] = useState<Date | undefined>(() => {
  if (ba?.announcementStartDate) {
   try { return new Date(ba.announcementStartDate); } catch { return undefined; }
  }
  return undefined;
 });

 const [announcementEndDate, setAnnouncementEndDate] = useState<Date | undefined>(() => {
  if (ba?.announcementEndDate) {
   try { return new Date(ba.announcementEndDate); } catch { return undefined; }
  }
  return undefined;
 });

 const [announcementChannel, setAnnouncementChannel] = useState(ba?.announcementChannel || "");
 const [announcementLink, setAnnouncementLink] = useState(ba?.announcementLink || "");
 const [announcementReference, setAnnouncementReference] = useState(ba?.announcementReference || "");
 const [numberOfBidders, setNumberOfBidders] = useState(ba?.numberOfBidders || 0);

 // Sync form state with ba data when it changes (e.g., after page refresh)
 useEffect(() => {
  if (ba) {
   if (ba.announcementStartDate) {
    try {
     setAnnouncementStartDate(new Date(ba.announcementStartDate));
    } catch {
     setAnnouncementStartDate(undefined);
    }
   }
   if (ba.announcementEndDate) {
    try {
     setAnnouncementEndDate(new Date(ba.announcementEndDate));
    } catch {
     setAnnouncementEndDate(undefined);
    }
   }
   setAnnouncementChannel(ba.announcementChannel || "");
   setAnnouncementLink(ba.announcementLink || "");
   setAnnouncementReference(ba.announcementReference || "");
   setNumberOfBidders(ba.numberOfBidders || 0);
  }
 }, [ba]);

 const [newBidder, setNewBidder] = useState<Bidder>({
  bidderName: "",
  supplierId: undefined,
  submissionDate: "",
  status: "received",
 });
 const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

 // Fetch suppliers for bidder dropdown
 const { data: vendorsData } = trpc.logistics.vendors.list.useQuery({
  isActive: true,
 });
 const suppliers = vendorsData?.vendors || [];

 // Batch-fetch qualification statuses for all suppliers
 const supplierIds = useMemo(() => suppliers.map((s: any) => s.id as number), [suppliers]);
 const { data: qualificationMap = {} } = trpc.vendors.getQualificationBatch.useQuery(
  { vendorIds: supplierIds },
  { enabled: supplierIds.length > 0 }
 );

 // Check if dates are locked
 const areDatesLocked = ba?.announcementStartDate !== null && ba?.announcementStartDate !== undefined;
 const isReadOnly = areDatesLocked;

 // Check if channel requires link
 const requiresLink = ["website", "newspaper", "donor_portal"].includes(announcementChannel);

 const handleSaveTenderInfo = async () => {
  if (!announcementStartDate || !announcementEndDate) {
   toast.error(t.tenderInformation.fillRequiredFields);
   return;
  }
  if (announcementEndDate < announcementStartDate) {
   toast.error(t.tenderInformation.endDateAfterStart);
   return;
  }
  if (!announcementChannel) {
   toast.error(t.tenderInformation.selectAnnouncementChannel);
   return;
  }
  if (requiresLink && !announcementLink) {
   toast.error(t.tenderInformation.announcementLinkRequired);
   return;
  }
  if (!announcementReference) {
   toast.error(t.tenderInformation.announcementRefRequired);
   return;
  }
  if (!ba?.id) return;

  updateTenderInfo.mutate({
   bidAnalysisId: ba.id,
   announcementStartDate,
   announcementEndDate,
   announcementChannel: announcementChannel as "website" | "newspaper" | "donor_portal" | "other",
   announcementLink: announcementLink || undefined,
   announcementReference: announcementReference || undefined,
   numberOfBidders: numberOfBidders || 0,
  });
 };

 const handleAddBidder = () => {
  if (!selectedSupplierId || !newBidder.submissionDate) {
   toast.error(t.tenderInformation.selectSupplierAndDate);
   return;
  }
  const selectedSupplier = suppliers.find(s => s.id.toString() === selectedSupplierId);
  const bidderName = selectedSupplier ? `${selectedSupplier.name} ${selectedSupplier.vendorCode ? `(${selectedSupplier.vendorCode})` : ''}` : "";
  const supplierId = parseInt(selectedSupplierId, 10);
  const isDuplicate = bidders.some(b => b.supplierId === supplierId);

  if (isDuplicate) {
   toast.error(`${t.tenderInformation.supplierDuplicate} "${bidderName}"`);
   return;
  }

  // Warn if vendor is not qualified (non-blocking per system policy)
  const qual = (qualificationMap as any)[supplierId];
  if (!qual) {
   toast.warning(isRTL ? `\u26A0\uFE0F ${bidderName} \u0644\u0645 \u064A\u062A\u0645 \u062A\u0623\u0647\u064A\u0644\u0647 \u0628\u0639\u062F. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0644\u0643\u0646 \u064A\u064F\u0646\u0635\u062D \u0628\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0623\u0647\u064A\u0644 \u0623\u0648\u0644\u0627\u064B.` : `\u26A0\uFE0F ${bidderName} has not been qualified yet. You may proceed, but it is recommended to complete qualification first.`, { duration: 6000 });
  } else if (qual.qualificationStatus === 'not_qualified') {
   toast.warning(isRTL ? `\u26A0\uFE0F ${bidderName} \u063A\u064A\u0631 \u0645\u0624\u0647\u0644 (${qual.totalScore}/30). \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0644\u0643\u0646 \u064A\u064F\u0646\u0635\u062D \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062A\u0623\u0647\u064A\u0644.` : `\u26A0\uFE0F ${bidderName} is NOT QUALIFIED (${qual.totalScore}/30). You may proceed, but qualification review is recommended.`, { duration: 6000 });
  } else if (qual.qualificationStatus === 'conditional') {
   toast.info(isRTL ? `\u2139\uFE0F ${bidderName} \u0645\u0624\u0647\u0644 \u0628\u0634\u0631\u0648\u0637 (${qual.totalScore}/30).` : `\u2139\uFE0F ${bidderName} is conditionally qualified (${qual.totalScore}/30).`, { duration: 4000 });
  }

  if (!ba?.id) return;
  addBidder.mutate({
   bidAnalysisId: ba?.id,
   supplierId,
   bidderName,
   submissionDate: new Date(newBidder.submissionDate),
   submissionStatus: newBidder.status,
   totalBidAmount: newBidder.totalOfferCost,
   currency: newBidder.currency || "USD",
  });
 };

 const handleUpdateBidderStatus = (bidderId: number, status: "received" | "valid" | "disqualified") => {
  updateBidder.mutate({ id: bidderId, status });
 };

 const handleDeleteBidder = (bidderId: number) => {
  if (confirm("Are you sure you want to delete this bidder?")) {
   deleteBidder.mutate({ id: bidderId });
  }
 };

 // Digital signature state
 const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
 const [signatureBidderId, setSignatureBidderId] = useState<number | null>(null);

 const saveSignature = trpc.logistics.bidAnalysis.saveAcknowledgementSignature.useMutation({
  onSuccess: () => {
   toast.success(isRTL ? 'تم حفظ التوقيع الرقمي بنجاح' : 'Digital signature saved successfully');
   setSignatureDialogOpen(false);
   setSignatureBidderId(null);
   refetchBidders();
   refetchSignatures();
  },
  onError: (error) => {
   toast.error(error.message);
  },
 });

 const handleOpenSignatureDialog = (bidderId: number) => {
  setSignatureBidderId(bidderId);
  setSignatureDialogOpen(true);
 };

 const handleSaveSignature = (data: { signerName: string; signerTitle: string; signatureDataUrl: string }) => {
  if (!ba?.id || !signatureBidderId) return;
  saveSignature.mutate({
   bidAnalysisId: ba.id,
   bidderId: signatureBidderId,
   signerName: data.signerName,
   signerTitle: data.signerTitle || undefined,
   signatureDataUrl: data.signatureDataUrl,
  });
 };

  const handlePrintAcknowledgement = async (bidder: any) => {
    try {
      setGeneratingPdfId(bidder.id);

      const result = await generatePDF.mutateAsync({
        documentType: "bidReceiptAcknowledgement",

       documentId: bidder.id,

       language: isRTL ? "ar" : "en",
      });

      if (!result?.pdf || !result.pdf.startsWith("JVBER")) {
        toast.error(
          isRTL
            ? "غير صالح PDF ملف"
            : "Invalid PDF generated"
        );
        return;
      }

      // Base64 → Blob
      const binaryString = atob(result.pdf);

      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");

    } catch (error: any) {
      console.error("Acknowledgement PDF error:", error);

      toast.error(
        error?.message ||
        (isRTL
          ? "خطأ في إنشاء PDF"
          : "Error generating PDF")
      );

    } finally {
      setGeneratingPdfId(null);
    }
  };

 if (isLoading) {
  return (
   <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
    <div className="text-center">
     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
     <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
    </div>
   </div>
  );
 }

 return (
  <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
   {/* Header */}
   <div className="mb-6">
    <BackButton onClick={() => setLocation(`/organization/logistics/procurement-workspace/${ba?.purchaseRequestId}`)} label={t.tenderInformation.backToProcurement} />
    <h1 className="text-3xl font-bold">
     {t.tenderInformation.tenderInformationTitle}
    </h1>
    <p className="text-muted-foreground">
     {t.tenderInformation.cbaNumber}: {ba?.cbaNumber}
    </p>
   </div>

   {/* Announcement Details */}
   <Card className="mb-6">
    <CardHeader>
     <CardTitle>{t.tenderInformation.announcementDetails}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Start Date */}
      <div>
       <Label htmlFor="startDate">
        {t.tenderInformation.announcementStartDate} <span className="text-red-500">*</span>
       </Label>
       <Popover>
        <PopoverTrigger asChild>
         <Button
          variant="outline"
          className="w-full justify-start text-start font-normal"
          disabled={isReadOnly}
         >
          <CalendarIcon className="h-4 w-4 me-2" />
          {announcementStartDate ? format(announcementStartDate, "PPP", { locale: isRTL ? ar : undefined }) : t.tenderInformation.pickADate}
         </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
         <Calendar
          mode="single"
          selected={announcementStartDate}
          onSelect={setAnnouncementStartDate}
          disabled={areDatesLocked}
         />
        </PopoverContent>
       </Popover>
      </div>

      {/* End Date */}
      <div>
       <Label htmlFor="endDate">
        {t.tenderInformation.announcementEndDate} <span className="text-red-500">*</span>
       </Label>
       <Popover>
        <PopoverTrigger asChild>
         <Button
          variant="outline"
          className="w-full justify-start text-start font-normal"
          disabled={isReadOnly}
         >
          <CalendarIcon className="h-4 w-4 me-2" />
          {announcementEndDate ? format(announcementEndDate, "PPP", { locale: isRTL ? ar : undefined }) : t.tenderInformation.pickADate}
         </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
         <Calendar
          mode="single"
          selected={announcementEndDate}
          onSelect={setAnnouncementEndDate}
          disabled={areDatesLocked || (announcementStartDate ? undefined : true)}
         />
        </PopoverContent>
       </Popover>
      </div>
     </div>

     {/* Channel */}
     <div>
      <Label htmlFor="channel">
       {t.tenderInformation.announcementChannel} <span className="text-red-500">*</span>
      </Label>
      <Select value={announcementChannel} onValueChange={setAnnouncementChannel} disabled={isReadOnly}>
       <SelectTrigger disabled={isReadOnly}>
        <SelectValue placeholder={t.tenderInformation.selectChannel} />
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="website">{t.tenderInformation.website}</SelectItem>
        <SelectItem value="newspaper">{t.tenderInformation.newspaper}</SelectItem>
        <SelectItem value="donor_portal">{t.tenderInformation.donorPortal}</SelectItem>
        <SelectItem value="other">{t.tenderInformation.other}</SelectItem>
       </SelectContent>
      </Select>
     </div>

     {/* Link (conditional) */}
     {requiresLink && (
      <div>
       <Label htmlFor="link">
        {t.tenderInformation.announcementLinkUrl} <span className="text-red-500">*</span>
       </Label>
       <Input
        id="link"
        type="url"
        value={announcementLink}
        onChange={(e) => setAnnouncementLink(e.target.value)}
        placeholder="https://..."
        dir="ltr"
        disabled={isReadOnly}
       />
      </div>
     )}

     {/* Reference */}
     <div>
      <Label htmlFor="reference">
       {t.tenderInformation.announcementRefId} <span className="text-red-500">*</span>
      </Label>
      <Input
       id="reference"
       value={announcementReference}
       onChange={(e) => setAnnouncementReference(e.target.value)}
       placeholder={t.tenderInformation.optionalRefNumber}
       disabled={isReadOnly}
      />
     </div>

     {/* Number of Bidders */}
     <div>
      <Label htmlFor="numberOfBidders">
       {t.tenderInformation.numBiddersReceived}
      </Label>
      <Input
       id="numberOfBidders"
       type="number"
       value={numberOfBidders}
       onChange={(e) => setNumberOfBidders(parseInt(e.target.value) || 0)}
       disabled={isReadOnly}
      />
     </div>

     <Button onClick={handleSaveTenderInfo} disabled={updateTenderInfo.isPending || isReadOnly} className="w-full">
      {updateTenderInfo.isPending ? t.tenderInformation.saving : t.tenderInformation.saveTenderInfo}
     </Button>
    </CardContent>
   </Card>

   {/* Bidders List */}
   <Card>
    <CardHeader>
     <CardTitle>{t.tenderInformation.biddersList}</CardTitle>
    </CardHeader>
    <CardContent>
     {/* Add New Bidder Form */}
     <div className="mb-6 p-4 border rounded-lg space-y-4">
      <div>
       <h3 className="font-semibold">{t.tenderInformation.addNewBidder}</h3>
       <p className="text-sm text-muted-foreground mt-1">
        {t.tenderInformation.ifSupplierNotExist}{" "}
        <Button
         variant="link"
         size="sm"
         className="h-auto p-0 inline"
         onClick={() => window.open('/organization/logistics/vendors', '_blank')}
        >
         <span className="underline">+ {t.tenderInformation.addNewSupplier}</span>
        </Button>
       </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       {/* Bidder Name */}
       <div>
        <Label>{t.tenderInformation.bidderName} <span className="text-red-500">*</span></Label>
        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
         <SelectTrigger>
          <SelectValue placeholder={suppliers && suppliers.length === 0 ? t.tenderInformation.noSuppliersFound : t.tenderInformation.selectSupplier} />
         </SelectTrigger>
         <SelectContent>
          {suppliers && suppliers.length > 0 ? (
           suppliers.map((supplier) => {
            const qual = (qualificationMap as any)[supplier.id];
            const qualStatus = qual?.qualificationStatus;
            return (
            <SelectItem key={supplier.id} value={supplier.id.toString()}>
             <span className="flex items-center gap-2">
              {supplier.name} {supplier.vendorCode ? `(${supplier.vendorCode})` : ''}
              {qualStatus === 'qualified' && <ShieldCheck className="h-3.5 w-3.5 text-green-600 inline" />}
              {qualStatus === 'conditional' && <ShieldAlert className="h-3.5 w-3.5 text-yellow-600 inline" />}
              {qualStatus === 'not_qualified' && <ShieldX className="h-3.5 w-3.5 text-red-600 inline" />}
              {!qual && <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground inline" />}
             </span>
            </SelectItem>
            );
           })
          ) : (
           <div className="p-4 text-sm text-muted-foreground text-center">
            {t.tenderInformation.noSuppliersFound}
           </div>
          )}
         </SelectContent>
        </Select>
       </div>
       {/* Submission Date */}
       <div>
        <Label>{t.tenderInformation.submissionDate} <span className="text-red-500">*</span></Label>
        <Input
         type="date"
         value={newBidder.submissionDate}
         onChange={(e) => setNewBidder({ ...newBidder, submissionDate: e.target.value })}
        />
       </div>
       {/* Status */}
       <div>
        <Label>{t.tenderInformation.status}</Label>
        <Select
         value={newBidder.status}
         onValueChange={(value: "received" | "valid" | "disqualified") =>
          setNewBidder({ ...newBidder, status: value })
         }
        >
         <SelectTrigger>
          <SelectValue />
         </SelectTrigger>
         <SelectContent>
          <SelectItem value="received">{t.tenderInformation.received}</SelectItem>
          <SelectItem value="valid">{t.tenderInformation.valid}</SelectItem>
          <SelectItem value="disqualified">{t.tenderInformation.disqualified}</SelectItem>
         </SelectContent>
        </Select>
       </div>
      </div>

      <Button onClick={handleAddBidder} disabled={addBidder.isPending}>
       <Plus className="h-4 w-4 me-2" />
       {addBidder.isPending ? t.tenderInformation.adding : t.tenderInformation.addBidder}
      </Button>
     </div>

     {/* Bidders Table */}
     <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead className="text-start">{t.tenderInformation.bidderName}</TableHead>
         <TableHead className="text-start">{t.tenderInformation.submissionDate}</TableHead>
         <TableHead className="text-start">{t.tenderInformation.status}</TableHead>
         <TableHead className="text-start">{t.tenderInformation.acknowledgement}</TableHead>
         <TableHead className="text-start">{isRTL ? 'التوقيع الرقمي' : 'Digital Sign'}</TableHead>
         <TableHead className="text-center">{t.tenderInformation.actions}</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {bidders.length === 0 ? (
         <TableRow>
          <TableCell colSpan={6} className="text-center text-muted-foreground">
           {t.tenderInformation.noBiddersYet}
          </TableCell>
         </TableRow>
        ) : (
         bidders.map((bidder: any) => (
          <TableRow key={bidder.id}>
           <TableCell className="text-start">{bidder.bidderName}</TableCell>
           <TableCell className="text-start">
            {bidder.submissionDate
             ? new Date(bidder.submissionDate).toLocaleDateString(t.logistics.enus)
             : "-"}
           </TableCell>
           <TableCell className="text-start">
            <Select
             value={bidder.submissionStatus || "received"}
             onValueChange={(value: "received" | "valid" | "disqualified") =>
              handleUpdateBidderStatus(bidder.id, value)
             }
            >
             <SelectTrigger className="w-32">
              <SelectValue />
             </SelectTrigger>
             <SelectContent>
              <SelectItem value="received">{t.tenderInformation.received}</SelectItem>
              <SelectItem value="valid">{t.tenderInformation.valid}</SelectItem>
              <SelectItem value="disqualified">{t.tenderInformation.disqualified}</SelectItem>
             </SelectContent>
            </Select>
           </TableCell>
           <TableCell className="text-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePrintAcknowledgement(bidder)}
              disabled={generatingPdfId === bidder.id}
            >
              {generatingPdfId === bidder.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
            </Button>
           </TableCell>
           <TableCell className="text-start">
            {signatureStatuses[bidder.id] ? (
             <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-700 font-medium">
               {signatureStatuses[bidder.id].signerName}
              </span>
              <Button
               variant="ghost"
               size="sm"
               onClick={() => handleOpenSignatureDialog(bidder.id)}
               className="gap-1 ms-1 h-6 px-1.5"
               title={isRTL ? 'إعادة التوقيع' : 'Re-sign'}
              >
               <Pen className="h-3 w-3" />
              </Button>
             </div>
            ) : (
             <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenSignatureDialog(bidder.id)}
              className="gap-1"
             >
              <Pen className="h-4 w-4" />
              <span className="text-xs">{isRTL ? 'وقّع' : 'Sign'}</span>
             </Button>
            )}
           </TableCell>
           <TableCell className="text-center">
            <Button
             variant="ghost"
             size="sm"
             onClick={() => handleDeleteBidder(bidder.id)}
            >
             <Trash2 className="h-4 w-4" />
            </Button>
           </TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

   {/* Digital Signature Dialog */}
   <SignatureCapture
    open={signatureDialogOpen}
    onClose={() => { setSignatureDialogOpen(false); setSignatureBidderId(null); }}
    onSave={handleSaveSignature}
    isRTL={isRTL}
    saving={saveSignature.isPending}
   />
  </div>
 );
}
