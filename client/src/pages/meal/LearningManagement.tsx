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
import { toast } from 'react-hot-toast';
import {
 ArrowLeft, ArrowRight, Plus, Edit, Trash2, Eye, BookOpen,
 Lightbulb, Star, FileText, Download
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function LearningManagement() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();

 const [showCreateDialog, setShowCreateDialog] = useState(false);
 const [showEditDialog, setShowEditDialog] = useState(false);
 const [showViewDialog, setShowViewDialog] = useState(false);
 const [showDeleteDialog, setShowDeleteDialog] = useState(false);
 const [selectedItem, setSelectedItem] = useState<any>(null);
 const [filterType, setFilterType] = useState('');
 const [filterStatus, setFilterStatus] = useState('');

 const [form, setForm] = useState({
 projectId: 0,
 type: 'lesson' as 'lesson' | 'best_practice' | 'product',
 title: '',
 context: '',
 rootCause: '',
 whatWorked: '',
 whatDidnt: '',
 recommendations: '',
 moduleSource: 'indicator' as 'indicator' | 'survey' | 'accountability' | 'cross_cutting',
 visibility: 'internal' as 'internal' | 'donor',
 status: 'draft' as 'draft' | 'submitted' | 'validated' | 'published' | 'archived',
 });

 const resetForm = () => {
 setForm({
 projectId: 0, type: 'lesson', title: '', context: '', rootCause: '',
 whatWorked: '', whatDidnt: '', recommendations: '',
 moduleSource: 'indicator', visibility: 'internal', status: 'draft',
 });
 };

 const { data: items = [], refetch } = trpc.mealLearning.list.useQuery({
 type: filterType ? filterType as any : undefined,
 status: filterStatus ? filterStatus as any : undefined,
 });

 const { data: stats } = trpc.mealLearning.stats.useQuery({});
 const { data: projects = [] } = trpc.projects.list.useQuery({});

 const createMutation = trpc.mealLearning.create.useMutation({
 onSuccess: () => {
 toast.success(t.meal.itemCreatedSuccessfully);
 setShowCreateDialog(false);
 resetForm();
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const updateMutation = trpc.mealLearning.update.useMutation({
 onSuccess: () => {
 toast.success(t.meal.itemUpdatedSuccessfully);
 setShowEditDialog(false);
 setSelectedItem(null);
 resetForm();
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const deleteMutation = trpc.mealLearning.delete.useMutation({
 onSuccess: () => {
 toast.success(t.meal.itemDeletedSuccessfully);
 setShowDeleteDialog(false);
 setSelectedItem(null);
 refetch();
 },
 onError: (e) => toast.error(e.message),
 });

 const handleCreate = () => {
 if (!form.title || !form.projectId) {
 toast.error(t.meal.pleaseFillRequiredFields);
 return;
 }
 createMutation.mutate(form);
 };

 const handleEdit = (item: any) => {
 setSelectedItem(item);
 setForm({
 projectId: item.projectId,
 type: item.type,
 title: item.title,
 context: item.context || '',
 rootCause: item.rootCause || '',
 whatWorked: item.whatWorked || '',
 whatDidnt: item.whatDidnt || '',
 recommendations: item.recommendations || '',
 moduleSource: item.moduleSource,
 visibility: item.visibility,
 status: item.status,
 });
 setShowEditDialog(true);
 };

 const handleUpdate = () => {
 if (!selectedItem) return;
 updateMutation.mutate({ id: selectedItem.id, ...form });
 };

 const handleView = (item: any) => {
 setSelectedItem(item);
 setShowViewDialog(true);
 };

 const labels = {
 title: t.meal.learningKnowledgeManagement,
 subtitle: t.meal.lessonsLearnedBestPracticesAndLearning,
 back: t.meal.backToMeal,
 addNew: t.meal.addNew,
 total: t.meal.total,
 lessons: t.meal.lessons,
 bestPractices: t.meal.bestPractices,
 products: t.meal.products,
 published: t.meal.published,
 draft: t.meal.draft,
 create: t.meal.createLearningItem,
 edit: t.meal.editLearningItem,
 view: t.meal.viewDetails,
 delete: t.meal.delete,
 confirmDelete: t.meal.areYouSureYouWantTo20,
 save: t.meal.save,
 cancel: t.meal.cancel,
 noItems: t.meal.noItemsFound,
 project: t.meal.project4,
 type: t.meal.type13,
 titleField: t.meal.title,
 context: t.meal.contextBackground,
 rootCause: t.meal.rootCause,
 whatWorked: t.meal.whatWorked,
 whatDidnt: t.meal.whatDidntWork,
 recommendations: t.meal.recommendations,
 moduleSource: t.meal.moduleSource,
 visibility: t.meal.visibility,
 status: t.meal.status,
 filterType: t.meal.filterByType,
 filterStatus: t.meal.filterByStatus,
 all: t.meal.all,
 export: t.meal.export,
 lesson: t.meal.lessonLearned,
 best_practice: t.meal.bestPractice,
 product: t.meal.learningProduct,
 };

 const typeLabels: Record<string, string> = {
 lesson: labels.lesson,
 best_practice: labels.best_practice,
 product: labels.product,
 };

 const statusColors: Record<string, string> = {
 draft: 'bg-gray-100 text-gray-700',
 submitted: 'bg-blue-100 text-blue-700',
 validated: 'bg-yellow-100 text-yellow-700',
 published: 'bg-green-100 text-green-700',
 archived: 'bg-red-100 text-red-700',
 };

 const typeIcons: Record<string, any> = {
 lesson: Lightbulb,
 best_practice: Star,
 product: FileText,
 };

 const handleExport = () => {
 const csv = [
 ['Title', 'Type', 'Status', 'Visibility', 'Module Source', 'Created At'].join(','),
 ...items.map((i: any) =>
 [i.title, i.type, i.status, i.visibility, i.moduleSource, new Date(i.createdAt).toLocaleDateString()].join(',')
 ),
 ].join('\n');
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = 'learning_items.csv';
 a.click();
 URL.revokeObjectURL(url);
 };

 // Form dialog content (shared between create and edit)
 const FormContent = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
 <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-2">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{labels.project} *</Label>
 <Select value={String(form.projectId || '')} onValueChange={(v) => setForm({ ...form, projectId: Number(v) })}>
 <SelectTrigger><SelectValue placeholder={labels.project} /></SelectTrigger>
 <SelectContent>
 {projects.map((p: any) => (
 <SelectItem key={p.id} value={String(p.id)}>{p.code} - {p.title}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{labels.type} *</Label>
 <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="lesson">{labels.lesson}</SelectItem>
 <SelectItem value="best_practice">{labels.best_practice}</SelectItem>
 <SelectItem value="product">{labels.product}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{labels.titleField} *</Label>
 <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{labels.moduleSource}</Label>
 <Select value={form.moduleSource} onValueChange={(v: any) => setForm({ ...form, moduleSource: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="indicator">{t.meal.indicator}</SelectItem>
 <SelectItem value="survey">{t.meal.survey}</SelectItem>
 <SelectItem value="accountability">{t.meal.accountability}</SelectItem>
 <SelectItem value="cross_cutting">{t.meal.crosscutting}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{labels.visibility}</Label>
 <Select value={form.visibility} onValueChange={(v: any) => setForm({ ...form, visibility: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="internal">{t.meal.internal}</SelectItem>
 <SelectItem value="donor">{t.meal.donorshareable}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{labels.context}</Label>
 <Textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} rows={3} />
 </div>
 <div>
 <Label>{labels.rootCause}</Label>
 <Textarea value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} rows={2} />
 </div>
 <div>
 <Label>{labels.whatWorked}</Label>
 <Textarea value={form.whatWorked} onChange={(e) => setForm({ ...form, whatWorked: e.target.value })} rows={2} />
 </div>
 <div>
 <Label>{labels.whatDidnt}</Label>
 <Textarea value={form.whatDidnt} onChange={(e) => setForm({ ...form, whatDidnt: e.target.value })} rows={2} />
 </div>
 <div>
 <Label>{labels.recommendations}</Label>
 <Textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} rows={2} />
 </div>
 <div>
 <Label>{labels.status}</Label>
 <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="draft">{t.meal.draft}</SelectItem>
 <SelectItem value="submitted">{t.meal.submitted}</SelectItem>
 <SelectItem value="validated">{t.meal.validated}</SelectItem>
 <SelectItem value="published">{t.meal.published}</SelectItem>
 <SelectItem value="archived">{t.meal.archived}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => { setShowCreateDialog(false); setShowEditDialog(false); }}>{labels.cancel}</Button>
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
 <BookOpen className="h-6 w-6 text-blue-600" /> {labels.title}
 </h1>
 <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport}>
 <Download className="h-4 w-4 me-1" /> {labels.export}
 </Button>
 <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
 <Plus className="h-4 w-4 me-1" /> {labels.addNew}
 </Button>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-blue-600">{stats?.total || 0}</div>
 <div className="text-xs text-muted-foreground">{labels.total}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-amber-600">{stats?.lessons || 0}</div>
 <div className="text-xs text-muted-foreground">{labels.lessons}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-green-600">{stats?.bestPractices || 0}</div>
 <div className="text-xs text-muted-foreground">{labels.bestPractices}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-purple-600">{stats?.products || 0}</div>
 <div className="text-xs text-muted-foreground">{labels.products}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-emerald-600">{stats?.published || 0}</div>
 <div className="text-xs text-muted-foreground">{labels.published}</div>
 </CardContent></Card>
 <Card><CardContent className="pt-4 text-center">
 <div className="text-2xl font-bold text-gray-600">{stats?.draft || 0}</div>
 <div className="text-xs text-muted-foreground">{labels.draft}</div>
 </CardContent></Card>
 </div>

 {/* Filters */}
 <div className="flex gap-4">
 <Select value={filterType || 'all'} onValueChange={(v) => setFilterType(v === 'all' ? '' : v)}>
 <SelectTrigger className="w-48"><SelectValue placeholder={labels.filterType} /></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{labels.all}</SelectItem>
 <SelectItem value="lesson">{labels.lesson}</SelectItem>
 <SelectItem value="best_practice">{labels.best_practice}</SelectItem>
 <SelectItem value="product">{labels.product}</SelectItem>
 </SelectContent>
 </Select>
 <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
 <SelectTrigger className="w-48"><SelectValue placeholder={labels.filterStatus} /></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{labels.all}</SelectItem>
 <SelectItem value="draft">{t.meal.draft}</SelectItem>
 <SelectItem value="submitted">{t.meal.submitted}</SelectItem>
 <SelectItem value="validated">{t.meal.validated}</SelectItem>
 <SelectItem value="published">{t.meal.published}</SelectItem>
 <SelectItem value="archived">{t.meal.archived}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Table */}
 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{labels.titleField}</TableHead>
 <TableHead>{labels.type}</TableHead>
 <TableHead>{labels.project}</TableHead>
 <TableHead>{labels.moduleSource}</TableHead>
 <TableHead>{labels.visibility}</TableHead>
 <TableHead>{labels.status}</TableHead>
 <TableHead className="text-center">{t.meal.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {items.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{labels.noItems}</TableCell>
 </TableRow>
 ) : (
 items.map((item: any) => {
 const TypeIcon = typeIcons[item.type] || FileText;
 const proj = projects.find((p: any) => p.id === item.projectId);
 return (
 <TableRow key={item.id}>
 <TableCell className="font-medium">
 <div className="flex items-center gap-2">
 <TypeIcon className="h-4 w-4 text-blue-500" />
 {item.title}
 </div>
 </TableCell>
 <TableCell><Badge variant="outline">{typeLabels[item.type] || item.type}</Badge></TableCell>
 <TableCell>{proj?.name || `#${item.projectId}`}</TableCell>
 <TableCell>{item.moduleSource}</TableCell>
 <TableCell>
 <Badge variant={item.visibility === 'donor' ? 'default' : 'secondary'}>
 {item.visibility === 'donor' ? (t.meal.donor) : (t.meal.internal)}
 </Badge>
 </TableCell>
 <TableCell>
 <Badge className={statusColors[item.status] || ''}>{item.status}</Badge>
 </TableCell>
 <TableCell>
 <div className="flex gap-1">
 <Button size="sm" variant="ghost" onClick={() => handleView(item)}><Eye className="h-4 w-4" /></Button>
 <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
 <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setSelectedItem(item); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
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

 {/* Create Dialog */}
 <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader><DialogTitle>{labels.create}</DialogTitle></DialogHeader>
 <FormContent onSubmit={handleCreate} submitLabel={labels.save} />
 </DialogContent>
 </Dialog>

 {/* Edit Dialog */}
 <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader><DialogTitle>{labels.edit}</DialogTitle></DialogHeader>
 <FormContent onSubmit={handleUpdate} submitLabel={labels.save} />
 </DialogContent>
 </Dialog>

 {/* View Dialog */}
 <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader><DialogTitle>{labels.view}</DialogTitle></DialogHeader>
 {selectedItem && (
 <div className="space-y-4 max-h-[60vh] overflow-y-auto">
 <div className="grid grid-cols-2 gap-4">
 <div><Label className="text-muted-foreground">{labels.titleField}</Label><p className="font-medium">{selectedItem.title}</p></div>
 <div><Label className="text-muted-foreground">{labels.type}</Label><p><Badge variant="outline">{typeLabels[selectedItem.type]}</Badge></p></div>
 <div><Label className="text-muted-foreground">{labels.status}</Label><p><Badge className={statusColors[selectedItem.status]}>{selectedItem.status}</Badge></p></div>
 <div><Label className="text-muted-foreground">{labels.visibility}</Label><p>{selectedItem.visibility}</p></div>
 <div><Label className="text-muted-foreground">{labels.moduleSource}</Label><p>{selectedItem.moduleSource}</p></div>
 </div>
 {selectedItem.context && <div><Label className="text-muted-foreground">{labels.context}</Label><p className="mt-1 text-sm">{selectedItem.context}</p></div>}
 {selectedItem.rootCause && <div><Label className="text-muted-foreground">{labels.rootCause}</Label><p className="mt-1 text-sm">{selectedItem.rootCause}</p></div>}
 {selectedItem.whatWorked && <div><Label className="text-muted-foreground">{labels.whatWorked}</Label><p className="mt-1 text-sm">{selectedItem.whatWorked}</p></div>}
 {selectedItem.whatDidnt && <div><Label className="text-muted-foreground">{labels.whatDidnt}</Label><p className="mt-1 text-sm">{selectedItem.whatDidnt}</p></div>}
 {selectedItem.recommendations && <div><Label className="text-muted-foreground">{labels.recommendations}</Label><p className="mt-1 text-sm">{selectedItem.recommendations}</p></div>}
 </div>
 )}
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation */}
 <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
 <DialogContent>
 <DialogHeader><DialogTitle>{labels.delete}</DialogTitle></DialogHeader>
 <p>{labels.confirmDelete}</p>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{labels.cancel}</Button>
 <Button variant="destructive" onClick={() => selectedItem && deleteMutation.mutate({ id: selectedItem.id })}>{labels.delete}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
