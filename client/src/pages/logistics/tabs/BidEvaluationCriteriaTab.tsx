/**
 * Bid Evaluation Criteria Tab
 * Manages evaluation criteria sections and items for formal procurement (>$25K)
 * Matches the Bid Evaluation Checklist reference form layout
 * Bilingual EN/AR support with RTL
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
 ClipboardList, Plus, Trash2, Edit2, Save, X, ListChecks,
 Shield, AlertTriangle, FileText, ChevronDown, ChevronUp, Wand2, BarChart3,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { useTranslation } from '@/i18n/useTranslation';

const BidEvaluationScoringTab = lazy(() => import("./BidEvaluationScoringTab"));

interface BidEvaluationCriteriaTabProps {
 purchaseRequestId: number;
 prNumber?: string;
}

const emptyForm = {
 name: "",
 nameAr: "",
 sectionNumber: 1,
 sectionName: "",
 sectionNameAr: "",
 criteriaType: "technical" as "technical" | "financial",
 stage: "MUST be Submitted with the Bid",
 stageAr: "",
 maxScore: 0,
 description: "",
 isScreening: false,
 isApplicable: true,
 sortOrder: 0,
};

export default function BidEvaluationCriteriaTab({
 purchaseRequestId, prNumber }: BidEvaluationCriteriaTabProps) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();

 const [addDialogOpen, setAddDialogOpen] = useState(false);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [form, setForm] = useState({ ...emptyForm });
 const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
 const [viewMode, setViewMode] = useState<"criteria" | "scoring">("criteria");

 // Get BA for this PR
 const { data: ba, isLoading: baLoading } = trpc.logistics.bidAnalysis.getByPurchaseRequestId.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId, retry: false }
 );

 // Get criteria for this BA
 const { data: criteria, isLoading: criteriaLoading, refetch } = trpc.logistics.bidEvaluation.listCriteria.useQuery(
 { bidAnalysisId: ba?.id || 0 },
 { enabled: !!ba?.id }
 );

 const addMutation = trpc.logistics.bidEvaluation.addCriteria.useMutation({
 onSuccess: () => {
 toast.success(t.bidEvaluationCriteriaTab.added);
 setAddDialogOpen(false);
 setForm({ ...emptyForm });
 refetch();
 },
 onError: (e: any) => toast.error(`${t.bidEvaluationCriteriaTab.error}: ${e.message}`),
 });

 const updateMutation = trpc.logistics.bidEvaluation.updateCriteria.useMutation({
 onSuccess: () => {
 toast.success(t.bidEvaluationCriteriaTab.updated);
 setEditingId(null);
 setForm({ ...emptyForm });
 refetch();
 },
 onError: (e: any) => toast.error(`${t.bidEvaluationCriteriaTab.error}: ${e.message}`),
 });

 const deleteMutation = trpc.logistics.bidEvaluation.deleteCriteria.useMutation({
 onSuccess: () => {
 toast.success(t.bidEvaluationCriteriaTab.deleted);
 refetch();
 },
 onError: (e: any) => toast.error(`${t.bidEvaluationCriteriaTab.error}: ${e.message}`),
 });

 const loadDefaultsMutation = trpc.logistics.bidEvaluation.addDefaultCriteria.useMutation({
 onSuccess: () => {
 toast.success(t.bidEvaluationCriteriaTab.defaultsLoaded);
 refetch();
 },
 onError: (e: any) => toast.error(`${t.bidEvaluationCriteriaTab.error}: ${e.message}`),
 });

 // Group criteria by section
 const sections = useMemo(() => {
 if (!criteria) return [];
 const sectionMap = new Map<number, { number: number; name: string; nameAr: string; criteria: typeof criteria }>();
 for (const c of criteria) {
 const secNum = c.sectionNumber || 1;
 if (!sectionMap.has(secNum)) {
 sectionMap.set(secNum, {
 number: secNum,
 name: c.sectionName || `Section ${secNum}`,
 nameAr: c.sectionNameAr || `القسم ${secNum}`,
 criteria: [],
 });
 }
 sectionMap.get(secNum)!.criteria.push(c);
 }
 return Array.from(sectionMap.values()).sort((a, b) => a.number - b.number);
 }, [criteria]);

 const totalWeight = useMemo(() => {
 if (!criteria) return 0;
 return criteria.reduce((sum, c) => sum + Number(c.maxScore || 0), 0);
 }, [criteria]);

 const screeningCount = useMemo(() => {
 if (!criteria) return 0;
 return criteria.filter((c) => c.isScreening).length;
 }, [criteria]);

 const toggleSection = (num: number) => {
 setExpandedSections((prev) => {
 const next = new Set(prev);
 if (next.has(num)) next.delete(num);
 else next.add(num);
 return next;
 });
 };

 const handleAdd = () => {
 if (!form.name.trim()) {
 toast.error(t.bidEvaluationCriteriaTab.nameRequired);
 return;
 }
 if (!form.maxScore) {
 toast.error(t.bidEvaluationCriteriaTab.maxScoreRequired);
 return;
 }
 addMutation.mutate({
 bidAnalysisId: ba!.id,
 name: form.name,
 nameAr: form.nameAr || undefined,
 sectionNumber: form.sectionNumber,
 sectionName: form.sectionName || undefined,
 sectionNameAr: form.sectionNameAr || undefined,
 criteriaType: form.criteriaType,
 stage: form.stage || undefined,
 stageAr: form.stageAr || undefined,
 weight: 1,
 maxScore: form.maxScore,
 description: form.description || undefined,
 isScreening: form.isScreening,
 isApplicable: form.isApplicable,
 sortOrder: form.sortOrder,
 });
 };

 const handleUpdate = () => {
 if (!editingId) return;
 if (!form.name.trim()) {
 toast.error(t.bidEvaluationCriteriaTab.nameRequired);
 return;
 }
 updateMutation.mutate({
 id: editingId,
 name: form.name,
 nameAr: form.nameAr || undefined,
 sectionNumber: form.sectionNumber,
 sectionName: form.sectionName || undefined,
 sectionNameAr: form.sectionNameAr || undefined,
 criteriaType: form.criteriaType,
 stage: form.stage || undefined,
 stageAr: form.stageAr || undefined,
 maxScore: form.maxScore,
 description: form.description || undefined,
 isScreening: form.isScreening,
 isApplicable: form.isApplicable,
 sortOrder: form.sortOrder,
 });
 };

 const startEdit = (c: any) => {
 setEditingId(c.id);
 setForm({
 name: c.name || "",
 nameAr: c.nameAr || "",
 sectionNumber: c.sectionNumber || 1,
 sectionName: c.sectionName || "",
 sectionNameAr: c.sectionNameAr || "",
 criteriaType: c.criteriaType || "technical",
 stage: c.stage || "",
 stageAr: c.stageAr || "",
 maxScore: Number(c.maxScore || 0),
 description: c.description || "",
 isScreening: !!c.isScreening,
 isApplicable: c.isApplicable !== false,
 sortOrder: c.sortOrder || 0,
 });
 };

 if (baLoading || criteriaLoading) {
 return (
 <div className="flex items-center justify-center py-12">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
 </div>
 );
 }

 if (!ba) {
 return (
 <div className="space-y-4">
 <div>
 <h3 className="text-xl font-bold">{t.bidEvaluationCriteriaTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.bidEvaluationCriteriaTab.subtitle}</p>
 </div>
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16">
 <ClipboardList className="h-16 w-16 text-gray-300 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.bidEvaluationCriteriaTab.noBA}</h4>
 <p className="text-sm text-muted-foreground text-center max-w-md">{t.bidEvaluationCriteriaTab.noBADesc}</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 const isAwarded = false; // Allow editing criteria even after award for now
 const hasCriteria = criteria && criteria.length > 0;

 // Criteria form dialog content
 const CriteriaForm = ({ isEdit = false }: { isEdit?: boolean }) => (
 <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-2">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>{t.bidEvaluationCriteriaTab.sectionNumber}</Label>
 <Input type="number" min="1" value={form.sectionNumber} onChange={(e) => setForm((p) => ({ ...p, sectionNumber: parseInt(e.target.value) || 1 }))} />
 </div>
 <div>
 <Label>{t.bidEvaluationCriteriaTab.maxScore} *</Label>
 <Input type="number" min="0" step="0.5" value={form.maxScore || ""} onChange={(e) => setForm((p) => ({ ...p, maxScore: parseFloat(e.target.value) || 0 }))} />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>{t.bidEvaluationCriteriaTab.sectionName}</Label>
 <Input value={form.sectionName} onChange={(e) => setForm((p) => ({ ...p, sectionName: e.target.value }))} placeholder={t.placeholders.eGLegalAndAdministrative} />
 </div>
 <div>
 <Label>{t.bidEvaluationCriteriaTab.sectionNameAr}</Label>
 <Input value={form.sectionNameAr} onChange={(e) => setForm((p) => ({ ...p, sectionNameAr: e.target.value }))} dir="rtl" placeholder={t.placeholders.مثالالقانونيةوالإدارية} />
 </div>
 </div>
 <div>
 <Label>{t.bidEvaluationCriteriaTab.criteriaName} *</Label>
 <Textarea value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} rows={2} placeholder={t.placeholders.eGValidCompanyRegistrationCommercialRegister} />
 </div>
 <div>
 <Label>{t.bidEvaluationCriteriaTab.criteriaNameAr}</Label>
 <Textarea value={form.nameAr} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} rows={2} dir="rtl" placeholder={t.placeholders.مثالتسجيلشركةساريالسجلالتجاري} />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>{t.bidEvaluationCriteriaTab.stage}</Label>
 <Input value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))} placeholder={t.placeholders.mustBeSubmittedWithTheBid} />
 </div>
 <div>
 <Label>{t.bidEvaluationCriteriaTab.stageAr}</Label>
 <Input value={form.stageAr} onChange={(e) => setForm((p) => ({ ...p, stageAr: e.target.value }))} dir="rtl" placeholder={t.placeholders.يجبتقديمهمعالعطاء} />
 </div>
 </div>
 <div>
 <Label>{t.bidEvaluationCriteriaTab.description}</Label>
 <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
 </div>
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <Switch checked={form.isScreening} onCheckedChange={(v) => setForm((p) => ({ ...p, isScreening: v }))} />
 <div>
 <Label className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-green-600" />{t.bidEvaluationCriteriaTab.isScreening}</Label>
 <p className="text-xs text-muted-foreground">{t.bidEvaluationCriteriaTab.isScreeningDesc}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Switch checked={form.isApplicable} onCheckedChange={(v) => setForm((p) => ({ ...p, isApplicable: v }))} />
 <div>
 <Label>{t.bidEvaluationCriteriaTab.isApplicable}</Label>
 <p className="text-xs text-muted-foreground">{t.bidEvaluationCriteriaTab.isApplicableDesc}</p>
 </div>
 </div>
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline" onClick={() => { isEdit ? setEditingId(null) : setAddDialogOpen(false); setForm({ ...emptyForm }); }}>
 <X className="h-4 w-4 me-1" />{t.bidEvaluationCriteriaTab.cancel}
 </Button>
 <Button onClick={isEdit ? handleUpdate : handleAdd} disabled={isEdit ? updateMutation.isPending : addMutation.isPending}>
 <Save className="h-4 w-4 me-1" />{t.bidEvaluationCriteriaTab.save}
 </Button>
 </div>
 </div>
 );

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold">{t.bidEvaluationCriteriaTab.title}</h3>
 <p className="text-sm text-muted-foreground">{t.bidEvaluationCriteriaTab.subtitle}</p>
 </div>
 <div className="flex items-center gap-2">
 {hasCriteria && ba?.bidders && ba.bidders.length > 0 && (
 <div className="flex rounded-md border overflow-hidden">
 <button
 onClick={() => setViewMode("criteria")}
 className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${ viewMode === "criteria" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted" }`}
 >
 <ClipboardList className="h-3.5 w-3.5" />
 {t.bidEvaluationCriteriaTab.criteria}
 </button>
 <button
 onClick={() => setViewMode("scoring")}
 className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${ viewMode === "scoring" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted" }`}
 >
 <BarChart3 className="h-3.5 w-3.5" />
 {t.bidEvaluationCriteriaTab.scoring}
 </button>
 </div>
 )}
 {!isAwarded && (
 <>
 {!hasCriteria && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => loadDefaultsMutation.mutate({ bidAnalysisId: ba.id })}
 disabled={loadDefaultsMutation.isPending}
 className="gap-2"
 >
 <Wand2 className="h-4 w-4" />
 {t.bidEvaluationCriteriaTab.loadDefaults}
 </Button>
 )}
 <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
 <DialogTrigger asChild>
 <Button size="sm" className="gap-2" onClick={() => setForm({ ...emptyForm })}>
 <Plus className="h-4 w-4" />{t.bidEvaluationCriteriaTab.addCriteria}
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Plus className="h-5 w-5" />{t.bidEvaluationCriteriaTab.addCriteria}
 </DialogTitle>
 </DialogHeader>
 <CriteriaForm />
 </DialogContent>
 </Dialog>
 </>
 )}
 </div>
 </div>

 {/* Summary Stats */}
 {hasCriteria && (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <Card className="border-teal-200 bg-teal-50">
 <CardContent className="py-3 text-center">
 <div className="text-xs text-teal-600 font-medium">{t.bidEvaluationCriteriaTab.totalWeight}</div>
 <div className="text-2xl font-bold text-teal-700">{totalWeight}</div>
 </CardContent>
 </Card>
 <Card className="border-blue-200 bg-blue-50">
 <CardContent className="py-3 text-center">
 <div className="text-xs text-blue-600 font-medium">{t.bidEvaluationCriteriaTab.sections}</div>
 <div className="text-2xl font-bold text-blue-700">{sections.length}</div>
 </CardContent>
 </Card>
 <Card className="border-purple-200 bg-purple-50">
 <CardContent className="py-3 text-center">
 <div className="text-xs text-purple-600 font-medium">{t.bidEvaluationCriteriaTab.criteria}</div>
 <div className="text-2xl font-bold text-purple-700">{criteria?.length || 0}</div>
 </CardContent>
 </Card>
 <Card className="border-green-200 bg-green-50">
 <CardContent className="py-3 text-center">
 <div className="text-xs text-green-600 font-medium">{t.bidEvaluationCriteriaTab.screeningItems}</div>
 <div className="text-2xl font-bold text-green-700">{screeningCount}</div>
 </CardContent>
 </Card>
 </div>
 )}

 {/* No criteria state */}
 {!hasCriteria && (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16">
 <ListChecks className="h-16 w-16 text-gray-300 mb-4" />
 <h4 className="text-lg font-semibold text-gray-600 mb-2">{t.bidEvaluationCriteriaTab.noCriteria}</h4>
 <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{t.bidEvaluationCriteriaTab.noCriteriaDesc}</p>
 {!isAwarded && (
 <Button
 onClick={() => loadDefaultsMutation.mutate({ bidAnalysisId: ba.id })}
 disabled={loadDefaultsMutation.isPending}
 className="gap-2"
 >
 <Wand2 className="h-4 w-4" />
 {t.bidEvaluationCriteriaTab.loadDefaults}
 </Button>
 )}
 </CardContent>
 </Card>
 )}

 {/* Scoring View */}
 {viewMode === "scoring" && ba && (
 <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
 <BidEvaluationScoringTab purchaseRequestId={purchaseRequestId} bidAnalysisId={ba.id} />
 </Suspense>
 )}

 {/* Criteria Sections */}
 {viewMode === "criteria" && sections.map((section) => {
 const isExpanded = expandedSections.has(section.number);
 const sectionTotal = section.criteria.reduce((sum, c) => sum + Number(c.maxScore || 0), 0);
 const displayName = isRTL ? (section.nameAr || section.name) : section.name;

 return (
 <Card key={section.number} className="overflow-hidden">
 {/* Section Header */}
 <div
 className="flex items-center justify-between px-5 py-3 bg-[#1a8a7d] text-white cursor-pointer hover:bg-[#157a6e] transition-colors"
 onClick={() => toggleSection(section.number)}
 >
 <div className="flex items-center gap-3">
 <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
 {section.number}
 </span>
 <h4 className="font-bold text-sm">{displayName}</h4>
 </div>
 <div className="flex items-center gap-3">
 <Badge className="bg-white/20 text-white border-0">
 {t.bidEvaluationCriteriaTab.weight}: {sectionTotal}
 </Badge>
 <Badge className="bg-white/20 text-white border-0">
 {section.criteria.length} {t.bidEvaluationCriteriaTab.criteria}
 </Badge>
 {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
 </div>
 </div>

 {/* Section Content */}
 {isExpanded && (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600 w-8">#</th>
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600 min-w-[250px]">{t.bidEvaluationCriteriaTab.requirement}</th>
 <th className="px-3 py-2 text-start text-xs font-bold text-gray-600 min-w-[180px]">{t.bidEvaluationCriteriaTab.stageHeader}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-20">{t.bidEvaluationCriteriaTab.weight}</th>
 <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-16">{t.bidEvaluationCriteriaTab.na}</th>
 {!isAwarded && <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-24"></th>}
 </tr>
 </thead>
 <tbody>
 {section.criteria.map((c: any, idx: number) => {
 const isEditing = editingId === c.id;
 const criteriaName = isRTL ? (c.nameAr || c.name) : c.name;
 const stageText = isRTL ? (c.stageAr || c.stage) : c.stage;

 if (isEditing) {
 return (
 <tr key={c.id} className="border-b border-gray-100 bg-yellow-50">
 <td colSpan={isAwarded ? 5 : 6} className="p-4">
 <CriteriaForm isEdit />
 </td>
 </tr>
 );
 }

 return (
 <tr
 key={c.id}
 className={`border-b border-gray-100 ${ c.isScreening ? "bg-green-50 hover:bg-green-100" : !c.isApplicable ? "bg-[#1a8a7d]/10 text-gray-500" : "hover:bg-gray-50" }`}
 >
 <td className="px-3 py-2.5 text-sm font-medium">{idx + 1}</td>
 <td className="px-3 py-2.5">
 <div className="flex items-start gap-2">
 {c.isScreening && <Shield className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />}
 <div>
 <div className={`text-sm ${c.isScreening ? "font-semibold text-green-800" : "font-medium"}`}>
 {criteriaName}
 </div>
 {c.description && (
 <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
 )}
 </div>
 </div>
 </td>
 <td className="px-3 py-2.5 text-xs text-gray-600">
 {stageText || "-"}
 </td>
 <td className="px-3 py-2.5 text-center font-bold text-sm">
 {!c.isApplicable ? (
 <span className="text-gray-400">{t.bidEvaluationCriteriaTab.na}</span>
 ) : (
 Number(c.maxScore || 0)
 )}
 </td>
 <td className="px-3 py-2.5 text-center">
 {!c.isApplicable ? (
 <Badge variant="outline" className="text-xs bg-[#1a8a7d]/10 text-[#1a8a7d] border-[#1a8a7d]/30">{t.bidEvaluationCriteriaTab.na}</Badge>
 ) : c.isScreening ? (
 <Badge className="text-xs bg-green-100 text-green-700 border-green-200">{t.bidEvaluationCriteriaTab.mandatory}</Badge>
 ) : null}
 </td>
 {!isAwarded && (
 <td className="px-3 py-2.5 text-center">
 <div className="flex items-center justify-center gap-1">
 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(c)}>
 <Edit2 className="h-3.5 w-3.5" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
 onClick={() => deleteMutation.mutate({ id: c.id })}
 disabled={deleteMutation.isPending}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 </td>
 )}
 </tr>
 );
 })}
 {/* Section subtotal */}
 <tr className="bg-gray-100 border-t-2 border-gray-300">
 <td colSpan={3} className="px-3 py-2 text-end text-xs font-bold text-gray-600">
 {displayName} — {t.bidEvaluationCriteriaTab.totalWeight}:
 </td>
 <td className="px-3 py-2 text-center font-bold text-sm">{sectionTotal}</td>
 <td colSpan={isAwarded ? 1 : 2}></td>
 </tr>
 </tbody>
 </table>
 </div>
 )}
 </Card>
 );
 })}

 {/* Grand Total */}
 {viewMode === "criteria" && hasCriteria && (
 <Card className="border-2 border-[#1a8a7d]">
 <CardContent className="py-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <ClipboardList className="h-6 w-6 text-[#1a8a7d]" />
 <div>
 <h4 className="font-bold text-[#1a8a7d]">{t.bidEvaluationCriteriaTab.totalWeight}</h4>
 <p className="text-xs text-muted-foreground">
 {sections.length} {t.bidEvaluationCriteriaTab.sections} · {criteria?.length || 0} {t.bidEvaluationCriteriaTab.criteria}
 </p>
 </div>
 </div>
 <div className="text-3xl font-bold text-[#1a8a7d]">{totalWeight}</div>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 );
}
