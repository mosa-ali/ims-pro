import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import {
  Bell, BellRing, Clock, AlertTriangle,
  CheckCircle2, Loader2, Send, History, Package, Warehouse
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";

export default function ScheduledExpiryAlerts() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const [thresholdDays, setThresholdDays] = useState("30");
  const [autoAlertEnabled, setAutoAlertEnabled] = useState(true);
  const [frequency, setFrequency] = useState("daily");
  const utils = trpc.useUtils();

  const { data: expiryData, isLoading: expiryLoading } = trpc.logistics.stockMgmt.expiryAlerts.check.useQuery({
    thresholdDays: parseInt(thresholdDays),
  });
  const { data: alertHistory, isLoading: historyLoading } = trpc.logistics.stockMgmt.expiryAlerts.getHistory.useQuery({});

  const sendAlert = trpc.logistics.stockMgmt.expiryAlerts.sendAlert.useMutation({
    onSuccess: (data: any) => {
      toast.success(isRTL ? `تم إرسال التنبيه لـ ${data.batchCount} دفعة` : `Alert sent for ${data.batchCount} batches`);
      utils.logistics.stockMgmt.expiryAlerts.getHistory.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const configureSchedule = trpc.logistics.stockMgmt.expiryAlerts.configureSchedule.useMutation({
    onSuccess: () => toast.success(isRTL ? "تم تحديث جدول التنبيهات" : "Alert schedule updated"),
    onError: (err: any) => toast.error(err.message),
  });

  const nearExpiryCount = expiryData?.nearExpiry?.length || 0;
  const expiredCount = expiryData?.expired?.length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <BackButton href="/organization/logistics/stock" label={t.logistics?.stockManagement || "Back to Stock Management"} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{t.logistics?.scheduledAlerts || "Scheduled Expiry Alerts"}</h1>
          <p className="text-sm text-muted-foreground">{t.logistics?.scheduledAlertsDesc || "Configure automated notifications for expiring stock batches"}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/organization/logistics/stock/warehouse-alert-configs">
            <Warehouse className="h-4 w-4 me-2" /> {t.logistics?.warehouseAlertConfig || "Warehouse Configs"}
          </Link>
        </Button>
        <Button
          onClick={() => sendAlert.mutate({ thresholdDays: parseInt(thresholdDays) })}
          disabled={sendAlert.isPending || (nearExpiryCount === 0 && expiredCount === 0)}
        >
          {sendAlert.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Send className="h-4 w-4 me-2" />}
          {isRTL ? "إرسال تنبيه الآن" : "Send Alert Now"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{nearExpiryCount}</p>
                <p className="text-xs text-muted-foreground">{t.logistics?.nearExpiry || "Near Expiry"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                <p className="text-xs text-muted-foreground">{t.logistics?.expired || "Expired"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Clock className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{thresholdDays}{isRTL ? " يوم" : "d"}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "حد التنبيه" : "Alert Threshold"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><BellRing className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{alertHistory?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "تنبيهات مرسلة" : "Alerts Sent"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5" /> {isRTL ? "إعدادات التنبيه" : "Alert Configuration"}
              </CardTitle>
              <CardDescription>{isRTL ? "إعداد إشعارات الانتهاء التلقائية" : "Set up automated expiry notifications"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-sm">{isRTL ? "حد التنبيه" : "Alert Threshold"}</Label>
                <Select value={thresholdDays} onValueChange={setThresholdDays}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{isRTL ? "٧ أيام قبل الانتهاء" : "7 days before expiry"}</SelectItem>
                    <SelectItem value="14">{isRTL ? "١٤ يوم قبل الانتهاء" : "14 days before expiry"}</SelectItem>
                    <SelectItem value="30">{isRTL ? "٣٠ يوم قبل الانتهاء" : "30 days before expiry"}</SelectItem>
                    <SelectItem value="60">{isRTL ? "٦٠ يوم قبل الانتهاء" : "60 days before expiry"}</SelectItem>
                    <SelectItem value="90">{isRTL ? "٩٠ يوم قبل الانتهاء" : "90 days before expiry"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">{isRTL ? "تكرار التنبيه" : "Alert Frequency"}</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{isRTL ? "يومي (كل صباح)" : "Daily (every morning)"}</SelectItem>
                    <SelectItem value="weekly">{isRTL ? "أسبوعي (كل اثنين)" : "Weekly (every Monday)"}</SelectItem>
                    <SelectItem value="biweekly">{isRTL ? "نصف شهري" : "Bi-weekly"}</SelectItem>
                    <SelectItem value="monthly">{isRTL ? "شهري (أول الشهر)" : "Monthly (1st of month)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{isRTL ? "إرسال تلقائي" : "Auto-Send Alerts"}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{isRTL ? "إرسال التنبيهات تلقائياً حسب الجدول" : "Automatically send alerts on schedule"}</p>
                </div>
                <Switch checked={autoAlertEnabled} onCheckedChange={setAutoAlertEnabled} />
              </div>

              <Button
                className="w-full"
                variant="secondary"
                onClick={() => configureSchedule.mutate({
                  thresholdDays: parseInt(thresholdDays),
                  frequency,
                  enabled: autoAlertEnabled,
                })}
                disabled={configureSchedule.isPending}
              >
                {configureSchedule.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
                {isRTL ? "حفظ الإعدادات" : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Near Expiry Batches */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" /> {isRTL ? "دفعات تحتاج اهتمام" : "Batches Requiring Attention"}
              </CardTitle>
              <CardDescription>
                {isRTL ? `دفعات تنتهي خلال ${thresholdDays} يوم أو منتهية بالفعل` : `Batches expiring within ${thresholdDays} days or already expired`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiryLoading ? (
                <div className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading batches..."}</div>
              ) : (nearExpiryCount === 0 && expiredCount === 0) ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-60" />
                  <p className="text-lg font-medium text-green-700">{isRTL ? "كل شيء على ما يرام" : "All Clear"}</p>
                  <p className="text-sm mt-1">{isRTL ? `لا توجد دفعات تنتهي خلال ${thresholdDays} يوم` : `No batches expiring within ${thresholdDays} days`}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-3 px-3 font-medium text-start">{t.logistics?.stockItem || "Item"}</th>
                        <th className="py-3 px-3 font-medium text-start">{isRTL ? "# الدفعة" : "Batch #"}</th>
                        <th className="py-3 px-3 font-medium text-start">{t.logistics?.warehouse || "Warehouse"}</th>
                        <th className="py-3 px-3 font-medium text-end">{t.logistics?.quantity || "Qty"}</th>
                        <th className="py-3 px-3 font-medium text-start">{isRTL ? "تاريخ الانتهاء" : "Expiry Date"}</th>
                        <th className="py-3 px-3 font-medium text-center">{isRTL ? "الأيام المتبقية" : "Days Left"}</th>
                        <th className="py-3 px-3 font-medium text-center">{t.logistics?.status || "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiryData?.expired?.map((batch: any) => (
                        <tr key={batch.id} className="border-b bg-red-50/30 hover:bg-red-50/50 transition-colors">
                          <td className="py-2.5 px-3">{batch.itemName || "—"}</td>
                          <td className="py-2.5 px-3 font-mono text-xs">{batch.batchNumber}</td>
                          <td className="py-2.5 px-3 text-xs">{batch.warehouse || "—"}</td>
                          <td className="py-2.5 px-3 text-end font-mono">{batch.quantity}</td>
                          <td className="py-2.5 px-3 text-red-600">
                            {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-red-600 font-medium">{t.logistics?.expired || "Expired"}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                              {t.logistics?.expired || "Expired"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {expiryData?.nearExpiry?.map((batch: any) => {
                        const daysLeft = batch.daysUntilExpiry || 0;
                        const urgency = daysLeft <= 7 ? "text-red-600" : daysLeft <= 14 ? "text-amber-600" : "text-yellow-600";
                        return (
                          <tr key={batch.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-2.5 px-3">{batch.itemName || "—"}</td>
                            <td className="py-2.5 px-3 font-mono text-xs">{batch.batchNumber}</td>
                            <td className="py-2.5 px-3 text-xs">{batch.warehouse || "—"}</td>
                            <td className="py-2.5 px-3 text-end font-mono">{batch.quantity}</td>
                            <td className="py-2.5 px-3">
                              {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "—"}
                            </td>
                            <td className={`py-2.5 px-3 text-center font-medium ${urgency}`}>
                              {daysLeft}{isRTL ? " يوم" : "d"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant="outline" className={
                                daysLeft <= 7 ? "bg-red-100 text-red-700 border-red-300" :
                                daysLeft <= 14 ? "bg-amber-100 text-amber-700 border-amber-300" :
                                "bg-yellow-100 text-yellow-700 border-yellow-300"
                              }>
                                {daysLeft <= 7 ? (isRTL ? "حرج" : "Critical") : daysLeft <= 14 ? (isRTL ? "تحذير" : "Warning") : (t.logistics?.nearExpiry || "Near Expiry")}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert History */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5" /> {isRTL ? "سجل التنبيهات" : "Alert History"}
              </CardTitle>
              <CardDescription>{isRTL ? "إشعارات الانتهاء المرسلة سابقاً" : "Previously sent expiry notifications"}</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-4 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading history..."}</div>
              ) : !alertHistory || alertHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? "لم يتم إرسال تنبيهات بعد" : "No alerts sent yet"}</p>
              ) : (
                <div className="space-y-3">
                  {alertHistory.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${alert.triggerType === "manual" ? "bg-blue-100" : "bg-green-100"}`}>
                          {alert.triggerType === "manual" ? (
                            <Send className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {isRTL ? `${alert.batchCount} دفعة تم الإبلاغ عنها` : `${alert.batchCount} batch${alert.batchCount !== 1 ? "es" : ""} reported`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.sentAt).toLocaleString()} · {alert.triggerType === "manual" ? (isRTL ? "يدوي" : "Manual") : (isRTL ? "مجدول" : "Scheduled")}
                            {alert.thresholdDays && ` · ${alert.thresholdDays}${isRTL ? " يوم" : "d"}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        alert.status === "sent" ? "bg-green-100 text-green-700 border-green-300" :
                        "bg-red-100 text-red-700 border-red-300"
                      }>
                        {alert.status === "sent" ? (isRTL ? "مرسل" : "Sent") : (isRTL ? "فشل" : "Failed")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
