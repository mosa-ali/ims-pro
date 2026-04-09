import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  Clock,
  User,
  Briefcase,
  FileText,
  Building2,
  DollarSign,
} from "lucide-react";

/**
 * Public QR verification page for digital signatures.
 * Accessible at /verify/:code — validates both bid receipt and SAC signatures.
 */
export default function VerifySignature() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading, error } = trpc.verifySignature.useQuery(
    { code: code || "" },
    { enabled: !!code }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Verifying signature...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h2>
            <p className="text-muted-foreground">
              Unable to verify this signature. The verification code may be invalid or the service
              is temporarily unavailable.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">Invalid Signature</h2>
            <p className="text-muted-foreground">
              {data.message || "This verification code does not match any recorded signature."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const signedDate = data.signedAt
    ? new Date(data.signedAt).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      })
    : "Unknown";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <Card className="max-w-lg w-full mx-4 shadow-lg border-green-200">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="bg-green-100 rounded-full p-4">
              <ShieldCheck className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">Signature Verified</CardTitle>
          <p className="text-muted-foreground mt-1">
            This document has been digitally signed and verified.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Document type badge */}
          <div className="text-center">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-sm px-3 py-1">
              <FileText className="w-3.5 h-3.5 me-1.5" />
              {data.documentType}
            </Badge>
          </div>

          <div className="bg-green-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Signed By</p>
                <p className="font-semibold text-foreground">{data.signerName}</p>
              </div>
            </div>

            {data.signerTitle && (
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Title / Role</p>
                  <p className="font-semibold text-foreground">{data.signerTitle}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Signed At</p>
                <p className="font-semibold text-foreground">{signedDate}</p>
              </div>
            </div>

            {/* SAC-specific details */}
            {data.type === "sac" && (
              <>
                {"sacNumber" in data && data.sacNumber && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">SAC Number</p>
                      <p className="font-semibold text-foreground font-mono">{data.sacNumber}</p>
                    </div>
                  </div>
                )}
                {"contractNumber" in data && data.contractNumber && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contract Number</p>
                      <p className="font-semibold text-foreground font-mono">{data.contractNumber}</p>
                    </div>
                  </div>
                )}
                {"vendorName" in data && data.vendorName && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="font-semibold text-foreground">{data.vendorName}</p>
                    </div>
                  </div>
                )}
                {"amount" in data && data.amount && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Approved Amount</p>
                      <p className="font-semibold text-foreground">
                        {"currency" in data ? data.currency : "USD"}{" "}
                        {parseFloat(data.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Verification Code</p>
              <p className="font-mono text-sm">{code}</p>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <CheckCircle className="w-3.5 h-3.5 me-1" />
              Verified
            </Badge>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Integrated Management System (IMS) — Digital Signature Verification
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
