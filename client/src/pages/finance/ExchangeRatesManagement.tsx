import { useState } from"react";
import { trpc } from"@/lib/trpc";
import { useAuth } from"@/contexts/AuthContext";
import { useOperatingUnit } from"@/contexts/OperatingUnitContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from"@/components/ui/dialog";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Badge } from"@/components/ui/badge";
import { toast } from"react-hot-toast";
import { Plus, Download, RefreshCw, Calculator, Trash2, Edit, ArrowRight} from"lucide-react";
import { useNavigate } from '@/lib/router-compat';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function ExchangeRatesManagement() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { user } = useAuth();
 const { currentOperatingUnit } = useOperatingUnit();
 const { language, isRTL} = useLanguage();

 const [showCreateDialog, setShowCreateDialog] = useState(false);
 const [showEditDialog, setShowEditDialog] = useState(false);
 const [showDeleteDialog, setShowDeleteDialog] = useState(false);
 const [showConverterDialog, setShowConverterDialog] = useState(false);
 const [selectedRateId, setSelectedRateId] = useState<number | null>(null);

 const [filterFromCurrency, setFilterFromCurrency] = useState("");
 const [filterToCurrency, setFilterToCurrency] = useState("");

 const [rateForm, setRateForm] = useState({
 fromCurrencyCode:"",
 toCurrencyCode:"",
 rate:"",
 effectiveDate:"",
 expiryDate:"",
 source:"manual",
 notes:"",
 });

 const [converterForm, setConverterForm] = useState({
 amount:"",
 fromCurrency:"",
 toCurrency:"",
 asOfDate:"",
 });

 const [conversionResult, setConversionResult] = useState<any>(null);

 // Queries
 const { data: rates = [], refetch: refetchRates } = trpc.exchangeRates.list.useQuery({
 fromCurrencyCode: filterFromCurrency || undefined,
 toCurrencyCode: filterToCurrency || undefined,
 });

 const { data: currencies = [] } = trpc.exchangeRates.listCurrencies.useQuery({});

 const { data: selectedRate } = trpc.exchangeRates.getById.useQuery(
 { id: selectedRateId! },
 { enabled: !!selectedRateId && showEditDialog }
 );

 // Mutations
 const createRateMutation = trpc.exchangeRates.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.exchangeRateCreatedSuccessfully);
 setShowCreateDialog(false);
 resetRateForm();
 refetchRates();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateRateMutation = trpc.exchangeRates.update.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.exchangeRateUpdatedSuccessfully);
 setShowEditDialog(false);
 setSelectedRateId(null);
 resetRateForm();
 refetchRates();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteRateMutation = trpc.exchangeRates.delete.useMutation({
 onSuccess: () => {
 toast.success(t.financeModule.exchangeRateDeletedSuccessfully);
 setShowDeleteDialog(false);
 setSelectedRateId(null);
 refetchRates();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const fetchLatestRatesMutation = trpc.exchangeRates.fetchLatestRates.useMutation({
 onSuccess: (data) => {
 toast.success(
 `Fetched ${data.insertedCount} exchange rates from API`
 );
 refetchRates();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const convertMutation = trpc.exchangeRates.convert.useQuery(
 {
 amount: parseFloat(converterForm.amount) || 0,
 fromCurrencyCode: converterForm.fromCurrency,
 toCurrencyCode: converterForm.toCurrency,
 asOfDate: converterForm.asOfDate || undefined,
 },
 {
 enabled: false,
 }
 );

 const resetRateForm = () => {
 setRateForm({
 fromCurrencyCode:"",
 toCurrencyCode:"",
 rate:"",
 effectiveDate:"",
 expiryDate:"",
 source:"manual",
 notes:"",
 });
 };

 const handleCreate = () => {
 if (!rateForm.fromCurrencyCode || !rateForm.toCurrencyCode || !rateForm.rate || !rateForm.effectiveDate) {
 toast.error(t.financeModule.pleaseFillAllRequiredFields);
 return;
 }

 createRateMutation.mutate({
 ...rateForm,
 });
 };

 const handleEdit = (rate: any) => {
 setSelectedRateId(rate.id);
 setRateForm({
 fromCurrencyCode: rate.fromCurrencyCode,
 toCurrencyCode: rate.toCurrencyCode,
 rate: rate.rate,
 effectiveDate: rate.effectiveDate ? new Date(rate.effectiveDate).toISOString().split("T")[0] :"",
 expiryDate: rate.expiryDate ? new Date(rate.expiryDate).toISOString().split("T")[0] :"",
 source: rate.source ||"manual",
 notes: rate.notes ||"",
 });
 setShowEditDialog(true);
 };

 const handleUpdate = () => {
 if (!selectedRateId) return;

 updateRateMutation.mutate({
 id: selectedRateId,
 rate: rateForm.rate,
 effectiveDate: rateForm.effectiveDate,
 expiryDate: rateForm.expiryDate || null,
 source: rateForm.source,
 notes: rateForm.notes,
 });
 };

 const handleDelete = (id: number) => {
 setSelectedRateId(id);
 setShowDeleteDialog(true);
 };

 const confirmDelete = () => {
 if (!selectedRateId) return;
 deleteRateMutation.mutate({ id: selectedRateId });
 };

 const handleFetchLatestRates = () => {
 fetchLatestRatesMutation.mutate({
 baseCurrency:"USD",
 });
 };

 const handleConvert = async () => {
 if (!converterForm.amount || !converterForm.fromCurrency || !converterForm.toCurrency) {
 toast.error(t.financeModule.pleaseFillAllConversionFields);
 return;
 }

 const result = await convertMutation.refetch();
 if (result.data) {
 setConversionResult(result.data);
 }
 };

 const formatDate = (date: any) => {
 if (!date) return"-";
 return new Date(date).toLocaleDateString('en-US');
 };

 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/finance')} label={t.financeModule.backToFinance} />
 <div className="flex justify-between items-center mb-6">
 <div>
 <h1 className="text-3xl font-bold">{t.financeModule.exchangeRatesManagement}</h1>
 <p className="text-muted-foreground mt-1">
 {'Manage currency exchange rates and automatic conversion'}
 </p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={() => setShowConverterDialog(true)}>
 <Calculator className="h-4 w-4 me-2" />
 {t.financeModule.currencyConverter}
 </Button>
 <Button
 variant="outline"
 onClick={handleFetchLatestRates}
 disabled={fetchLatestRatesMutation.isPending}
 >
 <RefreshCw className={`h-4 w-4 me-2 ${fetchLatestRatesMutation.isPending ?"animate-spin" :""}`} />
 {t.financeModule.fetchLatestRates}
 </Button>
 <Button onClick={() => setShowCreateDialog(true)}>
 <Plus className="h-4 w-4 me-2" />
 {t.financeModule.addExchangeRate}
 </Button>
 </div>
 </div>

 <Tabs defaultValue="rates" className="space-y-4">
 <TabsList>
 <TabsTrigger value="rates">{t.financeModule.exchangeRates}</TabsTrigger>
 <TabsTrigger value="currencies">{t.financeModule.currencies}</TabsTrigger>
 </TabsList>

 <TabsContent value="rates">
 <Card>
 <CardHeader>
 <CardTitle>{t.financeModule.exchangeRates}</CardTitle>
 <CardDescription>
 {'View and manage currency exchange rates'}
 </CardDescription>
 <div className="flex gap-4 mt-4">
 <div className="flex-1">
 <Label>{t.financeModule.fromCurrency}</Label>
 <Select value={filterFromCurrency || "all"} onValueChange={(v) => setFilterFromCurrency(v === "all" ? "" : v)}>
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.allCurrencies} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.allCurrencies}</SelectItem>
 {currencies.map((currency: any) => (
 <SelectItem key={currency.id} value={currency.code}>
 {currency.code} - {currency.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex-1">
 <Label>{t.financeModule.toCurrency}</Label>
 <Select value={filterToCurrency || "all"} onValueChange={(v) => setFilterToCurrency(v === "all" ? "" : v)}>
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.allCurrencies} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.allCurrencies}</SelectItem>
 {currencies.map((currency: any) => (
 <SelectItem key={currency.id} value={currency.code}>
 {currency.code} - {currency.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeModule.from}</TableHead>
 <TableHead>{t.financeModule.to}</TableHead>
 <TableHead>{t.financeModule.rate}</TableHead>
 <TableHead>{t.financeModule.effectiveDate}</TableHead>
 <TableHead>{t.financeModule.expiryDate}</TableHead>
 <TableHead>{t.financeModule.source}</TableHead>
 <TableHead className="text-center">{t.financeModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {rates.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {t.financeModule.noExchangeRatesFound}
 </TableCell>
 </TableRow>
 ) : (
 rates.map((rate: any) => (
 <TableRow key={rate.id}>
 <TableCell className="font-medium">{rate.fromCurrencyCode}</TableCell>
 <TableCell className="font-medium">{rate.toCurrencyCode}</TableCell>
 <TableCell>{parseFloat(rate.rate).toFixed(6)}</TableCell>
 <TableCell>{formatDate(rate.effectiveDate)}</TableCell>
 <TableCell>{formatDate(rate.expiryDate)}</TableCell>
 <TableCell>
 <Badge variant={rate.source ==="manual" ?"secondary" :"default"}>
 {rate.source ||"manual"}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex gap-2">
 <Button variant="ghost" size="sm" onClick={() => handleEdit(rate)}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => handleDelete(rate.id)}>
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

 <TabsContent value="currencies">
 <Card>
 <CardHeader>
 <CardTitle>{t.financeModule.availableCurrencies}</CardTitle>
 <CardDescription>
 {t.financeModule.listOfSupportedCurrenciesInThe}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeModule.code}</TableHead>
 <TableHead>{t.financeModule.name}</TableHead>
 <TableHead>{t.financeModule.symbol}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {currencies.map((currency: any) => (
 <TableRow key={currency.id}>
 <TableCell className="font-medium">{currency.code}</TableCell>
 <TableCell>{currency.name}</TableCell>
 <TableCell>{currency.symbol}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Create Rate Dialog */}
 <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.addNewExchangeRate}</DialogTitle>
 <DialogDescription>
 {t.financeModule.enterTheDetailsOfTheNew}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div className="space-y-2">
 <Label>{t.financeModule.fromCurrency}</Label>
 <Select value={rateForm.fromCurrencyCode} onValueChange={(value) => setRateForm({ ...rateForm, fromCurrencyCode: value })}>
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectCurrency} />
 </SelectTrigger>
 <SelectContent>
 {currencies.map((currency: any) => (
 <SelectItem key={currency.id} value={currency.code}>
 {currency.code} - {currency.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.toCurrency}</Label>
 <Select value={rateForm.toCurrencyCode} onValueChange={(value) => setRateForm({ ...rateForm, toCurrencyCode: value })}>
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectCurrency} />
 </SelectTrigger>
 <SelectContent>
 {currencies.map((currency: any) => (
 <SelectItem key={currency.id} value={currency.code}>
 {currency.code} - {currency.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.rate}</Label>
 <Input
 type="number"
 step="0.000001"
 value={rateForm.rate}
 onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
 placeholder="1.234567"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.effectiveDate}</Label>
 <Input
 type="date"
 value={rateForm.effectiveDate}
 onChange={(e) => setRateForm({ ...rateForm, effectiveDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.expiryDateOptional}</Label>
 <Input
 type="date"
 value={rateForm.expiryDate}
 onChange={(e) => setRateForm({ ...rateForm, expiryDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.notes}</Label>
 <Input
 value={rateForm.notes}
 onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
 placeholder={t.financeModule.additionalNotes}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={handleCreate} disabled={createRateMutation.isPending}>
 {t.financeModule.create}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Rate Dialog */}
 <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.editExchangeRate}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="space-y-2">
 <Label>{t.financeModule.rate}</Label>
 <Input
 type="number"
 step="0.000001"
 value={rateForm.rate}
 onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.effectiveDate}</Label>
 <Input
 type="date"
 value={rateForm.effectiveDate}
 onChange={(e) => setRateForm({ ...rateForm, effectiveDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.expiryDate}</Label>
 <Input
 type="date"
 value={rateForm.expiryDate}
 onChange={(e) => setRateForm({ ...rateForm, expiryDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.notes}</Label>
 <Input
 value={rateForm.notes}
 onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowEditDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button onClick={handleUpdate} disabled={updateRateMutation.isPending}>
 {t.financeModule.update}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.confirmDelete}</DialogTitle>
 <DialogDescription>
 {'Are you sure you want to delete this exchange rate? This action cannot be undone.'}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
 {t.financeModule.cancel}
 </Button>
 <Button variant="destructive" onClick={confirmDelete} disabled={deleteRateMutation.isPending}>
 {t.financeModule.delete}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Currency Converter Dialog */}
 <Dialog open={showConverterDialog} onOpenChange={setShowConverterDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financeModule.currencyConverter}</DialogTitle>
 <DialogDescription>
 {t.financeModule.convertAmountsBetweenCurrencies}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div className="space-y-2">
 <Label>{t.financeModule.amount}</Label>
 <Input
 type="number"
 value={converterForm.amount}
 onChange={(e) => setConverterForm({ ...converterForm, amount: e.target.value })}
 placeholder="1000"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.fromCurrency}</Label>
 <Select value={converterForm.fromCurrency} onValueChange={(value) => setConverterForm({ ...converterForm, fromCurrency: value })}>
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectCurrency} />
 </SelectTrigger>
 <SelectContent>
 {currencies.map((currency: any) => (
 <SelectItem key={currency.id} value={currency.code}>
 {currency.code}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.toCurrency}</Label>
 <Select value={converterForm.toCurrency} onValueChange={(value) => setConverterForm({ ...converterForm, toCurrency: value })}>
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectCurrency} />
 </SelectTrigger>
 <SelectContent>
 {currencies.map((currency: any) => (
 <SelectItem key={currency.id} value={currency.code}>
 {currency.code}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.dateOptional}</Label>
 <Input
 type="date"
 value={converterForm.asOfDate}
 onChange={(e) => setConverterForm({ ...converterForm, asOfDate: e.target.value })}
 />
 </div>
 <Button onClick={handleConvert} className="w-full">
 <Calculator className="h-4 w-4 me-2" />
 {t.financeModule.convert}
 </Button>
 {conversionResult && (
 <Card>
 <CardContent className="pt-6">
 <div className="text-center space-y-2">
 <div className="text-2xl font-bold">
 {conversionResult.originalAmount.toFixed(2)} {conversionResult.fromCurrency}
 </div>
 <ArrowRight className="h-6 w-6 mx-auto text-muted-foreground" />
 <div className="text-3xl font-bold text-primary">
 {conversionResult.convertedAmount.toFixed(2)} {conversionResult.toCurrency}
 </div>
 <div className="text-sm text-muted-foreground">
 {t.financeModule.rate24} {conversionResult.rate.toFixed(6)}
 </div>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowConverterDialog(false)}>
 {t.financeModule.close}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
