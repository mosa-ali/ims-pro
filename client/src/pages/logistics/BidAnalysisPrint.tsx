/**
 * Competitive Bid Analysis (CBA) Print View
 * Matches the official CBA form layout exactly per user reference
 * 
 * Layout:
 * - Title: "Competitive Bid Analysis (CBA)"
 * - Header: Date/Description/Purchaser/Tender | Budget/Currency/BudgetLine/Country | Logo
 * - Table: Applicant/Company | TECHNICAL EVALUATION (50%) sections | Technical Maximum | Threshold | FINANCIAL EVALUATION (50%) | 100% TOTAL | Remarks
 * - Rows: One per supplier, dynamic count
 * - Footer: Lowest proposal amount, Evaluation report, Approval signatures
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { BackButton } from "@/components/BackButton";

const TEAL = "#008080";
const TEAL_DARK = "#006666";

interface Section {
 num: number;
 name: string;
 nameAr: string;
 maxScore: number;
 isNA?: boolean;
}

export default function BidAnalysisPrint() {
 const { currentOrganization } = useOrganization();
 const [, params] = useRoute("/organization/logistics/bid-analysis/:id/print");
 const id = params?.id ? parseInt(params.id) : 0;

 const { data: ba, isLoading: baLoading } = trpc.logistics.bidAnalysis.getById.useQuery(
 { id },
 { enabled: !!id }
 );

 // Load actual evaluation scores
 const { data: scoresList, isLoading: scoresLoading } = trpc.logistics.bidEvaluation.getScores.useQuery(
 { bidAnalysisId: id },
 { enabled: !!id }
 );

 const isLoading = baLoading || scoresLoading;

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-white">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: TEAL }}></div>
 </div>
 );
 }
 if (!ba) return <div className="p-8 text-center">{isRTL ? 'لم يتم العثور على تحليل العطاءات' : 'Bid Analysis not found'}</div>;

 const bidders = ba.bidders || [];
 const criteria = ba.evaluationCriteria || [];
 const prNumber = ba.purchaseRequest?.prNumber || "-";
 const currency = ba.purchaseRequest?.currency || "USD";
 const prTotal = parseFloat(String(ba.purchaseRequest?.prTotalUsd || ba.purchaseRequest?.prTotalUSD || "0"));
 const techWeightPct = parseFloat(String(ba.technicalWeight || "50"));
 const finWeightPct = parseFloat(String(ba.financialWeight || "50"));
 const techThreshold = parseFloat(String(ba.technicalThreshold || "70"));

 // Build sections from evaluation criteria (grouped by sectionNumber)
 const sectionMap = new Map<number, Section>();
 const techCriteria = criteria.filter((c: any) => c.criteriaType === "technical");

 if (techCriteria.length > 0) {
 techCriteria.forEach((c: any) => {
 const sn = c.sectionNumber || 1;
 const existing = sectionMap.get(sn);
 const score = parseFloat(String(c.maxScore || c.weight || "0"));
 const isNA = c.isApplicable === false || score === 0;
 if (existing) {
 existing.maxScore += score;
 if (!existing.isNA && isNA && existing.maxScore === 0) existing.isNA = true;
 } else {
 sectionMap.set(sn, {
 num: sn,
 name: c.sectionName || `Section ${sn}`,
 nameAr: c.sectionNameAr || "",
 maxScore: score,
 isNA: isNA && score === 0,
 });
 }
 });
 }

 // Default 5 sections if no criteria defined
 const sections: Section[] = sectionMap.size > 0
 ? Array.from(sectionMap.values()).sort((a, b) => a.num - b.num)
 : [
 { num: 1, name: "Legal and Administrative", nameAr: "القانونية والإدارية", maxScore: 10 },
 { num: 2, name: "Relevant experience & technical & capacity", nameAr: "الخبرة والقدرة الفنية", maxScore: 15 },
 { num: 3, name: "Operational & Financial Capacity", nameAr: "القدرة التشغيلية والمالية", maxScore: 15 },
 { num: 4, name: "Samples (if relevant)", nameAr: "العينات", maxScore: 0, isNA: true },
 { num: 5, name: "References", nameAr: "المراجع", maxScore: 10 },
 ];

 const totalTechMax = sections.reduce((s, sec) => s + sec.maxScore, 0);
 const thresholdPoints = (techThreshold / 100) * totalTechMax;

 // Sort bidders by combined score desc
 const sortedBidders = [...bidders].sort((a: any, b: any) => {
 const sa = parseFloat(String(a.combinedScore || "0"));
 const sb = parseFloat(String(b.combinedScore || "0"));
 return sb - sa;
 });

 // Lowest bid among all bidders with amounts
 const amounts = bidders.map((b: any) => parseFloat(String(b.totalBidAmount || "0"))).filter((a: number) => a > 0);
 const lowestBid = amounts.length > 0 ? Math.min(...amounts) : 0;

 const selectedBidder = bidders.find((b: any) => b.isSelected);

 const getFinScore = (bidAmt: number) => {
 if (bidAmt <= 0 || lowestBid <= 0) return 0;
 return (lowestBid / bidAmt) * finWeightPct;
 };

 // Build score lookup from actual evaluation scores
 const scores = scoresList || [];
 const hasActualScores = scores.length > 0;

 // Map criteria to sections for score aggregation
 const criteriaToSection = new Map<number, number>();
 for (const c of techCriteria) {
 criteriaToSection.set(c.id, c.sectionNumber || 1);
 }

 // Get section scores for a bidder
 const getSectionScores = (techScore: number, bidderId?: number) => {
 if (hasActualScores && bidderId) {
 // Use actual scores grouped by section
 return sections.map(s => {
 const sectionCriteriaIds = techCriteria
 .filter((c: any) => (c.sectionNumber || 1) === s.num)
 .map((c: any) => c.id);
 
 let sectionTotal = 0;
 for (const cId of sectionCriteriaIds) {
 const scoreEntry = scores.find((sc: any) => sc.criterionId === cId && sc.bidderId === bidderId);
 if (scoreEntry && scoreEntry.status === "scored") {
 sectionTotal += parseFloat(String(scoreEntry.score || "0"));
 }
 }
 return sectionTotal;
 });
 }
 // Fallback: proportional distribution
 return sections.map(s => {
 if (techScore <= 0 || totalTechMax <= 0 || s.maxScore === 0) return 0;
 return (s.maxScore / totalTechMax) * techScore;
 });
 };

 const orgName = currentOrganization?.name || "Organization";
 const orgLogo = currentOrganization?.logoUrl;
 const { language, isRTL} = useLanguage();

 // Minimum 5 rows for empty form look
 const rowCount = Math.max(sortedBidders.length + 2, 5);

 return (
 <div className="min-h-screen bg-gray-100 print:bg-white print:min-h-0" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Buttons - hidden in print */}
 <div className="fixed top-4 end-4 print:hidden z-50 flex gap-2">
 <BackButton onClick={() => window.history.back()} label={'Back'} />
 <Button onClick={() => window.print()} className="gap-2 text-white" style={{ backgroundColor: TEAL }}>
 <Printer className="h-4 w-4" /> Print / Save as PDF
 </Button>
 </div>

 <div className="mx-auto bg-white shadow-lg print:shadow-none print:max-w-none" style={{ maxWidth: "297mm" }}>
 <div className="p-6 print:p-[8mm]">

 {/* ===== TITLE ===== */}
 <h1 className="text-center font-bold mb-4" style={{ fontSize: "18pt" }}>
 Competitive Bid Analysis (CBA)
 </h1>

 {/* ===== HEADER INFO BOXES ===== */}
 <div className="flex justify-between items-start mb-4 gap-3">
 {/* Left: Date, Description, Purchaser, Tender */}
 <table style={{ fontSize: "8pt", borderCollapse: "collapse" }}>
 <tbody>
 {[
 ["Date:", ba.createdAt ? format(new Date(ba.createdAt), "M/d/yyyy") : ""],
 ["What is being purchased:", ba.purchaseRequest?.description || ba.purchaseRequest?.justification || ""],
 ["Purchase made by:", ba.purchaseRequest?.requesterName || orgName],
 ["Tender or RFQ number:", ba.announcementRef || ba.cbaNumber || prNumber],
 ].map(([label, val], i) => (
 <tr key={i}>
 <td className="border border-black px-2 py-0.5 font-semibold whitespace-nowrap" style={{ fontSize: "7.5pt" }}>{label}</td>
 <td className="border border-black px-2 py-0.5" style={{ minWidth: "180px", fontSize: "7.5pt" }}>{val}</td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Center: Budget, Currency, Budget Line, Country */}
 <table style={{ fontSize: "8pt", borderCollapse: "collapse" }}>
 <tbody>
 {[
 ["Budget Amount:", prTotal > 0 ? prTotal.toLocaleString() : ""],
 ["Currency:", currency],
 ["Budget Line:", ba.purchaseRequest?.budgetLine || ""],
 ["Country:", ba.purchaseRequest?.deliveryLocation || ""],
 ].map(([label, val], i) => (
 <tr key={i}>
 <td className="border border-black px-2 py-0.5 font-semibold whitespace-nowrap" style={{ fontSize: "7.5pt" }}>{label}</td>
 <td className="border border-black px-2 py-0.5" style={{ minWidth: "100px", fontSize: "7.5pt" }}>{val}</td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Right: Logo */}
 <div className="border-2 border-black flex items-center justify-center flex-shrink-0" style={{ width: "100px", height: "75px", padding: "4px" }}>
 {orgLogo ? (
 <img src={orgLogo} alt={orgName} className="max-h-full max-w-full object-contain" />
 ) : (
 <div className="text-center font-bold uppercase leading-tight" style={{ fontSize: "6.5pt", color: "#666" }}>
 {orgName}
 </div>
 )}
 </div>
 </div>

 {/* ===== MAIN EVALUATION TABLE ===== */}
 <table className="w-full border-collapse" style={{ fontSize: "7pt", border: "2px solid black" }}>
 <thead>
 {/* Row 1: Top-level group headers */}
 <tr>
 {/* Applicant/Company - rowspan 3 */}
 <th rowSpan={3} className="border border-black px-1 py-1 text-center align-middle" style={{ minWidth: "110px", fontSize: "7.5pt", backgroundColor: "#f5f5f5" }}>
 <strong>Applicant/Company</strong>
 </th>
 {/* TECHNICAL EVALUATION header */}
 <th colSpan={sections.length} className="border border-black px-1 py-1.5 text-center text-white font-bold italic" style={{ backgroundColor: TEAL, fontSize: "9pt" }}>
 TECHNICAL EVALUATION ({techWeightPct}%)
 </th>
 {/* Technical - rowspan 1 */}
 <th rowSpan={1} className="border border-black px-1 py-1.5 text-center" style={{ backgroundColor: "#f5f5f5", fontSize: "7pt", width: "50px" }}>
 <strong>{isRTL ? 'فني' : 'Technical'}</strong>
 </th>
 {/* Threshold - rowspan 3 */}
 <th rowSpan={3} className="border border-black px-1 py-1 text-center align-middle italic" style={{ width: "70px", fontSize: "5.5pt", backgroundColor: "#f5f5f5", lineHeight: "1.3" }}>
 <em>Only proposals reaching ≥{techThreshold}% of max. technical score are eligible</em>
 </th>
 {/* FINANCIAL EVALUATION header */}
 <th colSpan={2} className="border border-black px-1 py-1.5 text-center text-white font-bold italic" style={{ backgroundColor: TEAL, fontSize: "9pt" }}>
 FINANCIAL EVALUATION ({finWeightPct}%)
 </th>
 {/* 100% TOTAL - rowspan 1 */}
 <th rowSpan={1} className="border border-black px-1 py-1.5 text-center text-white font-bold" style={{ backgroundColor: TEAL, width: "55px", fontSize: "8pt" }}>
 100%<br/>TOTAL
 </th>
 {/* Remarks - rowspan 3 */}
 <th rowSpan={3} className="border border-black px-1 py-1 text-center align-middle font-bold" style={{ width: "55px", fontSize: "7pt", backgroundColor: "#fffde7" }}>
 Remarks
 </th>
 </tr>

 {/* Row 2: Section names + sub-headers */}
 <tr>
 {sections.map((s, i) => (
 <th key={i} className="border border-black px-1 py-1 text-center text-white" style={{ backgroundColor: TEAL, fontSize: "5.5pt", minWidth: "55px", lineHeight: "1.2" }}>
 <div>{s.name}</div>
 </th>
 ))}
 {/* Maximum sub-label under Technical */}
 <th rowSpan={2} className="border border-black px-1 py-1 text-center align-middle font-bold" style={{ fontSize: "7pt", backgroundColor: "#f5f5f5" }}>
 Maximum
 </th>
 {/* Price offer from applicant */}
 <th className="border border-black px-1 py-1 text-center text-white" style={{ backgroundColor: TEAL, fontSize: "5.5pt", lineHeight: "1.2" }}>
 Price offer from applicant
 </th>
 {/* Total Financial */}
 <th className="border border-black px-1 py-1 text-center text-white" style={{ backgroundColor: TEAL, fontSize: "5.5pt", lineHeight: "1.2" }}>
 Total Financial
 </th>
 {/* Technical + Financial sub-header */}
 <th rowSpan={2} className="border border-black px-1 py-1 text-center text-white font-bold align-middle" style={{ backgroundColor: TEAL, fontSize: "5.5pt", lineHeight: "1.3" }}>
 <strong>Technical<br/>+<br/>{isRTL ? 'مالي' : 'Financial'}</strong><br/>max 100
 </th>
 </tr>

 {/* Row 3: Max values */}
 <tr>
 {sections.map((s, i) => (
 <th key={i} className="border border-black px-1 py-1 text-center font-bold" style={{ fontSize: "6.5pt", backgroundColor: "#f5f5f5" }}>
 {s.isNA ? "N/A" : `max ${s.maxScore}`}
 </th>
 ))}
 {/* Price sub-label */}
 <th className="border border-black px-1 py-1 text-center text-white font-bold" style={{ backgroundColor: TEAL, fontSize: "6.5pt" }}>
 Price
 </th>
 {/* Price Score explanation */}
 <th className="border border-black px-1 py-0.5 text-center text-white" style={{ backgroundColor: TEAL, fontSize: "4.5pt", lineHeight: "1.2" }}>
 Price Score: lowest<br/>proposal gets max.<br/>points:<br/><strong>{finWeightPct}</strong>
 </th>
 </tr>

 {/* Row 4: Threshold value row (shows the actual threshold number) */}
 <tr style={{ backgroundColor: "#f5f5f5" }}>
 <td className="border border-black px-1 py-0.5"></td>
 {sections.map((_, i) => (
 <td key={i} className="border border-black px-1 py-0.5"></td>
 ))}
 <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ fontSize: "8pt" }}>
 {totalTechMax}
 </td>
 <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ fontSize: "8pt" }}>
 {thresholdPoints.toFixed(0)}
 </td>
 <td className="border border-black px-1 py-0.5"></td>
 <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ fontSize: "7pt" }}>
 {finWeightPct}
 </td>
 <td className="border border-black px-1 py-0.5"></td>
 <td className="border border-black px-1 py-0.5"></td>
 </tr>
 </thead>

 <tbody>
 {Array.from({ length: rowCount }).map((_, idx) => {
 const b = sortedBidders[idx] as any;
 if (!b) {
 // Empty row
 return (
 <tr key={`e-${idx}`}>
 <td className="border border-black px-1 py-1.5"></td>
 {sections.map((_, j) => <td key={j} className="border border-black px-1 py-1.5"></td>)}
 <td className="border border-black px-1 py-1.5 text-center" style={{ fontSize: "7pt" }}>0</td>
 <td className="border border-black px-1 py-1.5 text-center">-</td>
 <td className="border border-black px-1 py-1.5"></td>
 <td className="border border-black px-1 py-1.5"></td>
 <td className="border border-black px-1 py-1.5 text-center">-</td>
 <td className="border border-black px-1 py-1.5"></td>
 </tr>
 );
 }

 const techScore = parseFloat(String(b.technicalScore || "0"));
 const bidAmt = parseFloat(String(b.totalBidAmount || "0"));
 const finScore = getFinScore(bidAmt);
 const passesTech = techScore >= thresholdPoints;
 const combined = passesTech && bidAmt > 0 ? techScore + finScore : 0;
 const isSelected = !!b.isSelected;
 const sScores = getSectionScores(techScore, b.id);

 return (
 <tr key={b.id || idx} style={isSelected ? { backgroundColor: "#d4edda" } : {}}>
 {/* Applicant name */}
 <td className="border border-black px-1 py-1" style={{ fontSize: "7pt", fontWeight: isSelected ? "bold" : "normal" }}>
 {b.bidderName || ""}
 {isSelected && <span style={{ color: TEAL_DARK, marginLeft: "3px" }}>★</span>}
 </td>
 {/* Section scores */}
 {sScores.map((score, i) => (
 <td key={i} className="border border-black px-1 py-1 text-center" style={{ fontSize: "7pt" }}>
 {sections[i].isNA ? "0" : score.toFixed(1)}
 </td>
 ))}
 {/* Technical Maximum (total) */}
 <td className="border border-black px-1 py-1 text-center font-bold" style={{ fontSize: "7.5pt" }}>
 {techScore > 0 ? techScore.toFixed(0) : "0"}
 </td>
 {/* Threshold pass indicator */}
 <td className="border border-black px-1 py-1 text-center" style={{ fontSize: "7pt" }}>
 {techScore > 0 ? (passesTech ? thresholdPoints.toFixed(0) : "-") : "-"}
 </td>
 {/* Price */}
 <td className="border border-black px-1 py-1 text-end" style={{ fontSize: "7pt", fontWeight: isSelected ? "bold" : "normal" }}>
 {bidAmt > 0 ? bidAmt.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
 </td>
 {/* Financial Score */}
 <td className="border border-black px-1 py-1 text-center font-bold" style={{ fontSize: "7pt" }}>
 {passesTech && bidAmt > 0 ? finScore.toFixed(2) : "0.00"}
 </td>
 {/* 100% Total */}
 <td className="border border-black px-1 py-1 text-center font-bold" style={{ fontSize: "7.5pt", color: isSelected ? TEAL_DARK : "inherit" }}>
 {passesTech && bidAmt > 0 ? (
 <strong>{combined.toFixed(2)}</strong>
 ) : techScore > 0 ? "-" : "-"}
 </td>
 {/* Remarks */}
 <td className="border border-black px-1 py-1" style={{ fontSize: "6pt" }}>
 {b.remarks || ""}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>

 {/* ===== LOWEST PROPOSAL AMOUNT ===== */}
 <div className="flex justify-end items-center gap-2 mt-3 mb-4" style={{ fontSize: "9pt" }}>
 <span className="font-bold">Lowest proposal amount</span>
 <span className="border-2 border-black px-3 py-1 font-bold text-end" style={{ fontSize: "10pt", minWidth: "100px" }}>
 {lowestBid > 0 ? lowestBid.toLocaleString() : ""}
 </span>
 </div>

 {/* ===== EVALUATION REPORT ===== */}
 <div className="mb-4">
 <p className="font-bold underline mb-2" style={{ fontSize: "9pt" }}>
 Evaluation report, including selection process description, conclusions and recommendation:
 </p>
 <div className="p-4 text-white" style={{ backgroundColor: TEAL, fontSize: "8.5pt", lineHeight: "1.5", minHeight: "80px" }}>
 {selectedBidder ? (() => {
 const selAmt = parseFloat(String(selectedBidder.totalBidAmount || "0"));
 const selTech = parseFloat(String(selectedBidder.technicalScore || "0"));
 const selFin = getFinScore(selAmt);
 const selCombined = selTech + selFin;
 const isLowest = selAmt === lowestBid;

 return (
 <div>
 <p>
 The supplier <strong>{selectedBidder.bidderName}</strong> was selected for the following reasons:
 </p>
 {ba.selectionJustification ? (
 <p className="mt-1">{ba.selectionJustification}</p>
 ) : (
 <p className="mt-1">
 The bidder achieved the highest combined score of <strong>{selCombined.toFixed(1)}</strong> points
 (Technical: {selTech.toFixed(1)}/{totalTechMax}, Financial: {selFin.toFixed(2)}/{finWeightPct})
 with a bid amount of <strong>{currency} {selAmt.toLocaleString()}</strong>.
 {!isLowest && (
 <span>
 {" "}While not the lowest price offer, {selectedBidder.bidderName} demonstrated the strongest overall
 qualification based on the combined technical and financial evaluation criteria.
 </span>
 )}
 {isLowest && (
 <span>
 {" "}The selected supplier also submitted the lowest price offer among all eligible bidders.
 </span>
 )}
 </p>
 )}
 </div>
 );
 })() : (
 <p className="italic">The supplier NAME was selected for following reasons....</p>
 )}
 </div>
 </div>

 {/* ===== APPROVAL SIGNATURES ===== */}
 <table className="mt-4" style={{ fontSize: "8pt", borderCollapse: "collapse" }}>
 <thead>
 <tr>
 <th className="border border-black px-3 py-1.5 text-start" style={{ width: "130px", backgroundColor: "#f5f5f5" }}></th>
 <th className="border border-black px-3 py-1.5 text-start" style={{ width: "180px", backgroundColor: "#f5f5f5" }}>{isRTL ? 'الاسم' : 'Name'}</th>
 <th className="border border-black px-3 py-1.5 text-start" style={{ width: "180px", backgroundColor: "#f5f5f5" }}>{isRTL ? 'التوقيع' : 'Signature'}</th>
 </tr>
 </thead>
 <tbody>
 {[1, 2, 3].map((n) => (
 <tr key={n}>
 <td className="border border-black px-3 py-2.5 font-semibold">Approved by ({n})</td>
 <td className="border border-black px-3 py-2.5"></td>
 <td className="border border-black px-3 py-2.5"></td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Footer */}
 <div className="mt-6 text-center" style={{ fontSize: "6.5pt", color: "#999" }}>
 <p>Generated from {orgName} - Integrated Management System (IMS) | {new Date().toLocaleDateString()}</p>
 </div>
 </div>
 </div>

 <style>{`
 @media print {
 @page {
 size: A4 landscape;
 margin: 6mm;
 }
 html, body {
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 color-adjust: exact !important;
 margin: 0 !important;
 padding: 0 !important;
 background: white !important;
 font-size: 7pt !important;
 }
 /* Hide ALL non-print elements */
 .print\\:hidden,
 nav, aside,
 [data-sidebar], [data-header],
 .sidebar, .header-nav,
 [class*="Sidebar"], [class*="AppShell"] > div:first-child {
 display: none !important;
 }
 /* Full width */
 .min-h-screen {
 min-height: auto !important;
 background: white !important;
 }
 .shadow-lg { box-shadow: none !important; }
 /* Table handling */
 table { page-break-inside: auto; }
 tr { page-break-inside: avoid; }
 thead { display: table-header-group; }
 }
 `}</style>
 </div>
 );
}
