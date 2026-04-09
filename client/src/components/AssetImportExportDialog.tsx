import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

export interface ImportError {
  row: number;
  field: string;
  message: string;
  suggestedFix: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface TemplateColumn {
  key: string;
  header: string;
  required: boolean;
  example: string | number;
  description: string;
  validation?: (val: any) => string | null;
}

interface AssetImportExportDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "import" | "export";
  title: string;
  templateColumns: TemplateColumn[];
  exportData?: Record<string, any>[];
  exportFileName?: string;
  onImport?: (rows: Record<string, any>[]) => Promise<ImportResult>;
  isRTL?: boolean;
}

export function AssetImportExportDialog({
  open,
  onClose,
  mode,
  title,
  templateColumns,
  exportData,
  exportFileName = "export",
  onImport,
  isRTL = false,
}: AssetImportExportDialogProps) {
  const [step, setStep] = useState<"idle" | "preview" | "importing" | "result">("idle");
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setStep("idle");
    setParsedRows([]);
    setValidationErrors([]);
    setImportResult(null);
    setProgress(0);
    setFileName("");
    onClose();
  };

  // ── Download template ──────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Header row
    const headers = templateColumns.map((c) => c.header);
    // Example row
    const examples = templateColumns.map((c) => c.example);
    // Instructions row
    const instructions = templateColumns.map(
      (c) => `${c.required ? "REQUIRED" : "Optional"}: ${c.description}`
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, examples, instructions]);

    // Style header row (column widths)
    ws["!cols"] = templateColumns.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // Add validation sheet
    const validationData = [
      ["Field", "Required", "Description", "Example"],
      ...templateColumns.map((c) => [
        c.header,
        c.required ? "Yes" : "No",
        c.description,
        String(c.example),
      ]),
    ];
    const wsValidation = XLSX.utils.aoa_to_sheet(validationData);
    wsValidation["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 45 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsValidation, "Field Guide");

    XLSX.writeFile(wb, `${exportFileName}_template.xlsx`);
  };

  // ── Export current data ────────────────────────────────────────────────────
  const handleExport = () => {
    if (!exportData || exportData.length === 0) return;

    const headers = templateColumns.map((c) => c.header);
    const rows = exportData.map((row) =>
      templateColumns.map((c) => row[c.key] ?? "")
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = templateColumns.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${exportFileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ── Parse uploaded file ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rawRows.length < 2) {
          setValidationErrors([
            {
              row: 1,
              field: "file",
              message: "File is empty or has no data rows",
              suggestedFix: "Download the template and fill in at least one data row",
            },
          ]);
          setStep("preview");
          return;
        }

        const headerRow = rawRows[0] as string[];
        const dataRows = rawRows.slice(1).filter((r) => r.some((c) => c !== undefined && c !== ""));

        // Map header names to column keys
        const colMap: Record<number, string> = {};
        templateColumns.forEach((col) => {
          const idx = headerRow.findIndex(
            (h) => h?.toString().trim().toLowerCase() === col.header.toLowerCase()
          );
          if (idx !== -1) colMap[idx] = col.key;
        });

        // Validate and parse rows
        const parsed: Record<string, any>[] = [];
        const errors: ImportError[] = [];

        dataRows.forEach((row, rowIdx) => {
          const obj: Record<string, any> = {};
          let rowHasError = false;

          templateColumns.forEach((col) => {
            const colIdx = headerRow.findIndex(
              (h) => h?.toString().trim().toLowerCase() === col.header.toLowerCase()
            );
            const rawVal = colIdx !== -1 ? row[colIdx] : undefined;
            const val = rawVal !== undefined && rawVal !== "" ? rawVal : undefined;

            if (col.required && (val === undefined || val === null || val === "")) {
              errors.push({
                row: rowIdx + 2,
                field: col.key,
                message: `"${col.header}" is required but missing`,
                suggestedFix: `Provide a value for "${col.header}" in row ${rowIdx + 2}`,
              });
              rowHasError = true;
            } else if (val !== undefined && col.validation) {
              const err = col.validation(val);
              if (err) {
                errors.push({
                  row: rowIdx + 2,
                  field: col.key,
                  message: err,
                  suggestedFix: `Fix "${col.header}" in row ${rowIdx + 2}`,
                });
                rowHasError = true;
              }
            }

            obj[col.key] = val;
          });

          if (!rowHasError) parsed.push(obj);
        });

        setParsedRows(parsed);
        setValidationErrors(errors);
        setStep("preview");
      } catch (err) {
        setValidationErrors([
          {
            row: 0,
            field: "file",
            message: "Failed to parse file. Ensure it is a valid .xlsx file.",
            suggestedFix: "Download the template and use it to prepare your data",
          },
        ]);
        setStep("preview");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Execute import ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!onImport || parsedRows.length === 0) return;
    setStep("importing");
    setProgress(30);

    try {
      setProgress(60);
      const result = await onImport(parsedRows);
      setProgress(100);
      setImportResult(result);
      setStep("result");
    } catch (err: any) {
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [
          {
            row: 0,
            field: "general",
            message: err.message || "Import failed",
            suggestedFix: "Check your data and try again",
          },
        ],
      });
      setStep("result");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] overflow-y-auto"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* ── EXPORT MODE ── */}
        {mode === "export" && (
          <div className="space-y-4">
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                Export all current data to an Excel file, or download a blank template to prepare
                bulk import data.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button onClick={handleExport} className="flex-1" disabled={!exportData?.length}>
                <Download className="h-4 w-4 mr-2" />
                Export Data ({exportData?.length ?? 0} rows)
              </Button>
              <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* Column guide */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Example</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateColumns.map((col) => (
                    <TableRow key={col.key}>
                      <TableCell className="font-medium">{col.header}</TableCell>
                      <TableCell>
                        {col.required ? (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{col.description}</TableCell>
                      <TableCell className="text-sm font-mono">{String(col.example)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── IMPORT MODE ── */}
        {mode === "import" && (
          <div className="space-y-4">
            {/* Step: idle */}
            {step === "idle" && (
              <>
                <Alert>
                  <Upload className="h-4 w-4" />
                  <AlertDescription>
                    Upload an Excel (.xlsx) file to import records. Download the template first to
                    ensure correct formatting.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}

            {/* Step: preview */}
            {step === "preview" && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{fileName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep("idle");
                      setParsedRows([]);
                      setValidationErrors([]);
                      setFileName("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{parsedRows.length}</div>
                    <div className="text-xs text-muted-foreground">Valid rows</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-500">{validationErrors.length}</div>
                    <div className="text-xs text-muted-foreground">Validation errors</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {parsedRows.length + validationErrors.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total rows</div>
                  </div>
                </div>

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-3 py-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">
                        {validationErrors.length} validation error(s) — these rows will be skipped
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Suggested Fix</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationErrors.map((err, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{err.row}</TableCell>
                              <TableCell className="text-xs font-medium">{err.field}</TableCell>
                              <TableCell className="text-xs text-red-600">{err.message}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{err.suggestedFix}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Preview of valid rows */}
                {parsedRows.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-3 py-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Preview of {Math.min(parsedRows.length, 5)} valid row(s)
                        {parsedRows.length > 5 ? ` (showing first 5 of ${parsedRows.length})` : ""}
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-48">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {templateColumns
                              .filter((c) => c.required)
                              .map((c) => (
                                <TableHead key={c.key} className="text-xs whitespace-nowrap">
                                  {c.header}
                                </TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              {templateColumns
                                .filter((c) => c.required)
                                .map((c) => (
                                  <TableCell key={c.key} className="text-xs">
                                    {row[c.key] ?? "—"}
                                  </TableCell>
                                ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step: importing */}
            {step === "importing" && (
              <div className="space-y-4 py-4 text-center">
                <div className="text-sm text-muted-foreground">Importing {parsedRows.length} records...</div>
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-muted-foreground">{progress}% complete</div>
              </div>
            )}

            {/* Step: result */}
            {step === "result" && importResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-green-200 rounded-lg p-3 text-center bg-green-50">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <div className="text-xs text-muted-foreground">Imported</div>
                  </div>
                  <div className="border border-yellow-200 rounded-lg p-3 text-center bg-yellow-50">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="border border-red-200 rounded-lg p-3 text-center bg-red-50">
                    <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-red-500">{importResult.errors.length}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-3 py-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">Import errors</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Suggested Fix</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((err, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{err.row}</TableCell>
                              <TableCell className="text-xs font-medium">{err.field}</TableCell>
                              <TableCell className="text-xs text-red-600">{err.message}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{err.suggestedFix}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {importResult.imported > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Successfully imported {importResult.imported} record(s). The page will refresh to show the new data.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {mode === "import" && step === "preview" && parsedRows.length > 0 && (
            <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
              <Upload className="h-4 w-4 mr-2" />
              Import {parsedRows.length} Records
            </Button>
          )}
          {mode === "import" && step === "preview" && (
            <Button
              variant="outline"
              onClick={() => {
                setStep("idle");
                setParsedRows([]);
                setValidationErrors([]);
                setFileName("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Choose Different File
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            {step === "result" ? "Close" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
