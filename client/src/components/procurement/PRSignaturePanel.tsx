/**
 * PR Signature Panel Component
 * 
 * Displays digital signature section for PR approval workflow
 * Allows Logistics, Finance, and PM to sign after PR submission
 * 
 * Features:
 * - Signature canvas for drawing signatures
 * - Signer information (name, title, date)
 * - Status indicators (Pending/Signed)
 * - Workflow-based signature sequencing
 */

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PenTool, Check, Clock } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SignatureData {
  signerName: string;
  signerTitle: string;
  signatureDataUrl: string;
  signedAt: Date;
}

interface PRSignaturePanelProps {
  prId: number;
  prStatus: string;
  logisticsSignature?: SignatureData | null;
  financeSignature?: SignatureData | null;
  pmSignature?: SignatureData | null;
  onSignatureSubmit?: (role: "logistics" | "finance" | "pm", signature: SignatureData) => void;
  currentUserRole?: "logistics" | "finance" | "pm" | "requester";
}

export function PRSignaturePanel({
  prId,
  prStatus,
  logisticsSignature,
  financeSignature,
  pmSignature,
  onSignatureSubmit,
  currentUserRole,
}: PRSignaturePanelProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [activeRole, setActiveRole] = useState<"logistics" | "finance" | "pm" | null>(null);

  // Determine which signature section to show based on PR status
  const canLogisticsSign = prStatus === "submitted";
  const canFinanceSign = prStatus === "validated_by_logistic";
  const canPMSign = prStatus === "validated_by_finance";

  // Initialize canvas
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  };

  const addSignatureMutation = trpc.logistics.purchaseRequests.addSignature.useMutation();

  const submitSignature = async () => {
    if (!activeRole || !signerName || !signerTitle) {
      toast.error("Please fill in all fields");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureDataUrl = canvas.toDataURL("image/png");

    try {
      await addSignatureMutation.mutateAsync({
        id: prId,
        role: activeRole,
        signerName,
        signerTitle,
        signatureDataUrl,
      });

      toast.success(`${activeRole} signature saved successfully`);

      // Reset form
      setSignerName("");
      setSignerTitle("");
      setActiveRole(null);
      clearSignature();

      if (onSignatureSubmit) {
        onSignatureSubmit(activeRole, {
          signerName,
          signerTitle,
          signatureDataUrl,
          signedAt: new Date(),
        });
      }
    } catch (error) {
      toast.error("Failed to save signature. Please try again.");
      console.error(error);
    }
  };

  const SignatureCard = ({
    role,
    title,
    signature,
    canSign,
  }: {
    role: "logistics" | "finance" | "pm";
    title: string;
    signature?: SignatureData | null;
    canSign: boolean;
  }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">{title}</h4>
        {signature ? (
          <Badge className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Signed
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )}
      </div>

      {signature ? (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground">Signer Name</div>
            <div className="font-medium">{signature.signerName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Signer Title</div>
            <div className="font-medium">{signature.signerTitle}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Signed At</div>
            <div className="font-medium">
              {new Date(signature.signedAt).toLocaleString()}
            </div>
          </div>
          <div className="mt-3">
            <img
              src={signature.signatureDataUrl}
              alt="Signature"
              className="border border-gray-200 rounded"
            />
          </div>
        </div>
      ) : canSign && currentUserRole === role ? (
        <div className="space-y-3">
          <Input
            placeholder="Your Full Name"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
          <Input
            placeholder="Your Title/Position"
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
          />
          <div className="border border-gray-200 rounded">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full cursor-crosshair"
              style={{ display: "block" }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSignature}
              className="flex-1"
              disabled={addSignatureMutation.isPending}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={submitSignature}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={addSignatureMutation.isPending}
            >
              <PenTool className="h-4 w-4 mr-2" />
              {addSignatureMutation.isPending ? "Saving..." : "Submit Signature"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {canSign ? "Waiting for your signature" : "Not yet available"}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Digital Signatures
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Approval workflow: Logistics → Finance → Project Manager
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SignatureCard
          role="logistics"
          title="Logistics Validation"
          signature={logisticsSignature}
          canSign={canLogisticsSign}
        />
        <SignatureCard
          role="finance"
          title="Finance Validation"
          signature={financeSignature}
          canSign={canFinanceSign}
        />
        <SignatureCard
          role="pm"
          title="PM Approval"
          signature={pmSignature}
          canSign={canPMSign}
        />
      </div>
    </div>
  );
}
