/**
 * Tender Information Tab
 * Manages tender announcement details for formal procurement (>$25K)
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
import { toast } from "sonner";
import {
 Megaphone, Save, Globe, Newspaper, Building2, MoreHorizontal,
 Calendar, Link2, FileText, Clock, CheckCircle, AlertCircle, Edit2, X,
} from "lucide-react";

interface TenderInformationTabProps {
 purchaseRequestId: number;
 prNumber?: string;
}

export default function TenderInformationTab({ purchaseRequestId, prNumber }: TenderInformationTabProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();

 const [isEditing, setIsEditing] = useState(false);
 const [form, setForm] = useState({
 announcementReference: "",
 announcementChannel: "" as "" | "website" | "newspaper" | "donor_portal" | "other",
 announcementStartDate: "",
 announcementEndDate: "",
 announcementLink: "",
 });

 const { data: ba, isLoading, refetch } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId, retry: false }
 );

 const updateTenderMutation = trpc.logistics.bidAnalysis.updateTenderInformation.useMutation({
 onSuccess: () => {
 toast.success(t.tenderInformationTab.saved);
 setIsEditing(false);
 refetch();
 },
 onError: (e: any) => toast.error(`${t.tenderInformationTab.error}: ${e.message}`),
 });

 // Populate form when BA data loads
 useEffect(() => {
 if (ba) {
 setForm({
 announcementReference: ba.announcementReference || "",
 announcementChannel: (ba.announcementChannel || "") as any,
 announcementStartDate: ba.announcementStartDate ? new Date(ba.announcementStartDate).toISOString().split("T")[0] : "",
 announcementEndDate: ba.announcementEndDate ? new Date(ba.announcementEndDate).toISOString().split("T")[0] : "",
 announcementLink: ba.announcementLink || "",
 });
 }
 }, [ba]);

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
 </div>
 );
 }

 if (!ba) {
 return (
 <div className="space-y-4">
 <div>
 <h3 className="text-xl font-bold">{t.tenderInformationTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.tenderInformationTab.subtitle}</p>
 </div>
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16">
 <Megaphone className="h-16 w-16 text-gray-300 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.tenderInformationTab.noBA}</h4>
 <p className="text-sm text-muted-foreground text-center max-w-md">{t.tenderInformationTab.noBADesc}</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 const isAwarded = ba.status === "awarded";
 const hasAnnouncementDates = !!(ba.announcementStartDate && ba.announcementEndDate);
 const now = new Date();
 const startDate = ba.announcementStartDate ? new Date(ba.announcementStartDate) : null;
 const endDate = ba.announcementEndDate ? new Date(ba.announcementEndDate) : null;
 const isActive = startDate && endDate && now >= startDate && now <= endDate;
 const isClosed = endDate && now > endDate;
 const isNotStarted = !hasAnnouncementDates || (startDate && now < startDate);

 const daysCalc = endDate
 ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
 : null;

 const channelIcon = (ch: string) => {
 switch (ch) {
 case "website": return <Globe className="h-4 w-4" />;
 case "newspaper": return <Newspaper className="h-4 w-4" />;
 case "donor_portal": return <Building2 className="h-4 w-4" />;
 default: return <MoreHorizontal className="h-4 w-4" />;
 }
 };

 const channelLabel = (ch: string) => {
 switch (ch) {
 case "website": return t.tenderInformationTab.channelWebsite;
 case "newspaper": return t.tenderInformationTab.channelNewspaper;
 case "donor_portal": return t.tenderInformationTab.channelDonorPortal;
 case "other": return t.tenderInformationTab.channelOther;
 default: return ch;
 }
 };

 const handleSave = () => {
 if (!form.announcementStartDate) {
 toast.error(t.tenderInformationTab.startDateRequired);
 return;
 }
 if (!form.announcementEndDate) {
 toast.error(t.tenderInformationTab.endDateRequired);
 return;
 }
 if (!form.announcementChannel) {
 toast.error(t.tenderInformationTab.channelRequired);
 return;
 }
 updateTenderMutation.mutate({
 bidAnalysisId: ba.id,
 announcementStartDate: new Date(form.announcementStartDate),
 announcementEndDate: new Date(form.announcementEndDate),
 announcementChannel: form.announcementChannel as "website" | "newspaper" | "donor_portal" | "other",
 announcementLink: form.announcementLink || undefined,
 announcementReference: form.announcementReference || undefined,
 });
 };

 const showForm = isEditing || !hasAnnouncementDates;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold">{t.tenderInformationTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.tenderInformationTab.subtitle}</p>
 </div>
 <div className="flex items-center gap-3">
 <Badge variant="secondary">{ba.cbaNumber || `BA-${ba.id}`}</Badge>
 {hasAnnouncementDates && (
 <Badge
 className={
 isClosed
 ? "bg-green-100 text-green-700 border-green-200"
 : isActive
 ? "bg-blue-100 text-blue-700 border-blue-200"
 : "bg-yellow-100 text-yellow-700 border-yellow-200"
 }
 >
 {isClosed ? t.tenderInformationTab.statusClosed : isActive ? t.tenderInformationTab.statusActive : t.tenderInformationTab.statusDraft}
 </Badge>
 )}
 </div>
 </div>

 {/* Status Banner */}
 {hasAnnouncementDates && (
 <Card className={`border-2 ${isClosed ? "border-green-200 bg-green-50" : isActive ? "border-blue-200 bg-blue-50" : "border-yellow-200 bg-yellow-50"}`}>
 <CardContent className="py-4">
 <div className="flex items-center gap-3">
 {isClosed ? (
 <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
 ) : isActive ? (
 <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 animate-pulse" />
 ) : (
 <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
 )}
 <div className="flex-1">
 <p className={`font-medium ${isClosed ? "text-green-800" : isActive ? "text-blue-800" : "text-yellow-800"}`}>
 {isClosed ? t.tenderInformationTab.announcementClosed : isActive ? t.tenderInformationTab.announcementActive : t.tenderInformationTab.announcementNotStarted}
 </p>
 {daysCalc !== null && (
 <p className={`text-sm mt-0.5 ${isClosed ? "text-green-600" : isActive ? "text-blue-600" : "text-yellow-600"}`}>
 {daysCalc > 0
 ? `${daysCalc} ${t.tenderInformationTab.daysRemaining}`
 : `${Math.abs(daysCalc)} ${t.tenderInformationTab.daysPassed}`}
 </p>
 )}
 </div>
 {hasAnnouncementDates && !isAwarded && !isEditing && (
 <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
 <Edit2 className="h-4 w-4" />{t.tenderInformationTab.edit}
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Tender Details - View Mode */}
 {hasAnnouncementDates && !showForm && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Megaphone className="h-5 w-5 text-teal-600" />
 {t.tenderInformationTab.title}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div>
 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.tenderInformationTab.announcementRef}</label>
 <div className="mt-1 text-sm font-medium">{ba.announcementReference || "-"}</div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.tenderInformationTab.announcementChannel}</label>
 <div className="mt-1 flex items-center gap-2 text-sm font-medium">
 {channelIcon(ba.announcementChannel || "")}
 {channelLabel(ba.announcementChannel || "")}
 </div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.tenderInformationTab.announcementLink}</label>
 <div className="mt-1 text-sm">
 {ba.announcementLink ? (
 <a href={ba.announcementLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
 <Link2 className="h-3.5 w-3.5" />
 {ba.announcementLink}
 </a>
 ) : "-"}
 </div>
 </div>
 </div>
 <div className="space-y-4">
 <div>
 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.tenderInformationTab.startDate}</label>
 <div className="mt-1 flex items-center gap-2 text-sm font-medium">
 <Calendar className="h-4 w-4 text-gray-400" />
 {startDate ? startDate.toLocaleDateString() : "-"}
 </div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.tenderInformationTab.endDate}</label>
 <div className="mt-1 flex items-center gap-2 text-sm font-medium">
 <Calendar className="h-4 w-4 text-gray-400" />
 {endDate ? endDate.toLocaleDateString() : "-"}
 </div>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.tenderInformationTab.announcementPeriod}</label>
 <div className="mt-1 text-sm font-medium">
 {startDate && endDate
 ? `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days`
 : "-"}
 </div>
 </div>
 </div>
 </div>

 {/* Evaluation Parameters */}
 <div className="mt-6 pt-6 border-t border-gray-200">
 <h4 className="text-sm font-bold text-gray-700 mb-4">{t.tenderInformationTab.evaluationMethod}</h4>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-gray-50 rounded-lg p-3 text-center">
 <div className="text-xs text-gray-500 mb-1">{t.tenderInformationTab.evaluationMethod}</div>
 <div className="font-bold text-sm">
 {ba.evaluationMethod === "lowest_price" ? t.tenderInformationTab.methodLowest
 : ba.evaluationMethod === "best_value" ? t.tenderInformationTab.methodBestValue
 : t.tenderInformationTab.methodQualityCost}
 </div>
 </div>
 <div className="bg-teal-50 rounded-lg p-3 text-center">
 <div className="text-xs text-teal-600 mb-1">{t.tenderInformationTab.technicalWeight}</div>
 <div className="font-bold text-lg text-teal-700">{ba.technicalWeight || 70}%</div>
 </div>
 <div className="bg-blue-50 rounded-lg p-3 text-center">
 <div className="text-xs text-blue-600 mb-1">{t.tenderInformationTab.financialWeight}</div>
 <div className="font-bold text-lg text-blue-700">{ba.financialWeight || 30}%</div>
 </div>
 <div className="bg-orange-50 rounded-lg p-3 text-center">
 <div className="text-xs text-orange-600 mb-1">{t.tenderInformationTab.minTechnicalScore}</div>
 <div className="font-bold text-lg text-orange-700">{ba.minimumTechnicalScore || 70}%</div>
 </div>
 </div>
 </div>

 {/* Bidders Count */}
 <div className="mt-6 pt-6 border-t border-gray-200">
 <div className="flex items-center gap-3">
 <div className="bg-purple-50 rounded-lg p-3 text-center min-w-[100px]">
 <div className="text-xs text-purple-600 mb-1">{t.tenderInformationTab.numberOfBidders}</div>
 <div className="font-bold text-2xl text-purple-700">{ba.numberOfBidders || 0}</div>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Tender Details - Edit/Create Mode */}
 {showForm && (
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2">
 <Megaphone className="h-5 w-5 text-teal-600" />
 {t.tenderInformationTab.title}
 </CardTitle>
 {isEditing && (
 <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="gap-2">
 <X className="h-4 w-4" />{t.tenderInformationTab.cancel}
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <Label>{t.tenderInformationTab.announcementRef}</Label>
 <Input
 value={form.announcementReference}
 onChange={(e) => setForm((p) => ({ ...p, announcementReference: e.target.value }))}
 placeholder={t.tenderInformationTab.announcementRefPlaceholder}
 disabled={isAwarded}
 />
 </div>
 <div>
 <Label>{t.tenderInformationTab.announcementChannel} *</Label>
 <Select
 value={form.announcementChannel || "placeholder"}
 onValueChange={(v) => setForm((p) => ({ ...p, announcementChannel: v === "placeholder" ? "" : v as any }))}
 disabled={isAwarded}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.tenderInformationTab.announcementChannel} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="website">{t.tenderInformationTab.channelWebsite}</SelectItem>
 <SelectItem value="newspaper">{t.tenderInformationTab.channelNewspaper}</SelectItem>
 <SelectItem value="donor_portal">{t.tenderInformationTab.channelDonorPortal}</SelectItem>
 <SelectItem value="other">{t.tenderInformationTab.channelOther}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <Label>{t.tenderInformationTab.startDate} *</Label>
 <Input
 type="date"
 value={form.announcementStartDate}
 onChange={(e) => setForm((p) => ({ ...p, announcementStartDate: e.target.value }))}
 disabled={isAwarded}
 />
 </div>
 <div>
 <Label>{t.tenderInformationTab.endDate} *</Label>
 <Input
 type="date"
 value={form.announcementEndDate}
 onChange={(e) => setForm((p) => ({ ...p, announcementEndDate: e.target.value }))}
 disabled={isAwarded}
 />
 </div>
 </div>
 <div>
 <Label>{t.tenderInformationTab.announcementLink}</Label>
 <Input
 value={form.announcementLink}
 onChange={(e) => setForm((p) => ({ ...p, announcementLink: e.target.value }))}
 placeholder={t.tenderInformationTab.announcementLinkPlaceholder}
 disabled={isAwarded}
 />
 </div>
 {!isAwarded && (
 <div className="flex justify-end pt-2">
 <Button onClick={handleSave} disabled={updateTenderMutation.isPending} className="gap-2">
 <Save className="h-4 w-4" />
 {updateTenderMutation.isPending ? "..." : t.tenderInformationTab.save}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </div>
 );
}
