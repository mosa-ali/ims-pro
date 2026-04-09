import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
/**
 * Mitigation Actions Panel
 * Displays and manages mitigation actions for a specific risk
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, CheckCircle2, Clock, AlertCircle, X, MessageSquare, Paperclip, User } from "lucide-react";
import { format } from "date-fns";

interface MitigationActionsPanelProps {
 riskId: number;
 riskTitle: string;
}

export function MitigationActionsPanel({ riskId, riskTitle }: MitigationActionsPanelProps) {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [selectedAction, setSelectedAction] = useState<number | null>(null);

 const { data: actions = [], refetch } = trpc.mitigationActions.listByRisk.useQuery({ riskId });

 const statusColors = {
 pending: "bg-gray-100 text-gray-800",
 in_progress: "bg-blue-100 text-blue-800",
 completed: "bg-green-100 text-green-800",
 cancelled: "bg-red-100 text-red-800",
 overdue: "bg-orange-100 text-orange-800",
 };

 const priorityColors = {
 low: "bg-gray-100 text-gray-800",
 medium: "bg-yellow-100 text-yellow-800",
 high: "bg-orange-100 text-orange-800",
 critical: "bg-red-100 text-red-800",
 };

 const completedCount = actions.filter(a => a.status === "completed").length;
 const totalCount = actions.length;
 const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold">Mitigation Actions</h3>
 <p className="text-sm text-muted-foreground">{riskTitle}</p>
 </div>
 <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
 <DialogTrigger asChild>
 <Button>
 <Plus className="w-4 h-4 me-2" />
 Add Action
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>Create Mitigation Action</DialogTitle>
 </DialogHeader>
 <CreateActionForm 
 riskId={riskId} 
 onSuccess={() => {
 setIsCreateOpen(false);
 refetch();
 toast.success("Mitigation action created successfully");
 }}
 />
 </DialogContent>
 </Dialog>
 </div>

 {/* Overall Progress */}
 {totalCount > 0 && (
 <Card className="p-4">
 <div className="space-y-2">
 <div className="flex items-center justify-between text-sm">
 <span className="font-medium">Overall Progress</span>
 <span className="text-muted-foreground">
 {completedCount} of {totalCount} actions completed
 </span>
 </div>
 <Progress value={overallProgress} className="h-2" />
 <p className="text-xs text-muted-foreground text-end">{overallProgress}%</p>
 </div>
 </Card>
 )}

 {/* Actions List */}
 <div className="space-y-3">
 {actions.length === 0 ? (
 <Card className="p-8 text-center">
 <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
 <p className="text-muted-foreground">No mitigation actions yet</p>
 <p className="text-sm text-muted-foreground mt-1">
 Create your first action to start tracking mitigation progress
 </p>
 </Card>
 ) : (
 actions.map((action) => (
 <Card key={action.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
 onClick={() => setSelectedAction(action.id)}
 >
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1 space-y-2">
 <div className="flex items-center gap-2">
 <h4 className="font-medium">{action.title}</h4>
 <Badge className={statusColors[action.status as keyof typeof statusColors]}>
 {action.status.replace("_", " ")}
 </Badge>
 <Badge className={priorityColors[action.priority as keyof typeof priorityColors]}>
 {action.priority}
 </Badge>
 </div>

 {action.description && (
 <p className="text-sm text-muted-foreground line-clamp-2">
 {action.description}
 </p>
 )}

 <div className="flex items-center gap-4 text-xs text-muted-foreground">
 {action.assignedToName && (
 <div className="flex items-center gap-1">
 <User className="w-3 h-3" />
 <span>{action.assignedToName}</span>
 </div>
 )}
 {action.deadline && (
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 <span>Due: {format(new Date(action.deadline), "MMM d, yyyy")}</span>
 </div>
 )}
 </div>

 <Progress value={action.progress} className="h-1.5" />
 </div>

 <div className="text-end">
 <div className="text-2xl font-bold text-primary">{action.progress}%</div>
 </div>
 </div>
 </Card>
 ))
 )}
 </div>

 {/* Action Details Dialog */}
 {selectedAction && (
 <ActionDetailsDialog
 actionId={selectedAction}
 onClose={() => setSelectedAction(null)}
 onUpdate={() => refetch()}
 />
 )}
 </div>
 );
}

/**
 * Create Action Form
 */
interface CreateActionFormProps {
 riskId: number;
 onSuccess: () => void;
}

function CreateActionForm({ riskId, onSuccess }: CreateActionFormProps) {
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
 const [deadline, setDeadline] = useState("");
 const [assignedTo, setAssignedTo] = useState<number | undefined>();

 const createMutation = trpc.mitigationActions.create.useMutation();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!title.trim()) {
 toast.error("Title is required");
 return;
 }

 try {
 await createMutation.mutateAsync({
 riskId,
 title: title.trim(),
 description: description.trim() || undefined,
 priority,
 deadline: deadline || undefined,
 assignedTo,
 });
 onSuccess();
 } catch (error) {
 toast.error("Failed to create mitigation action");
 console.error(error);
 }
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <Label htmlFor="title">Action Title *</Label>
 <Input
 id="title"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder={t.placeholders.eGImplementBudgetMonitoringDashboard}
 required
 />
 </div>

 <div>
 <Label htmlFor="description">Description</Label>
 <Textarea
 id="description"
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder={t.placeholders.describeTheMitigationActionInDetail}
 rows={3}
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="priority">Priority</Label>
 <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="low">Low</SelectItem>
 <SelectItem value="medium">Medium</SelectItem>
 <SelectItem value="high">High</SelectItem>
 <SelectItem value="critical">Critical</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label htmlFor="deadline">Deadline</Label>
 <Input
 id="deadline"
 type="date"
 value={deadline}
 onChange={(e) => setDeadline(e.target.value)}
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button type="submit" disabled={createMutation.isPending}>
 {createMutation.isPending ? "Creating..." : "Create Action"}
 </Button>
 </div>
 </form>
 );
}

/**
 * Action Details Dialog
 */
interface ActionDetailsDialogProps {
 actionId: number;
 onClose: () => void;
 onUpdate: () => void;
}

function ActionDetailsDialog({ actionId, onClose, onUpdate }: ActionDetailsDialogProps) {
 const [comment, setComment] = useState("");
 const [progressUpdate, setProgressUpdate] = useState("");

 const { data: action, refetch } = trpc.mitigationActions.getById.useQuery({ id: actionId });
 const addCommentMutation = trpc.mitigationActions.addComment.useMutation();
 const updateMutation = trpc.mitigationActions.update.useMutation();

 const handleAddComment = async () => {
 if (!comment.trim()) {
 toast.error("Comment cannot be empty");
 return;
 }

 try {
 await addCommentMutation.mutateAsync({
 actionId,
 comment: comment.trim(),
 progressUpdate: progressUpdate ? parseInt(progressUpdate) : undefined,
 });
 setComment("");
 setProgressUpdate("");
 refetch();
 onUpdate();
 toast.success("Comment added successfully");
 } catch (error) {
 toast.error("Failed to add comment");
 console.error(error);
 }
 };

 const handleStatusChange = async (newStatus: string) => {
 try {
 await updateMutation.mutateAsync({
 id: actionId,
 status: newStatus as any,
 });
 refetch();
 onUpdate();
 toast.success("Status updated successfully");
 } catch (error) {
 toast.error("Failed to update status");
 console.error(error);
 }
 };

 if (!action) {
 return null;
 }

 return (
 <Dialog open={true} onOpenChange={onClose}>
 <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{action.title}</DialogTitle>
 </DialogHeader>

 <div className="space-y-6">
 {/* Status & Progress */}
 <div className="flex items-center gap-4">
 <div className="flex-1">
 <Label>Status</Label>
 <Select value={action.status} onValueChange={handleStatusChange}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="pending">Pending</SelectItem>
 <SelectItem value="in_progress">In Progress</SelectItem>
 <SelectItem value="completed">Completed</SelectItem>
 <SelectItem value="cancelled">Cancelled</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="flex-1">
 <Label>Progress</Label>
 <div className="flex items-center gap-2">
 <Progress value={action.progress} className="flex-1" />
 <span className="text-sm font-medium">{action.progress}%</span>
 </div>
 </div>
 </div>

 {/* Description */}
 {action.description && (
 <div>
 <Label>Description</Label>
 <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
 </div>
 )}

 {/* Comments */}
 <div>
 <Label>Progress Updates & Comments</Label>
 <div className="space-y-3 mt-2">
 {action.comments.length === 0 ? (
 <p className="text-sm text-muted-foreground">No comments yet</p>
 ) : (
 action.comments.map((c) => (
 <Card key={c.id} className="p-3">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <p className="text-sm">{c.comment}</p>
 {c.progressUpdate !== null && (
 <Badge variant="outline" className="mt-2">
 Progress: {c.progressUpdate}%
 </Badge>
 )}
 </div>
 <div className="text-xs text-muted-foreground text-end">
 <div>{c.createdByName}</div>
 <div>{format(new Date(c.createdAt), "MMM d, yyyy HH:mm")}</div>
 </div>
 </div>
 </Card>
 ))
 )}
 </div>

 {/* Add Comment */}
 <div className="mt-4 space-y-2">
 <Textarea
 value={comment}
 onChange={(e) => setComment(e.target.value)}
 placeholder={t.placeholders.addAProgressUpdateOrComment}
 rows={2}
 />
 <div className="flex items-center gap-2">
 <Input
 type="number"
 min="0"
 max="100"
 value={progressUpdate}
 onChange={(e) => setProgressUpdate(e.target.value)}
 placeholder={t.placeholders.progress}
 className="w-32"
 />
 <Button 
 onClick={handleAddComment} 
 disabled={addCommentMutation.isPending}
 size="sm"
 >
 <MessageSquare className="w-4 h-4 me-2" />
 Add Comment
 </Button>
 </div>
 </div>
 </div>

 {/* Attachments */}
 <div>
 <Label>Attachments</Label>
 {action.attachments.length === 0 ? (
 <p className="text-sm text-muted-foreground mt-1">No attachments</p>
 ) : (
 <div className="space-y-2 mt-2">
 {action.attachments.map((att) => (
 <Card key={att.id} className="p-3">
 <div className="flex items-center gap-2">
 <Paperclip className="w-4 h-4 text-muted-foreground" />
 <a 
 href={att.fileUrl} 
 target="_blank" 
 rel="noopener noreferrer"
 className="text-sm text-primary hover:underline flex-1"
 >
 {att.fileName}
 </a>
 <span className="text-xs text-muted-foreground">
 {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ""}
 </span>
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
