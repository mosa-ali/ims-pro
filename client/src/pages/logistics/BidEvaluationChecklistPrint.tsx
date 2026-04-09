/**
 * Bid Evaluation Checklist Print View
 * Loads criteria and scores dynamically from the database
 * A4 landscape donor-ready print with detailed technical scoring matrix
 * Bidders as column headers, sections on the left
 * Yellow highlighting for "None" values, green for screening items
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { BackButton } from "@/components/BackButton";

const TEAL = "#008080";
const TEAL_LIGHT = "#e0f2f1";
const YELLOW_BG = "#ffff00";
const GREEN_BG = "#00b050";

interface CriterionRow {
 id: number;
 name: string;
 stage: string;
 maxScore: number;
 sectionNumber: number;
 sectionName: string;
 isScreening?: boolean;
 isApplicable?: boolean;
 sortOrder: number;
}

interface Section {
 number: number;
 name: string;
 criteria: CriterionRow[];
 totalWeight: number;
}

export default function BidEvaluationChecklistPrint() {
 const { currentOrganization } = useOrganization();
 const { language, isRTL} = useLanguage();
 const [, params] = useRoute("/organization/logistics/bid-evaluation-checklist/:id/print");
 const id = params?.id ? parseInt(params.id) : 0;

 // Load BA with bidders
 const { data: ba, isLoading: baLoading } = trpc.logistics.bidAnalysis.getById.useQuery(
 { id },
 { enabled: !!id }
 );

 // Load criteria from DB
 const { data: criteriaList, isLoading: criteriaLoading } = trpc.logistics.bidEvaluation.listCriteria.useQuery(
 { bidAnalysisId: id },
 { enabled: !!id }
 );

 // Load scores from DB
 const { data: scoresList, isLoading: scoresLoading } = trpc.logistics.bidEvaluation.getScores.useQuery(
 { bidAnalysisId: id },
 { enabled: !!id }
 );

 const isLoading = baLoading || criteriaLoading || scoresLoading;

 if (isLoading) return <div className="p-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 if (!ba) return <div className="p-8 text-center">{isRTL ? 'لم يتم العثور على تحليل العطاءات' : 'Bid Analysis not found'}</div>;

 const bidders = ba.bidders || [];
 const criteria = criteriaList || [];
 const scores = scoresList || [];

 // Group criteria by section
 const sectionsMap = new Map<number, Section>();
 for (const c of criteria) {
 const sNum = c.sectionNumber || 0;
 if (!sectionsMap.has(sNum)) {
 sectionsMap.set(sNum, {
 number: sNum,
 name: c.sectionName || `Section ${sNum}`,
 criteria: [],
 totalWeight: 0,
 });
 }
 const section = sectionsMap.get(sNum)!;
 const maxScore = parseFloat(String(c.maxScore || "0"));
 section.criteria.push({
 id: c.id,
 name: c.name || "",
 stage: c.stage || "",
 maxScore,
 sectionNumber: sNum,
 sectionName: c.sectionName || "",
 isScreening: c.isScreening || false,
 isApplicable: c.isApplicable !== false, // default true
 sortOrder: c.sortOrder || 0,
 });
 section.totalWeight += maxScore;
 }

 const sections = Array.from(sectionsMap.values()).sort((a, b) => a.number - b.number);
 // Sort criteria within each section
 sections.forEach(s => s.criteria.sort((a, b) => a.sortOrder - b.sortOrder));

 const totalWeight = sections.reduce((sum, s) => sum + s.totalWeight, 0);

 // Build score lookup: key = `${criterionId}-${bidderId}`
 const scoreMap = new Map<string, { score: number; status: string }>();
 for (const s of scores) {
 const key = `${s.criterionId}-${s.bidderId}`;
 scoreMap.set(key, {
 score: parseFloat(String(s.score || "0")),
 status: s.status || "scored",
 });
 }

 // Get score for a criterion-bidder pair
 const getScore = (criterionId: number, bidderId: number) => {
 return scoreMap.get(`${criterionId}-${bidderId}`);
 };

 // Check if we have any actual scores in DB
 const hasActualScores = scores.length > 0;

 // Fallback: proportional distribution from total technical score
 const getFallbackScore = (criterionMaxScore: number, bidderTechScore: number): number => {
 if (totalWeight === 0 || criterionMaxScore === 0) return 0;
 return (criterionMaxScore / totalWeight) * bidderTechScore;
 };

 // Calculate section subtotal for a bidder
 const getSectionSubtotal = (section: Section, bidderId: number, bidderTechScore: number): number => {
 if (hasActualScores) {
 return section.criteria.reduce((sum, c) => {
 const s = getScore(c.id, bidderId);
 if (s && s.status === "scored") return sum + s.score;
 return sum;
 }, 0);
 }
 // Fallback: proportional
 if (totalWeight === 0) return 0;
 return (section.totalWeight / totalWeight) * bidderTechScore;
 };

 // Is a criterion a post-award item?
 const isPostAward = (c: CriterionRow): boolean => {
 const stage = (c.stage || "").toLowerCase();
 return stage.includes("before contract") || stage.includes("before award") ||
 stage.includes("mandatory before") || stage.includes("verification process");
 };

 // Is a criterion N/A?
 const isNA = (c: CriterionRow): boolean => {
 return c.isApplicable === false || c.maxScore === 0;
 };

 const handlePrint = () => window.print();

 // Calculate bidder column width based on number of bidders
 const bidderColWidth = bidders.length > 10 ? "50px" : bidders.length > 7 ? "60px" : bidders.length > 4 ? "70px" : "85px";

 return (
 <div className="min-h-screen bg-gray-100 print:bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Print/Back buttons */}
 <div className="fixed top-4 end-4 print:hidden z-50 flex gap-2">
 <BackButton onClick={() => window.history.back()} label={'Back'} />
 <Button onClick={handlePrint} className="gap-2">
 <Printer className="h-4 w-4" /> Print
 </Button>
 </div>

 <div className="mx-auto bg-white shadow-lg print:shadow-none print:max-w-none" style={{ maxWidth: "297mm" }}>
 <div className="p-4 print:p-3" style={{ fontSize: "7pt" }}>

 {/* ===== HEADER ===== */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 {currentOrganization?.logoUrl ? (
 <img src={currentOrganization.logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
 ) : (
 <div className="h-10 w-10 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-500" style={{ fontSize: "6pt" }}>
 {currentOrganization?.name?.split(" ").map(w => w[0]).join("").slice(0, 3) || "ORG"}
 </div>
 )}
 <div>
 <p className="font-bold" style={{ fontSize: "9pt" }}>{currentOrganization?.name || "Organization"}</p>
 {currentOrganization?.nameAr && (
 <p className="text-gray-500" style={{ fontSize: "7pt" }} dir="rtl">{currentOrganization.nameAr}</p>
 )}
 </div>
 </div>
 <div className="text-center flex-1">
 <h1 className="font-bold" style={{ fontSize: "14pt" }}>{isRTL ? 'قائمة تقييم العطاءات' : 'Bid Evaluation Checklist'}</h1>
 </div>
 <div className="text-end" style={{ fontSize: "7pt" }}>
 <p><strong>CBA#:</strong> {ba.cbaNumber || ba.baNumber || "-"}</p>
 <p><strong>PR#:</strong> {ba.purchaseRequest?.prNumber || "-"}</p>
 <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
 </div>
 </div>

 {/* ===== MAIN EVALUATION TABLE ===== */}
 <div className="overflow-x-auto">
 <table className="w-full border-collapse border-2 border-black" style={{ fontSize: "6.5pt" }}>
 <thead>
 {/* Row 1: "Applicant/Company" label spanning bidder columns */}
 <tr>
 <th colSpan={5} className="border border-black px-1 py-1 text-start font-bold" style={{ fontSize: "7pt" }}>
 Bid Evaluation Checklist
 </th>
 <th colSpan={bidders.length} className="border border-black px-1 py-1 text-center font-bold" style={{ fontSize: "8pt" }}>
 Applicant/Company
 </th>
 </tr>
 {/* Row 2: Column headers with bidder names */}
 <tr style={{ backgroundColor: TEAL }}>
 <th className="border border-black px-1 py-2 text-white text-center font-bold" style={{ width: "22px" }}>#</th>
 <th className="border border-black px-1 py-2 text-white text-start font-bold" style={{ width: "80px" }}>Section</th>
 <th className="border border-black px-1 py-2 text-white text-start font-bold" style={{ width: "170px" }}>Requirement</th>
 <th className="border border-black px-1 py-2 text-white text-start font-bold" style={{ width: "120px" }}>Stage</th>
 <th className="border border-black px-1 py-2 text-white text-center font-bold" style={{ width: "40px" }}>{isRTL ? 'الوزن' : 'Weight'}</th>
 {bidders.map((b: any) => (
 <th
 key={b.id}
 className="border border-black px-1 py-2 text-white text-center font-bold"
 style={{ width: bidderColWidth, fontSize: "5.5pt", lineHeight: "1.2" }}
 >
 {b.bidderName || "-"}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {sections.map((section) => (
 section.criteria.map((criterion, cIdx) => {
 const criterionIsNA = isNA(criterion);
 const criterionIsPostAward = isPostAward(criterion) && !criterion.isScreening;

 return (
 <tr key={`${section.number}-${cIdx}`}>
 {/* Section number - only on first criterion */}
 {cIdx === 0 && (
 <td
 rowSpan={section.criteria.length}
 className="border border-black px-1 py-0.5 text-center font-bold align-top"
 style={{ backgroundColor: TEAL_LIGHT }}
 >
 {section.number}
 </td>
 )}
 {/* Section title - only on first criterion */}
 {cIdx === 0 && (
 <td
 rowSpan={section.criteria.length}
 className="border border-black px-1 py-0.5 font-bold align-top"
 style={{ backgroundColor: TEAL_LIGHT, fontSize: "6.5pt" }}
 >
 <div className="leading-tight">{section.name}</div>
 </td>
 )}
 {/* Requirement */}
 <td
 className="border border-black px-1 py-0.5"
 style={{
 fontSize: "6pt",
 lineHeight: "1.3",
 color: criterion.isScreening ? GREEN_BG : undefined,
 fontWeight: criterion.isScreening ? "bold" : undefined,
 }}
 >
 {criterion.name}
 </td>
 {/* Stage */}
 <td className="border border-black px-1 py-0.5 text-gray-600" style={{ fontSize: "5.5pt", lineHeight: "1.3" }}>
 {criterion.stage}
 </td>
 {/* Weight */}
 <td className="border border-black px-1 py-0.5 text-center font-bold">
 {criterion.maxScore}
 </td>
 {/* Bidder scores */}
 {bidders.map((b: any) => {
 const techScore = parseFloat(String(b.technicalScore || "0"));

 // Handle N/A criteria
 if (criterionIsNA) {
 return (
 <td key={b.id} className="border border-black px-1 py-0.5 text-center font-bold" style={{ backgroundColor: TEAL_LIGHT }}>
 N/A
 </td>
 );
 }

 // Handle post-award items
 if (criterionIsPostAward) {
 const scoreData = getScore(criterion.id, b.id);
 if (scoreData && scoreData.status === "scored") {
 return (
 <td key={b.id} className="border border-black px-1 py-0.5 text-center">
 {scoreData.score}
 </td>
 );
 }
 return (
 <td key={b.id} className="border border-black px-1 py-0.5 text-center text-gray-500 italic" style={{ fontSize: "5pt" }}>
 Not yet completed
 </td>
 );
 }

 // Get actual score or fallback
 const scoreData = getScore(criterion.id, b.id);
 let displayScore: number;
 let displayStatus = "scored";

 if (scoreData) {
 displayScore = scoreData.score;
 displayStatus = scoreData.status;
 } else if (hasActualScores) {
 // Has some scores but not for this criterion-bidder
 displayScore = 0;
 } else {
 // No scores at all - use proportional fallback
 displayScore = getFallbackScore(criterion.maxScore, techScore);
 }

 // Handle "none" status
 if (displayStatus === "none") {
 return (
 <td key={b.id} className="border border-black px-1 py-0.5 text-center font-bold" style={{ backgroundColor: YELLOW_BG }}>
 None
 </td>
 );
 }

 // Screening items get green background
 if (criterion.isScreening) {
 return (
 <td
 key={b.id}
 className="border border-black px-1 py-0.5 text-center font-bold text-white"
 style={{ backgroundColor: GREEN_BG, fontSize: "5.5pt" }}
 >
 {displayScore}
 </td>
 );
 }

 return (
 <td key={b.id} className="border border-black px-1 py-0.5 text-center">
 {displayScore === 0 && criterion.maxScore > 0 ? "0" : displayScore}
 </td>
 );
 })}
 </tr>
 );
 })
 ))}

 {/* ===== TOTAL ROW ===== */}
 <tr className="font-bold" style={{ backgroundColor: TEAL_LIGHT }}>
 <td colSpan={4} className="border-2 border-black px-1 py-1.5 text-end font-bold" style={{ fontSize: "7pt" }}>
 Total Technical Score
 </td>
 <td className="border-2 border-black px-1 py-1.5 text-center font-bold">
 {totalWeight}
 </td>
 {bidders.map((b: any) => {
 const techScore = parseFloat(String(b.technicalScore || "0"));
 // Sum actual scores if available, else use bidder's total
 let total = techScore;
 if (hasActualScores) {
 total = sections.reduce((sum, s) => sum + getSectionSubtotal(s, b.id, techScore), 0);
 }
 return (
 <td key={b.id} className="border-2 border-black px-1 py-1.5 text-center font-bold" style={{ fontSize: "7pt" }}>
 {total % 1 === 0 ? total : total.toFixed(1)}
 </td>
 );
 })}
 </tr>
 </tbody>
 </table>
 </div>

 {/* ===== SECTION SUBTOTALS SUMMARY TABLE ===== */}
 <div className="mt-4">
 <table className="border-collapse border-2 border-black" style={{ fontSize: "6.5pt" }}>
 <thead>
 <tr style={{ backgroundColor: TEAL }}>
 <th className="border border-black px-3 py-1.5 text-white text-start font-bold" style={{ width: "220px", fontSize: "7pt" }}>{isRTL ? 'الفئة' : 'Category'}</th>
 {bidders.map((b: any) => (
 <th key={b.id} className="border border-black px-2 py-1.5 text-white text-center font-bold" style={{ minWidth: "60px", fontSize: "6pt" }}>
 {(b.bidderName || "-").split(" ").slice(0, 2).join(" ")}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {sections.map((section) => (
 <tr key={section.number}>
 <td className="border border-black px-3 py-1">{section.name}</td>
 {bidders.map((b: any) => {
 const techScore = parseFloat(String(b.technicalScore || "0"));
 const subtotal = getSectionSubtotal(section, b.id, techScore);
 return (
 <td key={b.id} className="border border-black px-2 py-1 text-center">
 {section.totalWeight > 0 ? (subtotal % 1 === 0 ? subtotal : subtotal.toFixed(1)) : "0"}
 </td>
 );
 })}
 </tr>
 ))}
 {/* Grand total */}
 <tr className="font-bold" style={{ backgroundColor: TEAL_LIGHT }}>
 <td className="border-2 border-black px-3 py-1.5 font-bold" style={{ fontSize: "7pt" }}>{isRTL ? 'الإجمالي' : 'Total'}</td>
 {bidders.map((b: any) => {
 const techScore = parseFloat(String(b.technicalScore || "0"));
 let total = techScore;
 if (hasActualScores) {
 total = sections.reduce((sum, s) => sum + getSectionSubtotal(s, b.id, techScore), 0);
 }
 return (
 <td key={b.id} className="border-2 border-black px-2 py-1.5 text-center font-bold" style={{ fontSize: "7pt" }}>
 {total % 1 === 0 ? total : total.toFixed(1)}
 </td>
 );
 })}
 </tr>
 </tbody>
 </table>
 </div>

 {/* Footer */}
 <div className="mt-4 text-center text-gray-400" style={{ fontSize: "6pt" }}>
 <p>Generated from {currentOrganization?.name || "IMS"} | {new Date().toLocaleDateString()}</p>
 </div>
 </div>
 </div>

 <style>{`
 @media print {
 @page {
 size: A4 landscape;
 margin: 8mm;
 }
 body {
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 }
 .print\\:hidden {
 display: none !important;
 }
 /* Hide sidebar, header, navigation */
 nav, aside, [data-sidebar], [class*="sidebar"], header:not(.print-header) {
 display: none !important;
 }
 }
 `}</style>
 </div>
 );
}
