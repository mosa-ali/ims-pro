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
import { FolderKanban, Search, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface ProjectSelectorProps {
 value?: number | null;
 onChange: (projectId: number | null) => void;
 disabled?: boolean;
 placeholder?: string;
 placeholderAr?: string;
 className?: string;
 showIcon?: boolean;
 allowClear?: boolean;
}

/**
 * ProjectSelector Component
 * 
 * System-wide project selector that:
 * - Is scoped by organizationId + operatingUnitId (via scopedProcedure)
 * - Supports search functionality
 * - Handles empty states gracefully
 * - Supports disabled state
 * - Bilingual (English/Arabic) support
 */
export function ProjectSelector({
 value,
 onChange,
 disabled = false,
 placeholder = "Select project",
 placeholderAr = "اختر المشروع",
 className = "",
 showIcon = true,
 allowClear = true,
}: ProjectSelectorProps) {
 const { t } = useTranslation();
const [searchQuery, setSearchQuery] = useState("");
 
 // Fetch projects scoped by organization/operating unit
 const { data: projectsData, isLoading, error } = trpc.projects.list.useQuery(
 { page: 1, pageSize: 100 },
 { staleTime: 30000 }
 );

 const projects = projectsData?.projects || [];

 // Filter projects by search query
 const filteredProjects = useMemo(() => {
 if (!searchQuery.trim()) return projects;
 const query = searchQuery.toLowerCase();
 return projects.filter(
 (project) =>
 project.name?.toLowerCase().includes(query) ||
 project.nameAr?.toLowerCase().includes(query) ||
 project.projectCode?.toLowerCase().includes(query)
 );
 }, [projects, searchQuery]);

 // Get selected project name for display
 const selectedProject = projects.find((p) => p.id === value);

 if (error) {
 return (
 <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
 {showIcon && <FolderKanban className="w-4 h-4" />}
 const { t, language } = useTranslation();
 <span>{t.projectSelector.errorLoadingProjects}</span>
 </div>
 );
 }

 return (
 <div className={`flex items-center gap-2 ${className}`}>
 {showIcon && <FolderKanban className="w-4 h-4 text-muted-foreground" />}
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
 <span>{t.projectSelector.loading}</span>
 </div>
 ) : (
 <SelectValue placeholder={language === "en" ? placeholder : placeholderAr}>
 {selectedProject ? (
 <span>
 {language === "en" 
 ? selectedProject.name 
 : selectedProject.nameAr || selectedProject.name}
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
 placeholder={t.projectSelector.searchProjects}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-8 h-8"
 />
 </div>
 </div>

 {/* Clear Option */}
 {allowClear && value && (
 <SelectItem value="__clear__" className="text-muted-foreground">
 {t.projectSelector.clearSelection}
 </SelectItem>
 )}

 {/* Empty State */}
 {filteredProjects.length === 0 && (
 <div className="py-6 text-center text-sm text-muted-foreground">
 {searchQuery
 ? (t.projectSelector.noProjectsMatchYourSearch)
 : (t.projectSelector.noProjectsAvailable)}
 </div>
 )}

 {/* Project List */}
 {filteredProjects.map((project) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 <div className="flex flex-col">
 <span className="font-medium">
 {language === "en" ? project.name : project.nameAr || project.name}
 </span>
 {project.projectCode && (
 <span className="text-xs text-muted-foreground">{project.projectCode}</span>
 )}
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 );
}

export default ProjectSelector;
