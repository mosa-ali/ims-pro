/**
 * Onboarding Status Dashboard Widget
 * 
 * Displays Microsoft 365 onboarding status for all organizations
 * Shows connection progress, allowed domains, and tenant verification status
 * Supports RTL/LTR languages (Arabic/English)
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Link2,
  Globe,
  Shield,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnboardingStatusWidgetProps {
  organizationId?: number;
  compact?: boolean;
}

export function OnboardingStatusWidget({
  organizationId,
  compact = false,
}: OnboardingStatusWidgetProps) {
  const { language, isRTL } = useLanguage();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch organizations with onboarding status
  const { data: orgsData } = trpc.ims.organizations.list.useQuery();

  useEffect(() => {
    if (orgsData) {
      const filtered = organizationId
        ? orgsData.filter((o) => o.id === organizationId)
        : orgsData;

      setOrganizations(filtered);
      setLoading(false);
    }
  }, [orgsData, organizationId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {language === "ar" ? "متصل" : "Connected"}
          </Badge>
        );
      case "pending_consent":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {language === "ar" ? "قيد الانتظار" : "Pending Consent"}
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {language === "ar" ? "خطأ" : "Error"}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            {language === "ar" ? "غير متصل" : "Not Connected"}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className={isRTL ? "rtl" : "ltr"}>
        <CardHeader>
          <CardTitle>
            {language === "ar"
              ? "حالة إعداد Microsoft 365"
              : "Microsoft 365 Onboarding Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact && organizations.length === 0) {
    return null;
  }

  return (
    <Card className={isRTL ? "rtl" : "ltr"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          {language === "ar"
            ? "حالة إعداد Microsoft 365"
            : "Microsoft 365 Onboarding Status"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === "ar"
              ? "لا توجد منظمات"
              : "No organizations found"}
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="border rounded-lg p-4 space-y-3"
                dir={isRTL ? "rtl" : "ltr"}
              >
                {/* Organization Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">{org.domain}</p>
                  </div>
                  {getStatusBadge(org.onboardingStatus)}
                </div>

                {/* Status Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Enabled Status */}
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {language === "ar" ? "مفعل:" : "Enabled:"}
                      <span className="font-semibold ms-1">
                        {org.microsoft365Enabled ? (
                          <span className="text-green-600">
                            {language === "ar" ? "نعم" : "Yes"}
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {language === "ar" ? "لا" : "No"}
                          </span>
                        )}
                      </span>
                    </span>
                  </div>

                  {/* Tenant Verified */}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {language === "ar" ? "التحقق:" : "Verified:"}
                      <span className="font-semibold ms-1">
                        {org.tenantVerified ? (
                          <span className="text-green-600">
                            {language === "ar" ? "نعم" : "Yes"}
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {language === "ar" ? "لا" : "No"}
                          </span>
                        )}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Consent Date */}
                {org.consentGrantedAt && (
                  <div className="text-sm text-muted-foreground">
                    {language === "ar" ? "الموافقة في:" : "Consent Granted:"}
                    <span className="font-semibold ms-1">
                      {new Date(org.consentGrantedAt).toLocaleDateString(
                        language === "ar" ? "ar-SA" : "en-US"
                      )}
                    </span>
                  </div>
                )}

                {/* Connected By */}
                {org.connectedBy && (
                  <div className="text-sm text-muted-foreground">
                    {language === "ar" ? "متصل بواسطة:" : "Connected By:"}
                    <span className="font-semibold ms-1">
                      {org.connectedByUser?.name || "Admin"}
                    </span>
                  </div>
                )}

                {/* Allowed Domains */}
                {org.allowedDomains && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {language === "ar" ? "النطاقات المسموحة:" : "Allowed Domains:"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(org.allowedDomains || "[]").map(
                        (domain: string) => (
                          <Badge key={domain} variant="secondary">
                            {domain}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {org.onboardingStatus === "not_connected" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        // Navigate to organization details to initiate consent
                        window.location.href = `/platform/organizations/${org.id}`;
                      }}
                    >
                      <Link2 className="w-4 h-4 me-2" />
                      {language === "ar" ? "ربط الآن" : "Connect Now"}
                    </Button>
                  )}

                  {org.onboardingStatus === "pending_consent" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="opacity-50"
                    >
                      <Clock className="w-4 h-4 me-2" />
                      {language === "ar" ? "قيد الانتظار..." : "Pending..."}
                    </Button>
                  )}

                  {org.onboardingStatus === "connected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Navigate to organization details
                        window.location.href = `/platform/organizations/${org.id}`;
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 me-2" />
                      {language === "ar" ? "عرض التفاصيل" : "View Details"}
                    </Button>
                  )}

                  {org.onboardingStatus === "error" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        // Navigate to organization details to retry
                        window.location.href = `/platform/organizations/${org.id}`;
                      }}
                    >
                      <AlertCircle className="w-4 h-4 me-2" />
                      {language === "ar" ? "إعادة المحاولة" : "Retry"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {!compact && organizations.length > 0 && (
          <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {organizations.filter((o) => o.onboardingStatus === "connected")
                  .length}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === "ar" ? "متصل" : "Connected"}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {organizations.filter(
                  (o) => o.onboardingStatus === "pending_consent"
                ).length}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === "ar" ? "قيد الانتظار" : "Pending"}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {organizations.filter(
                  (o) => o.onboardingStatus === "not_connected"
                ).length}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === "ar" ? "غير متصل" : "Not Connected"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
