import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import {
 Command,
 CommandEmpty,
 CommandGroup,
 CommandInput,
 CommandItem,
 CommandList,
} from "@/components/ui/command";
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/i18n/useTranslation";

interface Donor {
 id: number;
 code: string;
 name: string;
 nameAr: string | null;
 type: string;
}

interface DonorComboboxProps {
 value: number | null;
 onValueChange: (value: number | null) => void;
 donors: Donor[];
 isLoading?: boolean;
 placeholder?: string;
 disabled?: boolean;
 className?: string;
}

export function DonorCombobox({
 value,
 onValueChange,
 donors,
 isLoading = false,
 placeholder,
 disabled = false,
 className,
}: DonorComboboxProps) {
 const { t } = useTranslation();
 const [open, setOpen] = useState(false);
const selectedDonor = donors.find((d) => d.id === value);
 const { t, language } = useTranslation();
 const displayValue = selectedDonor 
 ? (language === "en" ? selectedDonor.name : selectedDonor.nameAr || selectedDonor.name)
 : null;

 return (
 <Popover open={open} onOpenChange={setOpen}>
 <PopoverTrigger asChild>
 <Button
 variant="outline"
 role="combobox"
 aria-expanded={open}
 disabled={disabled || isLoading}
 className={cn(
 "w-full justify-between font-normal",
 !value && "text-muted-foreground",
 className
 )}
 >
 <span className="flex items-center gap-2 truncate">
 {selectedDonor && <Building2 className="h-4 w-4 shrink-0" />}
 {displayValue || placeholder || (t.donorCombobox.selectDonor)}
 </span>
 <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-[400px] p-0" align="start">
 <Command>
 <CommandInput 
 placeholder={t.donorCombobox.searchDonors} 
 />
 <CommandList>
 <CommandEmpty>
 {t.donorCombobox.noDonorFound}
 </CommandEmpty>
 <CommandGroup>
 {donors.map((donor) => (
 <CommandItem
 key={donor.id}
 value={`${donor.name} ${donor.nameAr || ""} ${donor.code}`}
 onSelect={() => {
 onValueChange(donor.id === value ? null : donor.id);
 setOpen(false);
 }}
 >
 <Check
 className={cn(
 "mr-2 h-4 w-4",
 value === donor.id ? "opacity-100" : "opacity-0"
 )}
 />
 <div className="flex flex-col">
 <span className="font-medium">
 {language === "en" ? donor.name : donor.nameAr || donor.name}
 </span>
 <span className="text-xs text-muted-foreground">
 {donor.code} • {donor.type}
 </span>
 </div>
 </CommandItem>
 ))}
 </CommandGroup>
 </CommandList>
 </Command>
 </PopoverContent>
 </Popover>
 );
}
