// ============================================================================
// FINANCE MODULE — Fiscal Years
// Phase 2.1.B Financial Configuration Domain
//
// Uses existing translation system via useTranslation() hook
// Manages fiscal year definitions, period mappings, and financial calendars.
// Supports multiple fiscal year calendars per organization.
// 
// tRPC Router: trpc.finance.fiscalYears.*
// ============================================================================

import { useState, useMemo } from "react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { trpc } from "@/lib/trpc";
import { FinancePageHeader } from "@/components/Finance/FinancePageHeader";
import { FinanceFilterBar, type FilterDropdown } from "@/components/Finance/FinanceFilterBar";
import { ExecutiveTable } from "@/components/Finance/ExecutiveTable";
import { FinanceCard } from "@/components/Finance/FinanceCard";
import { WidgetHeader } from "@/components/Finance/WidgetHeader";
import { FinanceKpiCard } from "@/components/Finance/FinanceKpiCard";
import { LoadingSkeleton } from "@/components/Finance/LoadingSkeleton";
import { StatusChip } from "@/components/Finance/StatusChip";
import { FINANCE_COLORS, SPACING, TYPE } from "@/components/Finance/tokens";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  Loader2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface FiscalYear {
  id: string;
  code: string;
  name: string;
  description: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  isClosed: boolean;
  organizationId: string;
  operatingUnitId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AccountingPeriod {
  id: string;
  fiscalYearId: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  isPeriodEnd: boolean;
  isYearEnd: boolean;
  createdAt: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FinanceFiscalYears() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOperatingUnit();

  // Scope
  const organizationId = currentOrganization?.id || "";
  const operatingUnitId = currentOperatingUnit?.id || "";

  // State
  const [activeTab, setActiveTab] = useState<"fiscal-years" | "periods">("fiscal-years");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddFiscalYear, setShowAddFiscalYear] = useState(false);
  const [editingFiscalYear, setEditingFiscalYear] = useState<FiscalYear | null>(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYear | null>(null);

  // Queries
  const { data: fiscalYears = [], isLoading: fiscalYearsLoading } = 
    trpc.finance.fiscalYears.list.useQuery(
      { organizationId, operatingUnitId, status: statusFilter !== "all" ? statusFilter : undefined },
      { enabled: !!organizationId }
    );

  const { data: periods = [], isLoading: periodsLoading } =
    trpc.finance.accountingPeriods.listByYear.useQuery(
      { organizationId, operatingUnitId, fiscalYearId: selectedFiscalYear?.id || "" },
      { enabled: !!selectedFiscalYear }
    );

  // Mutations
  const createFiscalYearMutation = trpc.finance.fiscalYears.create.useMutation();
  const updateFiscalYearMutation = trpc.finance.fiscalYears.update.useMutation();
  const deleteFiscalYearMutation = trpc.finance.fiscalYears.delete.useMutation();

  // Handlers
  const handleAddFiscalYear = async (formData: Partial<FiscalYear>) => {
    try {
      await createFiscalYearMutation.mutateAsync({
        organizationId,
        operatingUnitId,
        ...formData,
      } as any);
      toast.success(t.financeFiscalYears.created);
      setShowAddFiscalYear(false);
    } catch (error) {
      toast.error(t.common.errorOccurred);
    }
  };

  const handleDeleteFiscalYear = async (id: string) => {
    try {
      await deleteFiscalYearMutation.mutateAsync({
        organizationId,
        operatingUnitId,
        id,
      });
      toast.success(t.financeFiscalYears.deleted);
    } catch (error) {
      toast.error(t.common.errorOccurred);
    }
  };

  const handleExport = () => {
    const data = activeTab === "fiscal-years" ? fiscalYears : periods;
    const csv = [
      activeTab === "fiscal-years"
        ? ["Code", "Name", "Start Date", "End Date", "Status"]
        : ["Period", "Name", "Start Date", "End Date", "Status"],
      ...data.map((item) =>
        activeTab === "fiscal-years"
          ? [
              (item as FiscalYear).code,
              (item as FiscalYear).name,
              (item as FiscalYear).startDate,
              (item as FiscalYear).endDate,
              (item as FiscalYear).isClosed ? "Closed" : "Open",
            ]
          : [
              (item as AccountingPeriod).periodNumber,
              (item as AccountingPeriod).name,
              (item as AccountingPeriod).startDate,
              (item as AccountingPeriod).endDate,
              (item as AccountingPeriod).isOpen ? "Open" : "Closed",
            ]
      ),
    ]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiscal-years-${activeTab}.csv`;
    a.click();
  };

  // Filters
  const statusFilterOptions: FilterDropdown = {
    id: "status",
    label: t.common.status,
    options: [
      { value: "all", label: t.common.all },
      { value: "active", label: t.financeFiscalYears.active },
      { value: "closed", label: t.financeFiscalYears.closed },
    ],
    value: statusFilter,
    onChange: setStatusFilter,
  };

  // Stats
  const activeFiscalYears = useMemo(
    () => fiscalYears.filter((y) => y.isActive).length,
    [fiscalYears]
  );

  const currentFiscalYear = useMemo(
    () => 
      fiscalYears.find((y) => {
        const today = new Date();
        const start = new Date(y.startDate);
        const end = new Date(y.endDate);
        return today >= start && today <= end;
      }),
    [fiscalYears]
  );

  return (
    <div className={`min-h-screen ${SPACING.pageX} space-y-6`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <FinancePageHeader
        icon={Calendar}
        title={t.financeFiscalYears.title}
        subtitle={t.financeFiscalYears.subtitle}
        onExport={handleExport}
      />

      {/* KPI Cards */}
      {!fiscalYearsLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FinanceKpiCard
            value={fiscalYears.length.toString()}
            label={t.financeFiscalYears.totalYears}
            trend={{ direction: "stable" }}
          />
          <FinanceKpiCard
            value={activeFiscalYears.toString()}
            label={t.financeFiscalYears.activeYears}
            status="success"
          />
          <FinanceKpiCard
            value={currentFiscalYear?.name || "—"}
            label={t.financeFiscalYears.current}
            status={currentFiscalYear ? "success" : "warning"}
          />
        </div>
      )}

      {/* Filter Bar */}
      <FinanceFilterBar
        dropdowns={[statusFilterOptions]}
        showSearch
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t.common.searchPlaceholder}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="fiscal-years">{t.financeFiscalYears.fiscalYears}</TabsTrigger>
          <TabsTrigger value="periods">{t.financeFiscalYears.periods}</TabsTrigger>
        </TabsList>

        {/* Fiscal Years Tab */}
        <TabsContent value="fiscal-years" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={TYPE.sectionTitle}>{t.financeFiscalYears.fiscalYears}</h2>
            <Button
              onClick={() => setShowAddFiscalYear(true)}
              className="gap-2"
              style={{ background: FINANCE_COLORS.navy }}
            >
              <Plus className="h-4 w-4" />
              {t.financeFiscalYears.addYear}
            </Button>
          </div>

          {fiscalYearsLoading ? (
            <LoadingSkeleton />
          ) : fiscalYears.length === 0 ? (
            <FinanceCard className="py-12 text-center">
              <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className={TYPE.widgetSubtitle}>{t.financeFiscalYears.noYears}</p>
            </FinanceCard>
          ) : (
            <FinanceCard>
              <ExecutiveTable
                columns={[
                  { key: "code", label: t.common.code, width: "100px" },
                  { key: "name", label: t.common.name, width: "200px" },
                  {
                    key: "startDate",
                    label: t.financeFiscalYears.startDate,
                    width: "120px",
                    render: (value) => new Date(value).toLocaleDateString(),
                  },
                  {
                    key: "endDate",
                    label: t.financeFiscalYears.endDate,
                    width: "120px",
                    render: (value) => new Date(value).toLocaleDateString(),
                  },
                  {
                    key: "isActive",
                    label: t.common.status,
                    width: "100px",
                    render: (value, row: FiscalYear) => (
                      <StatusChip
                        status={
                          row.isClosed ? "Closed" : value ? "Active" : "Inactive"
                        }
                      />
                    ),
                  },
                  {
                    key: "actions",
                    label: t.common.actions,
                    width: "100px",
                    render: (_, row: FiscalYear) => (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedFiscalYear(row)}
                          className="text-blue-600 hover:text-blue-800"
                          title={t.financeFiscalYears.viewPeriods}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingFiscalYear(row)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFiscalYear(row.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={fiscalYears}
                onExport={handleExport}
              />
            </FinanceCard>
          )}
        </TabsContent>

        {/* Periods Tab */}
        <TabsContent value="periods" className="space-y-4">
          {selectedFiscalYear ? (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  {t.financeFiscalYears.showingPeriodsFor}{" "}
                  <strong>{selectedFiscalYear.name}</strong>
                </p>
              </div>

              {periodsLoading ? (
                <LoadingSkeleton />
              ) : periods.length === 0 ? (
                <FinanceCard className="py-12 text-center">
                  <p className={TYPE.widgetSubtitle}>
                    {t.financeFiscalYears.noPeriods}
                  </p>
                </FinanceCard>
              ) : (
                <FinanceCard>
                  <ExecutiveTable
                    columns={[
                      {
                        key: "periodNumber",
                        label: t.financeFiscalYears.period,
                        width: "80px",
                      },
                      { key: "name", label: t.common.name, width: "150px" },
                      {
                        key: "startDate",
                        label: t.financeFiscalYears.startDate,
                        width: "120px",
                        render: (value) => new Date(value).toLocaleDateString(),
                      },
                      {
                        key: "endDate",
                        label: t.financeFiscalYears.endDate,
                        width: "120px",
                        render: (value) => new Date(value).toLocaleDateString(),
                      },
                      {
                        key: "isOpen",
                        label: t.common.status,
                        width: "100px",
                        render: (value) => (
                          <StatusChip status={value ? "Open" : "Closed"} />
                        ),
                      },
                    ]}
                    data={periods}
                    onExport={handleExport}
                  />
                </FinanceCard>
              )}
            </>
          ) : (
            <FinanceCard className="py-12 text-center">
              <p className={TYPE.widgetSubtitle}>
                {t.financeFiscalYears.selectYearToViewPeriods}
              </p>
            </FinanceCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <AddFiscalYearDialog
        open={showAddFiscalYear || !!editingFiscalYear}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddFiscalYear(false);
            setEditingFiscalYear(null);
          }
        }}
        data={editingFiscalYear}
        onSubmit={editingFiscalYear ? undefined : handleAddFiscalYear}
      />
    </div>
  );
}

// ============================================================================
// ADD/EDIT FISCAL YEAR DIALOG
// ============================================================================

interface AddFiscalYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: FiscalYear | null;
  onSubmit?: (data: Partial<FiscalYear>) => Promise<void>;
}

function AddFiscalYearDialog({
  open,
  onOpenChange,
  data,
  onSubmit,
}: AddFiscalYearDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<FiscalYear>>(
    data || { isActive: true, isClosed: false }
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.code || !formData.name || !formData.startDate || !formData.endDate) {
      toast.error(t.common.required);
      return;
    }
    setIsLoading(true);
    try {
      await onSubmit?.(formData);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {data
              ? t.financeFiscalYears.editYear
              : t.financeFiscalYears.addYear}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t.common.code}</Label>
            <Input
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="FY2025"
            />
          </div>

          <div>
            <Label>{t.common.name}</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Fiscal Year 2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t.financeFiscalYears.startDate}</Label>
              <Input
                type="date"
                value={formData.startDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>{t.financeFiscalYears.endDate}</Label>
              <Input
                type="date"
                value={formData.endDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive || false}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
            />
            <span className="text-sm">{t.financeFiscalYears.setAsActive}</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ background: FINANCE_COLORS.navy }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t.common.save
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
