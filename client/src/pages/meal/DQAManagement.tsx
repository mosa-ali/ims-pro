import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from '@/lib/router-compat';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import {
 ArrowLeft, ArrowRight, Plus, Edit, Trash2, Eye, ShieldCheck,
 ClipboardCheck, AlertTriangle, CheckCircle, Download
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function DQAManagement() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();

 const [activeTab, setActiveTab] = useState('visits');
 const [showCreateVisitDialog, setShowCreateVisitDialog] = useState(false);
 const [showEditVisitDialog, setShowEditVisitDialog] = useState(false);
 const [showViewVisitDialog, setShowViewVisitDialog] = useState(false);
 const [showDeleteDialog, setShowDeleteDialog] = useState(false);
 const [selectedVisit, setSelectedVisit] = useState<any>(null);
 const [deleteTarget, setDeleteTarget] = useState<{type: string; id: number} | null>(null);

 // Findings dialogs
 const [showCreateFindingDialog, setShowCreateFindingDialog] = useState(false);
 const [showEditFindingDialog, setShowEditFindingDialog] = useState(false);
 const [selectedFinding, setSelectedFinding] = useState<any>(null);

 // Filters
 const [filterStatus, setFilterStatus] = useState('');

 // Visit form
 const [visitForm, setVisitForm] = useState({
 projectId: 0,
 visitDate: new Date().toISOString().split('T')[0],
 dataSource: 'mixed' as 'survey' | 'indicator' | 'accountability' | 'mixed',
 samplingMethod: '',
 recordsCheckedCount: 0,
 accurateCount: 0,
 discrepanciesCount: 0,
 missingFieldsCount: 0,
 duplicatesCount: 0,
 summary: '',
 status: 'draft' as 'draft' | 'submitted' | 'approved' | 'closed',
 });

 const resetVisitForm = () => {
 setVisitForm({
 projectId: 0, visitDate: new Date().toISOString().split('T')[0],
 dataSource: 'mixed', samplingMethod: '', recordsCheckedCount: 0,
 accurateCount: 0, discrepanciesCount: 0, missingFieldsCount: 0,
 duplicatesCount: 0, summary: '', status: 'draft',
 });
 };

 // Finding form
 const [findingForm, setFindingForm] = useState({
 dqaVisitId: 0,
 severity: 'medium' as 'low' | 'medium' | 'high',
 category: 'accuracy' as 'completeness' | 'accuracy' | 'timeliness' | 'integrity' | 'validity',
 findingText: '',
 recommendationText: '',
 });

 const { data: visits = [], refetch: refetchVisits } = trpc.mealDqa.listVisits.useQuery({
 status: filterStatus ? filterStatus as any : undefined,
 });
 const { data: stats } = trpc.mealDqa.stats.useQuery({});
 const { data: projects = [] } = trpc.projects.list.useQuery({});

 // Findings for selected visit
 const { data: findings = [], refetch: refetchFindings } = trpc.mealDqa.listFindings.useQuery(
 { dqaVisitId: selectedVisit?.id || 0 },
 { enabled: !!selectedVisit }
 );

 const createVisitMutation = trpc.mealDqa.createVisit.useMutation({
 onSuccess: () => {
 toast.success(t.meal.dqaVisitCreatedSuccessfully);
 setShowCreateVisitDialog(false);
 resetVisitForm();
 refetchVisits();
 },
 onError: (e) => toast.error(e.message),
 });

 const updateVisitMutation = trpc.mealDqa.updateVisit.useMutation({
 onSuccess: () => {
 toast.success(t.meal.visitUpdatedSuccessfully);
 setShowEditVisitDialog(false);
 refetchVisits();
 },
 onError: (e) => toast.error(e.message),
 });

 const deleteVisitMutation = trpc.mealDqa.deleteVisit.useMutation({
 onSuccess: () => {
 toast.success(t.meal.visitDeleted);
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 refetchVisits();
 },
 onError: (e) => toast.error(e.message),
 });

 const createFindingMutation = trpc.mealDqa.createFinding.useMutation({
 onSuccess: () => {
 toast.success(t.meal.findingAdded);
 setShowCreateFindingDialog(false);
 refetchFindings();
 },
 onError: (e) => toast.error(e.message),
 });

 const updateFindingMutation = trpc.mealDqa.updateFinding.useMutation({
 onSuccess: () => {
 toast.success(t.meal.findingUpdated);
 setShowEditFindingDialog(false);
 refetchFindings();
 },
 onError: (e) => toast.error(e.message),
 });

 const deleteFindingMutation = trpc.mealDqa.deleteFinding.useMutation({
 onSuccess: () => {
 toast.success(t.meal.findingDeleted);
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 refetchFindings();
 },
 onError: (e) => toast.error(e.message),
 });

 const handleCreateVisit = () => {
 if (!visitForm.projectId) {
 toast.error(t.meal.pleaseSelectAProject2);
 return;
 }
 createVisitMutation.mutate(visitForm);
 };

 const handleEditVisit = (visit: any) => {
 setSelectedVisit(visit);
 setVisitForm({
 projectId: visit.projectId,
 visitDate: visit.visitDate ? new Date(visit.visitDate).toISOString().split('T')[0] : '',
 dataSource: visit.dataSource,
 samplingMethod: visit.samplingMethod || '',
 recordsCheckedCount: visit.recordsCheckedCount || 0,
 accurateCount: visit.accurateCount || 0,
 discrepanciesCount: visit.discrepanciesCount || 0,
 missingFieldsCount: visit.missingFieldsCount || 0,
 duplicatesCount: visit.duplicatesCount || 0,
 summary: visit.summary || '',
 status: visit.status,
 });
 setShowEditVisitDialog(true);
 };

 const handleUpdateVisit = () => {
 if (!selectedVisit) return;
 updateVisitMutation.mutate({ id: selectedVisit.id, ...visitForm });
 };

 const handleViewVisit = (visit: any) => {
 setSelectedVisit(visit);
 setShowViewVisitDialog(true);
 };

 const handleDelete = () => {
 if (!deleteTarget) return;
 if (deleteTarget.type === 'visit') deleteVisitMutation.mutate({ id: deleteTarget.id });
 else if (deleteTarget.type === 'finding') deleteFindingMutation.mutate({ id: deleteTarget.id });
 };

 const handleExport = () => {
 const csv = [
 ['DQA Code', 'Visit Date', 'Data Source', 'Records Checked', 'Accurate', 'Discrepancies', 'Status'].join(','),
 ...visits.map((v: any) =>
 [v.dqaCode, new Date(v.visitDate).toLocaleDateString(), v.dataSource, v.recordsCheckedCount, v.accurateCount, v.discrepanciesCount, v.status].join(',')
 ),
 ].join('\n');
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = 'dqa_visits.csv';
 a.click();
 URL.revokeObjectURL(url);
 };

 const labels = {
 title: t.meal.dataQualityAssuranceDqa,
 subtitle: t.meal.dataVerificationSpotChecksAndQuality,
 back: t.meal.backToMeal,
 visits: t.meal.visits,
 findings: t.meal.findings,
 addVisit: t.meal.addVisit,
 addFinding: t.meal.addFinding,
 save: t.meal.save,
 cancel: t.meal.cancel,
 delete: t.meal.delete,
 confirmDelete: t.meal.areYouSureYouWantTo3,
 noVisits: t.meal.noVisitsFound,
 noFindings: t.meal.noFindingsFound,
 export: t.meal.export,
 };

 const statusColors: Record<string, string> = {
 draft: 'bg-gray-100 text-gray-700',
 submitted: 'bg-blue-100 text-blue-700',
 approved: 'bg-green-100 text-green-700',
 closed: 'bg-red-100 text-red-700',
 };

 const severityColors: Record<string, string> = {
 low: 'bg-green-100 text-green-700',
 medium: 'bg-yellow-100 text-yellow-700',
 high: 'bg-red-100 text-red-700',
 };

 // Visit form dialog content
 const VisitFormContent = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
 <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-2">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.meal.project4} *</Label>
 <Select value={String(visitForm.projectId || '')} onValueChange={(v) => setVisitForm({ ...visitForm, projectId: Number(v) })}>
 <SelectTrigger><SelectValue placeholder={t.meal.selectProject} /></SelectTrigger>
 <SelectContent>
 {projects.map((p: any) => (
 <SelectItem key={p.id} value={String(p.id)}>{p.code} - {p.title}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.meal.visitDate}</Label>
 <Input type="date" value={visitForm.visitDate} onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })} />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.meal.dataSource}</Label>
 <Select value={visitForm.dataSource} onValueChange={(v: any) => setVisitForm({ ...visitForm, dataSource: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="survey">{t.meal.survey}</SelectItem>
 <SelectItem value="indicator">{t.meal.indicator}</SelectItem>
 <SelectItem value="accountability">{t.meal.accountability}</SelectItem>
 <SelectItem value="mixed">{t.meal.mixed}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.meal.samplingMethod}</Label>
 <Input value={visitForm.samplingMethod} onChange={(e) => setVisitForm({ ...visitForm, samplingMethod: e.target.value })} />
 </div>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 <div>
 <Label>{t.meal.recordsChecked}</Label>
 <Input type="number" value={visitForm.recordsCheckedCount} onChange={(e) => setVisitForm({ ...visitForm, recordsCheckedCount: Number(e.target.value) })} />
 </div>
 <div>
 <Label>{t.meal.accurate}</Label>
 <Input type="number" value={visitForm.accurateCount} onChange={(e) => setVisitForm({ ...visitForm, accurateCount: Number(e.target.value) })} />
 </div>
 <div>
 <Label>{t.meal.discrepancies}</Label>
 <Input type="number" value={visitForm.discrepanciesCount} onChange={(e) => setVisitForm({ ...visitForm, discrepanciesCount: Number(e.target.value) })} />
 </div>
 <div>
 <Label>{t.meal.missingFields}</Label>
 <Input type="number" value={visitForm.missingFieldsCount} onChange={(e) => setVisitForm({ ...visitForm, missingFieldsCount: Number(e.target.value) })} />
 </div>
 <div>
 <Label>{t.meal.duplicates}</Label>
 <Input type="number" value={visitForm.duplicatesCount} onChange={(e) => setVisitForm({ ...visitForm, duplicatesCount: Number(e.target.value) })} />
 </div>
 </div>
 <div>
 <Label>{t.meal.summary}</Label>
 <Textarea value={visitForm.summary} onChange={(e) => setVisitForm({ ...visitForm, summary: e.target.value })} rows={3} />
 </div>
 <div>
 <Label>{t.meal.status}</Label>
 <Select value={visitForm.status} onValueChange={(v: any) => setVisitForm({ ...visitForm, status: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="draft">{t.meal.draft}</SelectItem>
 <SelectItem value="submitted">{t.meal.submitted}</SelectItem>
 <SelectItem value="approved">{t.meal.approved}</SelectItem>
 <SelectItem value="closed">{t.meal.closed}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => { setShowCreateVisitDialog(false); setShowEditVisitDialog(false); }}>{labels.cancel}</Button>
 <Button onClick={onSubmit}>{submitLabel}</Button>
 </DialogFooter>
 </div>
 );

 return (
 <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal')} label={labels.back} />

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <ShieldCheck className="h-6 w-6 text-blue-600" /> {labels.title}
 </h1>
 <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport}>
 <Download className="h-4 w-4 me-1" /> {labels.export}
 </Button>
 <Button onClick={() => { resetVisitForm(); setShowCreateVisitDialog(true); }}>
 <Plus className="h-4 w-4 me-1" /> {labels.addVisit}
 </Button>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-blue-600">{stats?.totalVisits || 0}</div>
 <div className="text-xs text-muted-foreground">{t.meal.totalVisits}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-purple-600">{stats?.totalRecordsChecked || 0}</div>
 <div className="text-xs text-muted-foreground">{t.meal.recordsChecked}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-green-600">{stats?.accuracyRate || 0}%</div>
 <div className="text-xs text-muted-foreground">{t.meal.accuracyRate}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-amber-600">{stats?.totalDiscrepancies || 0}</div>
 <div className="text-xs text-muted-foreground">{t.meal.discrepancies}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-emerald-600">{stats?.approved || 0}</div>
 <div className="text-xs text-muted-foreground">{t.meal.approved}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-gray-600">{stats?.pending || 0}</div>
 <div className="text-xs text-muted-foreground">{t.meal.pending}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-orange-600">{stats?.totalFindings || 0}</div>
 <div className="text-xs text-muted-foreground">{t.meal.findings}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-red-600">{stats?.highSeverity || 0}</div>
 <div className="text-xs text-muted-foreground">{t.meal.highSeverity}</div>
 </CardContent></Card>
 </div>

 {/* Filter */}
 <div className="flex gap-4">
 <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
 <SelectTrigger className="w-48"><SelectValue placeholder={t.meal.filterByStatus} /></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.meal.all}</SelectItem>
 <SelectItem value="draft">{t.meal.draft}</SelectItem>
 <SelectItem value="submitted">{t.meal.submitted}</SelectItem>
 <SelectItem value="approved">{t.meal.approved}</SelectItem>
 <SelectItem value="closed">{t.meal.closed}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Visits Table */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <ClipboardCheck className="h-5 w-5" />
 {t.meal.dqaVisits}
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.meal.code}</TableHead>
 <TableHead>{t.meal.project4}</TableHead>
 <TableHead>{t.meal.date5}</TableHead>
 <TableHead>{t.meal.dataSource}</TableHead>
 <TableHead>{t.meal.records}</TableHead>
 <TableHead>{t.meal.accuracy}</TableHead>
 <TableHead>{t.meal.status}</TableHead>
 <TableHead className="text-center">{t.meal.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {visits.length === 0 ? (
 <TableRow>
 <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{labels.noVisits}</TableCell>
 </TableRow>
 ) : (
 visits.map((visit: any) => {
 const proj = projects.find((p: any) => p.id === visit.projectId);
 const accuracy = visit.recordsCheckedCount > 0
 ? Math.round((visit.accurateCount / visit.recordsCheckedCount) * 100)
 : 0;
 return (
 <TableRow key={visit.id}>
 <TableCell className="font-mono font-medium">{visit.dqaCode}</TableCell>
 <TableCell>{proj?.name || `#${visit.projectId}`}</TableCell>
 <TableCell>{new Date(visit.visitDate).toLocaleDateString()}</TableCell>
 <TableCell><Badge variant="outline">{visit.dataSource}</Badge></TableCell>
 <TableCell>{visit.recordsCheckedCount}</TableCell>
 <TableCell>
 <span className={accuracy >= 80 ? 'text-green-600 font-medium' : accuracy >= 50 ? 'text-yellow-600 font-medium' : 'text-red-600 font-medium'}>
 {accuracy}%
 </span>
 </TableCell>
 <TableCell><Badge className={statusColors[visit.status] || ''}>{visit.status}</Badge></TableCell>
 <TableCell>
 <div className="flex gap-1">
 <Button size="sm" variant="ghost" onClick={() => handleViewVisit(visit)}><Eye className="h-4 w-4" /></Button>
 <Button size="sm" variant="ghost" onClick={() => handleEditVisit(visit)}><Edit className="h-4 w-4" /></Button>
 <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setDeleteTarget({ type: 'visit', id: visit.id }); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
 </div>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* Create Visit Dialog */}
 <Dialog open={showCreateVisitDialog} onOpenChange={setShowCreateVisitDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader><DialogTitle>{t.meal.createDqaVisit}</DialogTitle></DialogHeader>
 <VisitFormContent onSubmit={handleCreateVisit} submitLabel={labels.save} />
 </DialogContent>
 </Dialog>

 {/* Edit Visit Dialog */}
 <Dialog open={showEditVisitDialog} onOpenChange={setShowEditVisitDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader><DialogTitle>{t.meal.editDqaVisit}</DialogTitle></DialogHeader>
 <VisitFormContent onSubmit={handleUpdateVisit} submitLabel={labels.save} />
 </DialogContent>
 </Dialog>

 {/* View Visit Dialog with Findings */}
 <Dialog open={showViewVisitDialog} onOpenChange={setShowViewVisitDialog}>
 <DialogContent className="max-w-3xl">
 <DialogHeader><DialogTitle>{t.meal.dqaVisitDetails}</DialogTitle></DialogHeader>
 {selectedVisit && (
 <div className="space-y-4 max-h-[60vh] overflow-y-auto">
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 <div><Label className="text-muted-foreground">{t.meal.code}</Label><p className="font-mono font-medium">{selectedVisit.dqaCode}</p></div>
 <div><Label className="text-muted-foreground">{t.meal.date5}</Label><p>{new Date(selectedVisit.visitDate).toLocaleDateString()}</p></div>
 <div><Label className="text-muted-foreground">{t.meal.status}</Label><p><Badge className={statusColors[selectedVisit.status]}>{selectedVisit.status}</Badge></p></div>
 <div><Label className="text-muted-foreground">{t.meal.recordsChecked}</Label><p className="font-medium">{selectedVisit.recordsCheckedCount}</p></div>
 <div><Label className="text-muted-foreground">{t.meal.accurate}</Label><p className="font-medium text-green-600">{selectedVisit.accurateCount}</p></div>
 <div><Label className="text-muted-foreground">{t.meal.discrepancies}</Label><p className="font-medium text-red-600">{selectedVisit.discrepanciesCount}</p></div>
 </div>
 {selectedVisit.summary && <div><Label className="text-muted-foreground">{t.meal.summary}</Label><p className="text-sm mt-1">{selectedVisit.summary}</p></div>}

 {/* Findings section */}
 <div className="border-t pt-4">
 <div className="flex items-center justify-between mb-3">
 <h3 className="font-semibold flex items-center gap-2">
 <AlertTriangle className="h-4 w-4" />
 {t.meal.findings} ({findings.length})
 </h3>
 <Button size="sm" onClick={() => {
 setFindingForm({ dqaVisitId: selectedVisit.id, severity: 'medium', category: 'accuracy', findingText: '', recommendationText: '' });
 setShowCreateFindingDialog(true);
 }}>
 <Plus className="h-3 w-3 me-1" /> {labels.addFinding}
 </Button>
 </div>
 {findings.length === 0 ? (
 <p className="text-muted-foreground text-sm text-center py-4">{labels.noFindings}</p>
 ) : (
 <div className="space-y-2">
 {findings.map((f: any) => (
 <div key={f.id} className="border rounded-lg p-3 flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <Badge className={severityColors[f.severity]}>{f.severity}</Badge>
 <Badge variant="outline">{f.category}</Badge>
 </div>
 <p className="text-sm">{f.findingText}</p>
 {f.recommendationText && <p className="text-xs text-muted-foreground mt-1">{t.meal.recommendation} {f.recommendationText}</p>}
 </div>
 <div className="flex gap-1 ms-2">
 <Button size="sm" variant="ghost" onClick={() => {
 setSelectedFinding(f);
 setFindingForm({ dqaVisitId: f.dqaVisitId, severity: f.severity, category: f.category, findingText: f.findingText, recommendationText: f.recommendationText || '' });
 setShowEditFindingDialog(true);
 }}><Edit className="h-3 w-3" /></Button>
 <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setDeleteTarget({ type: 'finding', id: f.id }); setShowDeleteDialog(true); }}><Trash2 className="h-3 w-3" /></Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>

 {/* Create Finding Dialog */}
 <Dialog open={showCreateFindingDialog} onOpenChange={setShowCreateFindingDialog}>
 <DialogContent>
 <DialogHeader><DialogTitle>{t.meal.addFinding}</DialogTitle></DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.meal.severity6}</Label>
 <Select value={findingForm.severity} onValueChange={(v: any) => setFindingForm({ ...findingForm, severity: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="low">{t.meal.low}</SelectItem>
 <SelectItem value="medium">{t.meal.medium}</SelectItem>
 <SelectItem value="high">{t.meal.high7}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.meal.category}</Label>
 <Select value={findingForm.category} onValueChange={(v: any) => setFindingForm({ ...findingForm, category: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="completeness">{t.meal.completeness}</SelectItem>
 <SelectItem value="accuracy">{t.meal.accuracy}</SelectItem>
 <SelectItem value="timeliness">{t.meal.timeliness}</SelectItem>
 <SelectItem value="integrity">{t.meal.integrity}</SelectItem>
 <SelectItem value="validity">{t.meal.validity}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.meal.findingText} *</Label>
 <Textarea value={findingForm.findingText} onChange={(e) => setFindingForm({ ...findingForm, findingText: e.target.value })} rows={3} />
 </div>
 <div>
 <Label>{t.meal.recommendation8}</Label>
 <Textarea value={findingForm.recommendationText} onChange={(e) => setFindingForm({ ...findingForm, recommendationText: e.target.value })} rows={2} />
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowCreateFindingDialog(false)}>{labels.cancel}</Button>
 <Button onClick={() => {
 if (!findingForm.findingText) { toast.error(t.meal.pleaseEnterFindingText); return; }
 createFindingMutation.mutate(findingForm);
 }}>{labels.save}</Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 {/* Edit Finding Dialog */}
 <Dialog open={showEditFindingDialog} onOpenChange={setShowEditFindingDialog}>
 <DialogContent>
 <DialogHeader><DialogTitle>{t.meal.editFinding}</DialogTitle></DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.meal.severity6}</Label>
 <Select value={findingForm.severity} onValueChange={(v: any) => setFindingForm({ ...findingForm, severity: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="low">{t.meal.low}</SelectItem>
 <SelectItem value="medium">{t.meal.medium}</SelectItem>
 <SelectItem value="high">{t.meal.high7}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.meal.category}</Label>
 <Select value={findingForm.category} onValueChange={(v: any) => setFindingForm({ ...findingForm, category: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="completeness">{t.meal.completeness}</SelectItem>
 <SelectItem value="accuracy">{t.meal.accuracy}</SelectItem>
 <SelectItem value="timeliness">{t.meal.timeliness}</SelectItem>
 <SelectItem value="integrity">{t.meal.integrity}</SelectItem>
 <SelectItem value="validity">{t.meal.validity}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.meal.findingText} *</Label>
 <Textarea value={findingForm.findingText} onChange={(e) => setFindingForm({ ...findingForm, findingText: e.target.value })} rows={3} />
 </div>
 <div>
 <Label>{t.meal.recommendation8}</Label>
 <Textarea value={findingForm.recommendationText} onChange={(e) => setFindingForm({ ...findingForm, recommendationText: e.target.value })} rows={2} />
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowEditFindingDialog(false)}>{labels.cancel}</Button>
 <Button onClick={() => {
 if (!selectedFinding) return;
 updateFindingMutation.mutate({ id: selectedFinding.id, ...findingForm });
 }}>{labels.save}</Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation */}
 <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
 <DialogContent>
 <DialogHeader><DialogTitle>{labels.delete}</DialogTitle></DialogHeader>
 <p>{labels.confirmDelete}</p>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{labels.cancel}</Button>
 <Button variant="destructive" onClick={handleDelete}>{labels.delete}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
