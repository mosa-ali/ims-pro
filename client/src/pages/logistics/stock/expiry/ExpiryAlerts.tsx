/**
 * Expiry Alerts - Monitor near-expiry and expired batches, send notifications
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, AlertTriangle, XCircle, Loader2, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";

export default function ExpiryAlerts() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [thresholdDays, setThresholdDays] = useState(30);

  const { data: alertData, isLoading } = trpc.logistics.stockMgmt.expiryAlerts.check.useQuery({ thresholdDays });

  const sendAlertMut = trpc.logistics.stockMgmt.expiryAlerts.sendAlert.useMutation({
    onSuccess: (result) => {
      if (result.sent) toast.success(isRTL ? `تم إرسال التنبيه! ${result.nearExpiryCount} قريبة الانتهاء، ${result.expiredCount} منتهية.` : `Alert sent! ${result.nearExpiryCount} near-expiry, ${result.expiredCount} expired batches.`);
      else toast.info(isRTL ? "لا توجد دفعات تحتاج تنبيه." : "No batches require alerts.");
    },
    onError: (err) => toast.error(err.message),
  });

  const nearExpiry = alertData?.nearExpiry || [];
  const expired = alertData?.expired || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock" label={t.logistics?.stockManagement || "Back to Stock Management"} />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-start">{t.logistics?.expiryAlerts || "Batch Expiry Alerts"}</h1>
              <p className="text-muted-foreground text-start">{t.logistics?.expiryAlertsDesc || "Monitor near-expiry and expired batches, send notifications"}</p>
            </div>
            <Button onClick={() => sendAlertMut.mutate({ thresholdDays })} disabled={sendAlertMut.isPending} className="bg-amber-600 hover:bg-amber-700">
              {sendAlertMut.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Bell className="h-4 w-4 me-2" />}
              {isRTL ? "إرسال تنبيه الانتهاء" : "Send Expiry Alert"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-amber-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t.logistics?.nearExpiry || "Near Expiry"}</p>
                <p className="text-2xl font-bold text-amber-600">{isLoading ? "..." : nearExpiry.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-red-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t.logistics?.expired || "Expired"}</p>
                <p className="text-2xl font-bold text-red-600">{isLoading ? "..." : expired.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg"><Clock className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "حد التنبيه" : "Alert Threshold"}</p>
                <Select value={thresholdDays.toString()} onValueChange={(v) => setThresholdDays(parseInt(v))}>
                  <SelectTrigger className="w-[140px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{isRTL ? "٧ أيام" : "7 days"}</SelectItem>
                    <SelectItem value="14">{isRTL ? "١٤ يوم" : "14 days"}</SelectItem>
                    <SelectItem value="30">{isRTL ? "٣٠ يوم" : "30 days"}</SelectItem>
                    <SelectItem value="60">{isRTL ? "٦٠ يوم" : "60 days"}</SelectItem>
                    <SelectItem value="90">{isRTL ? "٩٠ يوم" : "90 days"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {nearExpiry.length > 0 && (
          <div className="bg-card rounded-lg border border-amber-200 overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
              <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{t.logistics?.nearExpiry || "Near Expiry"} ({thresholdDays}{isRTL ? " يوم" : "d"})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b"><tr>
                  <th className="text-start px-4 py-2 font-medium">{t.logistics?.stockItem || "Item"}</th>
                  <th className="text-start px-4 py-2 font-medium">{isRTL ? "# الدفعة" : "Batch #"}</th>
                  <th className="text-start px-4 py-2 font-medium">{t.logistics?.warehouse || "Warehouse"}</th>
                  <th className="text-end px-4 py-2 font-medium">{t.logistics?.quantity || "Available Qty"}</th>
                  <th className="text-start px-4 py-2 font-medium">{isRTL ? "تاريخ الانتهاء" : "Expiry Date"}</th>
                  <th className="text-end px-4 py-2 font-medium">{isRTL ? "الأيام المتبقية" : "Days Left"}</th>
                </tr></thead>
                <tbody>
                  {nearExpiry.map((b: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{b.itemName || `Item #${b.itemId}`}</td>
                      <td className="px-4 py-2 font-mono text-xs">{b.batchNumber}</td>
                      <td className="px-4 py-2 text-muted-foreground">{b.warehouse || "—"}</td>
                      <td className="px-4 py-2 text-end">{parseFloat(b.availableQty || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2 text-end">
                        <Badge className={`text-xs ${b.daysUntilExpiry <= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{b.daysUntilExpiry}{isRTL ? " يوم" : "d"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {expired.length > 0 && (
          <div className="bg-card rounded-lg border border-red-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200">
              <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2"><XCircle className="h-4 w-4" />{isRTL ? "دفعات منتهية الصلاحية" : "Expired Batches"}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b"><tr>
                  <th className="text-start px-4 py-2 font-medium">{t.logistics?.stockItem || "Item"}</th>
                  <th className="text-start px-4 py-2 font-medium">{isRTL ? "# الدفعة" : "Batch #"}</th>
                  <th className="text-start px-4 py-2 font-medium">{t.logistics?.warehouse || "Warehouse"}</th>
                  <th className="text-end px-4 py-2 font-medium">{t.logistics?.quantity || "Available Qty"}</th>
                  <th className="text-start px-4 py-2 font-medium">{isRTL ? "انتهت في" : "Expired On"}</th>
                  <th className="text-end px-4 py-2 font-medium">{isRTL ? "أيام التأخير" : "Days Overdue"}</th>
                </tr></thead>
                <tbody>
                  {expired.map((b: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{b.itemName || `Item #${b.itemId}`}</td>
                      <td className="px-4 py-2 font-mono text-xs">{b.batchNumber}</td>
                      <td className="px-4 py-2 text-muted-foreground">{b.warehouse || "—"}</td>
                      <td className="px-4 py-2 text-end">{parseFloat(b.availableQty || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2 text-end"><Badge className="text-xs bg-red-100 text-red-700">{Math.abs(b.daysUntilExpiry || 0)}{isRTL ? " يوم" : "d"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && nearExpiry.length === 0 && expired.length === 0 && (
          <div className="bg-card rounded-lg border border-green-200 p-8 text-center">
            <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3"><Bell className="h-6 w-6 text-green-600" /></div>
            <h3 className="text-lg font-semibold text-green-700">{isRTL ? "كل شيء على ما يرام" : "All Clear"}</h3>
            <p className="text-muted-foreground mt-1">{isRTL ? `لا توجد دفعات قريبة الانتهاء أو منتهية ضمن حد ${thresholdDays} يوم.` : `No batches near expiry or expired within the ${thresholdDays}-day threshold.`}</p>
          </div>
        )}
      </div>
    </div>
  );
}
