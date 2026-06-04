import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";

export default function StockItemsForm() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/organization/logistics/stock/items/:id");
  const [, editParams] = useRoute("/organization/logistics/stock/items/:id/edit");
  const itemId = params?.id || editParams?.id;
  const isEditMode = !!itemId;
  const { isRTL } = useLanguage();

  // Form state - all fields that the router accepts
  const [formData, setFormData] = useState({
    itemCode: "",
    itemName: "",
    itemNameAr: "",
    description: "",
    category: "",
    unitType: "",
    warehouseLocation: "",
    binLocation: "",
    currentQuantity: "",
    minimumQuantity: "",
    maximumQuantity: "",
    reorderLevel: "",
    unitCost: "",
    currency: "USD",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch item if in edit mode
  const { data: item, isLoading } = trpc.logistics.stock.getById.useQuery(
    { id: parseInt(itemId!) },
    { enabled: isEditMode }
  );

  const createMutation = trpc.logistics.stock.create.useMutation({
    onSuccess: () => {
      toast.success(t.common?.savedSuccessfully || "Item saved successfully");
      setLocation("/organization/logistics/stock/items");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save item");
      setIsSubmitting(false);
    },
  });

  const updateMutation = trpc.logistics.stock.update.useMutation({
    onSuccess: () => {
      toast.success(t.logistics?.updatedSuccessfully || "Item updated successfully");
      setLocation("/organization/logistics/stock/items");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update item");
      setIsSubmitting(false);
    },
  });

  const utils = trpc.useUtils();

  // Populate form when item is loaded
  useEffect(() => {
    if (item) {
      setFormData({
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        itemNameAr: item.itemNameAr || "",
        description: item.description || "",
        category: item.category || "",
        unitType: item.unitType || "",
        warehouseLocation: item.warehouseLocation || "",
        binLocation: item.binLocation || "",
        currentQuantity: item.currentQuantity?.toString() || "",
        minimumQuantity: item.minimumQuantity?.toString() || "",
        maximumQuantity: item.maximumQuantity?.toString() || "",
        reorderLevel: item.reorderLevel?.toString() || "",
        unitCost: item.unitCost?.toString() || "",
        currency: item.currency || "USD",
      });
    }
  }, [item]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemCode.trim()) {
      newErrors.itemCode = t.logistics?.itemCodeRequired || "Item code is required";
    }
    if (!formData.itemName.trim()) {
      newErrors.itemName = t.logistics?.itemNameRequired || "Item name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: parseInt(itemId!),
          itemName: formData.itemName,
          itemNameAr: formData.itemNameAr || undefined,
          description: formData.description || undefined,
          category: formData.category || undefined,
          unitType: formData.unitType || undefined,
          warehouseLocation: formData.warehouseLocation || undefined,
          binLocation: formData.binLocation || undefined,
          currentQuantity: formData.currentQuantity || undefined,
          minimumQuantity: formData.minimumQuantity || undefined,
          maximumQuantity: formData.maximumQuantity || undefined,
          reorderLevel: formData.reorderLevel || undefined,
          unitCost: formData.unitCost || undefined,
          currency: formData.currency || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          itemCode: formData.itemCode,
          itemName: formData.itemName,
          itemNameAr: formData.itemNameAr || undefined,
          description: formData.description || undefined,
          category: formData.category || undefined,
          unitType: formData.unitType || undefined,
          warehouseLocation: formData.warehouseLocation || undefined,
          binLocation: formData.binLocation || undefined,
          currentQuantity: formData.currentQuantity || undefined,
          minimumQuantity: formData.minimumQuantity || undefined,
          maximumQuantity: formData.maximumQuantity || undefined,
          reorderLevel: formData.reorderLevel || undefined,
          unitCost: formData.unitCost || undefined,
          currency: formData.currency || undefined,
        });
      }

      // Invalidate cache
      utils.logistics.stock.listItems.invalidate();
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container max-w-4xl">
          <div className="text-center py-12">{t.logistics?.loading || "Loading..."}</div>
        </div>
      </div>
    );
  }

  const isSubmittingForm = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <BackButton href="/organization/logistics/stock/items" iconOnly />
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode 
              ? t.logistics?.editItem || "Edit Stock Item" 
              : t.logistics?.addItem || "Add Stock Item"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isEditMode 
                ? t.logistics?.itemDetails || "Item Details" 
                : t.logistics?.newItem || "New Item"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Item Code */}
              <div className="space-y-2">
                <Label htmlFor="itemCode">
                  {t.logistics?.itemCode || "Item Code"} *
                </Label>
                <Input
                  id="itemCode"
                  name="itemCode"
                  value={formData.itemCode}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.enterItemCode || "Enter item code"}
                  className={errors.itemCode ? "border-red-500" : ""}
                  disabled={isEditMode || isSubmittingForm}
                />
                {errors.itemCode && (
                  <p className="text-sm text-red-500">{errors.itemCode}</p>
                )}
              </div>

              {/* Item Name (English) */}
              <div className="space-y-2">
                <Label htmlFor="itemName">
                  {t.logistics?.itemName || "Item Name"} *
                </Label>
                <Input
                  id="itemName"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.enterItemName || "Enter item name"}
                  className={errors.itemName ? "border-red-500" : ""}
                  disabled={isSubmittingForm}
                />
                {errors.itemName && (
                  <p className="text-sm text-red-500">{errors.itemName}</p>
                )}
              </div>

              {/* Item Name (Arabic) */}
              <div className="space-y-2">
                <Label htmlFor="itemNameAr">
                  {t.logistics?.itemNameAr || "Item Name (Arabic)"}
                </Label>
                <Input
                  id="itemNameAr"
                  name="itemNameAr"
                  value={formData.itemNameAr}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.enterItemNameAr || "أدخل اسم الصنف"}
                  dir="rtl"
                  disabled={isSubmittingForm}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">
                  {t.logistics?.category || "Category"}
                </Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.selectCategory || "Select category"}
                  disabled={isSubmittingForm}
                />
              </div>

              {/* Unit Type */}
              <div className="space-y-2">
                <Label htmlFor="unitType">
                  {t.logistics?.unitType || "Unit Type"}
                </Label>
                <Input
                  id="unitType"
                  name="unitType"
                  value={formData.unitType}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.enterUnitType || "e.g., Piece, Box, Kg"}
                  disabled={isSubmittingForm}
                />
              </div>

              {/* Warehouse Location */}
              <div className="space-y-2">
                <Label htmlFor="warehouseLocation">
                  {t.logistics?.warehouseLocation || "Warehouse Location"}
                </Label>
                <Input
                  id="warehouseLocation"
                  name="warehouseLocation"
                  value={formData.warehouseLocation}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.enterWarehouseLocation || "Enter warehouse location"}
                  disabled={isSubmittingForm}
                />
              </div>

              {/* Bin Location */}
              <div className="space-y-2">
                <Label htmlFor="binLocation">
                  {t.logistics?.binLocation || "Bin Location"}
                </Label>
                <Input
                  id="binLocation"
                  name="binLocation"
                  value={formData.binLocation}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.enterBinLocation || "Enter bin location"}
                  disabled={isSubmittingForm}
                />
              </div>

              {/* Quantities Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentQuantity">
                    {t.logistics?.currentQuantity || "Current Quantity"}
                  </Label>
                  <Input
                    id="currentQuantity"
                    name="currentQuantity"
                    type="number"
                    value={formData.currentQuantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled={isSubmittingForm}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumQuantity">
                    {t.logistics?.minimumQuantity || "Minimum Quantity"}
                  </Label>
                  <Input
                    id="minimumQuantity"
                    name="minimumQuantity"
                    type="number"
                    value={formData.minimumQuantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled={isSubmittingForm}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maximumQuantity">
                    {t.logistics?.maximumQuantity || "Maximum Quantity"}
                  </Label>
                  <Input
                    id="maximumQuantity"
                    name="maximumQuantity"
                    type="number"
                    value={formData.maximumQuantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled={isSubmittingForm}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">
                    {t.logistics?.reorderLevel || "Reorder Level"}
                  </Label>
                  <Input
                    id="reorderLevel"
                    name="reorderLevel"
                    type="number"
                    value={formData.reorderLevel}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled={isSubmittingForm}
                  />
                </div>
              </div>

              {/* Cost Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitCost">
                    {t.logistics?.unitCost || "Unit Cost"}
                  </Label>
                  <Input
                    id="unitCost"
                    name="unitCost"
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled={isSubmittingForm}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">
                    {t.logistics?.currency || "Currency"}
                  </Label>
                  <Input
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    placeholder="USD"
                    disabled={isSubmittingForm}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {t.logistics?.description || "Description"}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={t.logistics?.enterDescription || "Enter description"}
                  rows={4}
                  disabled={isSubmittingForm}
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 justify-end pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/organization/logistics/stock/items")}
                  disabled={isSubmittingForm}
                >
                  {t.common?.cancel || "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="gap-2"
                >
                  {isSubmittingForm ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.logistics?.saving || "Saving..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t.common?.save || "Save"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
