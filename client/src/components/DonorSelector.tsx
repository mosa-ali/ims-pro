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
import { UserCircle, Search, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface DonorSelectorProps {
 value?: number | null;
 onChange: (donorId: number | null) => void;
 disabled?: boolean;
 placeholder?: string;
 placeholderAr?: string;
 className?: string;
 showIcon?: boolean;
 allowClear?: boolean;
}

/**
 * DonorSelector Component
 * 
 * System-wide donor selector that:
 * - Is scoped by organizationId + operatingUnitId (via scopedProcedure)
 * - Supports search functionality
 * - Handles empty states gracefully
 * - Supports disabled state
 * - Bilingual (English/Arabic) support
 */
export function DonorSelector({
 value,
 onChange,
 disabled = false,
 placeholder = "Select donor",
 placeholderAr = "اختر المانح",
 className = "",
 showIcon = true,
 allowClear = true,
}: DonorSelectorProps) {
 const { t } = useTranslation();
const [searchQuery, setSearchQuery] = useState("");
 
 // Fetch donors scoped by organization/operating unit
 const { data: donorsData, isLoading, error } = trpc.donors.list.useQuery(
 { page: 1, pageSize: 100 },
 { staleTime: 30000 }
 );

 const donors = donorsData?.donors || [];

 // Filter donors by search query
 const filteredDonors = useMemo(() => {
 if (!searchQuery.trim()) return donors;
 const query = searchQuery.toLowerCase();
 return donors.filter(
 (donor) =>
 donor.name?.toLowerCase().includes(query) ||
 donor.nameAr?.toLowerCase().includes(query) ||
 donor.code?.toLowerCase().includes(query) ||
 donor.type?.toLowerCase().includes(query)
 );
 }, [donors, searchQuery]);

 // Get selected donor for display
 const selectedDonor = donors.find((d) => d.id === value);

 if (error) {
 return (
 <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
 {showIcon && <UserCircle className="w-4 h-4" />}
 const { t, language } = useTranslation();
 <span>{t.donorSelector.errorLoadingDonors}</span>
 </div>
 );
 }

 return (
 <div className={`flex items-center gap-2 ${className}`}>
 {showIcon && <UserCircle className="w-4 h-4 text-muted-foreground" />}
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
 <span>{t.donorSelector.loading}</span>
 </div>
 ) : (
 <SelectValue placeholder={language === "en" ? placeholder : placeholderAr}>
 {selectedDonor ? (
 <span>
 {language === "en" 
 ? selectedDonor.name 
 : selectedDonor.nameAr || selectedDonor.name}
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
 placeholder={t.donorSelector.searchDonors}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-8 h-8"
 />
 </div>
 </div>

 {/* Clear Option */}
 {allowClear && value && (
 <SelectItem value="__clear__" className="text-muted-foreground">
 {t.donorSelector.clearSelection}
 </SelectItem>
 )}

 {/* Empty State */}
 {filteredDonors.length === 0 && (
 <div className="py-6 text-center text-sm text-muted-foreground">
 {searchQuery
 ? (t.donorSelector.noDonorsMatchYourSearch)
 : (t.donorSelector.noDonorsAvailable)}
 </div>
 )}

 {/* Donor List */}
 {filteredDonors.map((donor) => (
 <SelectItem key={donor.id} value={donor.id.toString()}>
 <div className="flex flex-col">
 <span className="font-medium">
 {language === "en" ? donor.name : donor.nameAr || donor.name}
 </span>
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 {donor.code && <span>{donor.code}</span>}
 {donor.type && (
 <>
 <span>•</span>
 <span className="capitalize">{donor.type.replace(/_/g, ' ')}</span>
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

export default DonorSelector;
