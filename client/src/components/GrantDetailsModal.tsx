import { X, Calendar, DollarSign, Building2, User, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumber } from '@/lib/utils/formatting';
import { trpc } from '@/lib/trpc';

import { Upload, Download, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { GrantProgressReportPrintModal } from './GrantProgressReportPrintModal';

interface GrantDetailsModalProps {
 isOpen: boolean;
 onClose: () => void;
 grant: any;
}

export function GrantDetailsModal({ isOpen, onClose, grant }: GrantDetailsModalProps) {
 const [showPrintModal, setShowPrintModal] = useState(false);
 
 // Upload state
 const [isUploading, setIsUploading] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);
 
 // Fetch real documents from database
 const { data: documents = [], refetch: refetchDocuments } = trpc.grants.listDocuments.useQuery({grantId: grant?.id || 0}, {
 enabled: !!grant?.id && isOpen, // Only fetch when modal is open and grant exists
 });

 // Upload mutation
 const uploadMutation = trpc.grants.uploadDocument.useMutation({onSuccess: () => {
 toast.success('Document uploaded successfully!');
 refetchDocuments();
 setIsUploading(false);},
 onError: (error) => {
 toast.error(error.message || 'Failed to upload document');
 setIsUploading(false);
 },
 });

 // Delete mutation
 const deleteMutation = trpc.grants.deleteDocument.useMutation({onSuccess: () => {
 toast.success('Document deleted successfully!');
 refetchDocuments();},
 onError: (error) => {
 toast.error(error.message || 'Failed to delete document');
 },
 });
 
 if (!isOpen || !grant) return null;

 // Calculate grant progress
 const startDate = new Date(grant.startDate);
 const endDate = new Date(grant.endDate);
 const today = new Date();
 const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
 const elapsedDays = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
 const progressPercentage = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);

 // Status badge styling
 const getStatusBadge = (status: string) => {
 const styles = {
 active: 'bg-green-100 text-green-800',
 completed: 'bg-blue-100 text-blue-800',
 pending: 'bg-yellow-100 text-yellow-800',
 on_hold: 'bg-gray-100 text-gray-800',
 };
 return styles[status as keyof typeof styles] || styles.pending;
 };

 // Mock milestones data (will be replaced with real data from database)
 const milestones = [
 {
 id: 1,
 name: 'Grant Agreement Signed',
 dueDate: grant.startDate,
 status: 'completed',
 type: 'Contract',
 },
 {
 id: 2,
 name: 'Q1 Progress Report',
 dueDate: new Date(new Date(grant.startDate).setMonth(new Date(grant.startDate).getMonth() + 3)).toISOString(),
 status: 'completed',
 type: 'Report',
 },
 {
 id: 3,
 name: 'Mid-term Evaluation',
 dueDate: new Date((startDate.getTime() + endDate.getTime()) / 2).toISOString(),
 status: 'pending',
 type: 'Audit',
 },
 {
 id: 4,
 name: 'Final Report',
 dueDate: grant.endDate,
 status: 'pending',
 type: 'Report',
 },
 ];



 // Handle file selection and upload
 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 // Validate file size (max 10MB)
 if (file.size > 10 * 1024 * 1024) {
 toast.error('File size must be less than 10MB');
 return;
 }

 setIsUploading(true);

 try {
 // Read file as base64
 const reader = new FileReader();
 reader.onload = async () => {
 const base64 = reader.result as string;
 
 // Determine category based on file extension
 const ext = file.name.split('.').pop()?.toLowerCase();
 let category: 'contractual' | 'financial' | 'programmatic' | 'reporting' | 'other' = 'other';
 if (ext === 'pdf' && file.name.toLowerCase().includes('agreement')) category = 'contractual';
 else if (['xlsx', 'xls', 'csv'].includes(ext || '')) category = 'financial';
 else if (['doc', 'docx'].includes(ext || '')) category = 'programmatic';

 // Upload via tRPC (which will handle S3 upload server-side)
 await uploadMutation.mutateAsync({
 grantId: grant.id,
 fileName: file.name,
 fileData: base64,
 fileSize: file.size,
 mimeType: file.type,
 category,
 status: 'draft',
 });
 };
 reader.onerror = () => {
 toast.error('Failed to read file');
 setIsUploading(false);
 };
 reader.readAsDataURL(file);
 } catch (error) {
 console.error('Upload error:', error);
 toast.error('Failed to upload file');
 setIsUploading(false);
 }

 // Reset input
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };

 // Handle document download
 const handleDownload = (doc: any) => {
 window.open(doc.fileUrl, '_blank');
 };

 // Handle document delete
 const handleDelete = async (docId: number) => {
 if (confirm('Are you sure you want to delete this document?')) {
 await deleteMutation.mutateAsync({ documentId: docId });
 }
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <h2 className="text-2xl font-bold text-gray-900">{grant.grantName}</h2>
 <Badge className={getStatusBadge(grant.status)}>
 {grant.status.replace('_', ' ').toUpperCase()}
 </Badge>
 </div>
 <p className="text-gray-600">Grant Number: {grant.grantNumber}</p>
 </div>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="p-6">
 {/* Quick Stats */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <div className="bg-blue-50 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <DollarSign className="w-5 h-5 text-blue-600" />
 <span className="text-sm font-medium text-gray-600">Grant Amount</span>
 </div>
 <p className="text-2xl font-bold text-gray-900">
 {grant.currency} {formatNumber(grant.grantAmount)}
 </p>
 </div>

 <div className="bg-green-50 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <Calendar className="w-5 h-5 text-green-600" />
 <span className="text-sm font-medium text-gray-600">Duration</span>
 </div>
 <p className="text-2xl font-bold text-gray-900">
 {Math.ceil(totalDays / 30)} months
 </p>
 </div>

 <div className="bg-purple-50 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <Clock className="w-5 h-5 text-purple-600" />
 <span className="text-sm font-medium text-gray-600">Progress</span>
 </div>
 <p className="text-2xl font-bold text-gray-900">
 {grant.budgetUtilization || 0}%
 </p>
 </div>

 <div className="bg-yellow-50 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <FileText className="w-5 h-5 text-yellow-600" />
 <span className="text-sm font-medium text-gray-600">Reporting</span>
 </div>
 <p className="text-2xl font-bold text-gray-900 capitalize">
 {grant.reportingFrequency}
 </p>
 </div>
 </div>

 {/* Timeline Progress Bar */}
 <div className="mb-6">
 <div className="flex justify-between text-sm text-gray-600 mb-2">
 <span>Start: {new Date(grant.startDate).toLocaleDateString()}</span>
 <span>End: {new Date(grant.endDate).toLocaleDateString()}</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-3">
 <div
 className="bg-blue-600 h-3 rounded-full transition-all"
 style={{ width: `${progressPercentage}%` }}
 />
 </div>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="overview" className="w-full">
 <TabsList className="grid w-full grid-cols-4">
 <TabsTrigger value="overview">Overview</TabsTrigger>
 <TabsTrigger value="milestones">Milestones</TabsTrigger>
 <TabsTrigger value="documents">Documents</TabsTrigger>
 <TabsTrigger value="financial">Financial</TabsTrigger>
 </TabsList>

 {/* Overview Tab */}
 <TabsContent value="overview" className="space-y-6 mt-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Grant Information</h3>
 <dl className="space-y-3">
 <div>
 <dt className="text-sm font-medium text-gray-600">Donor</dt>
 <dd className="text-sm text-gray-900 mt-1">{grant.donorName}</dd>
 </div>
 <div>
 <dt className="text-sm font-medium text-gray-600">Donor Reference</dt>
 <dd className="text-sm text-gray-900 mt-1">{grant.donorReference || 'N/A'}</dd>
 </div>
 <div>
 <dt className="text-sm font-medium text-gray-600">Sector</dt>
 <dd className="text-sm text-gray-900 mt-1">{grant.sector || 'N/A'}</dd>
 </div>
 <div>
 <dt className="text-sm font-medium text-gray-600">Responsible Person</dt>
 <dd className="text-sm text-gray-900 mt-1">{grant.responsible || 'N/A'}</dd>
 </div>
 </dl>
 </div>

 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Co-Funding</h3>
 <dl className="space-y-3">
 <div>
 <dt className="text-sm font-medium text-gray-600">Co-Funding Status</dt>
 <dd className="text-sm text-gray-900 mt-1">
 {grant.coFunding ? 'Yes' : 'No'}
 </dd>
 </div>
 {grant.coFunding && (
 <div>
 <dt className="text-sm font-medium text-gray-600">Co-Funder Name</dt>
 <dd className="text-sm text-gray-900 mt-1">{grant.coFunderName}</dd>
 </div>
 )}
 </dl>
 </div>
 </div>

 {grant.description && (
 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
 <p className="text-gray-700 leading-relaxed">{grant.description}</p>
 </div>
 )}
 </TabsContent>

 {/* Milestones Tab */}
 <TabsContent value="milestones" className="mt-6">
 <div className="space-y-4">
 {milestones.map((milestone) => (
 <div
 key={milestone.id}
 className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
 >
 <div className="flex-shrink-0 mt-1">
 {milestone.status === 'completed' ? (
 <CheckCircle className="w-6 h-6 text-green-600" />
 ) : milestone.status === 'pending' ? (
 <Clock className="w-6 h-6 text-yellow-600" />
 ) : (
 <AlertCircle className="w-6 h-6 text-red-600" />
 )}
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between mb-1">
 <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
 <Badge variant="outline">{milestone.type}</Badge>
 </div>
 <p className="text-sm text-gray-600">
 Due: {new Date(milestone.dueDate).toLocaleDateString()}
 </p>
 </div>
 </div>
 ))}
 </div>
 </TabsContent>

 {/* Documents Tab */}
 <TabsContent value="documents" className="mt-6">
 <div className="space-y-4">
 {/* Upload Button */}
 <div className="flex justify-end">
 <input
 ref={fileInputRef}
 type="file"
 onChange={handleFileUpload}
 accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
 className="hidden"
 />
 <Button
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading}
 >
 <Upload className="w-4 h-4 me-2" />
 {isUploading ? 'Uploading...' : 'Upload Document'}
 </Button>
 </div>

 {/* Documents List */}
 {documents.length === 0 ? (
 <div className="text-center py-12 text-gray-500">
 <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p>No documents uploaded yet</p>
 <p className="text-sm mt-1">Click "Upload Document" to add files</p>
 </div>
 ) : (
 <div className="space-y-3">
 {documents.map((doc) => (
 <div
 key={doc.id}
 className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
 >
 <div className="flex items-center gap-3 flex-1">
 <FileText className="w-5 h-5 text-gray-600" />
 <div className="flex-1">
 <p className="font-medium text-gray-900">{doc.fileName}</p>
 <p className="text-sm text-gray-600">
 {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
 {doc.fileSize && ` • ${(doc.fileSize / 1024).toFixed(0)} KB`}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Badge variant="outline">
 {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
 </Badge>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleDownload(doc)}
 >
 <Download className="w-4 h-4" />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleDelete(doc.id)}
 >
 <Trash2 className="w-4 h-4 text-red-600" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </TabsContent>

 {/* Financial Tab */}
 <TabsContent value="financial" className="mt-6">
 <FinancialTabContent grant={grant} />
 </TabsContent>
 </Tabs>

 {/* Actions */}
 <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
 <Button variant="outline" onClick={onClose}>
 Close
 </Button>
 <Button onClick={() => setShowPrintModal(true)}>
 Generate Report
 </Button>
 </div>
 </div>
 </div>
 
 {/* Print Modal */}
 {showPrintModal && (
 <GrantProgressReportPrintModal
 grantNumber={grant.grantNumber}
 grantName={grant.grantName}
 donorName={grant.donorName}
 reportingPeriod={`${new Date(grant.startDate).toLocaleDateString()} - ${new Date().toLocaleDateString()}`}
 grantAmount={grant.grantAmount}
 currency={grant.currency}
 totalSpent={0}
 remainingBudget={grant.grantAmount}
 percentageSpent={0}
 activitiesCompleted={[]}
 upcomingActivities={[]}
 challenges={[]}
 achievements={[]}
 nextSteps={[]}
 preparedBy="Grant Manager"
 reviewedBy="Program Director"
 reportDate={new Date().toISOString().split('T')[0]}
 onClose={() => setShowPrintModal(false)}
 />
 )}
 </div>
 );
}

/**
 * Financial Tab Content Component
 * Fetches and displays budget utilization by category from the linked project
 */
function FinancialTabContent({ grant }: { grant: any }) {
 // Fetch budget utilization data by category from the linked project
 const { data: budgetData, isLoading } = trpc.grants.getBudgetUtilizationByCategory.useQuery(
 { grantId: grant?.id || 0 },
 { enabled: !!grant?.id }
 );

 // Map category names to shorter display names
 const shortenCategoryName = (name: string): string => {
 const shortNames: Record<string, string> = {
 'Personal (Salaries, Staff Cost)': 'Personnel',
 'Project Activities': 'Activities',
 'MEAL Activities': 'MEAL',
 'Operation Cost': 'Operations',
 'IP Cost': 'IP Costs',
 'Overhead Cost': 'Overhead',
 };
 return shortNames[name] || name;
 };

 // Map category colors to Tailwind classes
 const getColorClass = (color: string): string => {
 const colorMap: Record<string, string> = {
 blue: 'bg-blue-600',
 green: 'bg-green-600',
 purple: 'bg-purple-600',
 yellow: 'bg-yellow-600',
 orange: 'bg-orange-600',
 red: 'bg-red-600',
 gray: 'bg-gray-600',
 };
 return colorMap[color] || 'bg-gray-600';
 };

 return (
 <div className="space-y-6">
 {/* Budget Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-blue-50 rounded-lg p-4">
 <p className="text-sm font-medium text-gray-600 mb-1">Total Budget</p>
 <p className="text-2xl font-bold text-gray-900">
 {grant.currency} {formatNumber(grant.grantAmount)}
 </p>
 </div>
 <div className="bg-green-50 rounded-lg p-4">
 <p className="text-sm font-medium text-gray-600 mb-1">Spent</p>
 <p className="text-2xl font-bold text-gray-900">
 {grant.currency} {formatNumber(grant.spent || 0)}
 </p>
 </div>
 <div className="bg-yellow-50 rounded-lg p-4">
 <p className="text-sm font-medium text-gray-600 mb-1">Remaining</p>
 <p className="text-2xl font-bold text-gray-900">
 {grant.currency} {formatNumber(grant.balance || grant.grantAmount)}
 </p>
 </div>
 </div>

 {/* Budget Utilization by Category */}
 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Utilization by Category</h3>
 
 {isLoading ? (
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <div key={i} className="animate-pulse">
 <div className="flex justify-between mb-1">
 <div className="h-4 bg-gray-200 rounded w-24"></div>
 <div className="h-4 bg-gray-200 rounded w-16"></div>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2"></div>
 </div>
 ))}
 </div>
 ) : budgetData?.categories && budgetData.categories.length > 0 ? (
 <div className="space-y-4">
 {budgetData.categories.map((category, index) => (
 <div key={index}>
 <div className="flex justify-between text-sm mb-1">
 <span className="text-gray-600">{shortenCategoryName(category.name)}</span>
 <span className="font-medium">
 {category.budgetPercentage}% of budget ({category.utilizationPercentage}% utilized)
 </span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2.5">
 <div
 className={`${getColorClass(category.color)} h-2.5 rounded-full transition-all duration-300`}
 style={{ width: `${Math.min(category.utilizationPercentage, 100)}%` }}
 />
 </div>
 <div className="flex justify-between text-xs text-gray-500 mt-1">
 <span>Budgeted: {grant.currency} {formatNumber(category.budgeted)}</span>
 <span>Spent: {grant.currency} {formatNumber(category.spent)}</span>
 </div>
 </div>
 ))}

 {/* Overall Utilization */}
 <div className="pt-4 border-t border-gray-200">
 <div className="flex justify-between text-sm mb-1">
 <span className="font-medium text-gray-900">Overall Utilization</span>
 <span className="font-bold text-gray-900">{budgetData.overallUtilization}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-3">
 <div
 className="bg-blue-600 h-3 rounded-full transition-all duration-300"
 style={{ width: `${Math.min(budgetData.overallUtilization || 0, 100)}%` }}
 />
 </div>
 <div className="flex justify-between text-xs text-gray-500 mt-1">
 <span>Total Budgeted: {grant.currency} {formatNumber(budgetData.totalBudget)}</span>
 <span>Total Spent: {grant.currency} {formatNumber(budgetData.totalSpent)}</span>
 </div>
 </div>
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 <p>No budget items found for this grant's linked project.</p>
 <p className="text-sm mt-2">Budget utilization data will appear once budget items are added to the project.</p>
 </div>
 )}
 </div>
 </div>
 );
}
