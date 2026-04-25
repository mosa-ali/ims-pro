import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eraser, Check, Pen } from "lucide-react";

interface SignatureCaptureProps {
  open?: boolean;
  onClose?: () => void;

  embedded?: boolean;

  onSave: (data: {
    signerName: string;
    signerTitle: string;
    signatureDataUrl: string;
  }) => void;

  defaultName?: string;
  defaultTitle?: string;
  isRTL?: boolean;

  labels?: {
    title?: string;
    nameLabel?: string;
    titleLabel?: string;
    namePlaceholder?: string;
    titlePlaceholder?: string;
    drawSignature?: string;
    clearSignature?: string;
    saveSignature?: string;
    cancel?: string;
    signatureRequired?: string;
    nameRequired?: string;
    description?: string;
  };

  saving?: boolean;
}

export default function SignatureCapture({
  open = false,
  onClose = () => {},
  embedded = false,
  onSave,
  defaultName = "",
  defaultTitle = "",
  isRTL = false,
  labels = {},
  saving = false,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState(defaultName);
  const [signerTitle, setSignerTitle] = useState(defaultTitle);

  const l = {
    title: labels.title || (isRTL ? "التوقيع الرقمي" : "Digital Signature"),
    nameLabel: labels.nameLabel || (isRTL ? "الاسم" : "Name"),
    titleLabel: labels.titleLabel || (isRTL ? "المسمى الوظيفي" : "Title / Role"),
    namePlaceholder: labels.namePlaceholder || (isRTL ? "أدخل اسمك الكامل" : "Enter your full name"),
    titlePlaceholder: labels.titlePlaceholder || (isRTL ? "أدخل مسماك الوظيفي" : "Enter your title or role"),
    drawSignature: labels.drawSignature || (isRTL ? "ارسم توقيعك أدناه" : "Draw your signature below"),
    clearSignature: labels.clearSignature || (isRTL ? "مسح" : "Clear"),
    saveSignature: labels.saveSignature || (isRTL ? "حفظ التوقيع" : "Save Signature"),
    cancel: labels.cancel || (isRTL ? "إلغاء" : "Cancel"),
    signatureRequired: labels.signatureRequired || (isRTL ? "يرجى رسم التوقيع" : "Please draw your signature"),
    nameRequired: labels.nameRequired || (isRTL ? "يرجى إدخال الاسم" : "Please enter your name"),
    description: labels.description || (isRTL ? "ارسم توقيعك باستخدام الماوس أو شاشة اللمس" : "Draw your signature using mouse or touchscreen"),
  };

  // Initialize canvas
  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Set canvas size based on container
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
          canvas.width = rect.width - 2; // account for border
          canvas.height = 160;
        } else {
          canvas.width = 500;
          canvas.height = 160;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSignerName(defaultName);
      setSignerTitle(defaultTitle);
      setHasSignature(false);
    }
  }, [open, defaultName, defaultTitle]);

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const coords = getCoordinates(e);
      if (!coords) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
      setHasSignature(true);
    },
    [getCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      const coords = getCoordinates(e);
      if (!coords) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    },
    [isDrawing, getCoordinates]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasSignature(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!hasSignature) return;
    if (!signerName.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave({
      signerName: signerName.trim(),
      signerTitle: signerTitle.trim(),
      signatureDataUrl: dataUrl,
    });
  }, [hasSignature, signerName, signerTitle, onSave]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-[560px]"
        dir={isRTL ? "rtl" : "ltr"}
        style={{ textAlign: isRTL ? "right" : "left" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5 text-primary" />
            {l.title}
          </DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="signer-name">
              {l.nameLabel} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={l.namePlaceholder}
            />
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label htmlFor="signer-title">{l.titleLabel}</Label>
            <Input
              id="signer-title"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder={l.titlePlaceholder}
            />
          </div>

          {/* Signature Canvas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                {l.drawSignature} <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="h-7 text-xs"
              >
                <Eraser className="h-3.5 w-3.5 me-1" />
                {l.clearSignature}
              </Button>
            </div>
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white cursor-crosshair"
              style={{ touchAction: "none" }}
            >
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: "160px", display: "block" }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            {!hasSignature && (
              <p className="text-xs text-muted-foreground">{l.signatureRequired}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {l.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasSignature || !signerName.trim() || saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {isRTL ? "جاري الحفظ..." : "Saving..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                {l.saveSignature}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
