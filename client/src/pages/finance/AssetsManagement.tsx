import { useState, useMemo } from"react";
import { useNavigate } from '@/lib/router-compat';
import { useTranslation } from "@/i18n/useTranslation";
import { useOrganization } from"@/contexts/OrganizationContext";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Tabs, TabsContent } from"@/components/ui/tabs";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from"@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from"@/components/ui/select";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from"@/components/ui/table";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { toast } from"sonner";
import {
 Package,
 Plus,
 Search,
 Download,
 Upload,
 Edit,
 Trash2,
 ArrowLeft,
 ArrowRight,
 Wrench,
 ArrowRightLeft,
 XCircle,
 DollarSign,
 TrendingDown,
 AlertTriangle,
 CheckCircle,
 Clock,
 Building,
 Tag,
 Calendar,
 MapPin,
 User,
 FileText,
 Eye,
} from"lucide-react";
import { Link } from"wouter";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

// Asset status options
const assetStatuses = [
 { value:"active", labelEn:"Active", labelAr:"نشط", color:"bg-green-500" },
 { value:"in_maintenance", labelEn:"In Maintenance", labelAr:"قيد الصيانة", color:"bg-yellow-500" },
 { value:"disposed", labelEn:"Disposed", labelAr:"تم التخلص منه", color:"bg-gray-500" },
 { value:"lost", labelEn:"Lost", labelAr:"مفقود", color:"bg-red-500" },
 { value:"transferred", labelEn:"Transferred", labelAr:"منقول", color:"bg-blue-500" },
 { value:"pending_disposal", labelEn:"Pending Disposal", labelAr:"في انتظار التخلص", color:"bg-orange-500" },
];

// Asset condition options
const assetConditions = [
 { value:"excellent", labelEn:"Excellent", labelAr:"ممتاز" },
 { value:"good", labelEn:"Good", labelAr:"جيد" },
 { value:"fair", labelEn:"Fair", labelAr:"مقبول" },
 { value:"poor", labelEn:"Poor", labelAr:"ضعيف" },
 { value:"non_functional", labelEn:"Non-Functional", labelAr:"غير صالح" },
];

// Depreciation methods
const depreciationMethods = [
 { value:"straight_line", labelEn:"Straight Line", labelAr:"القسط الثابت" },
 { value:"declining_balance", labelEn:"Declining Balance", labelAr:"القسط المتناقص" },
 { value:"units_of_production", labelEn:"Units of Production", labelAr:"وحدات الإنتاج" },
 { value:"none", labelEn:"No Depreciation", labelAr:"بدون إهلاك" },
];

// Disposal types
const disposalTypes = [
 { value:"sale", labelEn:"Sale", labelAr:"بيع" },
 { value:"donation", labelEn:"Donation", labelAr:"تبرع" },
 { value:"scrap", labelEn:"Scrap", labelAr:"خردة" },
 { value:"theft", labelEn:"Theft", labelAr:"سرقة" },
 { value:"loss", labelEn:"Loss", labelAr:"فقدان" },
 { value:"transfer_out", labelEn:"Transfer Out", labelAr:"نقل للخارج" },
 { value:"write_off", labelEn:"Write Off", labelAr:"شطب" },
];

// Maintenance types
const maintenanceTypes = [
 { value:"preventive", labelEn:"Preventive", labelAr:"وقائية" },
 { value:"corrective", labelEn:"Corrective", labelAr:"تصحيحية" },
 { value:"inspection", labelEn:"Inspection", labelAr:"فحص" },
 { value:"upgrade", labelEn:"Upgrade", labelAr:"ترقية" },
 { value:"repair", labelEn:"Repair", labelAr:"إصلاح" },
];

export default function AssetsManagement() {
 const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;
 const navigate = useNavigate();

 // State
 const [activeTab, setActiveTab] = useState("assets");
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [categoryFilter, setCategoryFilter] = useState<string>("all");
 
 // Dialog states
 const [showAssetDialog, setShowAssetDialog] = useState(false);
 const [showCategoryDialog, setShowCategoryDialog] = useState(false);
 const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
 const [showTransferDialog, setShowTransferDialog] = useState(false);
 const [showDisposalDialog, setShowDisposalDialog] = useState(false);
 const [showImportDialog, setShowImportDialog] = useState(false);
 const [editingAsset, setEditingAsset] = useState<any>(null);
 const [editingCategory, setEditingCategory] = useState<any>(null);
 const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

 // Form states
 const [assetForm, setAssetForm] = useState({
 assetCode:"",
 name:"",
 description:"",
 categoryId:"",
 subcategory:"",
 acquisitionDate:"",
 acquisitionCost:"",
 currency:"USD",
 depreciationMethod:"straight_line",
 usefulLifeYears: 5,
 salvageValue:"",
 status:"active",
 condition:"good",
 location:"",
 assignedTo:"",
 donorName:"",
 grantCode:"",
 serialNumber:"",
 manufacturer:"",
 model:"",
 warrantyExpiry:"",
 insurancePolicy:"",
 insuranceExpiry:"",
 });

 const [categoryForm, setCategoryForm] = useState({
 code:"",
 name:"",
 description:"",
 depreciationRate:"",
 defaultUsefulLife: 5,
 });

 const [maintenanceForm, setMaintenanceForm] = useState({
 maintenanceType:"preventive",
 description:"",
 cost:"",
 currency:"USD",
 performedBy:"",
 vendorName:"",
 performedDate:"",
 nextDueDate:"",
 notes:"",
 });

 const [transferForm, setTransferForm] = useState({
 fromLocation:"",
 toLocation:"",
 fromAssignee:"",
 toAssignee:"",
 transferDate:"",
 reason:"",
 });

 const [disposalForm, setDisposalForm] = useState({
 disposalType:"sale",
 proposedDate:"",
 proposedValue:"",
 reason:"",
 buyerInfo:"",
 recipientInfo:"",
 notes:"",
 });

 // Queries
 const { data: assets = [], refetch: refetchAssets } = trpc.assets.listAssets.useQuery({
 organizationId,
 categoryId: categoryFilter !=="all" ? parseInt(categoryFilter) : undefined,
 status: statusFilter !=="all" ? statusFilter : undefined,
 search: searchQuery || undefined,
 });

 const { data: categories = [], refetch: refetchCategories } = trpc.assets.listCategories.useQuery({
 organizationId,
 });

 const { data: statistics } = trpc.assets.getAssetStatistics.useQuery({
 organizationId,
 });

 const { data: maintenanceRecords = [] } = trpc.assets.listMaintenance.useQuery({
 organizationId,
 assetId: selectedAssetId || undefined,
 });

 const { data: transfers = [] } = trpc.assets.listTransfers.useQuery({
 organizationId,
 });

 const { data: disposals = [] } = trpc.assets.listDisposals.useQuery({
 organizationId,
 });

 // Mutations
 const createAssetMutation = trpc.assets.createAsset.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.assetCreatedSuccessfully);
 setShowAssetDialog(false);
 resetAssetForm();
 refetchAssets();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateAssetMutation = trpc.assets.updateAsset.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.assetUpdatedSuccessfully);
 setShowAssetDialog(false);
 setEditingAsset(null);
 resetAssetForm();
 refetchAssets();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteAssetMutation = trpc.assets.deleteAsset.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.assetDeletedSuccessfully);
 refetchAssets();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const createCategoryMutation = trpc.assets.createCategory.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.categoryCreatedSuccessfully);
 setShowCategoryDialog(false);
 resetCategoryForm();
 refetchCategories();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateCategoryMutation = trpc.assets.updateCategory.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.categoryUpdatedSuccessfully);
 setShowCategoryDialog(false);
 setEditingCategory(null);
 resetCategoryForm();
 refetchCategories();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteCategoryMutation = trpc.assets.deleteCategory.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.categoryDeletedSuccessfully);
 refetchCategories();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const createMaintenanceMutation = trpc.assets.createMaintenance.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.maintenanceRecordAddedSuccessfully);
 setShowMaintenanceDialog(false);
 resetMaintenanceForm();
 refetchAssets();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const createTransferMutation = trpc.assets.createTransfer.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.transferRequestCreatedSuccessfully);
 setShowTransferDialog(false);
 resetTransferForm();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const createDisposalMutation = trpc.assets.createDisposal.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.disposalRequestCreatedSuccessfully);
 setShowDisposalDialog(false);
 resetDisposalForm();
 refetchAssets();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const bulkImportMutation = trpc.assets.bulkImportAssets.useMutation({
 onSuccess: (result) => {
 toast.success(
 `Successfully imported ${result.imported} assets`
 );
 setShowImportDialog(false);
 refetchAssets();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Reset functions
 const resetAssetForm = () => {
 setAssetForm({
 assetCode:"",
 name:"",
 description:"",
 categoryId:"",
 subcategory:"",
 acquisitionDate:"",
 acquisitionCost:"",
 currency:"USD",
 depreciationMethod:"straight_line",
 usefulLifeYears: 5,
 salvageValue:"",
 status:"active",
 condition:"good",
 location:"",
 assignedTo:"",
 donorName:"",
 grantCode:"",
 serialNumber:"",
 manufacturer:"",
 model:"",
 warrantyExpiry:"",
 insurancePolicy:"",
 insuranceExpiry:"",
 });
 };

 const resetCategoryForm = () => {
 setCategoryForm({
 code:"",
 name:"",
 description:"",
 depreciationRate:"",
 defaultUsefulLife: 5,
 });
 };

 const resetMaintenanceForm = () => {
 setMaintenanceForm({
 maintenanceType:"preventive",
 description:"",
 cost:"",
 currency:"USD",
 performedBy:"",
 vendorName:"",
 performedDate:"",
 nextDueDate:"",
 notes:"",
 });
 };

 const resetTransferForm = () => {
 setTransferForm({
 fromLocation:"",
 toLocation:"",
 fromAssignee:"",
 toAssignee:"",
 transferDate:"",
 reason:"",
 });
 };

 const resetDisposalForm = () => {
 setDisposalForm({
 disposalType:"sale",
 proposedDate:"",
 proposedValue:"",
 reason:"",
 buyerInfo:"",
 recipientInfo:"",
 notes:"",
 });
 };

 // Handlers
 const handleCreateAsset = () => {
 if (!assetForm.assetCode || !assetForm.name) {
 toast.error(t.financeModule.pleaseFillRequiredFields);
 return;
 }

 createAssetMutation.mutate({
 organizationId,
 ...assetForm,
 categoryId: assetForm.categoryId ? parseInt(assetForm.categoryId) : undefined,
 usefulLifeYears: assetForm.usefulLifeYears,
 depreciationMethod: assetForm.depreciationMethod as any,
 status: assetForm.status as any,
 condition: assetForm.condition as any,
 });
 };

 const handleUpdateAsset = () => {
 if (!editingAsset) return;

 updateAssetMutation.mutate({
 id: editingAsset.id,
 ...assetForm,
 categoryId: assetForm.categoryId ? parseInt(assetForm.categoryId) : null,
 depreciationMethod: assetForm.depreciationMethod as any,
 status: assetForm.status as any,
 condition: assetForm.condition as any,
 });
 };

 const handleDeleteAsset = (id: number) => {
 if (confirm(t.financeModule.areYouSureYouWantTo4)) {
 deleteAssetMutation.mutate({ id });
 }
 };

 const handleEditAsset = (asset: any) => {
 setEditingAsset(asset);
 setAssetForm({
 assetCode: asset.assetCode ||"",
 name: asset.name ||"",
 description: asset.description ||"",
 categoryId: asset.categoryId?.toString() ||"",
 subcategory: asset.subcategory ||"",
 acquisitionDate: asset.acquisitionDate ? new Date(asset.acquisitionDate).toISOString().split("T")[0] :"",
 acquisitionCost: asset.acquisitionCost?.toString() ||"",
 currency: asset.currency ||"USD",
 depreciationMethod: asset.depreciationMethod ||"straight_line",
 usefulLifeYears: asset.usefulLifeYears || 5,
 salvageValue: asset.salvageValue?.toString() ||"",
 status: asset.status ||"active",
 condition: asset.condition ||"good",
 location: asset.location ||"",
 assignedTo: asset.assignedTo ||"",
 donorName: asset.donorName ||"",
 grantCode: asset.grantCode ||"",
 serialNumber: asset.serialNumber ||"",
 manufacturer: asset.manufacturer ||"",
 model: asset.model ||"",
 warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split("T")[0] :"",
 insurancePolicy: asset.insurancePolicy ||"",
 insuranceExpiry: asset.insuranceExpiry ? new Date(asset.insuranceExpiry).toISOString().split("T")[0] :"",
 });
 setShowAssetDialog(true);
 };

 const handleCreateCategory = () => {
 if (!categoryForm.code || !categoryForm.name) {
 toast.error(t.financeModule.pleaseFillRequiredFields);
 return;
 }

 createCategoryMutation.mutate({
 organizationId,
 ...categoryForm,
 defaultUsefulLife: categoryForm.defaultUsefulLife,
 });
 };

 const handleUpdateCategory = () => {
 if (!editingCategory) return;

 updateCategoryMutation.mutate({
 id: editingCategory.id,
 ...categoryForm,
 });
 };

 const handleDeleteCategory = (id: number) => {
 if (confirm(t.financeModule.areYouSureYouWantTo5)) {
 deleteCategoryMutation.mutate({ id });
 }
 };

 const handleEditCategory = (category: any) => {
 setEditingCategory(category);
 setCategoryForm({
 code: category.code ||"",
 name: category.name ||"",
 description: category.description ||"",
 depreciationRate: category.depreciationRate?.toString() ||"",
 defaultUsefulLife: category.defaultUsefulLife || 5,
 });
 setShowCategoryDialog(true);
 };

 const handleCreateMaintenance = () => {
 if (!selectedAssetId) {
 toast.error(t.financeModule.pleaseSelectAnAsset);
 return;
 }

 createMaintenanceMutation.mutate({
 organizationId,
 assetId: selectedAssetId,
 ...maintenanceForm,
 maintenanceType: maintenanceForm.maintenanceType as any,
 });
 };

 const handleCreateTransfer = () => {
 if (!selectedAssetId) {
 toast.error(t.financeModule.pleaseSelectAnAsset);
 return;
 }

 createTransferMutation.mutate({
 organizationId,
 assetId: selectedAssetId,
 ...transferForm,
 });
 };

 const handleCreateDisposal = () => {
 if (!selectedAssetId) {
 toast.error(t.financeModule.pleaseSelectAnAsset);
 return;
 }

 createDisposalMutation.mutate({
 organizationId,
 assetId: selectedAssetId,
 ...disposalForm,
 disposalType: disposalForm.disposalType as any,
 });
 };

 const handleExport = () => {
 // Create CSV content
 const headers = [
"Asset Code",
"Name",
"Category",
"Acquisition Date",
"Acquisition Cost",
"Currency",
"Current Value",
"Status",
"Condition",
"Location",
"Assigned To",
"Donor",
"Grant Code",
"Serial Number",
"Manufacturer",
"Model",
 ];

 const rows = assets.map((asset: any) => [
 asset.assetCode,
 asset.name,
 categories.find((c: any) => c.id === asset.categoryId)?.name ||"",
 asset.acquisitionDate ? new Date(asset.acquisitionDate).toISOString().split("T")[0] :"",
 asset.acquisitionCost ||"",
 asset.currency ||"USD",
 asset.currentValue ||"",
 asset.status,
 asset.condition,
 asset.location ||"",
 asset.assignedTo ||"",
 asset.donorName ||"",
 asset.grantCode ||"",
 asset.serialNumber ||"",
 asset.manufacturer ||"",
 asset.model ||"",
 ]);

 const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
 const blob = new Blob(["\uFEFF" + csvContent], { type:"text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = `assets_${new Date().toISOString().split("T")[0]}.csv`;
 link.click();
 URL.revokeObjectURL(url);
 toast.success(t.financeModule.dataExportedSuccessfully);
 };

 const getStatusBadge = (status: string) => {
 const statusInfo = assetStatuses.find((s) => s.value === status);
 return (
 <Badge className={`${statusInfo?.color ||"bg-gray-500"} text-white`}>
 {isRTL ? statusInfo?.labelAr : statusInfo?.labelEn}
 </Badge>
 );
 };

 const getConditionLabel = (condition: string) => {
 const conditionInfo = assetConditions.find((c) => c.value === condition);
 return isRTL ? conditionInfo?.labelAr : conditionInfo?.labelEn;
 };

 const formatCurrency = (amount: string | number | null, currency: string ="USD") => {
 if (!amount) return `${currency} 0.00`;
 const num = typeof amount ==="string" ? parseFloat(amount) : amount;
 return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
 };

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <div className="flex items-center gap-2 mb-4">
 <Link href="/organization/finance">
 <BackButton label={t.financeModule.backToFinance} />
 </Link>
 </div>
 <div>
 <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
 <Package className="h-6 w-6 text-primary" />
 {t.financeModule.assetsManagement}
 </h1>
 <p className="text-muted-foreground">
 {'Fixed asset registry, depreciation tracking, and disposal workflows'}
 </p>
 </div>
 </div>

 {/* Statistics Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <Package className="h-5 w-5 text-blue-500" />
 <div>
 <p className="text-xs text-muted-foreground">
 {t.financeModule.totalAssets}
 </p>
 <p className="text-lg font-bold">{statistics?.totalAssets || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <CheckCircle className="h-5 w-5 text-green-500" />
 <div>
 <p className="text-xs text-muted-foreground">
 {t.financeModule.activeAssets}
 </p>
 <p className="text-lg font-bold">{statistics?.activeAssets || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <Wrench className="h-5 w-5 text-yellow-500" />
 <div>
 <p className="text-xs text-muted-foreground">
 {t.financeModule.inMaintenance}
 </p>
 <p className="text-lg font-bold">{statistics?.inMaintenance || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <DollarSign className="h-5 w-5 text-primary" />
 <div>
 <p className="text-xs text-muted-foreground">
 {t.financeModule.acquisitionCost}
 </p>
 <p className="text-lg font-bold">
 {formatCurrency(statistics?.totalAcquisitionCost || 0)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <TrendingDown className="h-5 w-5 text-orange-500" />
 <div>
 <p className="text-xs text-muted-foreground">
 {t.financeModule.accumulatedDepreciation}
 </p>
 <p className="text-lg font-bold">
 {formatCurrency(statistics?.totalDepreciation || 0)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-red-500" />
 <div>
 <p className="text-xs text-muted-foreground">
 {t.financeModule.pendingDisposal}
 </p>
 <p className="text-lg font-bold">{statistics?.pendingDisposal || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="container py-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'assets'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('assets')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <Package className="h-5 w-5" />
 {t.financeModule.assetRegistry}
 </CardTitle>
 </CardHeader>
 </Card>
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'categories'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('categories')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <Tag className="h-5 w-5" />
 {t.financeModule.categories}
 </CardTitle>
 </CardHeader>
 </Card>
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'transfers'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('transfers')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <ArrowRightLeft className="h-5 w-5" />
 {t.financeModule.transfers}
 </CardTitle>
 </CardHeader>
 </Card>
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'disposals'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('disposals')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <XCircle className="h-5 w-5" />
 {t.financeModule.disposals}
 </CardTitle>
 </CardHeader>
 </Card>
 </div>

 <Tabs value={activeTab} onValueChange={setActiveTab}>

 {/* Assets Tab */}
 <TabsContent value="assets">
 <Card>
 <CardHeader>
 <div className="flex flex-col md:flex-row justify-between gap-4">
 <div className="flex flex-1 gap-2">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.financeModule.searchAssets}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-10"
 />
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-40">
 <SelectValue placeholder={t.financeModule.status} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.allStatuses}</SelectItem>
 {assetStatuses.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {isRTL ? status.labelAr : status.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select value={categoryFilter} onValueChange={setCategoryFilter}>
 <SelectTrigger className="w-40">
 <SelectValue placeholder={t.financeModule.category} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.allCategories}</SelectItem>
 {categories.map((cat: any) => (
 <SelectItem key={cat.id} value={cat.id.toString()}>
 {cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport}>
 <Download className="h-4 w-4 me-2" />
 {t.financeModule.export}
 </Button>
 <Button variant="outline" onClick={() => setShowImportDialog(true)}>
 <Upload className="h-4 w-4 me-2" />
 {t.financeModule.import}
 </Button>
 <Button onClick={() => { resetAssetForm(); setEditingAsset(null); setShowAssetDialog(true); }}>
 <Plus className="h-4 w-4 me-2" />
 {t.financeModule.newAsset}
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeModule.assetCode}</TableHead>
 <TableHead>{t.financeModule.name}</TableHead>
 <TableHead>{t.financeModule.category}</TableHead>
 <TableHead>{t.financeModule.acquisitionCost}</TableHead>
 <TableHead>{t.financeModule.currentValue}</TableHead>
 <TableHead>{t.financeModule.location}</TableHead>
 <TableHead>{t.financeModule.donor}</TableHead>
 <TableHead>{t.financeModule.status}</TableHead>
 <TableHead className="text-center">{t.financeModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {assets.length === 0 ? (
 <TableRow>
 <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
 {t.financeModule.noAssetsFound}
 </TableCell>
 </TableRow>
 ) : (
 assets.map((asset: any) => (
 <TableRow key={asset.id}>
 <TableCell className="font-mono">{asset.assetCode}</TableCell>
 <TableCell>
 <div>
 <p className="font-medium">{asset.name}</p>
 {asset.serialNumber && (
 <p className="text-xs text-muted-foreground">SN: {asset.serialNumber}</p>
 )}
 </div>
 </TableCell>
 <TableCell>
 {categories.find((c: any) => c.id === asset.categoryId)?.name ||"-"}
 </TableCell>
 <TableCell>{formatCurrency(asset.acquisitionCost, asset.currency)}</TableCell>
 <TableCell>{formatCurrency(asset.currentValue, asset.currency)}</TableCell>
 <TableCell>{asset.location ||"-"}</TableCell>
 <TableCell>{asset.donorName ||"-"}</TableCell>
 <TableCell>{getStatusBadge(asset.status)}</TableCell>
 <TableCell>
 <div className="flex gap-1">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => navigate(`/organization/finance/assets/${asset.id}`)}
 title={t.financeModule.viewDetails}
 >
 <Eye className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleEditAsset(asset)}
 title={t.financeModule.edit}
 >
 <Edit className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 setSelectedAssetId(asset.id);
 setMaintenanceForm({
 ...maintenanceForm,
 });
 setShowMaintenanceDialog(true);
 }}
 title={t.financeModule.maintenance}
 >
 <Wrench className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 setSelectedAssetId(asset.id);
 setTransferForm({
 ...transferForm,
 fromLocation: asset.location ||"",
 fromAssignee: asset.assignedTo ||"",
 });
 setShowTransferDialog(true);
 }}
 title={t.financeModule.transfer}
 >
 <ArrowRightLeft className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 setSelectedAssetId(asset.id);
 setShowDisposalDialog(true);
 }}
 title={t.financeModule.dispose}
 disabled={asset.status ==="disposed"}
 >
 <XCircle className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDeleteAsset(asset.id)}
 title={t.financeModule.delete}
 >
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* Categories Tab */}
 <TabsContent value="categories">
 <Card>
 <CardHeader>
 <div className="flex justify-between items-center">
 <CardTitle>{t.financeModule.assetCategories}</CardTitle>
 <Button onClick={() => { resetCategoryForm(); setEditingCategory(null); setShowCategoryDialog(true); }}>
 <Plus className="h-4 w-4 me-2" />
 {t.financeModule.newCategory}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeModule.code}</TableHead>
 <TableHead>{t.financeModule.name}</TableHead>
 <TableHead>{t.financeModule.depreciationRate}</TableHead>
 <TableHead>{t.financeModule.usefulLife}</TableHead>
 <TableHead className="text-center">{t.financeModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {categories.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
 {t.financeModule.noCategoriesFound}
 </TableCell>
 </TableRow>
 ) : (
 categories.map((cat: any) => (
 <TableRow key={cat.id}>
 <TableCell className="font-mono">{cat.code}</TableCell>
 <TableCell>{cat.name}</TableCell>
 <TableCell>{cat.depreciationRate}%</TableCell>
 <TableCell>{cat.defaultUsefulLife} {t.financeModule.years}</TableCell>
 <TableCell>
 <div className="flex gap-1">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleEditCategory(cat)}
 >
 <Edit className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDeleteCategory(cat.id)}
 >
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* Transfers Tab */}
 <TabsContent value="transfers">
 <Card>
 <CardHeader>
 <CardTitle>{t.financeModule.transferRequests}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeModule.transfer6}</TableHead>
 <TableHead>{t.financeModule.asset}</TableHead>
 <TableHead>{t.financeModule.from}</TableHead>
 <TableHead>{t.financeModule.to}</TableHead>
 <TableHead>{t.financeModule.date}</TableHead>
 <TableHead>{t.financeModule.status}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {transfers.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
 {t.financeModule.noTransferRequests}
 </TableCell>
 </TableRow>
 ) : (
 transfers.map((transfer: any) => (
 <TableRow key={transfer.id}>
 <TableCell className="font-mono">{transfer.transferCode}</TableCell>
 <TableCell>
 {assets.find((a: any) => a.id === transfer.assetId)?.name ||"-"}
 </TableCell>
 <TableCell>
 <div>
 <p>{transfer.fromLocation}</p>
 <p className="text-xs text-muted-foreground">{transfer.fromAssignee}</p>
 </div>
 </TableCell>
 <TableCell>
 <div>
 <p>{transfer.toLocation}</p>
 <p className="text-xs text-muted-foreground">{transfer.toAssignee}</p>
 </div>
 </TableCell>
 <TableCell>
 {transfer.transferDate
 ? new Date(transfer.transferDate).toLocaleDateString()
 :"-"}
 </TableCell>
 <TableCell>
 <Badge
 variant={
 transfer.status ==="completed"
 ?"default"
 : transfer.status ==="rejected"
 ?"destructive"
 :"secondary"
 }
 >
 {transfer.status}
 </Badge>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* Disposals Tab */}
 <TabsContent value="disposals">
 <Card>
 <CardHeader>
 <CardTitle>{t.financeModule.disposalRequests}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeModule.disposal}</TableHead>
 <TableHead>{t.financeModule.asset}</TableHead>
 <TableHead>{t.financeModule.type}</TableHead>
 <TableHead>{t.financeModule.bookValue}</TableHead>
 <TableHead>{t.financeModule.proposedValue}</TableHead>
 <TableHead>{t.financeModule.status}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {disposals.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
 {t.financeModule.noDisposalRequests}
 </TableCell>
 </TableRow>
 ) : (
 disposals.map((disposal: any) => (
 <TableRow key={disposal.id}>
 <TableCell className="font-mono">{disposal.disposalCode}</TableCell>
 <TableCell>
 {assets.find((a: any) => a.id === disposal.assetId)?.name ||"-"}
 </TableCell>
 <TableCell>
 {disposalTypes.find((t) => t.value === disposal.disposalType)?.[
 t.financeModule.labelen
 ]}
 </TableCell>
 <TableCell>{formatCurrency(disposal.bookValue, disposal.currency)}</TableCell>
 <TableCell>{formatCurrency(disposal.proposedValue, disposal.currency)}</TableCell>
 <TableCell>
 <Badge
 variant={
 disposal.status ==="completed"
 ?"default"
 : disposal.status ==="rejected"
 ?"destructive"
 :"secondary"
 }
 >
 {disposal.status}
 </Badge>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>

 {/* Asset Dialog */}
 <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
 <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {editingAsset
 ? 'Edit Asset'
 : 'New Asset'}
 </DialogTitle>
 </DialogHeader>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
 {/* Basic Information */}
 <div className="space-y-4 md:col-span-2">
 <h3 className="font-semibold border-b pb-2">
 {t.financeModule.basicInformation}
 </h3>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.assetCode7}</Label>
 <Input
 value={assetForm.assetCode}
 onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
 placeholder="AST-001"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.name8}</Label>
 <Input
 value={assetForm.name}
 onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <Label>{t.financeModule.category}</Label>
 <Select
 value={assetForm.categoryId}
 onValueChange={(value) => setAssetForm({ ...assetForm, categoryId: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectCategory} />
 </SelectTrigger>
 <SelectContent>
 {categories.map((cat: any) => (
 <SelectItem key={cat.id} value={cat.id.toString()}>
 {cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2 md:col-span-2">
 <Label>{t.financeModule.description}</Label>
 <Textarea
 value={assetForm.description}
 onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
 rows={2}
 />
 </div>

 {/* Financial Information */}
 <div className="space-y-4 md:col-span-2">
 <h3 className="font-semibold border-b pb-2">
 {t.financeModule.financialInformation}
 </h3>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.acquisitionDate}</Label>
 <Input
 type="date"
 value={assetForm.acquisitionDate}
 onChange={(e) => setAssetForm({ ...assetForm, acquisitionDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.acquisitionCost}</Label>
 <Input
 type="number"
 value={assetForm.acquisitionCost}
 onChange={(e) => setAssetForm({ ...assetForm, acquisitionCost: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.currency}</Label>
 <Select
 value={assetForm.currency}
 onValueChange={(value) => setAssetForm({ ...assetForm, currency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 <SelectItem value="AED">AED</SelectItem>
 <SelectItem value="YER">YER</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.depreciationMethod}</Label>
 <Select
 value={assetForm.depreciationMethod}
 onValueChange={(value) => setAssetForm({ ...assetForm, depreciationMethod: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {depreciationMethods.map((method) => (
 <SelectItem key={method.value} value={method.value}>
 {isRTL ? method.labelAr : method.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.usefulLifeYears}</Label>
 <Input
 type="number"
 value={assetForm.usefulLifeYears}
 onChange={(e) =>
 setAssetForm({ ...assetForm, usefulLifeYears: parseInt(e.target.value) || 5 })
 }
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.salvageValue}</Label>
 <Input
 type="number"
 value={assetForm.salvageValue}
 onChange={(e) => setAssetForm({ ...assetForm, salvageValue: e.target.value })}
 />
 </div>

 {/* Status & Location */}
 <div className="space-y-4 md:col-span-2">
 <h3 className="font-semibold border-b pb-2">
 {t.financeModule.statusLocation}
 </h3>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.status}</Label>
 <Select
 value={assetForm.status}
 onValueChange={(value) => setAssetForm({ ...assetForm, status: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {assetStatuses.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {isRTL ? status.labelAr : status.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.condition}</Label>
 <Select
 value={assetForm.condition}
 onValueChange={(value) => setAssetForm({ ...assetForm, condition: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {assetConditions.map((condition) => (
 <SelectItem key={condition.value} value={condition.value}>
 {isRTL ? condition.labelAr : condition.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.location}</Label>
 <Input
 value={assetForm.location}
 onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.assignedTo}</Label>
 <Input
 value={assetForm.assignedTo}
 onChange={(e) => setAssetForm({ ...assetForm, assignedTo: e.target.value })}
 />
 </div>

 {/* Donor & Grant Information */}
 <div className="space-y-4 md:col-span-2">
 <h3 className="font-semibold border-b pb-2">
 {t.financeModule.donorGrantInformation}
 </h3>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.donorName}</Label>
 <Input
 value={assetForm.donorName}
 onChange={(e) => setAssetForm({ ...assetForm, donorName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.grantCode}</Label>
 <Input
 value={assetForm.grantCode}
 onChange={(e) => setAssetForm({ ...assetForm, grantCode: e.target.value })}
 />
 </div>

 {/* Technical Details */}
 <div className="space-y-4 md:col-span-2">
 <h3 className="font-semibold border-b pb-2">
 {t.financeModule.technicalDetails}
 </h3>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.serialNumber}</Label>
 <Input
 value={assetForm.serialNumber}
 onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.manufacturer}</Label>
 <Input
 value={assetForm.manufacturer}
 onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.model}</Label>
 <Input
 value={assetForm.model}
 onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.warrantyExpiry}</Label>
 <Input
 type="date"
 value={assetForm.warrantyExpiry}
 onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiry: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.insurancePolicy}</Label>
 <Input
 value={assetForm.insurancePolicy}
 onChange={(e) => setAssetForm({ ...assetForm, insurancePolicy: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.insuranceExpiry}</Label>
 <Input
 type="date"
 value={assetForm.insuranceExpiry}
 onChange={(e) => setAssetForm({ ...assetForm, insuranceExpiry: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowAssetDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={editingAsset ? handleUpdateAsset : handleCreateAsset}>
 {editingAsset
 ? 'Update'
 : 'Create'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Category Dialog */}
 <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>
 {editingCategory
 ? 'Edit Category'
 : 'New Category'}
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>{t.financeModule.code9}</Label>
 <Input
 value={categoryForm.code}
 onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
 placeholder={t.placeholders.eqp}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.name8}</Label>
 <Input
 value={categoryForm.name}
 onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
 placeholder={t.placeholders.equipment}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.description}</Label>
 <Textarea
 value={categoryForm.description}
 onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
 rows={2}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.depreciationRate10}</Label>
 <Input
 type="number"
 value={categoryForm.depreciationRate}
 onChange={(e) => setCategoryForm({ ...categoryForm, depreciationRate: e.target.value })}
 placeholder="20"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.defaultUsefulLifeYears}</Label>
 <Input
 type="number"
 value={categoryForm.defaultUsefulLife}
 onChange={(e) =>
 setCategoryForm({ ...categoryForm, defaultUsefulLife: parseInt(e.target.value) || 5 })
 }
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
 {editingCategory
 ? 'Update'
 : 'Create'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Maintenance Dialog */}
 <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.addMaintenanceRecord}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>{t.financeModule.maintenanceType}</Label>
 <Select
 value={maintenanceForm.maintenanceType}
 onValueChange={(value) =>
 setMaintenanceForm({ ...maintenanceForm, maintenanceType: value })
 }
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {maintenanceTypes.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {isRTL ? type.labelAr : type.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.description}</Label>
 <Textarea
 value={maintenanceForm.description}
 onChange={(e) =>
 setMaintenanceForm({ ...maintenanceForm, description: e.target.value })
 }
 rows={2}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeModule.cost}</Label>
 <Input
 type="number"
 value={maintenanceForm.cost}
 onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.currency}</Label>
 <Select
 value={maintenanceForm.currency}
 onValueChange={(value) =>
 setMaintenanceForm({ ...maintenanceForm, currency: value })
 }
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.performedBy}</Label>
 <Input
 value={maintenanceForm.performedBy}
 onChange={(e) =>
 setMaintenanceForm({ ...maintenanceForm, performedBy: e.target.value })
 }
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.vendorName}</Label>
 <Input
 value={maintenanceForm.vendorName}
 onChange={(e) =>
 setMaintenanceForm({ ...maintenanceForm, vendorName: e.target.value })
 }
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeModule.performedDate}</Label>
 <Input
 type="date"
 value={maintenanceForm.performedDate}
 onChange={(e) =>
 setMaintenanceForm({ ...maintenanceForm, performedDate: e.target.value })
 }
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.nextDueDate}</Label>
 <Input
 type="date"
 value={maintenanceForm.nextDueDate}
 onChange={(e) =>
 setMaintenanceForm({ ...maintenanceForm, nextDueDate: e.target.value })
 }
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.notes}</Label>
 <Textarea
 value={maintenanceForm.notes}
 onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
 rows={2}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={handleCreateMaintenance}>
 {t.financeModule.add}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Transfer Dialog */}
 <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.assetTransferRequest}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeModule.fromLocation}</Label>
 <Input
 value={transferForm.fromLocation}
 onChange={(e) => setTransferForm({ ...transferForm, fromLocation: e.target.value })}
 disabled
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.toLocation}</Label>
 <Input
 value={transferForm.toLocation}
 onChange={(e) => setTransferForm({ ...transferForm, toLocation: e.target.value })}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeModule.fromAssignee}</Label>
 <Input
 value={transferForm.fromAssignee}
 onChange={(e) => setTransferForm({ ...transferForm, fromAssignee: e.target.value })}
 disabled
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.toAssignee}</Label>
 <Input
 value={transferForm.toAssignee}
 onChange={(e) => setTransferForm({ ...transferForm, toAssignee: e.target.value })}
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.transferDate}</Label>
 <Input
 type="date"
 value={transferForm.transferDate}
 onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.reason}</Label>
 <Textarea
 value={transferForm.reason}
 onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
 rows={2}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={handleCreateTransfer}>
 {t.financeModule.createRequest}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Disposal Dialog */}
 <Dialog open={showDisposalDialog} onOpenChange={setShowDisposalDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.assetDisposalRequest}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>{t.financeModule.disposalType}</Label>
 <Select
 value={disposalForm.disposalType}
 onValueChange={(value) => setDisposalForm({ ...disposalForm, disposalType: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {disposalTypes.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {isRTL ? type.labelAr : type.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeModule.proposedDate}</Label>
 <Input
 type="date"
 value={disposalForm.proposedDate}
 onChange={(e) => setDisposalForm({ ...disposalForm, proposedDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.proposedValue}</Label>
 <Input
 type="number"
 value={disposalForm.proposedValue}
 onChange={(e) =>
 setDisposalForm({ ...disposalForm, proposedValue: e.target.value })
 }
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.reason}</Label>
 <Textarea
 value={disposalForm.reason}
 onChange={(e) => setDisposalForm({ ...disposalForm, reason: e.target.value })}
 rows={2}
 />
 </div>
 {(disposalForm.disposalType ==="sale" || disposalForm.disposalType ==="donation") && (
 <div className="space-y-2">
 <Label>
 {disposalForm.disposalType ==="sale"
 ? 'Buyer Information'
 : 'Recipient Information'}
 </Label>
 <Textarea
 value={
 disposalForm.disposalType ==="sale"
 ? disposalForm.buyerInfo
 : disposalForm.recipientInfo
 }
 onChange={(e) =>
 setDisposalForm({
 ...disposalForm,
 [disposalForm.disposalType ==="sale" ?"buyerInfo" :"recipientInfo"]:
 e.target.value,
 })
 }
 rows={2}
 />
 </div>
 )}
 <div className="space-y-2">
 <Label>{t.financeModule.notes}</Label>
 <Textarea
 value={disposalForm.notes}
 onChange={(e) => setDisposalForm({ ...disposalForm, notes: e.target.value })}
 rows={2}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowDisposalDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={handleCreateDisposal}>
 {t.financeModule.createRequest}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Import Dialog */}
 <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.importAssets}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <p className="text-sm text-muted-foreground">
 {'Upload an Excel file containing asset data. The file should contain the following columns:'}
 </p>
 <ul className="text-sm text-muted-foreground list-disc list-inside">
 <li>Asset Code, Name</li>
 <li>Acquisition Date, Acquisition Cost, Currency</li>
 <li>Status, Condition, Location</li>
 <li>Donor Name, Grant Code</li>
 <li>Serial Number, Manufacturer, Model</li>
 </ul>
 <div className="border-2 border-dashed rounded-lg p-8 text-center">
 <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
 <p className="text-sm text-muted-foreground">
 {t.financeModule.dragAndDropFileHereOr}
 </p>
 <Input
 type="file"
 accept=".xlsx,.xls,.csv"
 className="mt-2"
 onChange={(e) => {
 // Handle file upload - would need to parse Excel and call bulkImportMutation
 toast.info(t.financeModule.processingFile);
 }}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowImportDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
