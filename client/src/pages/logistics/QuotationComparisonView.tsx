/**
 * Quotation Comparison View
 * Displays side-by-side comparison of supplier quotations with highlighting
 * - Highlights best price (green)
 * - Highlights best delivery time (blue)
 * - Highlights best warranty (yellow)
 * - Shows total cost comparison
 * - Provides recommendation engine
 */

import { BackButton } from "@/components/BackButton";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import {
 ArrowLeft, ArrowRight,
 Download,
 TrendingDown,
 Zap,
 Truck,
 Shield,
 Award,
 Check,
 AlertCircle,
} from "lucide-react";

interface SupplierComparison {
 supplierId: number;
 supplierName: string;
 totalPrice: number;
 deliveryDays: number;
 warranty: number;
 paymentTerms: string;
 lineItems: Array<{
 itemId: number;
 itemName: string;
 quantity: number;
 unitPrice: number;
 totalPrice: number;
 }>;
}

interface ComparisonMetrics {
 bestPrice: number;
 bestDelivery: number;
 bestWarranty: number;
 bestValue: number;
}

export default function QuotationComparisonView() {
  const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const { qaId } = useParams<{ qaId: string }>();
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState("overview");

 const numericQaId = qaId ? parseInt(qaId, 10) : 0;

 // Fetch QA data with suppliers
 const { data: qaData, isLoading } = trpc.logistics.quotationAnalysis.getById.useQuery(
 { id: numericQaId },
 { enabled: !!qaId && numericQaId > 0 }
 );

 // Prepare supplier comparison data
 const suppliers = useMemo(() => {
 if (!qaData?.suppliers) return [];

 return qaData.suppliers.map((supplier: any) => ({
 supplierId: supplier.id,
 supplierName: supplier.supplierName,
 totalPrice: supplier.totalAmount || 0,
 deliveryDays: supplier.deliveryDays || 0,
 warranty: supplier.warranty || 0,
 paymentTerms: supplier.paymentTerms || "N/A",
 lineItems: supplier.lineItems || [],
 }));
 }, [qaData]);

 // Calculate comparison metrics
 const metrics = useMemo((): ComparisonMetrics => {
 if (suppliers.length === 0) {
 return {
 bestPrice: 0,
 bestDelivery: 0,
 bestWarranty: 0,
 bestValue: 0,
 };
 }

 const prices = suppliers.map((s) => s.totalPrice);
 const deliveries = suppliers.map((s) => s.deliveryDays);
 const warranties = suppliers.map((s) => s.warranty);

 return {
 bestPrice: Math.min(...prices),
 bestDelivery: Math.min(...deliveries),
 bestWarranty: Math.max(...warranties),
 bestValue: Math.min(...prices), // Simplified - could be more complex
 };
 }, [suppliers]);

 // Determine recommendations
 const recommendations = useMemo(() => {
 const recs = {
 bestPrice: suppliers.find((s) => s.totalPrice === metrics.bestPrice),
 bestDelivery: suppliers.find((s) => s.deliveryDays === metrics.bestDelivery),
 bestWarranty: suppliers.find((s) => s.warranty === metrics.bestWarranty),
 };
 return recs;
 }, [suppliers, metrics]);

 // Helper to highlight cells
 const getCellHighlight = (value: number, metric: "price" | "delivery" | "warranty") => {
 if (metric === "price" && value === metrics.bestPrice) return "bg-green-50 border-green-200";
 if (metric === "delivery" && value === metrics.bestDelivery) return "bg-blue-50 border-blue-200";
 if (metric === "warranty" && value === metrics.bestWarranty) return "bg-yellow-50 border-yellow-200";
 return "bg-white";
 };

 if (isLoading) {
 return (
 <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-pulse space-y-4">
 <div className="h-8 bg-gray-200 rounded w-1/3"></div>
 <div className="h-64 bg-gray-200 rounded"></div>
 </div>
 </div>
 );
 }

 if (!qaData) {
 return (
 <div className="p-6">
 <div className="text-center text-gray-500">No quotation analysis found</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton onClick={() => navigate(-1)} label={t.common.back} />
 <div>
 <h1 className="text-2xl font-bold">{isRTL ? 'مقارنة العروض' : 'Quotation Comparison'}</h1>
 <p className="text-gray-600">QA-{qaData.qaNumber}</p>
 </div>
 </div>
 <Button variant="outline" size="sm" className="gap-2">
 <Download className="w-4 h-4" />
 Export Report
 </Button>
 </div>

 {/* Recommendations Summary */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {/* Best Price */}
 <Card className="border-green-200 bg-green-50">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <TrendingDown className="w-4 h-4 text-green-600" />
 Best Price
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-700">
 ${metrics.bestPrice.toLocaleString()}
 </div>
 <p className="text-xs text-gray-600 mt-1">
 {recommendations.bestPrice?.supplierName}
 </p>
 </CardContent>
 </Card>

 {/* Best Delivery */}
 <Card className="border-blue-200 bg-blue-50">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Truck className="w-4 h-4 text-blue-600" />
 Best Delivery
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-blue-700">
 {metrics.bestDelivery} days
 </div>
 <p className="text-xs text-gray-600 mt-1">
 {recommendations.bestDelivery?.supplierName}
 </p>
 </CardContent>
 </Card>

 {/* Best Warranty */}
 <Card className="border-yellow-200 bg-yellow-50">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Shield className="w-4 h-4 text-yellow-600" />
 Best Warranty
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-yellow-700">
 {metrics.bestWarranty} months
 </div>
 <p className="text-xs text-gray-600 mt-1">
 {recommendations.bestWarranty?.supplierName}
 </p>
 </CardContent>
 </Card>

 {/* Total Suppliers */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Award className="w-4 h-4" />
 Suppliers
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{suppliers.length}</div>
 <p className="text-xs text-gray-600 mt-1">in comparison</p>
 </CardContent>
 </Card>
 </div>

 {/* Comparison Table */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList>
 <TabsTrigger value="overview">{isRTL ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
 <TabsTrigger value="details">{isRTL ? 'البنود' : 'Line Items'}</TabsTrigger>
 <TabsTrigger value="analysis">{isRTL ? 'التحليل' : 'Analysis'}</TabsTrigger>
 </TabsList>

 <TabsContent value="overview" className="space-y-4">
 <Card>
 <CardContent className="pt-6">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b">
 <th className="text-start py-3 px-4 font-semibold">{isRTL ? 'المورد' : 'Supplier'}</th>
 <th className="text-end py-3 px-4 font-semibold">
 <div className="flex items-center justify-end gap-1">
 <TrendingDown className="w-4 h-4 text-green-600" />
 Total Price
 </div>
 </th>
 <th className="text-end py-3 px-4 font-semibold">
 <div className="flex items-center justify-end gap-1">
 <Truck className="w-4 h-4 text-blue-600" />
 Delivery
 </div>
 </th>
 <th className="text-end py-3 px-4 font-semibold">
 <div className="flex items-center justify-end gap-1">
 <Shield className="w-4 h-4 text-yellow-600" />
 Warranty
 </div>
 </th>
 <th className="text-start py-3 px-4 font-semibold">{isRTL ? 'شروط الدفع' : 'Payment Terms'}</th>
 </tr>
 </thead>
 <tbody>
 {suppliers.map((supplier, idx) => (
 <tr key={idx} className="border-b hover:bg-gray-50">
 <td className="py-3 px-4 font-medium">{supplier.supplierName}</td>
 <td
 className={`text-end py-3 px-4 font-semibold border rounded ${getCellHighlight( supplier.totalPrice, "price" )}`}
 >
 <div className="flex items-center justify-end gap-2">
 ${supplier.totalPrice.toLocaleString()}
 {supplier.totalPrice === metrics.bestPrice && (
 <Check className="w-4 h-4 text-green-600" />
 )}
 </div>
 </td>
 <td
 className={`text-end py-3 px-4 font-semibold border rounded ${getCellHighlight( supplier.deliveryDays, "delivery" )}`}
 >
 <div className="flex items-center justify-end gap-2">
 {supplier.deliveryDays} days
 {supplier.deliveryDays === metrics.bestDelivery && (
 <Check className="w-4 h-4 text-blue-600" />
 )}
 </div>
 </td>
 <td
 className={`text-end py-3 px-4 font-semibold border rounded ${getCellHighlight( supplier.warranty, "warranty" )}`}
 >
 <div className="flex items-center justify-end gap-2">
 {supplier.warranty} months
 {supplier.warranty === metrics.bestWarranty && (
 <Check className="w-4 h-4 text-yellow-600" />
 )}
 </div>
 </td>
 <td className="py-3 px-4">{supplier.paymentTerms}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="details" className="space-y-4">
 <div className="grid grid-cols-1 gap-4">
 {suppliers.map((supplier, idx) => (
 <Card key={idx}>
 <CardHeader>
 <CardTitle className="text-base">{supplier.supplierName}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b">
 <th className="text-start py-2 px-3 font-semibold">{isRTL ? 'البند' : 'Item'}</th>
 <th className="text-end py-2 px-3 font-semibold">Qty</th>
 <th className="text-end py-2 px-3 font-semibold">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
 <th className="text-end py-2 px-3 font-semibold">{isRTL ? 'الإجمالي' : 'Total'}</th>
 </tr>
 </thead>
 <tbody>
 {supplier.lineItems.map((item, itemIdx) => (
 <tr key={itemIdx} className="border-b">
 <td className="py-2 px-3">{item.itemName}</td>
 <td className="text-end py-2 px-3">{item.quantity}</td>
 <td className="text-end py-2 px-3">
 ${item.unitPrice.toLocaleString()}
 </td>
 <td className="text-end py-2 px-3 font-semibold">
 ${item.totalPrice.toLocaleString()}
 </td>
 </tr>
 ))}
 <tr className="bg-gray-50 font-semibold">
 <td colSpan={3} className="py-2 px-3 text-end">
 Total:
 </td>
 <td className="text-end py-2 px-3">
 ${supplier.totalPrice.toLocaleString()}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </TabsContent>

 <TabsContent value="analysis" className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'تحليل المقارنة' : 'Comparison Analysis'}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-3">
 <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
 <TrendingDown className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
 <div>
 <h3 className="font-semibold text-green-900">{isRTL ? 'أفضل سعر' : 'Best Price'}</h3>
 <p className="text-sm text-green-800">
 {recommendations.bestPrice?.supplierName} offers the lowest price at $
 {metrics.bestPrice.toLocaleString()}
 </p>
 </div>
 </div>

 <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
 <Truck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
 <div>
 <h3 className="font-semibold text-blue-900">{isRTL ? 'أفضل تسليم' : 'Best Delivery'}</h3>
 <p className="text-sm text-blue-800">
 {recommendations.bestDelivery?.supplierName} offers the fastest delivery in{" "}
 {metrics.bestDelivery} days
 </p>
 </div>
 </div>

 <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
 <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
 <div>
 <h3 className="font-semibold text-yellow-900">{isRTL ? 'أفضل ضمان' : 'Best Warranty'}</h3>
 <p className="text-sm text-yellow-800">
 {recommendations.bestWarranty?.supplierName} provides the best warranty coverage
 at {metrics.bestWarranty} months
 </p>
 </div>
 </div>
 </div>

 <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
 <div className="flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
 <div>
 <h3 className="font-semibold text-blue-900">{isRTL ? 'التوصية' : 'Recommendation'}</h3>
 <p className="text-sm text-blue-800 mt-1">
 Based on price, delivery time, and warranty, we recommend{" "}
 <span className="font-semibold">
 {recommendations.bestPrice?.supplierName}
 </span>
 . This supplier offers the best overall value for this procurement.
 </p>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 );
}
