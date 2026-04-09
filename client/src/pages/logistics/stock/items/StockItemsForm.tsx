import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function StockItemsForm() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const [, params] = useRoute("/organization/logistics/stock/items/:id");
 const [, editParams] = useRoute("/organization/logistics/stock/items/:id/edit");
 const itemId = params?.id || editParams?.id;
 const isEditMode = !!itemId;
 const { isRTL } = useLanguage();

 const [formData, setFormData] = useState({
 itemCode: "",
 itemName: "",
 description: "",
 category: "",
 unit: "",
 currentQuantity: "",
 reorderLevel: "",
 unitPrice: "",
 storeLocation: "",
 });

 const { data: item, isLoading } = trpc.logistics.stock.getById.useQuery(
 { id: parseInt(itemId!) },
 { enabled: isEditMode }
 );

 const createMutation = trpc.logistics.stock.create.useMutation();
 const updateMutation = trpc.logistics.stock.update.useMutation();
 const utils = trpc.useUtils();

 useEffect(() => {
 if (item) {
 setFormData({
 itemCode: item.itemCode || "",
 itemName: item.itemName || "",
 description: item.description || "",
 category: item.category || "",
 unit: item.unit || "",
 currentQuantity: item.currentQuantity?.toString() || "",
 reorderLevel: item.reorderLevel?.toString() || "",
 unitPrice: item.unitPrice || "",
 storeLocation: item.storeLocation || "",
 });
 }
 }, [item]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 if (isEditMode) {
 await updateMutation.mutateAsync({
 id: parseInt(itemId!),
 ...formData,
 currentQuantity: parseInt(formData.currentQuantity) || 0,
 reorderLevel: parseInt(formData.reorderLevel) || 0,
 });
 } else {
 await createMutation.mutateAsync({
 ...formData,
 currentQuantity: parseInt(formData.currentQuantity) || 0,
 reorderLevel: parseInt(formData.reorderLevel) || 0,
 });
 }
 utils.logistics.stock.listItems.invalidate();
 setLocation("/organization/logistics/stock/items");
 } catch (error) {
 console.error("Error saving item:", error);
 }
 };

 if (isLoading) {
 return (
 <div className="min-h-screen bg-background p-6">
 <div className="container max-w-4xl">
 <div className="text-center py-12">{t.logistics.loading}</div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background p-6">
 <div className="container max-w-4xl">
 <div className="flex items-center gap-4 mb-6">
 <BackButton href="/organization/logistics/stock/items" iconOnly />
 <h1 className="text-3xl font-bold text-foreground">
  {isEditMode ? t.logistics.editItem : t.logistics.addItem18}
 </h1>
 </div>

 <form onSubmit={handleSubmit}>
 <Card>
 <CardHeader>
 <CardTitle>{t.logistics.itemInformation}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="itemCode">{t.logistics.itemCode} *</Label>
 <Input
 id="itemCode"
 value={formData.itemCode}
 onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="category">{t.logistics.category}</Label>
 <Input
 id="category"
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="itemName">{t.logistics.itemName} *</Label>
 <Input
 id="itemName"
 value={formData.itemName}
 onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
 required
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="description">{t.logistics.description}</Label>
 <Textarea
 id="description"
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 rows={3}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="unit">{t.logistics.unit} *</Label>
 <Input
 id="unit"
 value={formData.unit}
 onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="currentQuantity">{t.logistics.currentQuantity}</Label>
 <Input
 id="currentQuantity"
 type="number"
 value={formData.currentQuantity}
 onChange={(e) => setFormData({ ...formData, currentQuantity: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="reorderLevel">{t.logistics.reorderLevel}</Label>
 <Input
 id="reorderLevel"
 type="number"
 value={formData.reorderLevel}
 onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="unitPrice">{t.logistics.unitPrice}</Label>
 <Input
 id="unitPrice"
 type="number"
 step="0.01"
 value={formData.unitPrice}
 onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="storeLocation">{t.logistics.storeLocation}</Label>
 <Input
 id="storeLocation"
 value={formData.storeLocation}
 onChange={(e) => setFormData({ ...formData, storeLocation: e.target.value })}
 />
 </div>
 </div>
 </CardContent>
 </Card>

 <div className="flex justify-end gap-4 mt-6">
 <Button
 type="button"
 variant="outline"
 onClick={() => setLocation("/organization/logistics/stock/items")}
 >
 {t.logistics.cancel}
 </Button>
 <Button type="submit">
 <Save className="h-4 w-4 me-2" />
 {t.logistics.save}
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}
