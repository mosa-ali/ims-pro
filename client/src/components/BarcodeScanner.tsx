/**
 * BarcodeScanner Component
 * Camera-based barcode/QR code scanner using html5-qrcode
 * Supports: Code128, Code39, EAN-13, EAN-8, UPC-A, QR Code, DataMatrix
 * Features:
 * - Camera preview with real-time scanning
 * - Manual fallback input for environments without camera
 * - Scan history with running tally
 * - Audio/visual feedback on successful scan
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Camera, CameraOff, ScanLine, Keyboard, Trash2, Plus, Minus,
  Package, CheckCircle2, XCircle, Volume2, VolumeX, RotateCcw
} from "lucide-react";

export interface ScannedItem {
  code: string;         // barcode/QR code value
  quantity: number;     // counted quantity (incremented on re-scan)
  itemName?: string;    // resolved item name from lookup
  batchNumber?: string; // resolved batch number
  itemCode?: string;    // resolved item code
  itemId?: number;      // resolved item ID
  batchId?: number;     // resolved batch ID
  unit?: string;        // unit of measure
  scanCount: number;    // how many times this code was scanned
  lastScanned: number;  // timestamp of last scan
}

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: ScannedItem[]) => void;
  lookupBatch: (code: string) => Promise<{
    found: boolean;
    itemId?: number;
    batchId?: number;
    itemCode?: string;
    itemName?: string;
    batchNumber?: string;
    unit?: string;
    systemQty?: number;
  }>;
}

export default function BarcodeScanner({ open, onClose, onConfirm, lookupBatch }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize beep sound
  useEffect(() => {
    // Create a simple beep using AudioContext
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioRef.current = null; // We'll use AudioContext directly
    } catch {
      // Audio not available
    }
  }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 1200;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not available
    }
  }, [soundEnabled]);

  // Handle scan result
  const handleScan = useCallback(async (code: string) => {
    if (!code || code.trim().length === 0) return;
    
    const trimmedCode = code.trim();
    setLastScanResult(trimmedCode);
    playBeep();

    // Check if already scanned
    const existingIdx = scannedItems.findIndex(
      item => item.code === trimmedCode || 
              item.batchNumber === trimmedCode || 
              item.itemCode === trimmedCode
    );

    if (existingIdx >= 0) {
      // Increment quantity on re-scan
      setScannedItems(prev => {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
          scanCount: updated[existingIdx].scanCount + 1,
          lastScanned: Date.now(),
        };
        return updated;
      });
      toast.success(`${trimmedCode} — quantity +1 (now ${scannedItems[existingIdx].quantity + 1})`);
      return;
    }

    // Lookup the batch/item
    try {
      const result = await lookupBatch(trimmedCode);
      
      const newItem: ScannedItem = {
        code: trimmedCode,
        quantity: 1,
        itemName: result.found ? result.itemName : undefined,
        batchNumber: result.found ? result.batchNumber : undefined,
        itemCode: result.found ? result.itemCode : undefined,
        itemId: result.found ? result.itemId : undefined,
        batchId: result.found ? result.batchId : undefined,
        unit: result.found ? result.unit : undefined,
        scanCount: 1,
        lastScanned: Date.now(),
      };

      setScannedItems(prev => [newItem, ...prev]);
      
      if (result.found) {
        toast.success(`Found: ${result.itemName} (${result.batchNumber || trimmedCode})`);
      } else {
        toast.warning(`Code "${trimmedCode}" not found in stock. Added as unmatched.`);
      }
    } catch (err: any) {
      // Still add it even if lookup fails
      setScannedItems(prev => [{
        code: trimmedCode,
        quantity: 1,
        scanCount: 1,
        lastScanned: Date.now(),
      }, ...prev]);
      toast.error(`Lookup failed for "${trimmedCode}": ${err.message}`);
    }
  }, [scannedItems, lookupBatch, playBeep]);

  // Start camera scanner
  const startScanner = useCallback(async () => {
    if (!scannerContainerRef.current) return;
    
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scanner = new Html5Qrcode("barcode-scanner-container");
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          handleScan(decodedText);
        },
        () => {
          // QR code scan error (ignore - happens on every frame without a code)
        }
      );
      
      setScanning(true);
      setCameraError(null);
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(err.message || "Camera access denied or not available");
      setManualMode(true);
      toast.error("Camera not available. Switching to manual entry mode.");
    }
  }, [handleScan]);

  // Stop camera scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // Cleanup on unmount/close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // Stop scanner when dialog closes
  useEffect(() => {
    if (!open) {
      stopScanner();
    }
  }, [open, stopScanner]);

  // Handle manual input submit
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
      setManualInput("");
    }
  };

  // Update quantity for a specific item
  const updateQuantity = (idx: number, delta: number) => {
    setScannedItems(prev => {
      const updated = [...prev];
      const newQty = Math.max(0, updated[idx].quantity + delta);
      if (newQty === 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  };

  // Remove item
  const removeItem = (idx: number) => {
    setScannedItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Clear all
  const clearAll = () => {
    setScannedItems([]);
    setLastScanResult(null);
  };

  const matchedCount = scannedItems.filter(i => i.itemId).length;
  const unmatchedCount = scannedItems.filter(i => !i.itemId).length;
  const totalQty = scannedItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { stopScanner(); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Barcode / QR Code Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {!manualMode ? (
              <>
                {!scanning ? (
                  <Button onClick={startScanner} variant="default" size="sm">
                    <Camera className="h-4 w-4 mr-2" /> Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopScanner} variant="destructive" size="sm">
                    <CameraOff className="h-4 w-4 mr-2" /> Stop Camera
                  </Button>
                )}
                <Button onClick={() => { stopScanner(); setManualMode(true); }} variant="outline" size="sm">
                  <Keyboard className="h-4 w-4 mr-2" /> Manual Entry
                </Button>
              </>
            ) : (
              <Button onClick={() => setManualMode(false)} variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" /> Switch to Camera
              </Button>
            )}
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="ghost"
              size="sm"
              className="ml-auto"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {scannedItems.length > 0 && (
              <Button onClick={clearAll} variant="ghost" size="sm" className="text-red-600">
                <RotateCcw className="h-4 w-4 mr-1" /> Clear All
              </Button>
            )}
          </div>

          {/* Camera Preview */}
          {!manualMode && (
            <div className="relative">
              <div
                id="barcode-scanner-container"
                ref={scannerContainerRef}
                className="w-full rounded-lg overflow-hidden bg-gray-900 min-h-[250px]"
              />
              {!scanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                  <div className="text-center text-white">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-60" />
                    <p className="text-sm">Click "Start Camera" to begin scanning</p>
                  </div>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                  <div className="text-center text-white">
                    <XCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
                    <p className="text-sm text-red-300">{cameraError}</p>
                    <Button onClick={() => setManualMode(true)} variant="secondary" size="sm" className="mt-3">
                      Use Manual Entry
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry */}
          {manualMode && (
            <Card>
              <CardContent className="pt-4">
                <Label className="text-sm font-medium">Enter barcode, batch number, or item code</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
                    placeholder="Scan or type code here..."
                    autoFocus
                    className="font-mono"
                  />
                  <Button onClick={handleManualSubmit} disabled={!manualInput.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Use a USB/Bluetooth barcode scanner — it types the code and presses Enter automatically.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Last Scan Result */}
          {lastScanResult && (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700">Last scan: <span className="font-mono font-medium">{lastScanResult}</span></span>
            </div>
          )}

          {/* Summary Badges */}
          <div className="flex gap-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {scannedItems.length} unique items
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {totalQty} total qty
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {matchedCount} matched
            </Badge>
            {unmatchedCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {unmatchedCount} unmatched
              </Badge>
            )}
          </div>

          {/* Scanned Items List */}
          {scannedItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left text-muted-foreground">
                    <th className="py-2.5 px-3 font-medium">#</th>
                    <th className="py-2.5 px-3 font-medium">Code</th>
                    <th className="py-2.5 px-3 font-medium">Item</th>
                    <th className="py-2.5 px-3 font-medium">Batch</th>
                    <th className="py-2.5 px-3 font-medium text-center">Qty</th>
                    <th className="py-2.5 px-3 font-medium text-center">Status</th>
                    <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedItems.map((item, idx) => (
                    <tr key={`${item.code}-${idx}`} className={`border-b hover:bg-muted/30 transition-colors ${!item.itemId ? "bg-amber-50/30" : ""}`}>
                      <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-xs">{item.code}</td>
                      <td className="py-2 px-3">{item.itemName || <span className="text-muted-foreground italic">Unknown</span>}</td>
                      <td className="py-2 px-3 text-xs">{item.batchNumber || "—"}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(idx, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-mono font-medium w-8 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(idx, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.itemId ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                            Matched
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                            Unmatched
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {scannedItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No items scanned yet</p>
              <p className="text-xs mt-1">Start the camera or use manual entry to scan barcodes</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { stopScanner(); onClose(); }}>
            Cancel
          </Button>
          <Button
            onClick={() => { stopScanner(); onConfirm(scannedItems); }}
            disabled={scannedItems.length === 0}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Add {scannedItems.length} Item{scannedItems.length !== 1 ? "s" : ""} to Count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
