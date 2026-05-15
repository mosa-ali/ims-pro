import { Download, Upload } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';


interface BudgetSectionProps {
 budget: any;
 updateBudget: (data: any) => void;
}

export function BudgetSection({
 budget, updateBudget }: BudgetSectionProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();

const labels = {
 title: t.proposals.fundingOpportunities,
 subtitle: t.proposals.trackFundingCallsAndOpportunitiesBefore,
 addOpportunity: t.proposals.addOpportunity,
 donor: t.proposals.donor,
 interestArea: t.proposals.interestArea,
 geographicAreas: t.proposals.geographicAreas,
 deadline: t.proposals.deadline,
 budget: t.proposals.budget,
 coFunding: t.proposals.cofunding,
 yes: t.proposals.yes,
 no: t.proposals.no,
 edit: t.proposals.edit,
 delete: t.proposals.delete,
 archive: t.proposals.archive,
 sendToPipeline: t.proposals.sendToPipeline,
 cancel: t.proposals.cancel,
 save: t.proposals.save,
 addNew: t.proposals.addNewOpportunity,
 editOpportunity: t.proposals.editOpportunity,
 deleteConfirm: t.proposals.areYouSureYouWantTo,
 notes: t.proposals.notes,
 required: t.proposals.required,
 cfpLink: t.proposals.cfpLink,
 applicationLink: t.proposals.applicationLink,
 donorType: t.proposals.donorType,
 status: {
 open: t.proposals.open,
 closingSoon: t.proposals.closingSoon,
 urgent: t.proposals.urgent,
 closed: t.proposals.closed
 },
 sendToPipelineTitle: t.proposals.sendToPipeline,
 sendToPipelineDesc: t.proposals.aNewPipelineOpportunityWillBe,
 confirm: t.proposals.confirm
 };

 // Calculate totals
 const programStaffTotal = (budget?.programStaff || []).reduce((sum: number, item: any) => {
 return sum + (item.unitCost * item.quantity * item.months);
 }, 0);
 
 const activityCostsTotal = (budget?.activityCosts || []).reduce((sum: number, item: any) => {
 return sum + (item.unitCost * item.quantity);
 }, 0);
 
 const administrativeCostsTotal = (budget?.administrativeCosts || []).reduce((sum: number, item: any) => {
 return sum + item.amount;
 }, 0);
 
 const subtotal = programStaffTotal + activityCostsTotal + administrativeCostsTotal;
 const overhead = subtotal * ((budget?.overheadPercentage || 7) / 100);
 const grandTotal = subtotal + overhead;

 const handleExportBudgetExcel = () => {
 alert('Exporting budget to Excel...');
 };

 const handleImportBudgetExcel = () => {
 alert('Import budget from Excel... (File picker would open here)');
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between">
 <label className="block text-sm font-medium text-gray-700">
 {t.proposals.proposedBudget}
 <span className="text-red-600 ms-1">*</span>
 </label>
 <div className="flex gap-2">
 <button
 onClick={handleImportBudgetExcel}
 className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
 >
 <Upload className="w-3.5 h-3.5" />
 {t.proposals.importFromExcel}
 </button>
 <button
 onClick={handleExportBudgetExcel}
 className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
 >
 <Download className="w-3.5 h-3.5" />
 {t.proposals.exportToExcel}
 </button>
 </div>
 </div>

 {/* Program Staff Costs */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.proposals.programStaffCosts}</h4>
 <div className="overflow-x-auto">
 <table className="w-full border border-gray-300 text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.position}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.unitCost}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.quantity}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.months3}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.total}</th>
 </tr>
 </thead>
 <tbody>
 {(budget?.programStaff || []).map((staff: any, index: number) => {
 const total = staff.unitCost * staff.quantity * staff.months;
 return (
 <tr key={index}>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="text"
 value={staff.position}
 onChange={(e) => {
 const programStaff = [...budget.programStaff];
 programStaff[index].position = e.target.value;
 updateBudget({ ...budget, programStaff });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 placeholder={t.placeholders.eGProjectManager}
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="number"
 min="0"
 value={staff.unitCost}
 onChange={(e) => {
 const programStaff = [...budget.programStaff];
 programStaff[index].unitCost = parseFloat(e.target.value) || 0;
 updateBudget({ ...budget, programStaff });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="number"
 min="1"
 value={staff.quantity}
 onChange={(e) => {
 const programStaff = [...budget.programStaff];
 programStaff[index].quantity = parseInt(e.target.value) || 1;
 updateBudget({ ...budget, programStaff });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="number"
 min="1"
 max="120"
 value={staff.months}
 onChange={(e) => {
 const programStaff = [...budget.programStaff];
 programStaff[index].months = parseInt(e.target.value) || 1;
 updateBudget({ ...budget, programStaff });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 />
 </td>
 <td className="ltr-safe px-3 py-2 border border-gray-300 bg-gray-50 font-medium">
 ${total.toLocaleString()}
 </td>
 </tr>
 );
 })}
 <tr className="bg-blue-50">
 <td colSpan={4} className="px-3 py-2 border border-gray-300 text-end font-semibold">
 {t.proposals.staffSubtotal}:
 </td>
 <td className="ltr-safe px-3 py-2 border border-gray-300 font-bold">
 ${programStaffTotal.toLocaleString()}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 <button
 onClick={() => {
 const programStaff = [...(budget?.programStaff || []), 
 { position: '', unitCost: 0, quantity: 1, months: 12, total: 0 }
 ];
 updateBudget({ ...budget, programStaff });
 }}
 className="mt-2 text-sm text-primary hover:underline"
 >
 + {t.proposals.addRow}
 </button>
 </div>

 {/* Activity Costs */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.proposals.activityCosts}</h4>
 <div className="overflow-x-auto">
 <table className="w-full border border-gray-300 text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.activity1}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.description}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.unitCost}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.quantity}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.total}</th>
 </tr>
 </thead>
 <tbody>
 {(budget?.activityCosts || []).map((activity: any, index: number) => {
 const total = activity.unitCost * activity.quantity;
 return (
 <tr key={index}>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="text"
 value={activity.activity}
 onChange={(e) => {
 const activityCosts = [...budget.activityCosts];
 activityCosts[index].activity = e.target.value;
 updateBudget({ ...budget, activityCosts });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 placeholder={t.placeholders.activityName}
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="text"
 value={activity.description}
 onChange={(e) => {
 const activityCosts = [...budget.activityCosts];
 activityCosts[index].description = e.target.value;
 updateBudget({ ...budget, activityCosts });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 placeholder={t.placeholders.description1}
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="number"
 min="0"
 value={activity.unitCost}
 onChange={(e) => {
 const activityCosts = [...budget.activityCosts];
 activityCosts[index].unitCost = parseFloat(e.target.value) || 0;
 updateBudget({ ...budget, activityCosts });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="number"
 min="1"
 value={activity.quantity}
 onChange={(e) => {
 const activityCosts = [...budget.activityCosts];
 activityCosts[index].quantity = parseInt(e.target.value) || 1;
 updateBudget({ ...budget, activityCosts });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 />
 </td>
 <td className="ltr-safe px-3 py-2 border border-gray-300 bg-gray-50 font-medium">
 ${total.toLocaleString()}
 </td>
 </tr>
 );
 })}
 <tr className="bg-blue-50">
 <td colSpan={4} className="px-3 py-2 border border-gray-300 text-end font-semibold">
 {t.proposals.activitiesSubtotal}:
 </td>
 <td className="ltr-safe px-3 py-2 border border-gray-300 font-bold">
 ${activityCostsTotal.toLocaleString()}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 <button
 onClick={() => {
 const activityCosts = [...(budget?.activityCosts || []), 
 { activity: '', description: '', unitCost: 0, quantity: 1, total: 0 }
 ];
 updateBudget({ ...budget, activityCosts });
 }}
 className="mt-2 text-sm text-primary hover:underline"
 >
 + {t.proposals.addRow}
 </button>
 </div>

 {/* Administrative Costs */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.proposals.administrativeCosts}</h4>
 <div className="overflow-x-auto">
 <table className="w-full border border-gray-300 text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.description}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.amount}</th>
 </tr>
 </thead>
 <tbody>
 {(budget?.administrativeCosts || []).map((cost: any, index: number) => (
 <tr key={index}>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="text"
 value={cost.description}
 onChange={(e) => {
 const administrativeCosts = [...budget.administrativeCosts];
 administrativeCosts[index].description = e.target.value;
 updateBudget({ ...budget, administrativeCosts });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 placeholder={t.placeholders.eGOfficeRentUtilities}
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="number"
 min="0"
 value={cost.amount}
 onChange={(e) => {
 const administrativeCosts = [...budget.administrativeCosts];
 administrativeCosts[index].amount = parseFloat(e.target.value) || 0;
 updateBudget({ ...budget, administrativeCosts });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 />
 </td>
 </tr>
 ))}
 <tr className="bg-blue-50">
 <td className="px-3 py-2 border border-gray-300 text-end font-semibold">
 {t.proposals.administrativeSubtotal}:
 </td>
 <td className="ltr-safe px-3 py-2 border border-gray-300 font-bold">
 ${administrativeCostsTotal.toLocaleString()}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 <button
 onClick={() => {
 const administrativeCosts = [...(budget?.administrativeCosts || []), 
 { description: '', amount: 0 }
 ];
 updateBudget({ ...budget, administrativeCosts });
 }}
 className="mt-2 text-sm text-primary hover:underline"
 >
 + {t.proposals.addRow}
 </button>
 </div>

 {/* Budget Summary */}
 <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-700">{t.proposals.subtotal}:</span>
 <span className="ltr-safe text-lg font-bold">${subtotal.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-gray-700">{t.proposals.overhead}:</span>
 <input
 type="number"
 min="7"
 max="10"
 step="0.1"
 value={budget?.overheadPercentage || 7}
 onChange={(e) => {
 const value = parseFloat(e.target.value);
 if (value >= 7 && value <= 10) {
 updateBudget({ ...budget, overheadPercentage: value });
 }
 }}
 className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
 />
 <span className="text-sm text-gray-600">%</span>
 </div>
 <span className="ltr-safe text-lg font-bold">${overhead.toLocaleString()}</span>
 </div>
 <div className="pt-3 border-t border-gray-300 flex items-center justify-between">
 <span className="text-base font-bold text-gray-900">{t.proposals.grandTotal}:</span>
 <span className="ltr-safe text-2xl font-bold text-primary">${grandTotal.toLocaleString()}</span>
 </div>
 </div>
 </div>
 );
}

interface CoFundingProps {
 coFunding: any;
 updateCoFunding: (data: any) => void;
}

export function CoFundingSection({

 coFunding, updateCoFunding }: CoFundingProps) {

 const totalCoFunding = (coFunding?.sources || []).reduce((sum: number, source: any) => {
 return sum + source.amount;
 }, 0);

 return (
 <div className="space-y-4">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.proposals.cofundingSources}
 </label>
 <p className="text-sm text-gray-600 mb-4">
 {'Specify other donors contributing to this project funding. A project may be funded by multiple donors.'}
 </p>

 <div className="overflow-x-auto">
 <table className="w-full border border-gray-300 text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.donorName}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.description}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.amount}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.currency}</th>
 <th className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300">{t.proposals.status}</th>
 </tr>
 </thead>
 <tbody>
 {(coFunding?.sources || []).map((source: any, index: number) => (
 <tr key={index}>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="text"
 value={source.fundingSourceName || ''}
 onChange={(e) => {
 const sources = [...coFunding.sources];
 sources[index].fundingSourceName = e.target.value;
 updateCoFunding({ ...coFunding, sources });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 placeholder={t.placeholders.eGFoundationGrantGovernmentFund}
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="text"
 value={source.description}
 onChange={(e) => {
 const sources = [...coFunding.sources];
 sources[index].description = e.target.value;
 updateCoFunding({ ...coFunding, sources });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 placeholder={t.placeholders.contributionDescription}
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <input
 type="number"
 min="0"
 value={source.amount}
 onChange={(e) => {
 const sources = [...coFunding.sources];
 sources[index].amount = parseFloat(e.target.value) || 0;
 updateCoFunding({ ...coFunding, sources });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 />
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <select
 value={source.currency}
 onChange={(e) => {
 const sources = [...coFunding.sources];
 sources[index].currency = e.target.value;
 updateCoFunding({ ...coFunding, sources });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 >
 <option>USD</option>
 <option>EUR</option>
 <option>GBP</option>
 <option>CHF</option>
 </select>
 </td>
 <td className="px-3 py-2 border border-gray-300">
 <select
 value={source.status}
 onChange={(e) => {
 const sources = [...coFunding.sources];
 sources[index].status = e.target.value;
 updateCoFunding({ ...coFunding, sources });
 }}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
 >
 <option>Committed</option>
 <option>Pending</option>
 <option>Confirmed</option>
 </select>
 </td>
 </tr>
 ))}
 <tr className="bg-blue-50">
 <td colSpan={2} className="px-3 py-2 border border-gray-300 text-end font-semibold">
 {t.proposals.totalCofunding}:
 </td>
 <td colSpan={3} className="ltr-safe px-3 py-2 border border-gray-300 font-bold">
 ${totalCoFunding.toLocaleString()}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 <button
 onClick={() => {
 const sources = [...(coFunding?.sources || []), 
 { donorName: '', description: '', amount: 0, currency: 'USD', status: 'Committed' }
 ];
 updateCoFunding({ ...coFunding, sources });
 }}
 className="mt-2 text-sm text-primary hover:underline"
 >
 + {t.proposals.addDonor}
 </button>
 </div>
 );
}