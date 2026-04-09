import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface BudgetInformationSectionProps {
 isRTL: boolean;
 formData: any;
 setFormData: (data: any) => void;
 selectedBudgetId: number | null;
 selectedBudgetLine: any;
 budgetLinesData: any[];
 remainingBudget: number;
 budgetUtilizationPercent: number;
 isLocked: boolean;
}

export function BudgetInformationSection({
 isRTL,
 formData,
 setFormData,
 selectedBudgetId,
 selectedBudgetLine,
 budgetLinesData,
 remainingBudget,
 budgetUtilizationPercent,
 isLocked,
}: BudgetInformationSectionProps) {
 const { t } = useTranslation();
 const [isLoadingRate, setIsLoadingRate] = useState(false);

 const { data: currenciesData, isLoading: currenciesLoading } = trpc.finance.currencies.list.useQuery(
 { includeInactive: false },
 { staleTime: 1000 * 60 * 60 } // Cache for 1 hour - currencies don't change often
 );

 const currencyOptions = (currenciesData || []).map((currency) => ({
 value: currency.code,
 label: `${currency.code} - ${currency.name}`,
 }));

 // Sort options alphabetically by code
 currencyOptions.sort((a, b) => a.value.localeCompare(b.value));

 // Note: exchangeFrom is no longer needed as we use currency directly

 // Auto-calculate exchange rate when "Exchange to" currency changes
 useEffect(() => {
 if (
 formData.currency &&
 formData.currency !== "USD" &&
 formData.exchangeTo &&
 formData.exchangeTo !== formData.currency
 ) {
 fetchExchangeRate();
 }
 }, [formData.exchangeTo, formData.currency]);

 const fetchExchangeRate = async () => {
 if (!formData.currency || !formData.exchangeTo) return;

 setIsLoadingRate(true);
 try {
 // Try to fetch real-time rate from API
 const response = await fetch("/api/trpc/exchangeRates.getRealtimeRate", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 input: {
 fromCurrency: formData.currency,
 toCurrency: formData.exchangeTo,
 },
 }),
 credentials: "include",
 });

 if (response.ok) {
 const data = await response.json();
 if (data.result && data.result.rate) {
 setFormData((prev: any) => ({
 ...prev,
 exchangeRate: data.result.rate,
 }));
 }
 }
 } catch (error) {
 console.error("Failed to fetch exchange rate:", error);
 // Fallback: keep existing rate or use 1.0
 } finally {
 setIsLoadingRate(false);
 }
 };

 // Calculate conversion preview
 const conversionPreview = () => {
 if (
 !formData.totalBudgetLine ||
 !formData.exchangeRate ||
 !formData.currency ||
 !formData.exchangeTo
 ) {
 return null;
 }

 const originalAmount = parseFloat(formData.totalBudgetLine);
 const rate = parseFloat(formData.exchangeRate);
 const convertedAmount = originalAmount * rate;

 return `${formData.currency} ${originalAmount.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })} × ${rate.toLocaleString("en-US", {
 minimumFractionDigits: 6,
 maximumFractionDigits: 6,
 })} = ${formData.exchangeTo} ${convertedAmount.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}`;
 };

 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Row 1: Budget Line | Remaining Budget | Currency */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {/* Budget Line */}
 <div>
 <Label>{t.logistics.budgetLine}</Label>
 <select
 value={String(formData.budgetLineId || '')}
 onChange={(e) => {
 const lineId = parseInt(e.target.value);
 const selectedLine = budgetLinesData?.find(line => line.id === lineId);
 const remainingAmount = selectedLine ? (selectedLine.availableBalance || 0) : 0;
 setFormData((prev: any) => ({ 
 ...prev, 
 budgetLineId: lineId,
 totalBudgetLine: remainingAmount.toString(),
 subBudgetLine: selectedLine?.description || selectedLine?.descriptionAr || "",
 activityName: selectedLine?.activityName || ""
 }));
 }}
 disabled={!selectedBudgetId || isLocked}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <option value="">{t.logistics.selectBudgetLine}</option>
 {/* Show selected budget line even if not in budgetLinesData (for edit mode) */}
 {formData.budgetLineId && !budgetLinesData?.find(bl => bl.id === formData.budgetLineId) && (
 <option key={formData.budgetLineId} value={String(formData.budgetLineId)}>
 {formData.subBudgetLine || `Line ${formData.budgetLineId}`}
 </option>
 )}
 {budgetLinesData?.map((line) => (
 <option key={line.id} value={String(line.id)}>
 {line.description || line.descriptionAr || `Line ${line.lineCode}`}
 </option>
 ))}
 </select>
 </div>

 {/* Remaining Budget */}
 {selectedBudgetLine && (
 <div>
 <Label>{t.logistics.remainingBudget}</Label>
 <Input
 type="text"
 value={`${formData.currency} ${remainingBudget.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}`}
 readOnly
 className="bg-muted"
 />
 </div>
 )}

 {/* Currency */}
 <div>
 <Label>{t.logistics.currency}</Label>
 <Input
 type="text"
 value={formData.currency || "USD"}
 readOnly
 className="bg-muted"
 />
 </div>
 </div>

 {/* Row 2: Exchange Rate | Exchange to | Total - Always show */}
 {formData.currency && (
 <>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {/* Exchange Rate */}
 <div>
 <Label>{t.logistics.exchangeRate}</Label>
 <div className="relative">
 <Input
 type="number"
 step="0.000001"
 value={formData.exchangeRate || 1}
 onChange={(e) =>
 setFormData((prev: any) => ({
 ...prev,
 exchangeRate: parseFloat(e.target.value) || 1,
 }))
 }
 disabled={isLocked}
 placeholder="1.0"
 />
 {isLoadingRate && (
 <Loader2 className="absolute end-3 top-3 h-4 w-4 animate-spin text-primary" />
 )}
 </div>
 </div>

 {/* Exchange to */}
 <div>
 <Label>{t.logistics.exchangeTo}</Label>
 <select
 value={formData.exchangeTo || "USD"}
 onChange={(e) => {
 setFormData((prev: any) => ({
 ...prev,
 exchangeTo: e.target.value,
 }));
 }}
 disabled={isLocked}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {currencyOptions.map((opt) => (
 <option key={opt.value} value={opt.value}>
 {opt.label}
 </option>
 ))}
 </select>
 </div>

 {/* Total */}
 <div>
 <Label>{t.logistics.total}</Label>
 <Input
 type="text"
 value={`${formData.exchangeTo || "USD"} ${
 formData.total
 ? parseFloat(formData.total).toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
 : "0.00"
 }`}
 readOnly
 className="bg-muted"
 />
 </div>
 </div>

 {/* Conversion Preview */}
 {conversionPreview() && (
 <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
 <p className="text-sm text-blue-900 dark:text-blue-100">
 {t.logistics.conversionPreview}
 <span className="font-semibold">{conversionPreview()}</span>
 </p>
 </div>
 )}
 </>
 )}
 </div>
 );
}
