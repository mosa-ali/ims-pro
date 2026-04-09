/**
 * Bid Evaluation Scoring Tab
 * Matrix UI for entering per-criterion scores for each bidder
 * Feeds data into both Bid Evaluation Checklist print and CBA print
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
 purchaseRequestId: number;
 bidAnalysisId: number;
}

interface CriterionDef {
 id: number;
 name: string;
 stage: string;
 maxScore: number;
 sectionNumber: number;
 sectionName: string;
 isScreening: boolean;
 isApplicable: boolean;
 sortOrder: number;
}

interface SectionGroup {
 number: number;
 name: string;
 criteria: CriterionDef[];
 totalWeight: number;
}

interface ScoreEntry {
 criterionId: number;
 bidderId: number;
 score: number;
 status: string;
 notes?: string;
}

export default function BidEvaluationScoringTab({ purchaseRequestId, bidAnalysisId }: Props) {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 // Using sonner toast
 const utils = trpc.useUtils();

 // Load BA with bidders
 const { data: ba, isLoading: baLoading } = trpc.logistics.bidAnalysis.getById.useQuery(
 { id: bidAnalysisId },
 { enabled: !!bidAnalysisId }
 );

 // Load criteria
 const { data: criteriaList, isLoading: criteriaLoading } = trpc.logistics.bidEvaluation.listCriteria.useQuery(
 { bidAnalysisId },
 { enabled: !!bidAnalysisId }
 );

 // Load existing scores
 const { data: existingScores, isLoading: scoresLoading } = trpc.logistics.bidEvaluation.getScores.useQuery(
 { bidAnalysisId },
 { enabled: !!bidAnalysisId }
 );

 // Save scores mutation
 const saveMutation = trpc.logistics.bidEvaluation.saveScores.useMutation({
 onSuccess: () => {
 toast.success("Scores saved successfully");
 utils.logistics.bidEvaluation.getScores.invalidate({ bidAnalysisId });
 utils.logistics.bidAnalysis.getById.invalidate({ id: bidAnalysisId });
 setHasChanges(false);
 },
 onError: (err) => {
 toast.error(`Error: ${err.message}`);
 },
 });

 // Local score state: Map<`${criterionId}-${bidderId}`, ScoreEntry>
 const [localScores, setLocalScores] = useState<Map<string, ScoreEntry>>(new Map());
 const [hasChanges, setHasChanges] = useState(false);

 const bidders = ba?.bidders || [];
 const criteria = criteriaList || [];

 // Group criteria by section
 const sections = useMemo(() => {
 const map = new Map<number, SectionGroup>();
 for (const c of criteria) {
 const sNum = c.sectionNumber || 0;
 if (!map.has(sNum)) {
 map.set(sNum, {
 number: sNum,
 name: c.sectionName || `Section ${sNum}`,
 criteria: [],
 totalWeight: 0,
 });
 }
 const section = map.get(sNum)!;
 const maxScore = parseFloat(String(c.maxScore || "0"));
 section.criteria.push({
 id: c.id,
 name: c.name || "",
 stage: c.stage || "",
 maxScore,
 sectionNumber: sNum,
 sectionName: c.sectionName || "",
 isScreening: c.isScreening || false,
 isApplicable: c.isApplicable !== false,
 sortOrder: c.sortOrder || 0,
 });
 section.totalWeight += maxScore;
 }
 const result = Array.from(map.values()).sort((a, b) => a.number - b.number);
 result.forEach(s => s.criteria.sort((a, b) => a.sortOrder - b.sortOrder));
 return result;
 }, [criteria]);

 // Initialize local scores from existing data
 useEffect(() => {
 if (existingScores && existingScores.length > 0) {
 const map = new Map<string, ScoreEntry>();
 for (const s of existingScores) {
 const key = `${s.criterionId}-${s.bidderId}`;
 map.set(key, {
 criterionId: s.criterionId,
 bidderId: s.bidderId,
 score: parseFloat(String(s.score || "0")),
 status: s.status || "scored",
 notes: s.notes || undefined,
 });
 }
 setLocalScores(map);
 }
 }, [existingScores]);

 const getKey = (criterionId: number, bidderId: number) => `${criterionId}-${bidderId}`;

 const getLocalScore = (criterionId: number, bidderId: number): number => {
 const entry = localScores.get(getKey(criterionId, bidderId));
 return entry?.score ?? 0;
 };

 const getLocalStatus = (criterionId: number, bidderId: number): string => {
 const entry = localScores.get(getKey(criterionId, bidderId));
 return entry?.status ?? "scored";
 };

 const updateScore = useCallback((criterionId: number, bidderId: number, value: number, status = "scored") => {
 setLocalScores(prev => {
 const next = new Map(prev);
 next.set(getKey(criterionId, bidderId), {
 criterionId,
 bidderId,
 score: value,
 status,
 });
 return next;
 });
 setHasChanges(true);
 }, []);

 const setNone = useCallback((criterionId: number, bidderId: number) => {
 updateScore(criterionId, bidderId, 0, "none");
 }, [updateScore]);

 const setNA = useCallback((criterionId: number, bidderId: number) => {
 updateScore(criterionId, bidderId, 0, "na");
 }, [updateScore]);

 // Calculate section total for a bidder
 const getSectionTotal = (section: SectionGroup, bidderId: number): number => {
 return section.criteria.reduce((sum, c) => {
 const entry = localScores.get(getKey(c.id, bidderId));
 if (entry && entry.status === "scored") return sum + entry.score;
 return sum;
 }, 0);
 };

 // Calculate grand total for a bidder
 const getGrandTotal = (bidderId: number): number => {
 return sections.reduce((sum, s) => sum + getSectionTotal(s, bidderId), 0);
 };

 const handleSave = () => {
 const scoresToSave = Array.from(localScores.values());
 if (scoresToSave.length === 0) {
 toast.error("Enter some scores before saving.");
 return;
 }
 saveMutation.mutate({
 bidAnalysisId,
 scores: scoresToSave,
 });
 };

 const handleReset = () => {
 if (existingScores && existingScores.length > 0) {
 const map = new Map<string, ScoreEntry>();
 for (const s of existingScores) {
 const key = `${s.criterionId}-${s.bidderId}`;
 map.set(key, {
 criterionId: s.criterionId,
 bidderId: s.bidderId,
 score: parseFloat(String(s.score || "0")),
 status: s.status || "scored",
 notes: s.notes || undefined,
 });
 }
 setLocalScores(map);
 } else {
 setLocalScores(new Map());
 }
 setHasChanges(false);
 };

 const totalWeight = sections.reduce((s, sec) => s + sec.totalWeight, 0);

 const isLoading = baLoading || criteriaLoading || scoresLoading;

 if (isLoading) {
 return (
 <div className="p-6 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
 <p className="text-muted-foreground">Loading evaluation data...</p>
 </div>
 );
 }

 if (criteria.length === 0) {
 return (
 <Card>
 <CardContent className="p-8 text-center">
 <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
 <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لم يتم تحديد معايير التقييم' : 'No Evaluation Criteria Defined'}</h3>
 <p className="text-muted-foreground">
 Please define evaluation criteria in the "Bid Evaluation Criteria" tab before scoring bidders.
 </p>
 </CardContent>
 </Card>
 );
 }

 if (bidders.length === 0) {
 return (
 <Card>
 <CardContent className="p-8 text-center">
 <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
 <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا يوجد متقدمون' : 'No Bidders'}</h3>
 <p className="text-muted-foreground">
 Please add bidders in the "Bid Analysis" tab before scoring.
 </p>
 </CardContent>
 </Card>
 );
 }

 return (
 <div className="space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-bold">{isRTL ? 'درجات تقييم العطاءات' : 'Bid Evaluation Scoring'}</h2>
 <p className="text-sm text-muted-foreground">
 Enter scores for each criterion per bidder. Max score per criterion is shown in the Weight column.
 </p>
 </div>
 <div className="flex gap-2">
 {hasChanges && (
 <Button variant="outline" onClick={handleReset} className="gap-2">
 <RotateCcw className="h-4 w-4" /> Reset
 </Button>
 )}
 <Button
 onClick={handleSave}
 disabled={!hasChanges || saveMutation.isPending}
 className="gap-2"
 >
 <Save className="h-4 w-4" />
 {saveMutation.isPending ? "Saving..." : "Save Scores"}
 </Button>
 </div>
 </div>

 {/* Summary */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <Card>
 <CardContent className="p-3 text-center">
 <p className="text-xs text-muted-foreground">{isRTL ? 'الوزن الإجمالي' : 'Total Weight'}</p>
 <p className="text-xl font-bold">{totalWeight}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-3 text-center">
 <p className="text-xs text-muted-foreground">Sections</p>
 <p className="text-xl font-bold">{sections.length}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-3 text-center">
 <p className="text-xs text-muted-foreground">{isRTL ? 'المعايير' : 'Criteria'}</p>
 <p className="text-xl font-bold">{criteria.length}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-3 text-center">
 <p className="text-xs text-muted-foreground">Bidders</p>
 <p className="text-xl font-bold">{bidders.length}</p>
 </CardContent>
 </Card>
 </div>

 {/* Scoring Matrix */}
 <Card>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-muted/50">
 <th className="border px-2 py-2 text-start font-semibold sticky start-0 bg-muted/50 z-10" style={{ minWidth: "40px" }}>#</th>
 <th className="border px-2 py-2 text-start font-semibold sticky left-[40px] bg-muted/50 z-10" style={{ minWidth: "200px" }}>Requirement</th>
 <th className="border px-2 py-2 text-center font-semibold" style={{ minWidth: "60px" }}>{isRTL ? 'الوزن' : 'Weight'}</th>
 {bidders.map((b: any) => (
 <th key={b.id} className="border px-2 py-2 text-center font-semibold" style={{ minWidth: "90px" }}>
 <div className="text-xs leading-tight">{b.bidderName || "-"}</div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {sections.map((section) => (
 <>
 {/* Section header row */}
 <tr key={`sh-${section.number}`} className="bg-primary/10">
 <td className="border px-2 py-1.5 font-bold sticky start-0 bg-primary/10 z-10">
 {section.number}
 </td>
 <td colSpan={1} className="border px-2 py-1.5 font-bold sticky left-[40px] bg-primary/10 z-10">
 {section.name}
 </td>
 <td className="border px-2 py-1.5 text-center font-bold">
 {section.totalWeight}
 </td>
 {bidders.map((b: any) => (
 <td key={b.id} className="border px-2 py-1.5 text-center font-bold text-primary">
 {getSectionTotal(section, b.id).toFixed(1)}
 </td>
 ))}
 </tr>
 {/* Criteria rows */}
 {section.criteria.map((criterion, cIdx) => {
 const isNAItem = !criterion.isApplicable || criterion.maxScore === 0;
 const isPostAward = (criterion.stage || "").toLowerCase().includes("before contract") ||
 (criterion.stage || "").toLowerCase().includes("before award") ||
 (criterion.stage || "").toLowerCase().includes("verification process");

 return (
 <tr key={`c-${criterion.id}`} className={criterion.isScreening ? "bg-green-50" : ""}>
 <td className="border px-2 py-1 text-center text-xs text-muted-foreground sticky start-0 bg-background z-10">
 {section.number}.{cIdx + 1}
 </td>
 <td className="border px-2 py-1 sticky left-[40px] bg-background z-10">
 <div className="text-xs leading-tight">
 {criterion.name}
 {criterion.isScreening && (
 <Badge variant="outline" className="ms-1 text-[10px] bg-green-100 text-green-700 border-green-300">
 Screening
 </Badge>
 )}
 {isNAItem && (
 <Badge variant="outline" className="ms-1 text-[10px]">N/A</Badge>
 )}
 </div>
 <div className="text-[10px] text-muted-foreground mt-0.5">{criterion.stage}</div>
 </td>
 <td className="border px-2 py-1 text-center font-semibold text-xs">
 {criterion.maxScore}
 </td>
 {bidders.map((b: any) => {
 const key = getKey(criterion.id, b.id);
 const status = getLocalStatus(criterion.id, b.id);
 const score = getLocalScore(criterion.id, b.id);

 if (isNAItem) {
 return (
 <td key={b.id} className="border px-2 py-1 text-center text-xs text-muted-foreground bg-muted/30">
 N/A
 </td>
 );
 }

 if (isPostAward && !criterion.isScreening) {
 return (
 <td key={b.id} className="border px-1 py-1 text-center">
 <div className="flex items-center gap-1 justify-center">
 <Input
 type="number"
 min={0}
 max={criterion.maxScore}
 step={0.5}
 value={status === "not_yet_completed" ? "" : score}
 placeholder={t.placeholders.nC}
 onChange={(e) => {
 const val = parseFloat(e.target.value);
 if (!isNaN(val)) {
 updateScore(criterion.id, b.id, Math.min(val, criterion.maxScore));
 } else {
 updateScore(criterion.id, b.id, 0, "not_yet_completed");
 }
 }}
 className="h-7 w-16 text-center text-xs px-1"
 />
 </div>
 </td>
 );
 }

 return (
 <td key={b.id} className="border px-1 py-1 text-center">
 <div className="flex items-center gap-1 justify-center">
 <Input
 type="number"
 min={0}
 max={criterion.maxScore}
 step={0.5}
 value={status === "none" ? "" : score}
 placeholder={status === "none" ? "None" : "0"}
 onChange={(e) => {
 const val = parseFloat(e.target.value);
 if (!isNaN(val)) {
 updateScore(criterion.id, b.id, Math.min(val, criterion.maxScore));
 }
 }}
 className={`h-7 w-16 text-center text-xs px-1 ${status === "none" ? "bg-yellow-100 border-yellow-400" : ""}`}
 />
 <button
 type="button"
 onClick={() => status === "none" ? updateScore(criterion.id, b.id, 0, "scored") : setNone(criterion.id, b.id)}
 className={`text-[9px] px-1 py-0.5 rounded border ${status === "none" ? "bg-yellow-200 border-yellow-500 text-yellow-800" : "border-gray-300 text-gray-500 hover:bg-gray-100"}`}
 title="Toggle None"
 >
 ∅
 </button>
 </div>
 </td>
 );
 })}
 </tr>
 );
 })}
 </>
 ))}

 {/* Grand Total Row */}
 <tr className="bg-primary/20 font-bold">
 <td colSpan={2} className="border px-2 py-2 text-end font-bold sticky start-0 bg-primary/20 z-10">
 Grand Total
 </td>
 <td className="border px-2 py-2 text-center font-bold">
 {totalWeight}
 </td>
 {bidders.map((b: any) => (
 <td key={b.id} className="border px-2 py-2 text-center font-bold text-lg">
 {getGrandTotal(b.id).toFixed(1)}
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>

 {/* Save button at bottom too */}
 <div className="flex justify-end gap-2">
 {hasChanges && (
 <Button variant="outline" onClick={handleReset} className="gap-2">
 <RotateCcw className="h-4 w-4" /> Reset Changes
 </Button>
 )}
 <Button
 onClick={handleSave}
 disabled={!hasChanges || saveMutation.isPending}
 className="gap-2"
 size="lg"
 >
 <Save className="h-4 w-4" />
 {saveMutation.isPending ? "Saving..." : "Save All Scores"}
 </Button>
 </div>

 {hasChanges && (
 <div className="flex items-center gap-2 text-amber-600 text-sm">
 <AlertTriangle className="h-4 w-4" />
 <span>You have unsaved changes. Click "Save Scores" to persist your evaluation.</span>
 </div>
 )}
 </div>
 );
}
