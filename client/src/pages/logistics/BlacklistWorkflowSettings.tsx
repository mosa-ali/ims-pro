/**
 * Blacklist Workflow Settings Page
 * 
 * Organization-level configuration for the blacklist approval workflow:
 * - Customize approval stages (add/remove/reorder)
 * - Configure required roles per stage
 * - Signature requirements (submitter & approver)
 * - Auto-expiry settings
 * - Notification preferences
 * 
 * Full RTL/LTR support
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Trash2,
  GripVertical,
  Save,
  RotateCcw,
  ShieldCheck,
  Bell,
  Clock,
  PenTool,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";

// ── Types ──
interface WorkflowStage {
  key: string;
  label: string;
  labelAr: string;
  requiredRoles: string[];
  requireSignature: boolean;
}

// ── Available roles ──
const AVAILABLE_ROLES = [
  { key: "organization_admin", label: "Organization Admin", labelAr: "مدير المنظمة" },
  { key: "office_manager", label: "Office Manager", labelAr: "مدير المكتب" },
  { key: "project_manager", label: "Project Manager", labelAr: "مدير المشروع" },
  { key: "logistics_manager", label: "Logistics Manager", labelAr: "مدير اللوجستيات" },
  { key: "compliance_officer", label: "Compliance Officer", labelAr: "مسؤول الامتثال" },
  { key: "finance_manager", label: "Finance Manager", labelAr: "مدير المالية" },
  { key: "hr_manager", label: "HR Manager", labelAr: "مدير الموارد البشرية" },
  { key: "procurement_officer", label: "Procurement Officer", labelAr: "مسؤول المشتريات" },
];

// ── Duration options ──
const DURATION_OPTIONS = [
  { value: 0, label: "Permanent", labelAr: "دائم" },
  { value: 3, label: "3 Months", labelAr: "3 أشهر" },
  { value: 6, label: "6 Months", labelAr: "6 أشهر" },
  { value: 12, label: "12 Months", labelAr: "12 شهر" },
  { value: 24, label: "24 Months", labelAr: "24 شهر" },
  { value: 36, label: "36 Months", labelAr: "36 شهر" },
  { value: 60, label: "60 Months", labelAr: "60 شهر" },
];

export default function BlacklistWorkflowSettings() {
  const { language, isRTL } = useLanguage();

  // ── Fetch current config ──
  const { data: config, isLoading } = trpc.blacklist.getWorkflowConfig.useQuery();
  const updateConfig = trpc.blacklist.updateWorkflowConfig.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ── Local state ──
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [requireSubmitterSignature, setRequireSubmitterSignature] = useState(true);
  const [requireApproverSignature, setRequireApproverSignature] = useState(true);
  const [autoExpiryEnabled, setAutoExpiryEnabled] = useState(true);
  const [defaultDurationMonths, setDefaultDurationMonths] = useState(6);
  const [notifyOnSubmission, setNotifyOnSubmission] = useState(true);
  const [notifyOnApproval, setNotifyOnApproval] = useState(true);
  const [notifyOnRejection, setNotifyOnRejection] = useState(true);
  const [notifyOnExpiry, setNotifyOnExpiry] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // ── Sync from server ──
  useEffect(() => {
    if (config) {
      setStages(config.stages as WorkflowStage[]);
      setRequireSubmitterSignature(config.requireSubmitterSignature);
      setRequireApproverSignature(config.requireApproverSignature);
      setAutoExpiryEnabled(config.autoExpiryEnabled);
      setDefaultDurationMonths(config.defaultDurationMonths);
      setNotifyOnSubmission(config.notifyOnSubmission);
      setNotifyOnApproval(config.notifyOnApproval);
      setNotifyOnRejection(config.notifyOnRejection);
      setNotifyOnExpiry(config.notifyOnExpiry);
      setHasChanges(false);
    }
  }, [config]);

  // ── Stage management ──
  const addStage = () => {
    const newKey = `stage_${Date.now()}`;
    setStages([
      ...stages,
      {
        key: newKey,
        label: "New Stage",
        labelAr: "مرحلة جديدة",
        requiredRoles: ["organization_admin"],
        requireSignature: false,
      },
    ]);
    setHasChanges(true);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) {
      toast.error(isRTL ? "يجب أن يكون هناك مرحلة واحدة على الأقل" : "At least one stage is required");
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    const newStages = [...stages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    setStages(newStages);
    setHasChanges(true);
  };

  const updateStage = (index: number, updates: Partial<WorkflowStage>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updates };
    setStages(newStages);
    setHasChanges(true);
  };

  const toggleStageRole = (stageIndex: number, role: string) => {
    const stage = stages[stageIndex];
    const roles = stage.requiredRoles.includes(role)
      ? stage.requiredRoles.filter((r) => r !== role)
      : [...stage.requiredRoles, role];
    if (roles.length === 0) {
      toast.error(isRTL ? "يجب تحديد دور واحد على الأقل" : "At least one role is required");
      return;
    }
    updateStage(stageIndex, { requiredRoles: roles });
  };

  // ── Save handler ──
  const handleSave = () => {
    updateConfig.mutate({
      stages,
      requireSubmitterSignature,
      requireApproverSignature,
      autoExpiryEnabled,
      defaultDurationMonths,
      notifyOnSubmission,
      notifyOnApproval,
      notifyOnRejection,
      notifyOnExpiry,
    });
    setHasChanges(false);
  };

  // ── Reset handler ──
  const handleReset = () => {
    if (config) {
      setStages(config.stages as WorkflowStage[]);
      setRequireSubmitterSignature(config.requireSubmitterSignature);
      setRequireApproverSignature(config.requireApproverSignature);
      setAutoExpiryEnabled(config.autoExpiryEnabled);
      setDefaultDurationMonths(config.defaultDurationMonths);
      setNotifyOnSubmission(config.notifyOnSubmission);
      setNotifyOnApproval(config.notifyOnApproval);
      setNotifyOnRejection(config.notifyOnRejection);
      setNotifyOnExpiry(config.notifyOnExpiry);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Back button ── */}
      <BackButton
        href="/organization/logistics/evaluation-performance/blacklist"
        label={isRTL ? "العودة إلى إدارة القائمة السوداء" : "Back to Blacklist Management"}
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isRTL ? "إعدادات سير العمل" : "Workflow Settings"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? "تخصيص مراحل الموافقة والإعدادات لمنظمتك"
                : "Customize approval stages and settings for your organization"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              <span className={isRTL ? "mr-2" : "ml-2"}>
                {isRTL ? "إعادة تعيين" : "Reset"}
              </span>
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || updateConfig.isPending}>
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className={isRTL ? "mr-2" : "ml-2"}>
              {isRTL ? "حفظ الإعدادات" : "Save Settings"}
            </span>
          </Button>
        </div>
      </div>

      {/* ── Approval Stages ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {isRTL ? "مراحل الموافقة" : "Approval Stages"}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? "حدد مراحل سير عمل الموافقة والأدوار المطلوبة لكل مرحلة"
                  : "Define the approval workflow stages and required roles for each stage"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addStage}>
              <Plus className="w-4 h-4" />
              <span className={isRTL ? "mr-2" : "ml-2"}>
                {isRTL ? "إضافة مرحلة" : "Add Stage"}
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stages.map((stage, index) => (
            <div
              key={stage.key}
              className="border rounded-lg p-4 space-y-4 bg-muted/30"
            >
              {/* Stage header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline" className="font-mono">
                    {isRTL ? `مرحلة ${index + 1}` : `Stage ${index + 1}`}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveStage(index, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveStage(index, "down")}
                    disabled={index === stages.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeStage(index)}
                    disabled={stages.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Stage name fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم المرحلة (إنجليزي)" : "Stage Name (English)"}</Label>
                  <Input
                    value={stage.label}
                    onChange={(e) => updateStage(index, { label: e.target.value })}
                    placeholder="e.g., Validation"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم المرحلة (عربي)" : "Stage Name (Arabic)"}</Label>
                  <Input
                    value={stage.labelAr}
                    onChange={(e) => updateStage(index, { labelAr: e.target.value })}
                    placeholder="مثال: التحقق"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Required roles */}
              <div className="space-y-2">
                <Label>{isRTL ? "الأدوار المطلوبة" : "Required Roles"}</Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? "المستخدمون الذين لديهم أي من هذه الأدوار يمكنهم الموافقة في هذه المرحلة"
                    : "Users with any of these roles can approve at this stage"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = stage.requiredRoles.includes(role.key);
                    return (
                      <Badge
                        key={role.key}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => toggleStageRole(index, role.key)}
                      >
                        {isRTL ? role.labelAr : role.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Require signature toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    {isRTL ? "يتطلب توقيع رقمي" : "Require Digital Signature"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "يجب على المعتمد تقديم توقيع رقمي في هذه المرحلة"
                      : "Approver must provide a digital signature at this stage"}
                  </p>
                </div>
                <Switch
                  checked={stage.requireSignature}
                  onCheckedChange={(checked) =>
                    updateStage(index, { requireSignature: checked })
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Signature Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-primary" />
            {isRTL ? "إعدادات التوقيع" : "Signature Settings"}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? "تكوين متطلبات التوقيع الرقمي"
              : "Configure digital signature requirements"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>
                {isRTL ? "توقيع مقدم الطلب مطلوب" : "Submitter Signature Required"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "يجب على مقدم الطلب التوقيع عند تقديم حالة القائمة السوداء"
                  : "Submitter must sign when submitting a blacklist case"}
              </p>
            </div>
            <Switch
              checked={requireSubmitterSignature}
              onCheckedChange={(v) => {
                setRequireSubmitterSignature(v);
                setHasChanges(true);
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>
                {isRTL ? "توقيع المعتمد مطلوب" : "Approver Signature Required"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "يجب على المعتمد التوقيع عند الموافقة على حالة القائمة السوداء"
                  : "Approver must sign when approving a blacklist case"}
              </p>
            </div>
            <Switch
              checked={requireApproverSignature}
              onCheckedChange={(v) => {
                setRequireApproverSignature(v);
                setHasChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Expiry Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {isRTL ? "إعدادات انتهاء الصلاحية" : "Expiry Settings"}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? "تكوين الانتهاء التلقائي لحالات القائمة السوداء"
              : "Configure automatic expiry for blacklist cases"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>
                {isRTL ? "الانتهاء التلقائي" : "Auto-Expiry"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "تنتهي صلاحية الحالات المعتمدة تلقائيًا بعد تاريخ الانتهاء"
                  : "Approved cases automatically expire after the expiry date"}
              </p>
            </div>
            <Switch
              checked={autoExpiryEnabled}
              onCheckedChange={(v) => {
                setAutoExpiryEnabled(v);
                setHasChanges(true);
              }}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>
              {isRTL ? "المدة الافتراضية" : "Default Duration"}
            </Label>
            <Select
              value={String(defaultDurationMonths)}
              onValueChange={(v) => {
                setDefaultDurationMonths(Number(v));
                setHasChanges(true);
              }}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {isRTL ? opt.labelAr : opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "المدة الافتراضية عند إنشاء حالة قائمة سوداء جديدة"
                : "Default duration when creating a new blacklist case"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Notification Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {isRTL ? "إعدادات الإشعارات" : "Notification Settings"}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? "تكوين متى يتم إرسال الإشعارات"
              : "Configure when notifications are sent"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{isRTL ? "عند التقديم" : "On Submission"}</Label>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "إرسال إشعار عند تقديم حالة جديدة"
                  : "Send notification when a new case is submitted"}
              </p>
            </div>
            <Switch
              checked={notifyOnSubmission}
              onCheckedChange={(v) => {
                setNotifyOnSubmission(v);
                setHasChanges(true);
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{isRTL ? "عند الموافقة" : "On Approval"}</Label>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "إرسال إشعار عند الموافقة على حالة"
                  : "Send notification when a case is approved"}
              </p>
            </div>
            <Switch
              checked={notifyOnApproval}
              onCheckedChange={(v) => {
                setNotifyOnApproval(v);
                setHasChanges(true);
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{isRTL ? "عند الرفض" : "On Rejection"}</Label>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "إرسال إشعار عند رفض حالة"
                  : "Send notification when a case is rejected"}
              </p>
            </div>
            <Switch
              checked={notifyOnRejection}
              onCheckedChange={(v) => {
                setNotifyOnRejection(v);
                setHasChanges(true);
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{isRTL ? "عند انتهاء الصلاحية" : "On Expiry"}</Label>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "إرسال إشعار عند انتهاء صلاحية حالة تلقائيًا"
                  : "Send notification when a case automatically expires"}
              </p>
            </div>
            <Switch
              checked={notifyOnExpiry}
              onCheckedChange={(v) => {
                setNotifyOnExpiry(v);
                setHasChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Workflow Preview ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isRTL ? "معاينة سير العمل" : "Workflow Preview"}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? "معاينة مراحل سير العمل المكوّنة"
              : "Preview the configured workflow stages"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Draft */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1">
                {isRTL ? "مسودة" : "Draft"}
              </Badge>
              <span className="text-muted-foreground">→</span>
            </div>
            {/* Submitted */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 border-blue-500 text-blue-600">
                {isRTL ? "مقدم" : "Submitted"}
              </Badge>
              <span className="text-muted-foreground">→</span>
            </div>
            {/* Dynamic stages */}
            {stages.map((stage, index) => (
              <div key={stage.key} className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="px-3 py-1 border-purple-500 text-purple-600"
                >
                  {isRTL ? stage.labelAr : stage.label}
                  {stage.requireSignature && (
                    <PenTool className="w-3 h-3 inline-block ms-1" />
                  )}
                </Badge>
                <span className="text-muted-foreground">→</span>
              </div>
            ))}
            {/* Approved */}
            <Badge className="px-3 py-1 bg-green-600 text-white">
              {isRTL ? "معتمد" : "Approved"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {isRTL
              ? "يمكن رفض الحالات في أي مرحلة بعد التقديم. الحالات المعتمدة يمكن إلغاؤها."
              : "Cases can be rejected at any stage after submission. Approved cases can be revoked."}
          </p>
        </CardContent>
      </Card>

      {/* ── Sticky save bar ── */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex items-center justify-center gap-4 z-50 shadow-lg">
          <p className="text-sm text-muted-foreground">
            {isRTL ? "لديك تغييرات غير محفوظة" : "You have unsaved changes"}
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            <span className={isRTL ? "mr-1" : "ml-1"}>
              {isRTL ? "إعادة تعيين" : "Reset"}
            </span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className={isRTL ? "mr-1" : "ml-1"}>
              {isRTL ? "حفظ" : "Save"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
