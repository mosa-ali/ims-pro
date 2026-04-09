import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignatureCanvasProps {
  width?: number;
  height?: number;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  existingSignature?: string | null;
  disabled?: boolean;
  clearLabel?: string;
  confirmLabel?: string;
  signHereLabel?: string;
}

export default function SignatureCanvas({
  width = 400,
  height = 150,
  onSave,
  onClear,
  existingSignature,
  disabled = false,
  clearLabel = "Clear",
  confirmLabel = "Confirm",
  signHereLabel = "Sign here...",
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [confirmed, setConfirmed] = useState(!!existingSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Draw existing signature if available
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasSignature(true);
        setConfirmed(true);
      };
      img.src = existingSignature;
    } else {
      // Clear canvas with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      // Draw placeholder text
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(signHereLabel, width / 2, height / 2);
      // Draw bottom line
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, height - 20);
      ctx.lineTo(width - 20, height - 20);
      ctx.stroke();
    }
  }, [width, height, existingSignature, signHereLabel]);

  const getCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || confirmed) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear placeholder on first draw
      if (!hasSignature) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        // Redraw bottom line
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 20);
        ctx.lineTo(width - 20, height - 20);
        ctx.stroke();
      }

      const { x, y } = getCoords(e);
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasSignature(true);
    },
    [disabled, confirmed, hasSignature, getCoords, width, height]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled || confirmed) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCoords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, disabled, confirmed, getCoords]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(signHereLabel, width / 2, height / 2);
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.stroke();

    setHasSignature(false);
    setConfirmed(false);
    onClear?.();
  }, [width, height, signHereLabel, onClear]);

  const confirmSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const dataUrl = canvas.toDataURL("image/png");
    setConfirmed(true);
    onSave(dataUrl);
  }, [hasSignature, onSave]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`border-2 rounded-lg overflow-hidden ${
          confirmed
            ? "border-green-400 bg-green-50"
            : isDrawing
            ? "border-primary"
            : "border-dashed border-gray-300"
        }`}
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`${disabled || confirmed ? "cursor-default" : "cursor-crosshair"}`}
          style={{ width, height, touchAction: "none" }}
        />
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="flex-1"
          >
            <Eraser className="h-3 w-3 me-1" />
            {clearLabel}
          </Button>
          {!confirmed && hasSignature && (
            <Button
              type="button"
              size="sm"
              onClick={confirmSignature}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-3 w-3 me-1" />
              {confirmLabel}
            </Button>
          )}
        </div>
      )}
      {confirmed && (
        <p className="text-xs text-green-600 font-medium text-center">
          ✓ Signature confirmed
        </p>
      )}
    </div>
  );
}
