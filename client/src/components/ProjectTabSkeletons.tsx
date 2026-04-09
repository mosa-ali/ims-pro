import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeleton for Overview tab - mimics the project summary layout
 * with KPI cards, project info section, and description area
 */
export function OverviewTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* KPI Cards Row */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <Skeleton className="h-4 w-24 mb-3" />
 <Skeleton className="h-8 w-16 mb-2" />
 <Skeleton className="h-3 w-20" />
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Project Info Section */}
 <Card>
 <CardHeader>
 <Skeleton className="h-5 w-40" />
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="space-y-2">
 <Skeleton className="h-3 w-20" />
 <Skeleton className="h-5 w-32" />
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 {/* Description */}
 <Card>
 <CardHeader>
 <Skeleton className="h-5 w-32" />
 </CardHeader>
 <CardContent>
 <Skeleton className="h-4 w-full mb-2" />
 <Skeleton className="h-4 w-3/4 mb-2" />
 <Skeleton className="h-4 w-5/6" />
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Financial Overview tab - mimics budget summary cards
 * and the budget items table
 */
export function FinancialTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {Array.from({ length: 3 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-5">
 <Skeleton className="h-4 w-28 mb-3" />
 <Skeleton className="h-7 w-24 mb-2" />
 <Skeleton className="h-2 w-full rounded-full mb-2" />
 <Skeleton className="h-3 w-20" />
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Table Header + Actions */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-36" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-24 rounded-md" />
 <Skeleton className="h-9 w-24 rounded-md" />
 </div>
 </div>
 {/* Table */}
 <Card>
 <CardContent className="p-0">
 <div className="border-b px-4 py-3 flex gap-4">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} className="h-4 flex-1" />
 ))}
 </div>
 {Array.from({ length: 6 }).map((_, row) => (
 <div key={row} className="px-4 py-3 flex gap-4 border-b last:border-0">
 {Array.from({ length: 5 }).map((_, col) => (
 <Skeleton key={col} className="h-5 flex-1" />
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Activities tab - mimics the activities list with
 * filter bar and activity cards/table rows
 */
export function ActivitiesTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header with search and actions */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-32" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-32 rounded-md" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 </div>
 {/* Filter Bar */}
 <div className="flex gap-3">
 <Skeleton className="h-9 w-64 rounded-md" />
 <Skeleton className="h-9 w-32 rounded-md" />
 <Skeleton className="h-9 w-32 rounded-md" />
 </div>
 {/* Activity Cards */}
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <div className="flex items-start justify-between">
 <div className="flex-1 space-y-2">
 <Skeleton className="h-5 w-48" />
 <Skeleton className="h-4 w-72" />
 <div className="flex gap-4 mt-3">
 <Skeleton className="h-6 w-20 rounded-full" />
 <Skeleton className="h-6 w-24 rounded-full" />
 <Skeleton className="h-6 w-16 rounded-full" />
 </div>
 </div>
 <div className="flex flex-col items-end gap-2">
 <Skeleton className="h-8 w-16" />
 <Skeleton className="h-2 w-24 rounded-full" />
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 );
}

/**
 * Skeleton for Indicators tab - mimics indicator cards with
 * progress bars and measurement data
 */
export function IndicatorsTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-36" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-28 rounded-md" />
 <Skeleton className="h-9 w-24 rounded-md" />
 </div>
 </div>
 {/* Summary Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4 text-center">
 <Skeleton className="h-8 w-12 mx-auto mb-2" />
 <Skeleton className="h-3 w-20 mx-auto" />
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Indicator Table */}
 <Card>
 <CardContent className="p-0">
 <div className="border-b px-4 py-3 flex gap-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <Skeleton key={i} className="h-4 flex-1" />
 ))}
 </div>
 {Array.from({ length: 5 }).map((_, row) => (
 <div key={row} className="px-4 py-4 flex gap-4 items-center border-b last:border-0">
 <Skeleton className="h-5 flex-[2]" />
 <Skeleton className="h-6 w-16 rounded-full" />
 <Skeleton className="h-5 flex-1" />
 <Skeleton className="h-5 flex-1" />
 <Skeleton className="h-2 flex-1 rounded-full" />
 <Skeleton className="h-8 w-8 rounded" />
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Beneficiaries tab - mimics the beneficiary list
 * with demographic summary and registration table
 */
export function BeneficiariesTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-32" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-36 rounded-md" />
 <Skeleton className="h-9 w-24 rounded-md" />
 </div>
 </div>
 {/* Demographic Summary */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <Skeleton className="h-4 w-20 mb-2" />
 <Skeleton className="h-7 w-16 mb-1" />
 <Skeleton className="h-3 w-24" />
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Filters */}
 <div className="flex gap-3">
 <Skeleton className="h-9 w-56 rounded-md" />
 <Skeleton className="h-9 w-28 rounded-md" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 {/* Table */}
 <Card>
 <CardContent className="p-0">
 <div className="border-b px-4 py-3 flex gap-4">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} className="h-4 flex-1" />
 ))}
 </div>
 {Array.from({ length: 5 }).map((_, row) => (
 <div key={row} className="px-4 py-3 flex gap-4 border-b last:border-0">
 {Array.from({ length: 5 }).map((_, col) => (
 <Skeleton key={col} className="h-5 flex-1" />
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Case Management tab - mimics the KPI dashboard
 * with case statistics and recent cases table
 */
export function CaseManagementTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* KPI Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <div className="flex items-center gap-3">
 <Skeleton className="h-10 w-10 rounded-lg" />
 <div className="space-y-1">
 <Skeleton className="h-3 w-20" />
 <Skeleton className="h-6 w-12" />
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Filters and Actions */}
 <div className="flex items-center justify-between">
 <div className="flex gap-2">
 <Skeleton className="h-9 w-48 rounded-md" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 {/* Cases Table */}
 <Card>
 <CardContent className="p-0">
 <div className="border-b px-4 py-3 flex gap-4">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} className="h-4 flex-1" />
 ))}
 </div>
 {Array.from({ length: 5 }).map((_, row) => (
 <div key={row} className="px-4 py-3 flex gap-4 border-b last:border-0">
 {Array.from({ length: 5 }).map((_, col) => (
 <Skeleton key={col} className="h-5 flex-1" />
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Tasks tab - mimics the task board/list view
 * with task cards and status columns
 */
export function TasksTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-24" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-28 rounded-md" />
 <Skeleton className="h-9 w-24 rounded-md" />
 </div>
 </div>
 {/* Filter Bar */}
 <div className="flex gap-3">
 <Skeleton className="h-9 w-56 rounded-md" />
 <Skeleton className="h-9 w-32 rounded-md" />
 <Skeleton className="h-9 w-32 rounded-md" />
 </div>
 {/* Task List */}
 {Array.from({ length: 5 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 flex-1">
 <Skeleton className="h-5 w-5 rounded" />
 <div className="space-y-1 flex-1">
 <Skeleton className="h-5 w-48" />
 <Skeleton className="h-3 w-32" />
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Skeleton className="h-6 w-20 rounded-full" />
 <Skeleton className="h-6 w-6 rounded-full" />
 <Skeleton className="h-4 w-20" />
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 );
}

/**
 * Skeleton for Project Plan tab - mimics the Gantt chart / timeline view
 * with phase headers and task rows
 */
export function ProjectPlanTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-32" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-28 rounded-md" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 </div>
 {/* Timeline Header */}
 <Card>
 <CardContent className="p-4">
 <div className="flex gap-2 mb-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <Skeleton key={i} className="h-6 flex-1 rounded" />
 ))}
 </div>
 {/* Phase Groups */}
 {Array.from({ length: 3 }).map((_, phase) => (
 <div key={phase} className="mb-6">
 <Skeleton className="h-5 w-40 mb-3" />
 {Array.from({ length: 3 }).map((_, task) => (
 <div key={task} className="flex items-center gap-4 mb-2">
 <Skeleton className="h-4 w-32" />
 <Skeleton className="h-6 flex-1 rounded-full" />
 <Skeleton className="h-4 w-20" />
 </div>
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Forecast Plan tab - mimics the forecast table
 * with monthly columns and budget line items
 */
export function ForecastPlanTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-36" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-28 rounded-md" />
 <Skeleton className="h-9 w-24 rounded-md" />
 </div>
 </div>
 {/* Summary */}
 <div className="grid grid-cols-3 gap-4">
 {Array.from({ length: 3 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <Skeleton className="h-3 w-24 mb-2" />
 <Skeleton className="h-7 w-20" />
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Forecast Table */}
 <Card>
 <CardContent className="p-0 overflow-x-auto">
 <div className="border-b px-4 py-3 flex gap-3 min-w-[800px]">
 <Skeleton className="h-4 w-32" />
 {Array.from({ length: 6 }).map((_, i) => (
 <Skeleton key={i} className="h-4 flex-1" />
 ))}
 </div>
 {Array.from({ length: 6 }).map((_, row) => (
 <div key={row} className="px-4 py-3 flex gap-3 border-b last:border-0 min-w-[800px]">
 <Skeleton className="h-5 w-32" />
 {Array.from({ length: 6 }).map((_, col) => (
 <Skeleton key={col} className="h-5 flex-1" />
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Procurement Plan tab - mimics the procurement items
 * table with status badges and amounts
 */
export function ProcurementPlanTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-40" />
 <div className="flex gap-2">
 <Skeleton className="h-9 w-32 rounded-md" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 </div>
 {/* Summary Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <Skeleton className="h-3 w-24 mb-2" />
 <Skeleton className="h-7 w-16 mb-1" />
 <Skeleton className="h-3 w-20" />
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Table */}
 <Card>
 <CardContent className="p-0">
 <div className="border-b px-4 py-3 flex gap-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <Skeleton key={i} className="h-4 flex-1" />
 ))}
 </div>
 {Array.from({ length: 5 }).map((_, row) => (
 <div key={row} className="px-4 py-3 flex gap-4 border-b last:border-0">
 {Array.from({ length: 6 }).map((_, col) => (
 <Skeleton key={col} className="h-5 flex-1" />
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}

/**
 * Skeleton for Report tabs (Project Report & Monthly Report) -
 * mimics the report layout with sections and charts
 */
export function ReportTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header with date range */}
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <Skeleton className="h-5 w-40" />
 <Skeleton className="h-3 w-56" />
 </div>
 <div className="flex gap-2">
 <Skeleton className="h-9 w-28 rounded-md" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 </div>
 {/* Report Sections */}
 {Array.from({ length: 3 }).map((_, section) => (
 <Card key={section}>
 <CardHeader>
 <Skeleton className="h-5 w-44" />
 </CardHeader>
 <CardContent className="space-y-3">
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-5/6" />
 <Skeleton className="h-4 w-4/5" />
 {section === 0 && (
 <div className="grid grid-cols-2 gap-4 mt-4">
 <Skeleton className="h-32 rounded-lg" />
 <Skeleton className="h-32 rounded-lg" />
 </div>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 );
}

/**
 * Skeleton for Variance Alerts tab - mimics the alerts dashboard
 * with alert cards and severity indicators
 */
export function VarianceAlertsTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-36" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 {/* Summary */}
 <div className="grid grid-cols-3 gap-4">
 {Array.from({ length: 3 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4 flex items-center gap-3">
 <Skeleton className="h-10 w-10 rounded-full" />
 <div className="space-y-1">
 <Skeleton className="h-6 w-10" />
 <Skeleton className="h-3 w-20" />
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 {/* Alert Items */}
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <div className="flex items-start gap-3">
 <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-1" />
 <div className="flex-1 space-y-2">
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-48" />
 <Skeleton className="h-6 w-16 rounded-full" />
 </div>
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-3/4" />
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 );
}

/**
 * Skeleton for Evidence Documents tab - mimics the document list
 * with file icons and metadata
 */
export function EvidenceTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-40" />
 <Skeleton className="h-9 w-32 rounded-md" />
 </div>
 {/* Document Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <div className="flex items-start gap-3">
 <Skeleton className="h-10 w-10 rounded flex-shrink-0" />
 <div className="flex-1 space-y-2">
 <Skeleton className="h-4 w-32" />
 <Skeleton className="h-3 w-20" />
 <Skeleton className="h-3 w-24" />
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 );
}

/**
 * Generic tab skeleton fallback - used when no specific skeleton exists
 */
export function GenericTabSkeleton() {
 return (
 <div className="space-y-6 p-4">
 <div className="flex items-center justify-between">
 <Skeleton className="h-5 w-36" />
 <Skeleton className="h-9 w-28 rounded-md" />
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <Skeleton className="h-4 w-20 mb-2" />
 <Skeleton className="h-7 w-14" />
 </CardContent>
 </Card>
 ))}
 </div>
 <Card>
 <CardContent className="p-0">
 <div className="border-b px-4 py-3 flex gap-4">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} className="h-4 flex-1" />
 ))}
 </div>
 {Array.from({ length: 5 }).map((_, row) => (
 <div key={row} className="px-4 py-3 flex gap-4 border-b last:border-0">
 {Array.from({ length: 5 }).map((_, col) => (
 <Skeleton key={col} className="h-5 flex-1" />
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 );
}
