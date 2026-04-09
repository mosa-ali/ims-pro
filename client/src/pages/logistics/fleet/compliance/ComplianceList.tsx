/**
 * Fleet Compliance Tracking List
 * Displays insurance, registration, inspection, and permit compliance records
 * with status indicators (valid, expiring soon, expired)
 */

import React, { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { BackButton } from "@/components/BackButton";
import { useTranslation } from "@/i18n/useTranslation";

export default function ComplianceList() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [complianceType, setComplianceType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  // Fetch compliance records
  const { data: complianceData, isLoading } =
    trpc.logistics.fleet.listCompliance.useQuery({
      organizationId,
      limit,
      offset,
      complianceType: complianceType as any,
      status: status as any,
    });

  // Delete mutation
  const deleteComplianceMutation =
    trpc.logistics.fleet.deleteCompliance.useMutation({
      onSuccess: () => {
        // Refetch data
        trpc.useUtils().logistics.fleet.listCompliance.invalidate();
      },
    });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this compliance record?")) {
      deleteComplianceMutation.mutate({ id });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "expiring_soon":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "expired":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      valid: { bg: "bg-green-100", text: "text-green-700", label: "Valid" },
      expiring_soon: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        label: "Expiring Soon",
      },
      expired: { bg: "bg-red-100", text: "text-red-700", label: "Expired" },
      pending: { bg: "bg-gray-100", text: "text-gray-700", label: "Pending" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {getStatusIcon(status)}
        {config.label}
      </span>
    );
  };

  const complianceItems = complianceData?.items || [];
  const total = complianceData?.total || 0;
  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/fleet" label="Back to Fleet" />
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-start">Compliance Tracking</h1>
            <p className="text-muted-foreground text-start">
              Manage insurance, registration, inspection, and permit compliance
            </p>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Filters & Actions */}
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Compliance Type</label>
              <Select value={complianceType || "all"} onValueChange={(val) => setComplianceType(val === "all" ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={status || "all"} onValueChange={(val) => setStatus(val === "all" ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button asChild>
              <Link href="/organization/logistics/fleet/compliance/new">
                <Plus className="h-4 w-4 me-2" />
                Add Compliance
              </Link>
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : complianceItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No compliance records found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">Vehicle</TableHead>
                    <TableHead className="text-start">Type</TableHead>
                    <TableHead className="text-start">Document #</TableHead>
                    <TableHead className="text-start">Expiry Date</TableHead>
                    <TableHead className="text-start">Status</TableHead>
                    <TableHead className="text-start">Authority</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-start font-medium">
                        {item.vehicleId}
                      </TableCell>
                      <TableCell className="text-start capitalize">
                        {item.complianceType}
                      </TableCell>
                      <TableCell className="text-start">
                        {item.documentNumber || "-"}
                      </TableCell>
                      <TableCell className="text-start">
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-start">
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell className="text-start">
                        {item.issuingAuthority || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Link href={`/organization/logistics/fleet/compliance/${item.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="border-t p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrevPage}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage}
                    onClick={() => setOffset(offset + limit)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
