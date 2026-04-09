/**
 * Score Dashboard Page
 * Shows final scores, vendor classification, risk levels, and last evaluation dates
 * Reads from vendor_qualification_scores (logistics qualification data)
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  LayoutDashboard,
  Award,
  TrendingUp,
  AlertCircle,
  ShieldAlert,
  BarChart3,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { BackButton } from "@/components/BackButton";

function getClassification(scorePercentage: number) {
  if (scorePercentage >= 85) return { label: 'Preferred', labelAr: 'مفضل', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
  if (scorePercentage >= 70) return { label: 'Approved', labelAr: 'معتمد', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
  if (scorePercentage >= 50) return { label: 'Conditional', labelAr: 'مشروط', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' };
  return { label: 'Rejected', labelAr: 'مرفوض', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
}

function getRiskLevel(scorePercentage: number) {
  if (scorePercentage >= 85) return { label: 'Low Risk', labelAr: 'خطر منخفض', color: 'text-green-600' };
  if (scorePercentage >= 70) return { label: 'Medium Risk', labelAr: 'خطر متوسط', color: 'text-blue-600' };
  if (scorePercentage >= 50) return { label: 'High Risk', labelAr: 'خطر عالي', color: 'text-yellow-600' };
  return { label: 'Critical Risk', labelAr: 'خطر حرج', color: 'text-red-600' };
}

export default function ScoreDashboard() {
  const { isRTL } = useLanguage();
  const [currentLoc] = useLocation();
  const isFinanceContext = currentLoc.includes('/finance/');
  const evalBackPath = isFinanceContext ? '/organization/finance/vendors/evaluation' : '/organization/logistics/evaluation-performance';

  // Fetch dashboard data from qualification scores
  const dashboardQuery = trpc.vendors.qualificationScoreDashboard.useQuery();
  const data = dashboardQuery.data;
  const stats = data?.stats || { total: 0, preferred: 0, approved: 0, conditional: 0, rejected: 0 };
  const vendorScores = data?.vendors || [];

  // Sort by score descending
  const sorted = [...vendorScores].sort((a, b) => b.totalScore - a.totalScore);

  if (dashboardQuery.isLoading) {
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
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-3 rounded-lg text-white">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isRTL ? 'لوحة النتائج' : 'Score Dashboard'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isRTL ? 'النتيجة النهائية، تصنيف المورد، مستوى المخاطر، تاريخ آخر تقييم' : 'Final score, vendor classification, risk level, last evaluation date'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Classification Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-4 pb-4 text-center">
              <Award className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700">{stats.preferred}</div>
              <p className="text-sm text-green-600">{isRTL ? 'مفضل (85-100)' : 'Preferred (85-100)'}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-4 text-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-700">{stats.approved}</div>
              <p className="text-sm text-blue-600">{isRTL ? 'معتمد (70-84)' : 'Approved (70-84)'}</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardContent className="pt-4 pb-4 text-center">
              <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-yellow-700">{stats.conditional}</div>
              <p className="text-sm text-yellow-600">{isRTL ? 'مشروط (50-69)' : 'Conditional (50-69)'}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="pt-4 pb-4 text-center">
              <ShieldAlert className="h-6 w-6 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
              <p className="text-sm text-red-600">{isRTL ? 'مرفوض (<50)' : 'Rejected (<50)'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Score Distribution Bar */}
        {stats.total > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">{isRTL ? 'توزيع التصنيف' : 'Classification Distribution'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {stats.preferred > 0 && (
                  <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(stats.preferred / stats.total) * 100}%` }}>
                    {stats.preferred}
                  </div>
                )}
                {stats.approved > 0 && (
                  <div className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(stats.approved / stats.total) * 100}%` }}>
                    {stats.approved}
                  </div>
                )}
                {stats.conditional > 0 && (
                  <div className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(stats.conditional / stats.total) * 100}%` }}>
                    {stats.conditional}
                  </div>
                )}
                {stats.rejected > 0 && (
                  <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(stats.rejected / stats.total) * 100}%` }}>
                    {stats.rejected}
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> {isRTL ? 'مفضل' : 'Preferred'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> {isRTL ? 'معتمد' : 'Approved'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500" /> {isRTL ? 'مشروط' : 'Conditional'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> {isRTL ? 'مرفوض' : 'Rejected'}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Score Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isRTL ? 'نتائج الموردين' : 'Vendor Scores'}</CardTitle>
            <CardDescription>{isRTL ? 'أحدث تقييم لكل مورد' : 'Latest evaluation per vendor'}</CardDescription>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{isRTL ? 'لا توجد تقييمات بعد' : 'No evaluations yet'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL ? 'قم بتقييم الموردين من قائمة التأهيل أولاً' : 'Evaluate vendors from the Qualification List first'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-start py-3 px-3 font-medium">{isRTL ? 'المورد' : 'Vendor'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'النتيجة' : 'Score'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'النسبة' : 'Percentage'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'التصنيف' : 'Classification'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'المخاطر' : 'Risk Level'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'المقيّم' : 'Evaluator'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'تاريخ التقييم' : 'Evaluation Date'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'الصلاحية' : 'Expiry'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((v) => {
                      const cls = getClassification(v.scorePercentage);
                      const risk = getRiskLevel(v.scorePercentage);
                      return (
                        <tr key={v.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium text-foreground">{v.vendorName}</p>
                              <p className="text-xs text-muted-foreground">{v.vendorCode}</p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3">
                            <span className={`text-lg font-bold ${cls.color}`}>{v.totalScore.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">/30</span>
                          </td>
                          <td className="text-center py-3 px-3">
                            <span className={`font-semibold ${cls.color}`}>{v.scorePercentage}%</span>
                          </td>
                          <td className="text-center py-3 px-3">
                            <Badge variant="outline" className={`${cls.bg} ${cls.color} border-0`}>
                              {isRTL ? cls.labelAr : cls.label}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-3">
                            <span className={`text-xs font-medium ${risk.color}`}>
                              {isRTL ? risk.labelAr : risk.label}
                            </span>
                          </td>
                          <td className="text-center py-3 px-3 text-sm text-muted-foreground">
                            {v.evaluatorName || '—'}
                          </td>
                          <td className="text-center py-3 px-3 text-sm text-muted-foreground">
                            {v.evaluationDate ? new Date(v.evaluationDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="text-center py-3 px-3 text-sm text-muted-foreground">
                            {v.expiryDate ? new Date(v.expiryDate).toLocaleDateString() : '—'}
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

        {/* Section Breakdown */}
        {sorted.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">{isRTL ? 'تفاصيل الأقسام' : 'Section Breakdown'}</CardTitle>
              <CardDescription>{isRTL ? 'توزيع النتائج حسب أقسام التقييم' : 'Score distribution by evaluation sections'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-start py-3 px-3 font-medium">{isRTL ? 'المورد' : 'Vendor'}</th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'قانوني وإداري' : 'Legal & Admin'}<br /><span className="text-xs font-normal">(max 12)</span></th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'خبرة وقدرة فنية' : 'Experience & Technical'}<br /><span className="text-xs font-normal">(max 10)</span></th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'تواجد تشغيلي' : 'Operational Presence'}<br /><span className="text-xs font-normal">(max 2)</span></th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'مراجع' : 'References'}<br /><span className="text-xs font-normal">(max 6)</span></th>
                      <th className="text-center py-3 px-3 font-medium">{isRTL ? 'الإجمالي' : 'Total'}<br /><span className="text-xs font-normal">(max 30)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((v) => (
                      <tr key={v.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-3 font-medium">{v.vendorName}</td>
                        <td className="text-center py-3 px-3">{v.section1Total.toFixed(2)}</td>
                        <td className="text-center py-3 px-3">{v.section2Total.toFixed(2)}</td>
                        <td className="text-center py-3 px-3">{v.section3Total.toFixed(2)}</td>
                        <td className="text-center py-3 px-3">{v.section4Total.toFixed(2)}</td>
                        <td className="text-center py-3 px-3 font-bold">{v.totalScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
