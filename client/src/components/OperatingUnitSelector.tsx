import { useTranslation } from '@/i18n/useTranslation';
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

/**
 * Operating Unit Selector Component
 * 
 * Smart selector that:
 * - Hides when user has exactly 1 operating unit
 * - Shows when user has multiple operating units
 * - Auto-selects if user has 1 unit
 */
export function OperatingUnitSelector() {
  const { t } = useTranslation();
 const {
 currentOperatingUnitId,
 setCurrentOperatingUnitId,
 userOperatingUnits,
 isLoading,
 shouldShowSelector,
 } = useOperatingUnit();

 // Don't render if user has only 1 unit (auto-selected)
 if (!shouldShowSelector) {
 return null;
 }

 if (isLoading) {
 return (
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Building2 className="w-4 h-4" />
 <span>Loading units...</span>
 </div>
 );
 }

 if (userOperatingUnits.length === 0) {
 return (
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Building2 className="w-4 h-4" />
 <span>No operating units assigned</span>
 </div>
 );
 }

 return (
 <div className="flex items-center gap-2">
 <Building2 className="w-4 h-4 text-muted-foreground" />
 <Select
 value={currentOperatingUnitId?.toString() || ""}
 onValueChange={(value) => setCurrentOperatingUnitId(parseInt(value))}
 >
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder={t.placeholders.selectOperatingUnit} />
 </SelectTrigger>
 <SelectContent>
 {userOperatingUnits.map((unit) => (
 <SelectItem key={unit.id} value={unit.id.toString()}>
 <div className="flex flex-col">
 <span className="font-medium">{unit.name}</span>
 <span className="text-xs text-muted-foreground capitalize">{unit.type}</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 );
}
