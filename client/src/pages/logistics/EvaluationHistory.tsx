/**
 * Evaluation History Page
 * Track evaluator, date, score changes, version history
 * Reads from vendor_qualification_scores (logistics qualification data)
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  History,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { BackButton } from "@/components/BackButton";

function getClassification(scorePercentage: number) {
  if (scorePercentage >= 85) return { label: 'Preferred', labelAr: 'مفضل', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
  if (scorePercentage >= 70) return { label: 'Approved', labelAr: 'معتمد', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
  if (scorePercentage >= 50) return { label: 'Conditional', labelAr: 'مشروط', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' };
  return { label: 'Rejected', labelAr: 'مرفوض', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
}

function getApprovalStatusLabel(status: string, isRTL: boolean) {
  const map: Record<string, { en: string; ar: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft: { en: 'Draft', ar: 'مسودة', variant: 'secondary' },
    pending_logistics: { en: 'Pending Logistics', ar: 'بانتظار اللوجستيات', variant: 'outline' },
    pending_manager: { en: 'Pending Manager', ar: 'بانتظار المدير', variant: 'outline' },
    approved: { en: 'Approved', ar: 'معتمد', variant: 'default' },
    rejected: { en: 'Rejected', ar: 'مرفوض', variant: 'destructive' },
    // Legacy statuses
    pending_procurement: { en: 'Pending Procurement', ar: 'بانتظار المشتريات', variant: 'outline' },
    pending_compliance: { en: 'Pending Compliance', ar: 'بانتظار الامتثال', variant: 'outline' },
    pending_finance: { en: 'Pending Finance', ar: 'بانتظار المالية', variant: 'outline' },
    pending_final: { en: 'Pending Final', ar: 'بانتظار النهائي', variant: 'outline' },
  };
  const entry = map[status] || { en: status, ar: status, variant: 'secondary' as const };
  return { label: isRTL ? entry.ar : entry.en, variant: entry.variant };
}

export default function EvaluationHistory() {
  const { isRTL } = useLanguage();
  const [currentLoc] = useLocation();
  const isFinanceContext = currentLoc.includes('/finance/');
  const evalBackPath = isFinanceContext ? '/organization/finance/vendors/evaluation' : '/organization/logistics/evaluation-performance';
  const qualListPath = isFinanceContext ? '/organization/finance/vendors/evaluation/qualification-list' : '/organization/logistics/evaluation-performance/qualification-list';

  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch qualification history from the actual qualification scores table
  const historyQuery = trpc.vendors.qualificationHistory.useQuery();
  const evaluations = (historyQuery.data || []) as any[];

  // Apply filters
  const filtered = evaluations.filter((ev: any) => {
    if (filterClassification !== 'all') {
      const cls = getClassification(ev.scorePercentage || 0);
      if (cls.label.toLowerCase() !== filterClassification) return false;
    }
    if (filterStatus !== 'all' && ev.approvalStatus !== filterStatus) return false;
    return true;
  });

  // Sort by date descending
  filtered.sort((a: any, b: any) => {
    const dateA = a.evaluationDate ? new Date(a.evaluationDate).getTime() : 0;
    const dateB = b.evaluationDate ? new Date(b.evaluationDate).getTime() : 0;
    return dateB - dateA;
  });

  if (historyQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <div className="bg-amber-500 p-3 rounded-lg text-white">
                <History className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isRTL ? 'سجل التقييمات' : 'Evaluation History'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isRTL ? 'تتبع المقيم، التاريخ، تغييرات النتائج، سجل الإصدارات' : 'Track evaluator, date, score changes, version history'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={filterClassification} onValueChange={setFilterClassification}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={isRTL ? 'التصنيف' : 'Classification'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'جميع التصنيفات' : 'All Classifications'}</SelectItem>
              <SelectItem value="preferred">{isRTL ? 'مفضل' : 'Preferred'}</SelectItem>
              <SelectItem value="approved">{isRTL ? 'معتمد' : 'Approved'}</SelectItem>
              <SelectItem value="conditional">{isRTL ? 'مشروط' : 'Conditional'}</SelectItem>
              <SelectItem value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
              <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
              <SelectItem value="pending_logistics">{isRTL ? 'بانتظار اللوجستيات' : 'Pending Logistics'}</SelectItem>
              <SelectItem value="pending_manager">{isRTL ? 'بانتظار المدير' : 'Pending Manager'}</SelectItem>
              <SelectItem value="approved">{isRTL ? 'معتمد' : 'Approved'}</SelectItem>
              <SelectItem value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Evaluation List */}
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-2">
                {isRTL ? 'لا توجد تقييمات' : 'No evaluations found'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {evaluations.length > 0
                  ? (isRTL ? 'لا توجد نتائج مطابقة للفلاتر المحددة' : 'No results match the selected filters')
                  : (isRTL ? 'قم بتقييم الموردين من قائمة التأهيل أولاً' : 'Evaluate vendors from the Qualification List first')
                }
              </p>
              {evaluations.length === 0 && (
                <Link href={qualListPath}>
                  <Button>
                    {isRTL ? 'الذهاب لقائمة التأهيل' : 'Go to Qualification List'}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((ev: any) => {
              const cls = getClassification(ev.scorePercentage || 0);
              const approvalInfo = getApprovalStatusLabel(ev.approvalStatus || 'draft', isRTL);
              const isExpanded = expandedId === ev.id;
              return (
                <Card key={ev.id} className={`${cls.border} border transition-shadow hover:shadow-sm`}>
                  <CardContent className="py-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-center p-2 rounded-lg ${cls.bg} min-w-[70px]`}>
                          <div className={`text-xl font-bold ${cls.color}`}>{(ev.totalScore || 0).toFixed(2)}</div>
                          <p className="text-[10px] text-muted-foreground">/30</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{ev.vendorName}</p>
                          <p className="text-xs text-muted-foreground">{ev.vendorCode}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ev.evaluatorName || (isRTL ? 'غير محدد' : 'Unknown')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {ev.evaluationDate ? new Date(ev.evaluationDate).toLocaleDateString() : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${cls.bg} ${cls.color} border-0`}>
                          {isRTL ? cls.labelAr : cls.label}
                        </Badge>
                        <Badge variant={approvalInfo.variant}>
                          {approvalInfo.label}
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Score Breakdown */}
                        <div>
                          <p className="text-sm font-medium mb-2">{isRTL ? 'تفاصيل النتائج' : 'Score Breakdown'}</p>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">{isRTL ? 'قانوني وإداري' : 'Legal & Admin'}</p>
                              <p className="text-lg font-bold">{(ev.section1Total || 0).toFixed(2)}<span className="text-xs text-muted-foreground">/12</span></p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">{isRTL ? 'خبرة وقدرة فنية' : 'Experience & Technical'}</p>
                              <p className="text-lg font-bold">{(ev.section2Total || 0).toFixed(2)}<span className="text-xs text-muted-foreground">/10</span></p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">{isRTL ? 'تواجد تشغيلي' : 'Operational Presence'}</p>
                              <p className="text-lg font-bold">{(ev.section3Total || 0).toFixed(2)}<span className="text-xs text-muted-foreground">/2</span></p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">{isRTL ? 'مراجع' : 'References'}</p>
                              <p className="text-lg font-bold">{(ev.section4Total || 0).toFixed(2)}<span className="text-xs text-muted-foreground">/6</span></p>
                            </div>
                            <div className={`${cls.bg} rounded-lg p-3 text-center`}>
                              <p className="text-xs text-muted-foreground">{isRTL ? 'الإجمالي' : 'Total'}</p>
                              <p className={`text-lg font-bold ${cls.color}`}>{(ev.totalScore || 0).toFixed(2)}<span className="text-xs text-muted-foreground">/30</span></p>
                            </div>
                          </div>
                        </div>

                        {/* Qualification Status */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">{isRTL ? 'حالة التأهيل' : 'Qualification'}: </span>
                            <span className="font-medium capitalize">{ev.qualificationStatus || '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{isRTL ? 'النسبة المئوية' : 'Percentage'}: </span>
                            <span className={`font-medium ${cls.color}`}>{ev.scorePercentage}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{isRTL ? 'الصلاحية' : 'Expiry'}: </span>
                            <span className="font-medium">
                              {ev.expiryDate ? new Date(ev.expiryDate).toLocaleDateString() : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{isRTL ? 'حالة الموافقة' : 'Approval'}: </span>
                            <Badge variant={approvalInfo.variant} className="text-xs">
                              {approvalInfo.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Notes */}
                        {ev.notes && (
                          <div>
                            <p className="text-sm font-medium mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</p>
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">{ev.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center mt-6 text-sm text-muted-foreground">
          {isRTL ? `عرض ${filtered.length} من ${evaluations.length} تقييم` : `Showing ${filtered.length} of ${evaluations.length} evaluations`}
        </div>
      </div>
    </div>
  );
}
