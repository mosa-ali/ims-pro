/**
 * Advanced Reporting Export Engine
 * Provides PDF and Excel export functionality for fleet reports
 */

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, BorderStyle, WidthType, VerticalAlign, AlignmentType, PageBreak } from "docx";
import * as XLSX from "xlsx";
import { storagePut } from "../storage";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportOptions {
  format: "pdf" | "excel";
  reportType: "fleet-overview" | "vehicle-detail" | "driver-performance" | "trip-detail" | "fuel-consumption" | "maintenance";
  title: string;
  organizationName: string;
  filters?: Record<string, any>;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export interface ReportData {
  title: string;
  organizationName: string;
  generatedDate: Date;
  summary?: Record<string, any>;
  data: any[];
  columns: Array<{ key: string; label: string; type?: string }>;
}

export interface ExportResult {
  url: string;
  fileName: string;
  fileSize: number;
  format: string;
  generatedAt: Date;
}

// ============================================================================
// PDF EXPORT ENGINE
// ============================================================================

export async function generatePDFReport(reportData: ReportData, options: ExportOptions): Promise<ExportResult> {
  const fileName = `${options.reportType}-${Date.now()}.pdf`;
  
  // Create document sections
  const sections = [];

  // Header section
  sections.push(
    new Paragraph({
      text: reportData.title,
      style: "Heading1",
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Organization info
  sections.push(
    new Paragraph({
      text: `Organization: ${reportData.organizationName}`,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `Generated: ${reportData.generatedDate.toLocaleDateString()}`,
      spacing: { after: 400 },
    })
  );

  // Summary section
  if (options.includeSummary && reportData.summary) {
    sections.push(
      new Paragraph({
        text: "Summary",
        style: "Heading2",
        spacing: { after: 200 },
      })
    );

    for (const [key, value] of Object.entries(reportData.summary)) {
      sections.push(
        new Paragraph({
          text: `${key}: ${value}`,
          spacing: { after: 100 },
        })
      );
    }

    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));
  }

  // Data table
  sections.push(
    new Paragraph({
      text: "Details",
      style: "Heading2",
      spacing: { after: 200 },
    })
  );

  const tableRows = [
    new TableRow({
      children: reportData.columns.map(
        (col) =>
          new TableCell({
            children: [new Paragraph({ text: col.label, bold: true })],
            shading: { fill: "D3D3D3" },
          })
      ),
    }),
    ...reportData.data.slice(0, 100).map(
      (row) =>
        new TableRow({
          children: reportData.columns.map(
            (col) =>
              new TableCell({
                children: [new Paragraph({ text: String(row[col.key] || "") })],
              })
          ),
        })
    ),
  ];

  sections.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);

  // Upload to storage
  const fileKey = `reports/pdf/${fileName}`;
  const { url } = await storagePut(fileKey, buffer, "application/pdf");

  return {
    url,
    fileName,
    fileSize: buffer.length,
    format: "pdf",
    generatedAt: new Date(),
  };
}

// ============================================================================
// EXCEL EXPORT ENGINE
// ============================================================================

export async function generateExcelReport(reportData: ReportData, options: ExportOptions): Promise<ExportResult> {
  const fileName = `${options.reportType}-${Date.now()}.xlsx`;

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary sheet
  if (options.includeSummary && reportData.summary) {
    const summaryData = [
      ["Report", reportData.title],
      ["Organization", reportData.organizationName],
      ["Generated", reportData.generatedDate.toLocaleDateString()],
      [""],
      ...Object.entries(reportData.summary).map(([key, value]) => [key, value]),
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  }

  // Data sheet
  const dataSheet = XLSX.utils.json_to_sheet(reportData.data, {
    header: reportData.columns.map((col) => col.key),
  });

  // Add column headers
  const headerRow = reportData.columns.map((col) => col.label);
  XLSX.utils.sheet_add_aoa(dataSheet, [headerRow], { origin: "A1" });

  // Format columns
  const colWidths = reportData.columns.map((col) => ({
    wch: Math.max(col.label.length, 15),
  }));
  dataSheet["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, dataSheet, "Data");

  // Generate buffer
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

  // Upload to storage
  const fileKey = `reports/excel/${fileName}`;
  const { url } = await storagePut(fileKey, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  return {
    url,
    fileName,
    fileSize: (buffer as Buffer).length,
    format: "excel",
    generatedAt: new Date(),
  };
}

// ============================================================================
// EXPORT ORCHESTRATOR
// ============================================================================

export async function exportReport(reportData: ReportData, options: ExportOptions): Promise<ExportResult> {
  if (options.format === "pdf") {
    return generatePDFReport(reportData, options);
  } else if (options.format === "excel") {
    return generateExcelReport(reportData, options);
  } else {
    throw new Error(`Unsupported export format: ${options.format}`);
  }
}

// ============================================================================
// REPORT DATA BUILDERS
// ============================================================================

export function buildFleetOverviewReport(
  fleetData: any[],
  organizationName: string,
  summary?: Record<string, any>
): ReportData {
  return {
    title: "Fleet Overview Report",
    organizationName,
    generatedDate: new Date(),
    summary,
    data: fleetData,
    columns: [
      { key: "vehicleId", label: "Vehicle ID" },
      { key: "registration", label: "Registration" },
      { key: "status", label: "Status" },
      { key: "mileage", label: "Mileage" },
      { key: "fuelType", label: "Fuel Type" },
      { key: "lastServiceDate", label: "Last Service" },
    ],
  };
}

export function buildVehicleDetailReport(
  vehicleData: any,
  organizationName: string,
  summary?: Record<string, any>
): ReportData {
  return {
    title: `Vehicle Detail Report - ${vehicleData.registration}`,
    organizationName,
    generatedDate: new Date(),
    summary,
    data: [vehicleData],
    columns: [
      { key: "vehicleId", label: "Vehicle ID" },
      { key: "registration", label: "Registration" },
      { key: "make", label: "Make" },
      { key: "model", label: "Model" },
      { key: "year", label: "Year" },
      { key: "status", label: "Status" },
      { key: "mileage", label: "Mileage" },
      { key: "fuelType", label: "Fuel Type" },
      { key: "purchaseDate", label: "Purchase Date" },
      { key: "lastServiceDate", label: "Last Service" },
    ],
  };
}

export function buildDriverPerformanceReport(
  driverData: any[],
  organizationName: string,
  summary?: Record<string, any>
): ReportData {
  return {
    title: "Driver Performance Report",
    organizationName,
    generatedDate: new Date(),
    summary,
    data: driverData,
    columns: [
      { key: "driverId", label: "Driver ID" },
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "tripsCompleted", label: "Trips Completed" },
      { key: "avgRating", label: "Avg Rating" },
      { key: "safetyScore", label: "Safety Score" },
      { key: "fuelEfficiency", label: "Fuel Efficiency" },
    ],
  };
}

export function buildTripDetailReport(
  tripData: any[],
  organizationName: string,
  summary?: Record<string, any>
): ReportData {
  return {
    title: "Trip Detail Report",
    organizationName,
    generatedDate: new Date(),
    summary,
    data: tripData,
    columns: [
      { key: "tripId", label: "Trip ID" },
      { key: "vehicleId", label: "Vehicle ID" },
      { key: "driverId", label: "Driver ID" },
      { key: "startDate", label: "Start Date" },
      { key: "endDate", label: "End Date" },
      { key: "distance", label: "Distance (km)" },
      { key: "fuelConsumed", label: "Fuel (L)" },
      { key: "status", label: "Status" },
    ],
  };
}

export function buildFuelConsumptionReport(
  fuelData: any[],
  organizationName: string,
  summary?: Record<string, any>
): ReportData {
  return {
    title: "Fuel Consumption Report",
    organizationName,
    generatedDate: new Date(),
    summary,
    data: fuelData,
    columns: [
      { key: "vehicleId", label: "Vehicle ID" },
      { key: "logDate", label: "Date" },
      { key: "quantityLiters", label: "Quantity (L)" },
      { key: "cost", label: "Cost" },
      { key: "pricePerLiter", label: "Price/L" },
      { key: "mileage", label: "Mileage" },
      { key: "efficiency", label: "Efficiency (L/100km)" },
    ],
  };
}

export function buildMaintenanceReport(
  maintenanceData: any[],
  organizationName: string,
  summary?: Record<string, any>
): ReportData {
  return {
    title: "Maintenance Report",
    organizationName,
    generatedDate: new Date(),
    summary,
    data: maintenanceData,
    columns: [
      { key: "vehicleId", label: "Vehicle ID" },
      { key: "maintenanceDate", label: "Date" },
      { key: "type", label: "Type" },
      { key: "description", label: "Description" },
      { key: "cost", label: "Cost" },
      { key: "status", label: "Status" },
      { key: "nextDueDate", label: "Next Due" },
    ],
  };
}
