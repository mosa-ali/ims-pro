/**
 * Fleet Compliance Form
 * Create/Edit compliance records (insurance, registration, inspection, permits)
 */

import React, { useEffect, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, X } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useTranslation } from "@/i18n/useTranslation";

export default function ComplianceForm() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const [, params] = useRoute("/organization/logistics/fleet/compliance/:id/edit");
  const [, setLocation] = useLocation();
  const complianceId = params?.id ? parseInt(params.id) : null;

  const [formData, setFormData] = useState({
    vehicleId: "",
    complianceType: "insurance" as const,
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    issuingAuthority: "",
    cost: "",
    currency: "USD",
    documentUrl: "",
    remarks: "",
  });

  // Fetch vehicles for dropdown
  const { data: vehiclesData } = trpc.logistics.fleet.listVehicles.useQuery({
    organizationId,
    limit: 1000,
    offset: 0,
  });

  // Fetch existing compliance if editing
  const { data: existingCompliance } = trpc.logistics.fleet.getCompliance.useQuery(
    { id: complianceId! },
    { enabled: !!complianceId }
  );

  // Create mutation
  const createMutation = trpc.logistics.fleet.createCompliance.useMutation({
    onSuccess: () => {
      setLocation("/organization/logistics/fleet/compliance");
    },
  });

  // Update mutation
  const updateMutation = trpc.logistics.fleet.updateCompliance.useMutation({
    onSuccess: () => {
      setLocation("/organization/logistics/fleet/compliance");
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingCompliance) {
      setFormData({
        vehicleId: existingCompliance.vehicleId?.toString() || "",
        complianceType: existingCompliance.complianceType || "insurance",
        documentNumber: existingCompliance.documentNumber || "",
        issueDate: existingCompliance.issueDate || "",
        expiryDate: existingCompliance.expiryDate || "",
        issuingAuthority: existingCompliance.issuingAuthority || "",
        cost: existingCompliance.cost?.toString() || "",
        currency: existingCompliance.currency || "USD",
        documentUrl: existingCompliance.documentUrl || "",
        remarks: existingCompliance.remarks || "",
      });
    }
  }, [existingCompliance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (complianceId) {
      updateMutation.mutate({
        id: complianceId,
        data: {
          vehicleId: parseInt(formData.vehicleId),
          ...formData,
        },
      });
    } else {
      createMutation.mutate({
        vehicleId: parseInt(formData.vehicleId),
        ...formData,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const vehicles = vehiclesData?.items || [];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/fleet/compliance" label="Back" />
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-start">
              {complianceId ? "Edit Compliance" : "Add Compliance"}
            </h1>
          </div>
        </div>
      </div>

      <div className="container py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Vehicle Selection */}
              <div>
                <label className="text-sm font-medium">Vehicle *</label>
                <Select
                  value={formData.vehicleId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vehicleId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.plateNumber} - {vehicle.brand} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Compliance Type */}
              <div>
                <label className="text-sm font-medium">Compliance Type *</label>
                <Select
                  value={formData.complianceType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, complianceType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Document Number */}
              <div>
                <label className="text-sm font-medium">Document Number</label>
                <Input
                  value={formData.documentNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, documentNumber: e.target.value })
                  }
                  placeholder="e.g., INS-2024-001"
                />
              </div>

              {/* Issue Date */}
              <div>
                <label className="text-sm font-medium">Issue Date</label>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, issueDate: e.target.value })
                  }
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="text-sm font-medium">Expiry Date *</label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDate: e.target.value })
                  }
                  required
                />
              </div>

              {/* Issuing Authority */}
              <div>
                <label className="text-sm font-medium">Issuing Authority</label>
                <Input
                  value={formData.issuingAuthority}
                  onChange={(e) =>
                    setFormData({ ...formData, issuingAuthority: e.target.value })
                  }
                  placeholder="e.g., Ministry of Transport"
                />
              </div>

              {/* Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cost</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Document URL */}
              <div>
                <label className="text-sm font-medium">Document URL</label>
                <Input
                  type="url"
                  value={formData.documentUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, documentUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="text-sm font-medium">Remarks</label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setLocation("/organization/logistics/fleet/compliance")
                  }
                >
                  <X className="h-4 w-4 me-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  <Save className="h-4 w-4 me-2" />
                  {complianceId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
