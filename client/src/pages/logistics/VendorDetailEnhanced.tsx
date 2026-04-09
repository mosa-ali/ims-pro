import { BackButton } from "@/components/BackButton";
/**
 * Enhanced Vendor Detail Page
 * Comprehensive vendor profile with complete history and document management
 * 
 * Features:
 * - Vendor profile header with key metrics
 * - Tabs: Overview, Participation History, Performance Evaluations, Documents, Activity Timeline
 * - Document upload functionality
 * - Performance trends visualization
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState } from 'react';
import { useParams } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useNavigate } from '@/lib/router-compat';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
 ArrowLeft, ArrowRight,
 Building2,
 User,
 Mail,
 Phone,
 Globe,
 MapPin,
 CreditCard,
 FileText,
 Loader2,
 Pencil,
 DollarSign,
 Clock,
 Award,
 TrendingUp,
 TrendingDown,
 AlertCircle,
 CheckCircle,
 Upload,
 Download,
 Eye,
 Calendar,
 BarChart3,
 Activity,
 ShieldAlert,
 Star,
} from 'lucide-react';

// EvaluationDialogContent - working evaluation form that calls the mutation
function EvaluationDialogContent({ vendorId, isRTL, t, onClose, onSuccess }: {
 vendorId: number;
 isRTL: boolean;
 t: any;
 onClose: () => void;
 onSuccess: () => void;
}) {
 const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
 const [periodStart, setPeriodStart] = useState('');
 const [periodEnd, setPeriodEnd] = useState('');
 const [quality, setQuality] = useState(0);
 const [delivery, setDelivery] = useState(0);
 const [compliance, setCompliance] = useState(0);
 const [communication, setCommunication] = useState(0);
 const [strengths, setStrengths] = useState('');
 const [weaknesses, setWeaknesses] = useState('');
 const [recommendations, setRecommendations] = useState('');

 const mutation = trpc.vendors.addPerformanceEvaluation.useMutation({
 onSuccess: () => {
 toast.success(t.vendorDetailEnhanced2?.evaluationSuccess || 'Evaluation saved successfully');
 onSuccess();
 },
 onError: (error: any) => {
 toast.error('Error: ' + error.message);
 },
 });

 const handleSave = () => {
 if (quality < 0 || quality > 10 || delivery < 0 || delivery > 10 || compliance < 0 || compliance > 10) {
 toast.error(isRTL ? 'الدرجات يجب أن تكون بين 0 و 10' : 'Scores must be between 0 and 10');
 return;
 }
 mutation.mutate({
 vendorId,
 evaluationDate: new Date(evalDate),
 evaluationPeriodStart: periodStart || undefined,
 evaluationPeriodEnd: periodEnd || undefined,
 qualityScore: quality,
 deliveryScore: delivery,
 complianceScore: compliance,
 communicationScore: communication || undefined,
 strengths: strengths || undefined,
 weaknesses: weaknesses || undefined,
 recommendations: recommendations || undefined,
 });
 };

 return (
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{t.vendorDetailEnhanced2?.addEvaluation || 'Add Performance Evaluation'}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 max-h-[60vh] overflow-y-auto">
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label>{isRTL ? 'بداية الفترة' : 'Period Start'}</Label>
 <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
 </div>
 <div>
 <Label>{isRTL ? 'نهاية الفترة' : 'Period End'}</Label>
 <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
 </div>
 <div>
 <Label>{isRTL ? 'تاريخ التقييم' : 'Evaluation Date'}</Label>
 <Input type="date" value={evalDate} onChange={(e) => setEvalDate(e.target.value)} />
 </div>
 </div>
 <Separator />
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{isRTL ? 'درجة الجودة' : 'Quality Score'} (0-10)</Label>
 <Input type="number" min="0" max="10" step="0.1" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value) || 0)} />
 </div>
 <div>
 <Label>{isRTL ? 'درجة التسليم' : 'Delivery Score'} (0-10)</Label>
 <Input type="number" min="0" max="10" step="0.1" value={delivery} onChange={(e) => setDelivery(parseFloat(e.target.value) || 0)} />
 </div>
 <div>
 <Label>{isRTL ? 'درجة الامتثال' : 'Compliance Score'} (0-10)</Label>
 <Input type="number" min="0" max="10" step="0.1" value={compliance} onChange={(e) => setCompliance(parseFloat(e.target.value) || 0)} />
 </div>
 <div>
 <Label>{isRTL ? 'درجة التواصل' : 'Communication Score'} (0-10)</Label>
 <Input type="number" min="0" max="10" step="0.1" value={communication} onChange={(e) => setCommunication(parseFloat(e.target.value) || 0)} />
 </div>
 </div>
 <div>
 <Label>{isRTL ? 'نقاط القوة' : 'Strengths'}</Label>
 <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} />
 </div>
 <div>
 <Label>{isRTL ? 'نقاط الضعف' : 'Weaknesses'}</Label>
 <Textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} rows={2} />
 </div>
 <div>
 <Label>{isRTL ? 'التوصيات' : 'Recommendations'}</Label>
 <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={2} />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={onClose}>
 {isRTL ? 'إلغاء' : 'Cancel'}
 </Button>
 <Button onClick={handleSave} disabled={mutation.isPending}>
 {mutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Award className="h-4 w-4 me-2" />}
 {isRTL ? 'حفظ التقييم' : 'Save Evaluation'}
 </Button>
 </DialogFooter>
 </DialogContent>
 );
}

// Translations
export default function VendorDetailEnhanced() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const { selectedOrganization } = useOrganization();

 const [activeTab, setActiveTab] = useState('overview');
 const [showUploadDialog, setShowUploadDialog] = useState(false);
 const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);

 // Fetch vendor data
 const vendorQuery = trpc.vendors.getById.useQuery(
 { id: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch participation history
 const participationsQuery = trpc.vendors.getParticipationHistory.useQuery(
 { vendorId: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch performance evaluations
 const evaluationsQuery = trpc.vendors.getPerformanceEvaluations.useQuery(
 { vendorId: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch documents
 const documentsQuery = trpc.vendors.getDocuments.useQuery(
 { vendorId: parseInt(id!) },
 { enabled: !!id }
 );

 // Mutations
 const activateMutation = trpc.vendors.activateFinancially.useMutation({
 onSuccess: () => {
 toast.success(t.vendorDetailEnhanced2.activateSuccess);
 vendorQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 if (vendorQuery.isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
 <p className="text-muted-foreground">{t.vendorDetailEnhanced2.loading}</p>
 </div>
 </div>
 );
 }

 if (!vendorQuery.data) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="text-center">
 <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
 <h2 className="text-xl font-semibold mb-2">{t.vendorDetailEnhanced2.notFound}</h2>
 <p className="text-muted-foreground mb-4">{t.vendorDetailEnhanced2.notFoundDesc}</p>
 <BackButton onClick={() => navigate('/organization/logistics/vendors')} label={t.vendorDetailEnhanced2.goBack} />
 </div>
 </div>
 );
 }

 const vendor = vendorQuery.data;

 // Calculate metrics
 const totalParticipations = vendor.totalParticipations || 0;
 const totalWins = vendor.totalWins || 0;
 const winRate = totalParticipations > 0 ? (totalWins / totalParticipations) * 100 : 0;
 const performanceRating = vendor.performanceRating || 0;

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <BackButton onClick={() => navigate('/organization/logistics/vendors')} label={t.vendorDetailEnhanced2.backToVendors} />
 </div>

 {/* Vendor Header */}
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-4">
 <div className="bg-primary/10 p-4 rounded-lg">
 <Building2 className="h-8 w-8 text-primary" />
 </div>
 <div>
 <div className="flex items-center gap-3 mb-2">
 <h1 className="text-3xl font-bold">{vendor.legalName || vendor.name}</h1>
 <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
 {t[vendor.status as keyof typeof t] || vendor.status}
 </Badge>
 {vendor.financiallyActive && (
 <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
 <CheckCircle className="h-3 w-3 me-1" />
 Financially Active
 </Badge>
 )}
 {vendor.blacklisted && (
 <Badge variant="destructive">
 <ShieldAlert className="h-3 w-3 me-1" />
 {t.vendorDetailEnhanced2.blacklisted}
 </Badge>
 )}
 </div>
 <p className="text-muted-foreground">
 {vendor.vendorCode} • {t[vendor.vendorType as keyof typeof t] || vendor.vendorType}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {!vendor.financiallyActive && (
 <Button
 variant="outline"
 onClick={() => activateMutation.mutate({ vendorId: vendor.id })}
 disabled={activateMutation.isLoading}
 >
 <CheckCircle className="h-4 w-4 me-2" />
 {t.vendorDetailEnhanced2.activateFinancially}
 </Button>
 )}
 <Button onClick={() => navigate(`/organization/logistics/vendors/suppliers/${vendor.id}/edit`)}>
 <Pencil className="h-4 w-4 me-2" />
 {t.vendorDetailEnhanced2.edit}
 </Button>
 </div>
 </div>

 {/* Metrics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Activity className="h-4 w-4" />
 {t.vendorDetailEnhanced2.totalParticipations}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{totalParticipations}</div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Award className="h-4 w-4" />
 {t.vendorDetailEnhanced2.winRate}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">{winRate.toFixed(1)}%</div>
 <Progress value={winRate} className="mt-2" />
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <DollarSign className="h-4 w-4" />
 {t.vendorDetailEnhanced2.totalContracts}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">
 ${(vendor.totalContractsValue || 0).toLocaleString()}
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Star className="h-4 w-4" />
 {t.vendorDetailEnhanced2.performanceRating}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-2">
 <div className="text-2xl font-bold">{performanceRating.toFixed(1)}</div>
 <div className="text-sm text-muted-foreground">/ 5.0</div>
 </div>
 <Progress value={(performanceRating / 5) * 100} className="mt-2" />
 </CardContent>
 </Card>
 </div>
 </div>
 </div>

 {/* Main Content - Tabs */}
 <div className="container py-8">
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList className="mb-6">
 <TabsTrigger value="overview">{t.vendorDetailEnhanced2.overview}</TabsTrigger>
 <TabsTrigger value="participations">
 {t.vendorDetailEnhanced2.participationHistory}
 {totalParticipations > 0 && (
 <Badge variant="secondary" className="ms-2">{totalParticipations}</Badge>
 )}
 </TabsTrigger>
 <TabsTrigger value="evaluations">{t.vendorDetailEnhanced2.performanceEvaluations}</TabsTrigger>
 <TabsTrigger value="documents">{t.vendorDetailEnhanced2.documents}</TabsTrigger>
 <TabsTrigger value="activity">{t.vendorDetailEnhanced2.activityTimeline}</TabsTrigger>
 </TabsList>

 {/* Overview Tab */}
 <TabsContent value="overview">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* General Information */}
 <Card>
 <CardHeader>
 <CardTitle>{t.vendorDetailEnhanced2.generalInfo}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.vendorCode}</Label>
 <p className="font-medium">{vendor.vendorCode}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.vendorType}</Label>
 <p className="font-medium">{t[vendor.vendorType as keyof typeof t] || vendor.vendorType}</p>
 </div>
 </div>
 <Separator />
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.legalName}</Label>
 <p className="font-medium">{vendor.legalName || vendor.name}</p>
 </div>
 {vendor.tradeName && (
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.tradeName}</Label>
 <p className="font-medium">{vendor.tradeName}</p>
 </div>
 )}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.taxId}</Label>
 <p className="font-medium">{vendor.taxId || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.registrationNumber}</Label>
 <p className="font-medium">{vendor.registrationNumber || '-'}</p>
 </div>
 </div>
 <Separator />
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.contactPerson}</Label>
 <p className="font-medium">{vendor.contactPerson || '-'}</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex items-center gap-2">
 <Mail className="h-4 w-4 text-muted-foreground" />
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.email}</Label>
 <p className="font-medium text-sm">{vendor.email || '-'}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Phone className="h-4 w-4 text-muted-foreground" />
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.phone}</Label>
 <p className="font-medium text-sm">{vendor.phone || '-'}</p>
 </div>
 </div>
 </div>
 {vendor.website && (
 <div className="flex items-center gap-2">
 <Globe className="h-4 w-4 text-muted-foreground" />
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.website}</Label>
 <p className="font-medium text-sm">
 <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
 {vendor.website}
 </a>
 </p>
 </div>
 </div>
 )}
 {vendor.address && (
 <>
 <Separator />
 <div className="flex items-start gap-2">
 <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.address}</Label>
 <p className="font-medium">{vendor.address}</p>
 <p className="text-sm text-muted-foreground">
 {[vendor.city, vendor.country].filter(Boolean).join(', ')}
 </p>
 </div>
 </div>
 </>
 )}
 </CardContent>
 </Card>

 {/* Procurement Information */}
 <Card>
 <CardHeader>
 <CardTitle>{t.vendorDetailEnhanced2.procurementInfo}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.primaryCategory}</Label>
 <p className="font-medium">{vendor.primaryCategory || '-'}</p>
 </div>
 {vendor.procurementCategories && (
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.categories}</Label>
 <div className="flex flex-wrap gap-2 mt-2">
 {vendor.procurementCategories.split(',').map((cat: string, i: number) => (
 <Badge key={i} variant="outline">{cat.trim()}</Badge>
 ))}
 </div>
 </div>
 )}
 <Separator />
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.riskLevel}</Label>
 <Badge variant={
 vendor.riskLevel === 'low' ? 'default' :
 vendor.riskLevel === 'medium' ? 'secondary' : 'destructive'
 }>
 {t[vendor.riskLevel as keyof typeof t] || vendor.riskLevel || 'Low'}
 </Badge>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.complianceStatus}</Label>
 <Badge variant={vendor.complianceStatus === 'compliant' ? 'default' : 'destructive'}>
 {t[vendor.complianceStatus as keyof typeof t] || vendor.complianceStatus || 'Compliant'}
 </Badge>
 </div>
 </div>
 <Separator />
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.sanctionsScreened}</Label>
 <p className="font-medium">{vendor.sanctionsScreened ? 'Yes' : 'No'}</p>
 </div>
 {vendor.lastSanctionsScreeningDate && (
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.lastScreeningDate}</Label>
 <p className="font-medium">
 {new Date(vendor.lastSanctionsScreeningDate).toLocaleDateString()}
 </p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Financial Information */}
 <Card>
 <CardHeader>
 <CardTitle>{t.vendorDetailEnhanced2.financialInfo}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.financiallyActive}</Label>
 <p className="font-medium">{vendor.financiallyActive ? 'Yes' : 'No'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.approvalStatus}</Label>
 <Badge variant={vendor.approvalStatus === 'approved' ? 'default' : 'secondary'}>
 {t[vendor.approvalStatus as keyof typeof t] || vendor.approvalStatus || 'Pending'}
 </Badge>
 </div>
 </div>
 <Separator />
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.creditLimit}</Label>
 <p className="font-medium">${(vendor.creditLimit || 0).toLocaleString()}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.currentBalance}</Label>
 <p className="font-medium">${(vendor.currentBalance || 0).toLocaleString()}</p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.paymentTerms}</Label>
 <p className="font-medium">{vendor.paymentDays || 30} days</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.currency}</Label>
 <p className="font-medium">{vendor.currency || 'USD'}</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Bank Details */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <CreditCard className="h-5 w-5" />
 {t.vendorDetailEnhanced2.bankDetails}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.bankName}</Label>
 <p className="font-medium">{vendor.bankName || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.accountNumber}</Label>
 <p className="font-medium font-mono">{vendor.accountNumber || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.iban}</Label>
 <p className="font-medium font-mono">{vendor.iban || '-'}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.vendorDetailEnhanced2.swiftCode}</Label>
 <p className="font-medium font-mono">{vendor.swiftCode || '-'}</p>
 </div>
 </CardContent>
 </Card>
 </div>
 </TabsContent>

 {/* Participation History Tab */}
 <TabsContent value="participations">
 <Card>
 <CardHeader>
 <CardTitle>{t.vendorDetailEnhanced2.participationHistory}</CardTitle>
 <CardDescription>
 Complete history of RFQ, Tender, and Quotation participations
 </CardDescription>
 </CardHeader>
 <CardContent>
 {participationsQuery.isLoading ? (
 <div className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
 <p className="text-sm text-muted-foreground">{t.vendorDetailEnhanced2.loading}</p>
 </div>
 ) : !participationsQuery.data || participationsQuery.data.length === 0 ? (
 <div className="text-center py-8">
 <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
 <p className="text-muted-foreground">{t.vendorDetailEnhanced2.noParticipations}</p>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.vendorDetailEnhanced2.participationType}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.referenceNumber}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.submissionDate}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.technicalScore}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.financialScore}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.ranking}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.outcome}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {participationsQuery.data.map((participation: any) => (
 <TableRow key={participation.id}>
 <TableCell>
 <Badge variant="outline">{participation.participationType}</Badge>
 </TableCell>
 <TableCell className="font-mono text-sm">
 {participation.referenceNumber}
 </TableCell>
 <TableCell>
 {participation.submissionDate ? 
 new Date(participation.submissionDate).toLocaleDateString() : '-'}
 </TableCell>
 <TableCell>
 {participation.technicalScore ? 
 `${participation.technicalScore}/100` : '-'}
 </TableCell>
 <TableCell>
 {participation.financialScore ? 
 `${participation.financialScore}/100` : '-'}
 </TableCell>
 <TableCell>
 {participation.ranking ? `#${participation.ranking}` : '-'}
 </TableCell>
 <TableCell>
 <Badge variant={
 participation.awarded ? 'default' :
 participation.outcome === 'pending' ? 'secondary' : 'outline'
 }>
 {participation.awarded ? t.vendorDetailEnhanced2.awarded : 
 participation.outcome === 'pending' ? t.vendorDetailEnhanced2.pending : t.vendorDetailEnhanced2.notAwarded}
 </Badge>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Performance Evaluations Tab */}
 <TabsContent value="evaluations">
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle>{t.vendorDetailEnhanced2.performanceEvaluations}</CardTitle>
 <CardDescription>
 Periodic performance reviews and ratings
 </CardDescription>
 </div>
 <Button onClick={() => setShowEvaluationDialog(true)}>
 <Award className="h-4 w-4 me-2" />
 {t.vendorDetailEnhanced2.addEvaluation}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {evaluationsQuery.isLoading ? (
 <div className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
 <p className="text-sm text-muted-foreground">{t.vendorDetailEnhanced2.loading}</p>
 </div>
 ) : !evaluationsQuery.data || evaluationsQuery.data.length === 0 ? (
 <div className="text-center py-8">
 <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
 <p className="text-muted-foreground">{t.vendorDetailEnhanced2.noEvaluations}</p>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.vendorDetailEnhanced2.evaluationDate}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.evaluationPeriod}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.qualityScore}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.deliveryScore}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.complianceScore}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.overallRating}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.evaluatedBy}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {evaluationsQuery.data.map((evaluation: any) => (
 <TableRow key={evaluation.id}>
 <TableCell>
 {new Date(evaluation.evaluationDate).toLocaleDateString()}
 </TableCell>
 <TableCell>{evaluation.evaluationPeriod}</TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <span>{evaluation.qualityScore}/10</span>
 <Progress value={(evaluation.qualityScore / 10) * 100} className="w-16" />
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <span>{evaluation.deliveryScore}/10</span>
 <Progress value={(evaluation.deliveryScore / 10) * 100} className="w-16" />
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <span>{evaluation.complianceScore}/10</span>
 <Progress value={(evaluation.complianceScore / 10) * 100} className="w-16" />
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-1">
 <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
 <span className="font-semibold">{evaluation.overallRating}/5</span>
 </div>
 </TableCell>
 <TableCell>{evaluation.evaluatedBy || '-'}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Documents Tab */}
 <TabsContent value="documents">
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle>{t.vendorDetailEnhanced2.documents}</CardTitle>
 <CardDescription>
 Compliance certificates and supporting documents
 </CardDescription>
 </div>
 <Button onClick={() => setShowUploadDialog(true)}>
 <Upload className="h-4 w-4 me-2" />
 {t.vendorDetailEnhanced2.uploadDocument}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {documentsQuery.isLoading ? (
 <div className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
 <p className="text-sm text-muted-foreground">{t.vendorDetailEnhanced2.loading}</p>
 </div>
 ) : !documentsQuery.data || documentsQuery.data.length === 0 ? (
 <div className="text-center py-8">
 <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
 <p className="text-muted-foreground">{t.vendorDetailEnhanced2.noDocuments}</p>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.vendorDetailEnhanced2.documentType}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.documentNumber}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.issueDate}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.expiryDate}</TableHead>
 <TableHead>{t.vendorDetailEnhanced2.uploadedBy}</TableHead>
 <TableHead className="text-center">{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {documentsQuery.data.map((document: any) => (
 <TableRow key={document.id}>
 <TableCell>
 <Badge variant="outline">
 {t[document.documentType as keyof typeof t] || document.documentType}
 </Badge>
 </TableCell>
 <TableCell className="font-mono text-sm">
 {document.documentNumber || '-'}
 </TableCell>
 <TableCell>
 {document.issueDate ? 
 new Date(document.issueDate).toLocaleDateString() : '-'}
 </TableCell>
 <TableCell>
 {document.expiryDate ? (
 <span className={
 new Date(document.expiryDate) < new Date() ? 
 'text-red-600 font-semibold' : ''
 }>
 {new Date(document.expiryDate).toLocaleDateString()}
 </span>
 ) : '-'}
 </TableCell>
 <TableCell>{document.uploadedBy || '-'}</TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <Button variant="ghost" size="sm">
 <Eye className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm">
 <Download className="h-4 w-4" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Activity Timeline Tab */}
 <TabsContent value="activity">
 <Card>
 <CardHeader>
 <CardTitle>{t.vendorDetailEnhanced2.activityTimeline}</CardTitle>
 <CardDescription>
 Complete audit trail of vendor activities
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="text-center py-8">
 <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
 <p className="text-muted-foreground">{t.vendorDetailEnhanced2.noActivity}</p>
 <p className="text-sm text-muted-foreground mt-2">
 Activity timeline will be implemented in the next phase
 </p>
 </div>
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>

 {/* Upload Document Dialog */}
 <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.vendorDetailEnhanced2.uploadDocument}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.vendorDetailEnhanced2.documentType}</Label>
 <Select>
 <SelectTrigger>
 <SelectValue placeholder={t.placeholders.selectDocumentType} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="registration_certificate">{t.vendorDetailEnhanced2.registration_certificate}</SelectItem>
 <SelectItem value="tax_certificate">{t.vendorDetailEnhanced2.tax_certificate}</SelectItem>
 <SelectItem value="insurance_certificate">{t.vendorDetailEnhanced2.insurance_certificate}</SelectItem>
 <SelectItem value="quality_certificate">{t.vendorDetailEnhanced2.quality_certificate}</SelectItem>
 <SelectItem value="financial_statement">{t.vendorDetailEnhanced2.financial_statement}</SelectItem>
 <SelectItem value="other">{t.vendorDetailEnhanced2.other}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.vendorDetailEnhanced2.documentNumber}</Label>
 <Input placeholder={t.placeholders.documentNumber} />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.vendorDetailEnhanced2.issueDate}</Label>
 <Input type="date" />
 </div>
 <div>
 <Label>{t.vendorDetailEnhanced2.expiryDate}</Label>
 <Input type="date" />
 </div>
 </div>
 <div>
 <Label>File</Label>
 <Input type="file" />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
 Cancel
 </Button>
 <Button onClick={() => {
 toast.success(t.vendorDetailEnhanced2.uploadSuccess);
 setShowUploadDialog(false);
 }}>
 <Upload className="h-4 w-4 me-2" />
 Upload
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Add Evaluation Dialog */}
 <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
 <EvaluationDialogContent
 vendorId={parseInt(id!)}
 isRTL={isRTL}
 t={t}
 onClose={() => setShowEvaluationDialog(false)}
 onSuccess={() => {
 evaluationsQuery.refetch();
 setShowEvaluationDialog(false);
 }}
 />
 </Dialog>
 </div>
 );
}
