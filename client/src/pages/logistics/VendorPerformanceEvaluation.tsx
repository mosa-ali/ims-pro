import { BackButton } from "@/components/BackButton";
/**
 * Vendor Performance Evaluation Page
 * Interface for conducting periodic vendor performance reviews
 * 
 * Features:
 * - Performance evaluation form with quality/delivery/compliance scoring
 * - Automated overall rating calculation
 * - Evaluation history view
 * - Performance trends visualization
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
 ArrowLeft, ArrowRight,
 Award,
 Star,
 TrendingUp,
 TrendingDown,
 Loader2,
 Save,
 BarChart3,
 Calendar,
} from 'lucide-react';

// Translations
export default function VendorPerformanceEvaluation() {
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const { selectedOrganization } = useOrganization();

 // Form state
 const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
 const [evaluationPeriodStart, setEvaluationPeriodStart] = useState('');
 const [evaluationPeriodEnd, setEvaluationPeriodEnd] = useState('');
 const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);
 const [qualityScore, setQualityScore] = useState<number>(0);
 const [deliveryScore, setDeliveryScore] = useState<number>(0);
 const [complianceScore, setComplianceScore] = useState<number>(0);
 const [communicationScore, setCommunicationScore] = useState<number>(0);
 const [strengths, setStrengths] = useState('');
 const [weaknesses, setWeaknesses] = useState('');
 const [recommendations, setRecommendations] = useState('');

 // Fetch vendors list
 const vendorsQuery = trpc.vendors.list.useQuery({
 isActive: true,
 isFinanciallyActive: true,
 limit: 100,
 });

 // Fetch evaluation history for selected vendor
 const historyQuery = trpc.vendors.getPerformanceEvaluations.useQuery(
 { vendorId: selectedVendorId! },
 { enabled: !!selectedVendorId }
 );

 // Save evaluation mutation
 const saveEvaluationMutation = trpc.vendors.addPerformanceEvaluation.useMutation({
 onSuccess: () => {
 toast.success(t.vendorPerformanceEvaluation2.evaluationSaved);
 // Reset form
 setEvaluationPeriodStart('');
 setEvaluationPeriodEnd('');
 setQualityScore(0);
 setDeliveryScore(0);
 setComplianceScore(0);
 setCommunicationScore(0);
 setStrengths('');
 setWeaknesses('');
 setRecommendations('');
 // Refetch history
 historyQuery.refetch();
 },
 onError: (error: any) => {
 toast.error(t.vendorPerformanceEvaluation2.evaluationError + ': ' + error.message);
 },
 });

 // Calculate overall score (0-10 scale)
 const calculateOverallScore = () => {
 const scores = [qualityScore, deliveryScore, complianceScore];
 if (communicationScore > 0) scores.push(communicationScore);
 return scores.reduce((a, b) => a + b, 0) / scores.length;
 };

 const overallScore = calculateOverallScore();
 const overallRating = (overallScore / 10) * 5; // Convert to 0-5 for display

 const getRatingLabel = (rating: number) => {
 if (rating >= 4.5) return t.vendorPerformanceEvaluation2.excellent;
 if (rating >= 3.5) return t.vendorPerformanceEvaluation2.good;
 if (rating >= 2.5) return t.vendorPerformanceEvaluation2.satisfactory;
 if (rating >= 1.5) return t.vendorPerformanceEvaluation2.needsImprovement;
 return t.vendorPerformanceEvaluation2.poor;
 };

 const getRatingColor = (rating: number) => {
 if (rating >= 4.5) return 'text-green-600';
 if (rating >= 3.5) return 'text-blue-600';
 if (rating >= 2.5) return 'text-yellow-600';
 if (rating >= 1.5) return 'text-orange-600';
 return 'text-red-600';
 };

 const handleSaveEvaluation = () => {
 if (!selectedVendorId) {
 toast.error(t.vendorPerformanceEvaluation2.selectVendorFirst);
 return;
 }

 if (
 qualityScore < 0 || qualityScore > 10 ||
 deliveryScore < 0 || deliveryScore > 10 ||
 complianceScore < 0 || complianceScore > 10 ||
 communicationScore < 0 || communicationScore > 10
 ) {
 toast.error(t.vendorPerformanceEvaluation2.invalidScores);
 return;
 }

 saveEvaluationMutation.mutate({
 vendorId: selectedVendorId,
 evaluationPeriodStart: evaluationPeriodStart || undefined,
 evaluationPeriodEnd: evaluationPeriodEnd || undefined,
 evaluationDate: new Date(evaluationDate),
 qualityScore,
 deliveryScore,
 complianceScore,
 communicationScore: communicationScore || undefined,
 strengths: strengths || undefined,
 weaknesses: weaknesses || undefined,
 recommendations: recommendations || undefined,
 });
 };

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <BackButton onClick={() => navigate('/organization/logistics/vendors')} label={t.vendorPerformanceEvaluation2.backToVendors} />
 </div>

 <div className="flex items-start justify-between">
 <div>
 <h1 className="text-3xl font-bold mb-2">{t.vendorPerformanceEvaluation2.title}</h1>
 <p className="text-muted-foreground">{t.vendorPerformanceEvaluation2.description}</p>
 </div>
 <Award className="h-12 w-12 text-primary" />
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="container py-8">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Evaluation Form */}
 <div className="lg:col-span-2 space-y-6">
 <Card>
 <CardHeader>
 <CardTitle>{t.vendorPerformanceEvaluation2.newEvaluation}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* Vendor Selection */}
 <div>
 <Label>{t.vendorPerformanceEvaluation2.selectVendor}</Label>
 <Select
 value={selectedVendorId?.toString()}
 onValueChange={(value) => setSelectedVendorId(parseInt(value))}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.vendorPerformanceEvaluation2.selectVendor} />
 </SelectTrigger>
 <SelectContent>
 {vendorsQuery.data?.vendors.map((vendor: any) => (
 <SelectItem key={vendor.id} value={vendor.id.toString()}>
 {vendor.legalName || vendor.name} ({vendor.vendorCode})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Period and Date */}
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label>{isRTL ? 'بداية فترة التقييم' : 'Period Start'}</Label>
 <Input
 type="date"
 value={evaluationPeriodStart}
 onChange={(e) => setEvaluationPeriodStart(e.target.value)}
 />
 </div>
 <div>
 <Label>{isRTL ? 'نهاية فترة التقييم' : 'Period End'}</Label>
 <Input
 type="date"
 value={evaluationPeriodEnd}
 onChange={(e) => setEvaluationPeriodEnd(e.target.value)}
 />
 </div>
 <div>
 <Label>{t.vendorPerformanceEvaluation2.evaluationDate}</Label>
 <Input
 type="date"
 value={evaluationDate}
 onChange={(e) => setEvaluationDate(e.target.value)}
 />
 </div>
 </div>

 <Separator />

 {/* Scoring Criteria */}
 <div>
 <h3 className="text-lg font-semibold mb-4">{t.vendorPerformanceEvaluation2.scoringCriteria}</h3>
 <p className="text-sm text-muted-foreground mb-4">{t.vendorPerformanceEvaluation2.scoreRange}</p>

 <div className="space-y-6">
 {/* Quality Score */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <div>
 <Label>{t.vendorPerformanceEvaluation2.qualityScore}</Label>
 <p className="text-sm text-muted-foreground">{t.vendorPerformanceEvaluation2.qualityDesc}</p>
 </div>
 <div className="flex items-center gap-2">
 <Input
 type="number"
 min="0"
 max="10"
 step="0.1"
 value={qualityScore}
 onChange={(e) => setQualityScore(parseFloat(e.target.value) || 0)}
 className="w-20 text-center"
 />
 <span className="text-sm text-muted-foreground">/ 10</span>
 </div>
 </div>
 <Progress value={(qualityScore / 10) * 100} />
 </div>

 {/* Delivery Score */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <div>
 <Label>{t.vendorPerformanceEvaluation2.deliveryScore}</Label>
 <p className="text-sm text-muted-foreground">{t.vendorPerformanceEvaluation2.deliveryDesc}</p>
 </div>
 <div className="flex items-center gap-2">
 <Input
 type="number"
 min="0"
 max="10"
 step="0.1"
 value={deliveryScore}
 onChange={(e) => setDeliveryScore(parseFloat(e.target.value) || 0)}
 className="w-20 text-center"
 />
 <span className="text-sm text-muted-foreground">/ 10</span>
 </div>
 </div>
 <Progress value={(deliveryScore / 10) * 100} />
 </div>

 {/* Compliance Score */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <div>
 <Label>{t.vendorPerformanceEvaluation2.complianceScore}</Label>
 <p className="text-sm text-muted-foreground">{t.vendorPerformanceEvaluation2.complianceDesc}</p>
 </div>
 <div className="flex items-center gap-2">
 <Input
 type="number"
 min="0"
 max="10"
 step="0.1"
 value={complianceScore}
 onChange={(e) => setComplianceScore(parseFloat(e.target.value) || 0)}
 className="w-20 text-center"
 />
 <span className="text-sm text-muted-foreground">/ 10</span>
 </div>
 </div>
 <Progress value={(complianceScore / 10) * 100} />
 </div>

 {/* Communication Score */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <div>
 <Label>{t.vendorPerformanceEvaluation2.communicationScore}</Label>
 <p className="text-sm text-muted-foreground">{t.vendorPerformanceEvaluation2.communicationDesc}</p>
 </div>
 <div className="flex items-center gap-2">
 <Input
 type="number"
 min="0"
 max="10"
 step="0.1"
 value={communicationScore}
 onChange={(e) => setCommunicationScore(parseFloat(e.target.value) || 0)}
 className="w-20 text-center"
 />
 <span className="text-sm text-muted-foreground">/ 10</span>
 </div>
 </div>
 <Progress value={(communicationScore / 10) * 100} />
 </div>


 </div>
 </div>

 <Separator />

 {/* Overall Rating */}
 <div className="bg-muted/50 p-4 rounded-lg">
 <div className="flex items-center justify-between">
 <div>
 <Label className="text-base">{t.vendorPerformanceEvaluation2.overallRating}</Label>
 <p className="text-sm text-muted-foreground">{t.vendorPerformanceEvaluation2.autoCalculated}</p>
 </div>
 <div className="text-end">
 <div className="flex items-center gap-2 mb-1">
 <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
 <span className={`text-3xl font-bold ${getRatingColor(overallRating)}`}>
 {overallRating.toFixed(2)}
 </span>
 <span className="text-muted-foreground">/ 5.0</span>
 </div>
 <Badge variant="outline" className={getRatingColor(overallRating)}>
 {getRatingLabel(overallRating)}
 </Badge>
 </div>
 </div>
 </div>

 {/* Strengths */}
 <div>
 <Label>{isRTL ? 'نقاط القوة' : 'Strengths'}</Label>
 <Textarea
 placeholder={isRTL ? 'أدخل نقاط القوة للمورد...' : 'Enter vendor strengths...'}
 value={strengths}
 onChange={(e) => setStrengths(e.target.value)}
 rows={3}
 />
 </div>

 {/* Weaknesses */}
 <div>
 <Label>{isRTL ? 'نقاط الضعف' : 'Weaknesses'}</Label>
 <Textarea
 placeholder={isRTL ? 'أدخل نقاط الضعف للمورد...' : 'Enter vendor weaknesses...'}
 value={weaknesses}
 onChange={(e) => setWeaknesses(e.target.value)}
 rows={3}
 />
 </div>

 {/* Recommendations */}
 <div>
 <Label>{t.vendorPerformanceEvaluation2.recommendations}</Label>
 <Textarea
 placeholder={t.vendorPerformanceEvaluation2.recommendationsPlaceholder}
 value={recommendations}
 onChange={(e) => setRecommendations(e.target.value)}
 rows={3}
 />
 </div>

 {/* Actions */}
 <div className="flex items-center gap-3 pt-4">
 <Button
 onClick={handleSaveEvaluation}
 disabled={saveEvaluationMutation.isLoading || !selectedVendorId}
 >
 {saveEvaluationMutation.isLoading ? (
 <>
 <Loader2 className="h-4 w-4 me-2 animate-spin" />
 {t.vendorPerformanceEvaluation2.saving}
 </>
 ) : (
 <>
 <Save className="h-4 w-4 me-2" />
 {t.vendorPerformanceEvaluation2.saveEvaluation}
 </>
 )}
 </Button>
 <Button
 variant="outline"
 onClick={() => navigate('/organization/logistics/vendors')}
 >
 {t.vendorPerformanceEvaluation2.cancel}
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Evaluation History */}
 <div className="space-y-6">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <BarChart3 className="h-5 w-5" />
 {t.vendorPerformanceEvaluation2.evaluationHistory}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {!selectedVendorId ? (
 <p className="text-sm text-muted-foreground text-center py-8">
 {t.vendorPerformanceEvaluation2.selectVendorFirst}
 </p>
 ) : historyQuery.isLoading ? (
 <div className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
 <p className="text-sm text-muted-foreground">{t.vendorPerformanceEvaluation2.loading}</p>
 </div>
 ) : !historyQuery.data || historyQuery.data.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-8">
 {t.vendorPerformanceEvaluation2.noHistory}
 </p>
 ) : (
 <div className="space-y-3">
 {historyQuery.data.map((evaluation: any) => (
 <div
 key={evaluation.id}
 className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
 >
 <div className="flex items-start justify-between mb-2">
 <div>
 <p className="font-medium">
 {evaluation.evaluationPeriodStart && evaluation.evaluationPeriodEnd
 ? `${new Date(evaluation.evaluationPeriodStart).toLocaleDateString()} - ${new Date(evaluation.evaluationPeriodEnd).toLocaleDateString()}`
 : new Date(evaluation.evaluationDate).toLocaleDateString()}
 </p>
 <p className="text-sm text-muted-foreground flex items-center gap-1">
 <Calendar className="h-3 w-3" />
 {new Date(evaluation.evaluationDate).toLocaleDateString()}
 </p>
 </div>
 <div className="flex items-center gap-1">
 <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
 <span className="font-semibold">{parseFloat(evaluation.overallScore || '0').toFixed(1)}/10</span>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-2 text-xs">
 <div>
 <span className="text-muted-foreground">Quality:</span>
 <span className="font-medium ms-1">{evaluation.qualityScore}/10</span>
 </div>
 <div>
 <span className="text-muted-foreground">Delivery:</span>
 <span className="font-medium ms-1">{evaluation.deliveryScore}/10</span>
 </div>
 <div>
 <span className="text-muted-foreground">Compliance:</span>
 <span className="font-medium ms-1">{evaluation.complianceScore}/10</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 </div>
 );
}
