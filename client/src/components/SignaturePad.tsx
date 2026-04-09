import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Undo2 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  labels?: {
    clear: string;
    undo: string;
    signHere: string;
  };
}

interface Stroke {
  points: { x: number; y: number }[];
}

export default function SignaturePad({
  onSignatureChange,
  disabled = false,
  width = 500,
  height = 200,
  labels = { clear: 'Clear', undo: 'Undo', signHere: 'Sign here' },
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  const getCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
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

  const redrawCanvas = useCallback(
    (allStrokes: Stroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw guide line
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 40);
      ctx.lineTo(canvas.width - 20, canvas.height - 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw placeholder text if no strokes
      if (allStrokes.length === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels.signHere, canvas.width / 2, canvas.height - 50);
      }

      // Draw all strokes
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    },
    [labels.signHere]
  );

  useEffect(() => {
    redrawCanvas(strokes);
  }, [strokes, redrawCanvas]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width * 2; // High DPI
    canvas.height = height * 2;
    redrawCanvas([]);
  }, [width, height, redrawCanvas]);

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const coords = getCoords(e);
      setIsDrawing(true);
      setCurrentStroke({ points: [coords] });
    },
    [disabled, getCoords]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled || !currentStroke) return;
      e.preventDefault();
      const coords = getCoords(e);
      const updatedStroke = {
        points: [...currentStroke.points, coords],
      };
      setCurrentStroke(updatedStroke);

      // Draw current stroke in real-time
      const allStrokes = [...strokes, updatedStroke];
      redrawCanvas(allStrokes);
    },
    [isDrawing, disabled, currentStroke, strokes, getCoords, redrawCanvas]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    const newStrokes = [...strokes, currentStroke];
    setStrokes(newStrokes);
    setCurrentStroke(null);

    // Emit signature data
    const canvas = canvasRef.current;
    if (canvas) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  }, [isDrawing, currentStroke, strokes, onSignatureChange]);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke(null);
    redrawCanvas([]);
    onSignatureChange(null);
  }, [redrawCanvas, onSignatureChange]);

  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    redrawCanvas(newStrokes);
    if (newStrokes.length === 0) {
      onSignatureChange(null);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        // Need to redraw first then get data URL
        setTimeout(() => {
          onSignatureChange(canvas.toDataURL('image/png'));
        }, 0);
      }
    }
  }, [strokes, redrawCanvas, onSignatureChange]);

  return (
    <div className="space-y-2">
      <div
        className={`border-2 rounded-lg overflow-hidden ${
          disabled
            ? 'border-muted bg-muted/30 cursor-not-allowed'
            : 'border-border bg-white cursor-crosshair'
        }`}
        style={{ width: '100%', maxWidth: `${width}px` }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px`, touchAction: 'none' }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={strokes.length === 0}
          >
            <Undo2 className="w-4 h-4 me-1" />
            {labels.undo}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={strokes.length === 0}
          >
            <Eraser className="w-4 h-4 me-1" />
            {labels.clear}
          </Button>
        </div>
      )}
    </div>
  );
}
