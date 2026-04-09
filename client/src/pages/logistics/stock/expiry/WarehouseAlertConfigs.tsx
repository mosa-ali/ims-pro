/**
 * Warehouse-Level Alert Configuration
 * Allows setting custom expiry thresholds per warehouse/category
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Warehouse, Bell, Clock,
  CheckCircle2, Loader2, AlertTriangle, Settings2, ShieldCheck
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";

interface AlertConfig {
  id: number;
  warehouseId: number | null;
  warehouseName: string;
  category: string | null;
  thresholdDays: number;
  frequency: string;
  enabled: number;
  notifyEmail: number;
  notifyInApp: number;
  lastAlertSentAt: number | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function WarehouseAlertConfigs() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AlertConfig | null>(null);

  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [thresholdDays, setThresholdDays] = useState("30");
  const [frequency, setFrequency] = useState("daily");
  const [enabled, setEnabled] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyInApp, setNotifyInApp] = useState(true);

  const utils = trpc.useUtils();

  const { data: configs, isLoading } = trpc.logistics.stockMgmt.warehouseAlertConfigs.list.useQuery();
  const { data: warehouses } = trpc.logistics.stockMgmt.warehouseAlertConfigs.getWarehouses.useQuery();
  const { data: categories } = trpc.logistics.stockMgmt.warehouseAlertConfigs.getCategories.useQuery();

  const upsert = trpc.logistics.stockMgmt.warehouseAlertConfigs.upsert.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.action === "created" ? (isRTL ? "تم إنشاء إعداد التنبيه" : "Alert config created") : (isRTL ? "تم تحديث إعداد التنبيه" : "Alert config updated"));
      utils.logistics.stockMgmt.warehouseAlertConfigs.list.invalidate();
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteConfig = trpc.logistics.stockMgmt.warehouseAlertConfigs.delete.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم حذف إعداد التنبيه" : "Alert config deleted");
      utils.logistics.stockMgmt.warehouseAlertConfigs.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setShowForm(false); setEditingConfig(null); setWarehouseName(""); setWarehouseId(null);
    setCategory(""); setThresholdDays("30"); setFrequency("daily"); setEnabled(true);
    setNotifyEmail(false); setNotifyInApp(true);
  };

  const openEdit = (config: AlertConfig) => {
    setEditingConfig(config); setWarehouseName(config.warehouseName); setWarehouseId(config.warehouseId);
    setCategory(config.category || ""); setThresholdDays(String(config.thresholdDays));
    setFrequency(config.frequency); setEnabled(!!config.enabled); setNotifyEmail(!!config.notifyEmail);
    setNotifyInApp(!!config.notifyInApp); setShowForm(true);
  };

  const handleSubmit = () => {
    if (!warehouseName.trim()) { toast.error(isRTL ? "اسم المستودع مطلوب" : "Warehouse name is required"); return; }
    upsert.mutate({
      id: editingConfig?.id, warehouseId, warehouseName: warehouseName.trim(),
      category: category.trim() || null, thresholdDays: parseInt(thresholdDays),
      frequency: frequency as any, enabled, notifyEmail, notifyInApp,
    });
  };

  const handleWarehouseSelect = (name: string) => {
    setWarehouseName(name);
    const wh = warehouses?.find((w: any) => w.warehouseName === name);
    setWarehouseId(wh?.warehouseId || null);
  };

  const enabledCount = configs?.filter((c: any) => c.enabled).length || 0;
  const totalCount = configs?.length || 0;

  const frequencyLabels: Record<string, string> = {
    daily: isRTL ? "يومي" : "Daily",
    weekly: isRTL ? "أسبوعي" : "Weekly",
    biweekly: isRTL ? "نصف شهري" : "Bi-weekly",
    monthly: isRTL ? "شهري" : "Monthly",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <BackButton href="/organization/logistics/stock/scheduled-alerts" label={t.logistics?.scheduledAlerts || "Back to Scheduled Alerts"} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{t.logistics?.warehouseAlertConfig || "Warehouse Alert Configuration"}</h1>
          <p className="text-sm text-muted-foreground">{t.logistics?.warehouseAlertConfigDesc || "Set custom expiry thresholds per warehouse and item category"}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة إعداد" : "Add Configuration"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Settings2 className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الإعدادات" : "Total Configs"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-green-600">{enabledCount}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "نشط" : "Active"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Warehouse className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{warehouses?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t.logistics?.warehouses || "Warehouses"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          {isRTL ? "جاري تحميل الإعدادات..." : "Loading configurations..."}
        </div>
      ) : !configs || configs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Settings2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-lg font-medium">{isRTL ? "لا توجد إعدادات تنبيه" : "No Alert Configurations"}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {isRTL ? "أنشئ إعدادات تنبيه مخصصة لكل مستودع. مثلاً: المستلزمات الطبية ٩٠ يوم، المواد الغذائية ٣٠ يوم." : "Create warehouse-specific alert configurations to set custom expiry thresholds. For example, medical supplies at 90 days, food items at 30 days."}
            </p>
            <Button className="mt-4" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 me-2" /> {isRTL ? "إنشاء أول إعداد" : "Create First Config"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config: any) => (
            <Card key={config.id} className={`transition-all ${config.enabled ? "border-green-200 bg-green-50/30" : "opacity-60"}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{config.warehouseName}</CardTitle>
                  </div>
                  <Badge variant="outline" className={config.enabled ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-500 border-gray-300"}>
                    {config.enabled ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Disabled")}
                  </Badge>
                </div>
                {config.category && <Badge variant="secondary" className="w-fit text-xs mt-1">{config.category}</Badge>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "الحد" : "Threshold"}</p>
                    <p className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      {config.thresholdDays} {isRTL ? "يوم" : "days"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "التكرار" : "Frequency"}</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      {frequencyLabels[config.frequency] || config.frequency}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {config.notifyInApp ? <span className="flex items-center gap-1"><Bell className="h-3 w-3" /> {isRTL ? "داخل التطبيق" : "In-App"}</span> : null}
                  {config.notifyEmail ? <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {isRTL ? "بريد إلكتروني" : "Email"}</span> : null}
                  {config.lastAlertSentAt && <span>{isRTL ? "آخر:" : "Last:"} {new Date(config.lastAlertSentAt).toLocaleDateString()}</span>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(config)}>
                    <Pencil className="h-3.5 w-3.5 me-1" /> {isRTL ? "تعديل" : "Edit"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50"
                    onClick={() => { if (confirm(isRTL ? "حذف هذا الإعداد؟" : "Delete this alert configuration?")) deleteConfig.mutate({ id: config.id }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingConfig ? (isRTL ? "تعديل إعداد التنبيه" : "Edit Alert Configuration") : (isRTL ? "إعداد تنبيه جديد" : "New Alert Configuration")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t.logistics?.warehouse || "Warehouse"}</Label>
              {warehouses && warehouses.length > 0 ? (
                <Select value={warehouseName} onValueChange={handleWarehouseSelect}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder={isRTL ? "اختر المستودع..." : "Select warehouse..."} /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh: any) => (
                      <SelectItem key={wh.warehouseName || wh.warehouseId} value={wh.warehouseName || "Unknown"}>{wh.warehouseName || "Unknown"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} placeholder={isRTL ? "مثال: المستودع الرئيسي" : "e.g., Main Warehouse"} className="mt-1.5" />
              )}
            </div>
            <div>
              <Label>{isRTL ? "فئة الصنف (اختياري)" : "Item Category (optional)"}</Label>
              {categories && categories.length > 0 ? (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder={isRTL ? "جميع الفئات" : "All categories"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_categories">{isRTL ? "جميع الفئات" : "All Categories"}</SelectItem>
                    {categories.map((cat: string) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={isRTL ? "مثال: مستلزمات طبية" : "e.g., Medical Supplies"} className="mt-1.5" />
              )}
              <p className="text-xs text-muted-foreground mt-1">{isRTL ? "اتركه فارغاً لتطبيقه على جميع الأصناف" : "Leave empty to apply to all items in this warehouse"}</p>
            </div>
            <div>
              <Label>{isRTL ? "حد الانتهاء (أيام قبل الانتهاء)" : "Expiry Threshold (days before expiry)"}</Label>
              <Select value={thresholdDays} onValueChange={setThresholdDays}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{isRTL ? "٧ أيام" : "7 days"}</SelectItem>
                  <SelectItem value="14">{isRTL ? "١٤ يوم" : "14 days"}</SelectItem>
                  <SelectItem value="30">{isRTL ? "٣٠ يوم (افتراضي)" : "30 days (default)"}</SelectItem>
                  <SelectItem value="60">{isRTL ? "٦٠ يوم" : "60 days"}</SelectItem>
                  <SelectItem value="90">{isRTL ? "٩٠ يوم" : "90 days"}</SelectItem>
                  <SelectItem value="120">{isRTL ? "١٢٠ يوم" : "120 days"}</SelectItem>
                  <SelectItem value="180">{isRTL ? "١٨٠ يوم (٦ أشهر)" : "180 days (6 months)"}</SelectItem>
                  <SelectItem value="365">{isRTL ? "٣٦٥ يوم (سنة)" : "365 days (1 year)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isRTL ? "تكرار التنبيه" : "Alert Frequency"}</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{isRTL ? "يومي" : "Daily"}</SelectItem>
                  <SelectItem value="weekly">{isRTL ? "أسبوعي" : "Weekly"}</SelectItem>
                  <SelectItem value="biweekly">{isRTL ? "نصف شهري" : "Bi-weekly"}</SelectItem>
                  <SelectItem value="monthly">{isRTL ? "شهري" : "Monthly"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{isRTL ? "مفعّل" : "Enabled"}</Label>
                  <p className="text-xs text-muted-foreground">{isRTL ? "التنبيهات النشطة ستُرسل حسب الجدول" : "Active alerts will be sent on schedule"}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{isRTL ? "إشعار داخل التطبيق" : "In-App Notification"}</Label>
                  <p className="text-xs text-muted-foreground">{isRTL ? "إرسال إلى مركز إشعارات المالك" : "Send to owner notification center"}</p>
                </div>
                <Switch checked={notifyInApp} onCheckedChange={setNotifyInApp} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>{t.common?.cancel || "Cancel"}</Button>
            <Button onClick={handleSubmit} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
              {editingConfig ? (isRTL ? "تحديث" : "Update") : (isRTL ? "إنشاء" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
