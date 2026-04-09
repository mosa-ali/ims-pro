import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContractCardProps {
 contractId: number;
 contractNumber: string;
 vendorName: string;
 contractValue: string;
 currency: string;
 status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'terminated';
 paymentStructure: string;
 retentionPercentage: string;
 startDate: string;
 endDate: string;
 signedFileUrl?: string;
 onStatusChange?: () => void;
}

const statusConfig = {
 draft: { label: 'Draft', color: 'bg-gray-100', textColor: 'text-gray-800', icon: FileText },
 pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100', textColor: 'text-yellow-800', icon: Clock },
 approved: { label: 'Approved', color: 'bg-green-100', textColor: 'text-green-800', icon: CheckCircle },
 active: { label: 'Active', color: 'bg-blue-100', textColor: 'text-blue-800', icon: CheckCircle },
 completed: { label: 'Completed', color: 'bg-slate-100', textColor: 'text-slate-800', icon: CheckCircle },
 terminated: { label: 'Terminated', color: 'bg-red-100', textColor: 'text-red-800', icon: AlertCircle },
};

export const ContractCard: React.FC<ContractCardProps> = ({
 contractId,
 contractNumber,
 vendorName,
 contractValue,
 currency,
 status,
 paymentStructure,
 retentionPercentage,
 startDate,
 endDate,
 signedFileUrl,
 onStatusChange,
}) => {
 const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
 const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

 const approveContractMutation = trpc.procurementPhaseA.contracts.approve.useMutation({
 onSuccess: () => {
 toast.success(`Contract ${approvalAction === 'approve' ? 'approved' : 'rejected'}`);
 setIsApprovalDialogOpen(false);
 setApprovalAction(null);
 onStatusChange?.();
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to update contract');
 },
 });

 const submitForApprovalMutation = trpc.procurementPhaseA.contracts.submitForApproval.useMutation({
 onSuccess: () => {
 toast.success('Contract submitted for approval');
 onStatusChange?.();
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to submit contract');
 },
 });

 const handleApprove = () => {
  const { language, isRTL } = useLanguage();
 setApprovalAction('approve');
 approveContractMutation.mutate({
 id: contractId,
 approve: true,
 });
 };

 const handleReject = () => {
 setApprovalAction('reject');
 approveContractMutation.mutate({
 id: contractId,
 approve: false,
 });
 };

 const handleSubmitForApproval = () => {
 submitForApprovalMutation.mutate({ id: contractId });
 };

 const config = statusConfig[status];
 const StatusIcon = config.icon;

 return (
 <Card className="w-full">
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <CardTitle className="text-lg font-semibold">{contractNumber}</CardTitle>
 <p className="text-sm text-muted-foreground mt-1">{vendorName}</p>
 </div>
 <Badge className={`${config.color} ${config.textColor}`}>
 <StatusIcon className="w-3 h-3 me-1 inline" />
 {config.label}
 </Badge>
 </div>
 </CardHeader>

 <CardContent className="space-y-4">
 {/* Contract Value */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-muted-foreground">{isRTL ? 'قيمة العقد' : 'Contract Value'}</p>
 <p className="text-lg font-semibold">
 {currency} {parseFloat(contractValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
 </p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{isRTL ? 'هيكل الدفع' : 'Payment Structure'}</p>
 <p className="text-sm font-medium capitalize">{paymentStructure.replace(/_/g, ' ')}</p>
 </div>
 </div>

 {/* Retention & Dates */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-muted-foreground">Retention %</p>
 <p className="text-sm font-medium">{retentionPercentage}%</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">Duration</p>
 <p className="text-xs text-muted-foreground">
 {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
 </p>
 </div>
 </div>

 {/* Signed Document */}
 {signedFileUrl && (
 <div className="pt-2 border-t">
 <a
 href={signedFileUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="text-sm text-blue-600 hover:underline flex items-center"
 >
 <FileText className="w-4 h-4 me-2" />
 View Signed Contract
 </a>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex gap-2 pt-4 border-t">
 {status === 'draft' && (
 <>
 <Button
 variant="outline"
 size="sm"
 className="flex-1"
 onClick={handleSubmitForApproval}
 disabled={submitForApprovalMutation.isPending}
 >
 Submit for Approval
 </Button>
 </>
 )}

 {status === 'pending_approval' && (
 <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
 <DialogTrigger asChild>
 <Button variant="outline" size="sm" className="flex-1">
 Review & Approve
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{isRTL ? 'موافقة العقد' : 'Contract Approval'}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <p className="text-sm text-muted-foreground">
 Contract {contractNumber} from {vendorName}
 </p>
 <div className="flex gap-2">
 <Button
 variant="default"
 className="flex-1"
 onClick={handleApprove}
 disabled={approveContractMutation.isPending}
 >
 Approve
 </Button>
 <Button
 variant="destructive"
 className="flex-1"
 onClick={handleReject}
 disabled={approveContractMutation.isPending}
 >
 Reject
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 )}

 {status === 'approved' && (
 <Button variant="outline" size="sm" className="flex-1" disabled>
 Contract Approved
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 );
};
