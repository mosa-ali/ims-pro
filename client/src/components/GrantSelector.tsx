import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DollarSign, Search, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface GrantSelectorProps {
 value?: number | null;
 onChange: (grantId: number | null) => void;
 projectId?: number | null;
 disabled?: boolean;
 placeholder?: string;
 placeholderAr?: string;
 className?: string;
 showIcon?: boolean;
 allowClear?: boolean;
}

/**
 * GrantSelector Component
 * 
 * System-wide grant selector that:
 * - Filters by selected projectId when provided
 * - Is scoped by organizationId + operatingUnitId (via scopedProcedure)
 * - Supports search functionality
 * - Handles empty states gracefully
 * - Supports disabled state
 * - Bilingual (English/Arabic) support
 */
export function GrantSelector({
 value,
 onChange,
 projectId,
 disabled = false,
 placeholder = "Select grant",
 placeholderAr = "اختر المنحة",
 className = "",
 showIcon = true,
 allowClear = true,
}: GrantSelectorProps) {
 const { t } = useTranslation();
const [searchQuery, setSearchQuery] = useState("");
 
 // Fetch grants scoped by organization/operating unit
 const { data: grantsData, isLoading, error } = trpc.grants.list.useQuery(
 { 
 page: 1, 
 pageSize: 100,
 projectId: projectId || undefined,
 },
 { 
 staleTime: 30000,
 enabled: true,
 }
 );

 const grants = grantsData?.grants || [];

 // Filter grants by search query
 const filteredGrants = useMemo(() => {
 if (!searchQuery.trim()) return grants;
 const query = searchQuery.toLowerCase();
 return grants.filter(
 (grant) =>
 grant.title?.toLowerCase().includes(query) ||
 grant.titleAr?.toLowerCase().includes(query) ||
 grant.grantCode?.toLowerCase().includes(query) ||
 grant.donorName?.toLowerCase().includes(query)
 );
 }, [grants, searchQuery]);

 // Get selected grant for display
 const selectedGrant = grants.find((g) => g.id === value);

 // Clear selection when projectId changes and current selection doesn't match
 useMemo(() => {
 if (projectId && selectedGrant && selectedGrant.projectId !== projectId) {
 onChange(null);
 }
 }, [projectId, selectedGrant, onChange]);

 if (error) {
 return (
 <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
 {showIcon && <DollarSign className="w-4 h-4" />}
 const { t, language } = useTranslation();
 <span>{t.grantSelector.errorLoadingGrants}</span>
 </div>
 );
 }

 return (
 <div className={`flex items-center gap-2 ${className}`}>
 {showIcon && <DollarSign className="w-4 h-4 text-muted-foreground" />}
 <Select
 value={value?.toString() || ""}
 onValueChange={(val) => {
 if (val === "__clear__") {
 onChange(null);
 } else {
 onChange(val ? parseInt(val) : null);
 }
 }}
 disabled={disabled || isLoading}
 >
 <SelectTrigger className="w-full min-w-[200px]">
 {isLoading ? (
 <div className="flex items-center gap-2">
 <Loader2 className="w-4 h-4 animate-spin" />
 <span>{t.grantSelector.loading}</span>
 </div>
 ) : (
 <SelectValue placeholder={language === "en" ? placeholder : placeholderAr}>
 {selectedGrant ? (
 <span>
 {language === "en" 
 ? selectedGrant.title 
 : selectedGrant.titleAr || selectedGrant.title}
 </span>
 ) : null}
 </SelectValue>
 )}
 </SelectTrigger>
 <SelectContent className="max-h-[300px]">
 {/* Search Input */}
 <div className="px-2 pb-2 sticky top-0 bg-popover">
 <div className="relative">
 <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 placeholder={t.grantSelector.searchGrants}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-8 h-8"
 />
 </div>
 </div>

 {/* Clear Option */}
 {allowClear && value && (
 <SelectItem value="__clear__" className="text-muted-foreground">
 {t.grantSelector.clearSelection}
 </SelectItem>
 )}

 {/* Empty State */}
 {filteredGrants.length === 0 && (
 <div className="py-6 text-center text-sm text-muted-foreground">
 {searchQuery
 ? (t.grantSelector.noGrantsMatchYourSearch)
 : projectId
 ? (t.grantSelector.noGrantsForThisProject)
 : (t.grantSelector.noGrantsAvailable)}
 </div>
 )}

 {/* Grant List */}
 {filteredGrants.map((grant) => (
 <SelectItem key={grant.id} value={grant.id.toString()}>
 <div className="flex flex-col">
 <span className="font-medium">
 {language === "en" ? grant.title : grant.titleAr || grant.title}
 </span>
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 {grant.grantCode && <span>{grant.grantCode}</span>}
 {grant.donorName && (
 <>
 <span>•</span>
 <span>{grant.donorName}</span>
 </>
 )}
 </div>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 );
}

export default GrantSelector;
