/**
 * Approval Workflow Page
 * Simplified 2-Stage: Logistics Review → Manager Approval
 * With digital signature capture (canvas-based), timestamps, and verification QR codes
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  GitBranch,
  CheckCircle,
  XCircle,
  ArrowRight,
  FileText,
  Send,
  ClipboardCheck,
  Award,
  Eye,
  AlertTriangle,
  PenTool,
  Eraser,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { BackButton } from "@/components/BackButton";
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

// ─── Simplified Workflow Stages ───────────────────────────────────────────────
const WORKFLOW_STAGES = [
  { key: 'draft', status: 'draft', label: 'Draft', labelAr: 'مسودة', icon: FileText, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  { key: 'logistics', status: 'pending_logistics', label: 'Logistics Review', labelAr: 'مراجعة اللوجستيات', icon: ClipboardCheck, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { key: 'manager', status: 'pending_manager', label: 'Manager Approval', labelAr: 'موافقة المدير', icon: Award, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { key: 'completed', status: 'approved', label: 'Approved', labelAr: 'معتمد', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
];

function getStageIndex(approvalStatus: string): number {
  const idx = WORKFLOW_STAGES.findIndex(s => s.status === approvalStatus);
  return idx >= 0 ? idx : 0;
}

function getStageStatus(approvalStatus: string, stageKey: string): 'completed' | 'current' | 'pending' {
  const currentIdx = getStageIndex(approvalStatus);
  const stageIdx = WORKFLOW_STAGES.findIndex(s => s.key === stageKey);
  if (stageIdx < currentIdx) return 'completed';
  if (stageIdx === currentIdx) return 'current';
  return 'pending';
}

// ─── Signature Canvas Component ───────────────────────────────────────────────
function SignatureCanvas({
  onConfirm,
  onCancel,
  isRTL,
}: {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
  isRTL: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e);
    hasDrawnRef.current = true;
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  }, [getPos]);

  const stopDraw = useCallback(() => { isDrawingRef.current = false; }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  };

  const confirmSignature = () => {
    if (!hasDrawnRef.current) {
      toast.error(isRTL ? 'يرجى رسم التوقيع أولاً' : 'Please draw your signature first');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    onConfirm(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-primary/30 rounded-lg p-1 bg-white">
        <canvas
          ref={canvasRef}
          width={560}
          height={180}
          className="w-full cursor-crosshair touch-none rounded"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {isRTL ? 'ارسم توقيعك في المربع أعلاه' : 'Draw your signature in the box above'}
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          <Eraser className="h-4 w-4 me-1" />
          {isRTL ? 'مسح' : 'Clear'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button size="sm" onClick={confirmSignature} className="bg-green-600 hover:bg-green-700">
          <PenTool className="h-4 w-4 me-1" />
          {isRTL ? 'تأكيد التوقيع' : 'Confirm Signature'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ApprovalWorkflow() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentLoc] = useLocation();
  const isFinanceContext = currentLoc.includes('/finance/');
  const evalBackPath = isFinanceContext ? '/organization/finance/vendors/evaluation' : '/organization/logistics/evaluation-performance';
  const qualListPath = isFinanceContext ? '/organization/finance/vendors/evaluation/qualification-list' : '/organization/logistics/evaluation-performance/qualification-list';

  const [activeTab, setActiveTab] = useState('all');
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [signatureMode, setSignatureMode] = useState<{ qualId: number; action: 'submit' | 'approve' } | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<Record<number, string>>({});

  // Fetch all qualifications for approval
  const qualsQuery = trpc.vendors.listQualificationsForApproval.useQuery({ status: undefined });
  const qualifications = (qualsQuery.data || []) as any[];

  const utils = trpc.useUtils();

  // Submit for approval mutation
  const submitMutation = trpc.vendors.submitForApproval.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال التأهيل للموافقة' : 'Qualification submitted for approval');
      utils.vendors.listQualificationsForApproval.invalidate();
      setSignatureMode(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Approve stage mutation
  const approveMutation = trpc.vendors.approveQualificationStage.useMutation({
    onSuccess: (data) => {
      const stageLabels: Record<string, string> = {
        'pending_manager': isRTL ? 'تمت موافقة اللوجستيات → المدير' : 'Logistics approved → Manager',
        'approved': isRTL ? 'تمت الموافقة النهائية' : 'Final approval granted',
      };
      toast.success(stageLabels[data.nextStatus] || (isRTL ? 'تمت الموافقة' : 'Approved'));
      utils.vendors.listQualificationsForApproval.invalidate();
      setSignatureMode(null);
      setDetailDialog(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Reject mutation
  const rejectMutation = trpc.vendors.rejectQualificationStage.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? 'تم رفض التأهيل' : 'Qualification rejected');
      setRejectDialog(null);
      setRejectReason('');
      utils.vendors.listQualificationsForApproval.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Group by approval status
  const drafts = qualifications.filter(q => q.approvalStatus === 'draft');
  const pendingLogistics = qualifications.filter(q => q.approvalStatus === 'pending_logistics');
  const pendingManager = qualifications.filter(q => q.approvalStatus === 'pending_manager');
  const approved = qualifications.filter(q => q.approvalStatus === 'approved');
  const rejected = qualifications.filter(q => q.approvalStatus === 'rejected');
  const allPending = [...pendingLogistics, ...pendingManager];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string, labelAr: string, variant: string, className: string }> = {
      'draft': { label: 'Draft', labelAr: 'مسودة', variant: 'secondary', className: '' },
      'pending_logistics': { label: 'Logistics Review', labelAr: 'مراجعة اللوجستيات', variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      'pending_manager': { label: 'Manager Approval', labelAr: 'موافقة المدير', variant: 'outline', className: 'bg-amber-50 text-amber-700 border-amber-200' },
      'approved': { label: 'Approved', labelAr: 'معتمد', variant: 'outline', className: 'bg-green-50 text-green-700 border-green-200' },
      'rejected': { label: 'Rejected', labelAr: 'مرفوض', variant: 'destructive', className: '' },
    };
    const info = map[status] || { label: status, labelAr: status, variant: 'secondary', className: '' };
    return <Badge variant={info.variant as any} className={info.className}>{isRTL ? info.labelAr : info.label}</Badge>;
  };

  const getQualStatusBadge = (status: string) => {
    const map: Record<string, { label: string, labelAr: string, className: string }> = {
      'qualified': { label: 'Qualified', labelAr: 'مؤهل', className: 'bg-green-100 text-green-700 border-green-300' },
      'conditional': { label: 'Conditional', labelAr: 'مشروط', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      'not_qualified': { label: 'Not Qualified', labelAr: 'غير مؤهل', className: 'bg-red-100 text-red-700 border-red-300' },
    };
    const info = map[status] || { label: status, labelAr: status, className: '' };
    return <Badge variant="outline" className={info.className}>{isRTL ? info.labelAr : info.label}</Badge>;
  };

  const canApproveAtStage = (approvalStatus: string): boolean => {
    return ['pending_logistics', 'pending_manager'].includes(approvalStatus);
  };

  const handleSignatureConfirm = (dataUrl: string) => {
    if (!signatureMode) return;
    if (signatureMode.action === 'submit') {
      submitMutation.mutate({ qualificationId: signatureMode.qualId, signatureDataUrl: dataUrl });
    } else {
      approveMutation.mutate({
        qualificationId: signatureMode.qualId,
        notes: approvalNotes[signatureMode.qualId] || '',
        signatureDataUrl: dataUrl,
      });
    }
  };

  const renderWorkflowStepper = (approvalStatus: string) => (
    <div className="flex items-center gap-1 flex-wrap">
      {WORKFLOW_STAGES.map((stage, idx) => {
        const status = getStageStatus(approvalStatus, stage.key);
        const Icon = stage.icon;
        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
              status === 'current' ? `${stage.bgColor} ${stage.color}` :
              'bg-muted text-muted-foreground'
            }`}>
              {status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{isRTL ? stage.labelAr : stage.label}</span>
            </div>
            {idx < WORKFLOW_STAGES.length - 1 && (
              <ArrowRight className={`h-3 w-3 ${status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderQualificationRow = (qual: any, showActions: boolean) => (
    <TableRow key={qual.id}>
      <TableCell>
        <div>
          <p className="font-medium">{qual.vendorName}</p>
          <p className="text-xs text-muted-foreground">{qual.vendorCode}</p>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="font-bold">{qual.totalScore}/30</span>
      </TableCell>
      <TableCell className="text-center">
        {getQualStatusBadge(qual.qualificationStatus)}
      </TableCell>
      <TableCell className="text-center">
        {getStatusBadge(qual.approvalStatus)}
      </TableCell>
      <TableCell>
        <div className="min-w-[260px]">
          {renderWorkflowStepper(qual.approvalStatus)}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {qual.expiryDate ? new Date(qual.expiryDate).toLocaleDateString() : '—'}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailDialog(qual)}>
            <Eye className="h-3 w-3 me-1" />
            {isRTL ? 'تفاصيل' : 'Details'}
          </Button>
          {showActions && qual.approvalStatus === 'draft' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => submitMutation.mutate({ qualificationId: qual.id })}
                disabled={submitMutation.isPending}
              >
                <Send className="h-3 w-3 me-1" />
                {isRTL ? 'إرسال' : 'Submit'}
              </Button>
              <Button
                size="sm"
                onClick={() => setSignatureMode({ qualId: qual.id, action: 'submit' })}
                disabled={submitMutation.isPending}
              >
                <PenTool className="h-3 w-3 me-1" />
                {isRTL ? 'إرسال بتوقيع' : 'Submit & Sign'}
              </Button>
            </>
          )}
          {showActions && canApproveAtStage(qual.approvalStatus) && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setSignatureMode({ qualId: qual.id, action: 'approve' })}
                disabled={approveMutation.isPending}
              >
                <PenTool className="h-3 w-3 me-1" />
                {isRTL ? 'موافقة وتوقيع' : 'Approve & Sign'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => { setRejectDialog(qual); setRejectReason(''); }}
              >
                <XCircle className="h-3 w-3 me-1" />
                {isRTL ? 'رفض' : 'Reject'}
              </Button>
            </>
          )}
          {showActions && qual.approvalStatus === 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => submitMutation.mutate({ qualificationId: qual.id })}
              disabled={submitMutation.isPending}
            >
              <Send className="h-3 w-3 me-1" />
              {isRTL ? 'إعادة إرسال' : 'Resubmit'}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderTable = (items: any[], showActions: boolean) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isRTL ? 'المورد' : 'Vendor'}</TableHead>
            <TableHead className="text-center">{isRTL ? 'النتيجة' : 'Score'}</TableHead>
            <TableHead className="text-center">{isRTL ? 'حالة التأهيل' : 'Qualification'}</TableHead>
            <TableHead className="text-center">{isRTL ? 'حالة الموافقة' : 'Approval Status'}</TableHead>
            <TableHead>{isRTL ? 'مراحل سير العمل' : 'Workflow Stages'}</TableHead>
            <TableHead className="text-center">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</TableHead>
            <TableHead className="text-center">{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {isRTL ? 'لا توجد سجلات' : 'No records found'}
              </TableCell>
            </TableRow>
          ) : (
            items.map(q => renderQualificationRow(q, showActions))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href={evalBackPath}>
              <BackButton label={isRTL ? 'العودة للتقييم والأداء' : 'Back to Evaluation & Performance'} />
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-violet-500 p-3 rounded-lg text-white">
                <GitBranch className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isRTL ? 'سير عمل الموافقة' : 'Approval Workflow'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isRTL
                    ? 'مراجعة اللوجستيات → موافقة المدير'
                    : 'Logistics Review → Manager Approval'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('all')}>
            <CardContent className="pt-4 pb-4 text-center">
              <FileText className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-2xl font-bold">{qualifications.length}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'الكل' : 'All'}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('draft')}>
            <CardContent className="pt-4 pb-4 text-center">
              <FileText className="h-5 w-5 text-gray-500 mx-auto mb-1" />
              <div className="text-2xl font-bold">{drafts.length}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'مسودة' : 'Draft'}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 cursor-pointer hover:shadow-md" onClick={() => setActiveTab('logistics')}>
            <CardContent className="pt-4 pb-4 text-center">
              <ClipboardCheck className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-700">{pendingLogistics.length}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'اللوجستيات' : 'Logistics'}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 cursor-pointer hover:shadow-md" onClick={() => setActiveTab('manager')}>
            <CardContent className="pt-4 pb-4 text-center">
              <Award className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-amber-700">{pendingManager.length}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'المدير' : 'Manager'}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 cursor-pointer hover:shadow-md" onClick={() => setActiveTab('approved')}>
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700">{approved.length}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'معتمد' : 'Approved'}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 cursor-pointer hover:shadow-md" onClick={() => setActiveTab('rejected')}>
            <CardContent className="pt-4 pb-4 text-center">
              <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700">{rejected.length}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'مرفوض' : 'Rejected'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">{isRTL ? 'الكل' : 'All'} ({qualifications.length})</TabsTrigger>
            <TabsTrigger value="pending">{isRTL ? 'معلق' : 'Pending'} ({allPending.length})</TabsTrigger>
            <TabsTrigger value="draft">{isRTL ? 'مسودة' : 'Draft'} ({drafts.length})</TabsTrigger>
            <TabsTrigger value="logistics">{isRTL ? 'اللوجستيات' : 'Logistics'} ({pendingLogistics.length})</TabsTrigger>
            <TabsTrigger value="manager">{isRTL ? 'المدير' : 'Manager'} ({pendingManager.length})</TabsTrigger>
            <TabsTrigger value="approved">{isRTL ? 'معتمد' : 'Approved'} ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">{isRTL ? 'مرفوض' : 'Rejected'} ({rejected.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {renderTable(qualifications, true)}
          </TabsContent>
          <TabsContent value="pending">
            {renderTable(allPending, true)}
          </TabsContent>
          <TabsContent value="draft">
            {renderTable(drafts, true)}
          </TabsContent>
          <TabsContent value="logistics">
            {renderTable(pendingLogistics, true)}
          </TabsContent>
          <TabsContent value="manager">
            {renderTable(pendingManager, true)}
          </TabsContent>
          <TabsContent value="approved">
            {renderTable(approved, false)}
          </TabsContent>
          <TabsContent value="rejected">
            {renderTable(rejected, true)}
          </TabsContent>
        </Tabs>

        {qualifications.length === 0 && (
          <Card className="border-dashed mt-4">
            <CardContent className="py-12 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-2">
                {isRTL ? 'لا توجد تأهيلات في سير العمل' : 'No qualifications in workflow'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {isRTL ? 'أنشئ تأهيلاً من قائمة التأهيل لبدء سير العمل' : 'Create a qualification from the Checklist to start the workflow'}
              </p>
              <Button onClick={() => navigate(qualListPath)}>
                {isRTL ? 'الذهاب لقائمة التأهيل' : 'Go to Qualification List'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Signature Dialog ─── */}
      <Dialog open={!!signatureMode} onOpenChange={(open) => !open && setSignatureMode(null)}>
        <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              {signatureMode?.action === 'submit'
                ? (isRTL ? 'توقيع المُرسِل' : 'Submitter Signature')
                : (isRTL ? 'توقيع الموافقة' : 'Approval Signature')}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'يرجى رسم توقيعك أدناه للتأكيد. سيتم تسجيل الطابع الزمني وإنشاء رمز QR للتحقق.'
                : 'Please draw your signature below to confirm. A timestamp and verification QR code will be generated.'}
            </DialogDescription>
          </DialogHeader>

          {signatureMode?.action === 'approve' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isRTL ? 'ملاحظات الموافقة (اختياري)' : 'Approval Notes (optional)'}
              </label>
              <Textarea
                placeholder={isRTL ? 'ملاحظات...' : 'Notes...'}
                value={approvalNotes[signatureMode.qualId] || ''}
                onChange={(e) => setApprovalNotes(prev => ({ ...prev, [signatureMode.qualId]: e.target.value }))}
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          <SignatureCanvas
            onConfirm={handleSignatureConfirm}
            onCancel={() => setSignatureMode(null)}
            isRTL={isRTL}
          />

          {(submitMutation.isPending || approveMutation.isPending) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              {isRTL ? 'جاري المعالجة...' : 'Processing...'}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isRTL ? 'تفاصيل التأهيل' : 'Qualification Details'}
            </DialogTitle>
            <DialogDescription>
              {detailDialog?.vendorName} ({detailDialog?.vendorCode})
            </DialogDescription>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-5">
              {/* Score & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{isRTL ? 'النتيجة الإجمالية' : 'Total Score'}</p>
                  <p className="text-2xl font-bold">{detailDialog.totalScore}/30</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{isRTL ? 'حالة التأهيل' : 'Qualification Status'}</p>
                  <div className="mt-1">{getQualStatusBadge(detailDialog.qualificationStatus)}</div>
                </div>
              </div>

              {/* Workflow Progress */}
              <div>
                <p className="text-sm font-medium mb-2">{isRTL ? 'مراحل سير العمل' : 'Workflow Progress'}</p>
                {renderWorkflowStepper(detailDialog.approvalStatus)}
              </div>

              <Separator />

              {/* Approval History with Signatures */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">{isRTL ? 'سجل الموافقات والتوقيعات' : 'Approval History & Signatures'}</p>

                {/* Logistics Stage */}
                {detailDialog.logisticsApprovedAt && (
                  <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{isRTL ? 'مراجعة اللوجستيات' : 'Logistics Review'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(detailDialog.logisticsApprovedAt).toLocaleString()}
                      </div>
                    </div>
                    {detailDialog.logisticsNotes && (
                      <p className="text-sm text-muted-foreground">{detailDialog.logisticsNotes}</p>
                    )}
                    {detailDialog.logisticsSignatureUrl && (
                      <div className="flex items-start gap-4">
                        <div className="border rounded bg-white p-2">
                          <img src={detailDialog.logisticsSignatureUrl} alt="Logistics Signature" className="h-16 w-auto" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <ShieldCheck className="h-3 w-3" />
                            {isRTL ? 'توقيع موثق' : 'Verified Signature'}
                          </div>
                          {detailDialog.logisticsSignatureHash && (
                            <QRCodeSVG
                              value={JSON.stringify({
                                type: 'qual_approval',
                                qualId: detailDialog.id,
                                stage: 'logistics',
                                hash: detailDialog.logisticsSignatureHash.substring(0, 16),
                                ts: detailDialog.logisticsApprovedAt,
                              })}
                              size={64}
                              level="M"
                            />
                          )}
                          <p className="text-[10px] text-muted-foreground font-mono break-all max-w-[200px]">
                            SHA-256: {detailDialog.logisticsSignatureHash?.substring(0, 16)}...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manager Stage */}
                {detailDialog.managerApprovedAt && (
                  <div className="border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium">{isRTL ? 'موافقة المدير' : 'Manager Approval'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(detailDialog.managerApprovedAt).toLocaleString()}
                      </div>
                    </div>
                    {detailDialog.managerNotes && (
                      <p className="text-sm text-muted-foreground">{detailDialog.managerNotes}</p>
                    )}
                    {detailDialog.managerSignatureUrl && (
                      <div className="flex items-start gap-4">
                        <div className="border rounded bg-white p-2">
                          <img src={detailDialog.managerSignatureUrl} alt="Manager Signature" className="h-16 w-auto" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <ShieldCheck className="h-3 w-3" />
                            {isRTL ? 'توقيع موثق' : 'Verified Signature'}
                          </div>
                          {detailDialog.managerSignatureHash && (
                            <QRCodeSVG
                              value={JSON.stringify({
                                type: 'qual_approval',
                                qualId: detailDialog.id,
                                stage: 'manager',
                                hash: detailDialog.managerSignatureHash.substring(0, 16),
                                ts: detailDialog.managerApprovedAt,
                              })}
                              size={64}
                              level="M"
                            />
                          )}
                          <p className="text-[10px] text-muted-foreground font-mono break-all max-w-[200px]">
                            SHA-256: {detailDialog.managerSignatureHash?.substring(0, 16)}...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!detailDialog.logisticsApprovedAt && !detailDialog.managerApprovedAt && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isRTL ? 'لا يوجد سجل موافقات بعد' : 'No approval history yet'}
                  </p>
                )}
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'تاريخ التقييم' : 'Evaluation Date'}</p>
                  <p>{detailDialog.evaluationDate ? new Date(detailDialog.evaluationDate).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                  <p>{detailDialog.expiryDate ? new Date(detailDialog.expiryDate).toLocaleDateString() : '—'}</p>
                </div>
              </div>

              {/* Inline approval actions for pending items */}
              {canApproveAtStage(detailDialog.approvalStatus) && (
                <div className="border-t pt-3 space-y-2">
                  <Textarea
                    placeholder={isRTL ? 'ملاحظات الموافقة (اختياري)...' : 'Approval notes (optional)...'}
                    value={approvalNotes[detailDialog.id] || ''}
                    onChange={(e) => setApprovalNotes(prev => ({ ...prev, [detailDialog.id]: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setDetailDialog(null);
                        setSignatureMode({ qualId: detailDialog.id, action: 'approve' });
                      }}
                    >
                      <PenTool className="h-3 w-3 me-1" />
                      {isRTL ? 'موافقة وتوقيع' : 'Approve & Sign'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDetailDialog(null);
                        setRejectDialog(detailDialog);
                        setRejectReason('');
                      }}
                    >
                      <XCircle className="h-3 w-3 me-1" />
                      {isRTL ? 'رفض' : 'Reject'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ─── */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {isRTL ? 'رفض التأهيل' : 'Reject Qualification'}
            </DialogTitle>
            <DialogDescription>
              {rejectDialog?.vendorName} ({rejectDialog?.vendorCode})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'يرجى تقديم سبب الرفض (مطلوب):' : 'Please provide a rejection reason (required):'}
            </p>
            <Textarea
              placeholder={isRTL ? 'سبب الرفض...' : 'Rejection reason...'}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast.error(isRTL ? 'سبب الرفض مطلوب' : 'Rejection reason is required');
                  return;
                }
                rejectMutation.mutate({
                  qualificationId: rejectDialog.id,
                  notes: rejectReason,
                });
              }}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              <XCircle className="h-3 w-3 me-1" />
              {isRTL ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
