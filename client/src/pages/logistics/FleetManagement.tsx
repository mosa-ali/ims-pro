/**
 * Fleet Management Page - Card-Based Navigation
 * Sub-module cards follow the HR Employees Profiles card design pattern.
 * All KPI values are wired to real database queries via tRPC.
 */

import React from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight,
  Car,
  Users,
  Fuel,
  Wrench,
  MapPin,
  FileCheck,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";

export default function FleetManagement() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  // ── Core list queries (already existed) ──────────────────────────────────
  const { data: vehicles } = trpc.logistics.fleet.listVehicles.useQuery({
    organizationId,
    limit: 50,
    offset: 0,
  });
  const { data: drivers } = trpc.logistics.fleet.listDrivers.useQuery({
    organizationId,
    limit: 50,
    offset: 0,
  });

  // ── New KPI aggregation query ─────────────────────────────────────────────
  const { data: kpis, isLoading: kpisLoading } =
    trpc.logistics.fleetKPIs.getKPIs.useQuery({});

  // ── Derived counts ────────────────────────────────────────────────────────
  const totalVehicles = vehicles?.total || 0;
  const activeVehicles =
    vehicles?.items?.filter((v: any) => v.status === "active").length || 0;
  const totalDrivers = drivers?.total || 0;
  const activeDrivers =
    drivers?.items?.filter((d: any) => d.status === "active").length || 0;

  // ── KPI values (real data) ────────────────────────────────────────────────
  const tripsThisMonth = kpis?.tripsThisMonth ?? 0;
  const ongoingTrips = kpis?.ongoingTrips ?? 0;
  const scheduledMaintenance = kpis?.scheduledMaintenance ?? 0;
  const inProgressMaintenance = kpis?.inProgressMaintenance ?? 0;
  const fuelThisMonthL = kpis?.fuelThisMonthL ?? 0;
  const fuelCostThisMonth = kpis?.fuelCostThisMonth ?? "0.00";
  const expiringSoon = kpis?.expiringSoon ?? 0;
  const expired = kpis?.expired ?? 0;

  // ── Sub-module card definitions ───────────────────────────────────────────
  const subModuleCards = [
    {
      id: "vehicles",
      title: t.logistics.vehicles,
      description: t.logistics.manageVehicleRegistryAndStatus,
      icon: Car,
      href: "/organization/logistics/fleet/vehicles",
      metrics: [
        { label: t.logistics.totalVehicles, value: totalVehicles, live: false },
        { label: t.logistics.active, value: activeVehicles, live: false },
      ],
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      id: "drivers",
      title: t.logistics.drivers,
      description: t.logistics.manageDriverRegistryAndLicenses,
      icon: Users,
      href: "/organization/logistics/fleet/drivers",
      metrics: [
        { label: t.logistics.totalDrivers, value: totalDrivers, live: false },
        { label: t.logistics.active, value: activeDrivers, live: false },
      ],
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
    },
    {
      id: "trips",
      title: t.logistics.tripLogs,
      description: t.logistics.trackTripsAndAssignments,
      icon: MapPin,
      href: "/organization/logistics/fleet/trips",
      metrics: [
        { label: t.logistics.tripsThisMonth, value: tripsThisMonth, live: true },
        { label: t.logistics.ongoing, value: ongoingTrips, live: true },
      ],
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    {
      id: "maintenance",
      title: t.logistics.maintenance,
      description: t.logistics.maintenanceRecordsAndScheduling,
      icon: Wrench,
      href: "/organization/logistics/fleet/maintenance",
      metrics: [
        { label: t.logistics.scheduled, value: scheduledMaintenance, live: true },
        { label: t.logistics.inProgress, value: inProgressMaintenance, live: true },
      ],
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100",
    },
    {
      id: "fuel",
      title: t.logistics.fuelTracking,
      description: t.logistics.trackFuelConsumptionAndCosts,
      icon: Fuel,
      href: "/organization/logistics/fleet/fuel",
      metrics: [
        { label: t.logistics.thisMonthL, value: fuelThisMonthL, live: true },
        { label: t.logistics.cost, value: `$${fuelCostThisMonth}`, live: true },
      ],
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
    },
    {
      id: "compliance",
      title: t.logistics.compliance,
      description: t.logistics.insuranceRegistrationAndInspections,
      icon: FileCheck,
      href: "/organization/logistics/fleet/compliance",
      metrics: [
        { label: t.logistics.expiringSoon, value: expiringSoon, live: true },
        { label: t.logistics.expired, value: expired, live: true },
      ],
      iconColor: "text-yellow-600",
      iconBg: "bg-yellow-100",
    },
  ];

  // ── Shared sub-components ─────────────────────────────────────────────────
  const StatusBadge = () => (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 shrink-0">
      {t.logistics.active || "Active"}
    </span>
  );

  const NavArrow = () =>
    isRTL ? (
      <ChevronLeft className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronRight className="w-4 h-4 text-blue-600" />
    );

  const KpiValue = ({
    value,
    loading,
  }: {
    value: number | string;
    loading?: boolean;
  }) =>
    loading ? (
      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
    ) : (
      <p className="text-2xl font-bold text-blue-600 leading-tight">{value}</p>
    );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics" label={t.logistics.backToLogistics} />
          <div>
            <h1 className="text-2xl font-bold text-start">
              {t.logistics.fleetManagement}
            </h1>
            <p className="text-muted-foreground text-start">
              {t.logistics.manageVehiclesDriversTripsAndMaintenance}
            </p>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-8">
        {/* Top KPI Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: t.logistics.totalVehicles,
              value: totalVehicles,
              icon: Car,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
            {
              label: t.logistics.totalDrivers,
              value: totalDrivers,
              icon: Users,
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
            },
            {
              label: t.logistics.upcomingMaintenance,
              value: scheduledMaintenance,
              icon: Wrench,
              iconBg: "bg-orange-50",
              iconColor: "text-orange-600",
            },
            {
              label: t.logistics.activeTrips,
              value: ongoingTrips,
              icon: TrendingUp,
              iconBg: "bg-purple-50",
              iconColor: "text-purple-600",
            },
          ].map((kpi, idx) => {
            const KpiIcon = kpi.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3"
              >
                <div className={`p-3 rounded-lg ${kpi.iconBg} shrink-0`}>
                  <KpiIcon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {kpi.label}
                  </p>
                  {kpisLoading &&
                  (kpi.label === t.logistics.upcomingMaintenance ||
                    kpi.label === t.logistics.activeTrips) ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold leading-tight">
                      {kpi.value}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sub-Modules Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-start">
            {t.logistics.submodules}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subModuleCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.id} href={card.href}>
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:border-blue-500 hover:shadow-lg cursor-pointer h-full flex flex-col">
                    {/* Row 1: Icon + Status Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2 ${card.iconBg} rounded-lg shrink-0`}>
                        <Icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                      <StatusBadge />
                    </div>

                    {/* Row 2: Title */}
                    <h3 className="text-lg font-semibold text-gray-900 text-start line-clamp-1">
                      {card.title}
                    </h3>

                    {/* Row 3: Description */}
                    <p className="text-sm text-gray-600 mt-1 text-start line-clamp-2 flex-1">
                      {card.description}
                    </p>

                    {/* Row 4: KPI Metrics */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {card.metrics.map((metric, idx) => (
                        <div key={idx} className="text-start">
                          <p className="text-xs text-muted-foreground">
                            {metric.label}
                          </p>
                          <KpiValue
                            value={metric.value}
                            loading={kpisLoading && metric.live}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Row 5: Navigation Arrow */}
                    <div className="mt-4 flex items-center gap-1 text-blue-600 text-xs font-medium">
                      <NavArrow />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-start">
            {t.logistics.quickActions}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/organization/logistics/fleet/vehicles/new">
                <Car className="h-4 w-4 me-2" />
                {t.logistics.addVehicle}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/fleet/drivers/new">
                <Users className="h-4 w-4 me-2" />
                {t.logistics.addDriver}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/fleet/trips/new">
                <MapPin className="h-4 w-4 me-2" />
                {t.logistics.newTrip}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/fleet/maintenance/new">
                <Wrench className="h-4 w-4 me-2" />
                {t.logistics.scheduleMaintenance}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
