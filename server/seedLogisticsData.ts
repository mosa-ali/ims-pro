/**
 * Seed Logistics & Procurement Test Data
 * This script adds realistic example data for testing and validation
 */

import { getDb } from "./db";
import {
  vendors,
  purchaseRequests,
  purchaseRequestLineItems,
  purchaseOrders,
  purchaseOrderLineItems,
  goodsReceiptNotes,
  grnLineItems,
  stockItems,
  vehicles,
  drivers,
  tripLogs,
  fuelLogs,
} from "../drizzle/schema";

export async function seedLogisticsData(organizationId: number, operatingUnitId: number = 1) {
  const db = await getDb();
  const now = new Date();
  
  // Check if data already exists
  const existingVendors = await db.select().from(vendors)
    .where(eq(vendors.organizationId, organizationId)).limit(1);
  
  if (existingVendors.length > 0) {
    console.log("Logistics data already exists, skipping seed");
    return { success: true, message: "Data already exists" };
  }

  // ============================================================================
  // SEED VENDORS (3 vendors)
  // ============================================================================
  const vendorData = [
    {
      organizationId,
      vendorCode: "SUP-001",
      legalName: "Al-Rashid Trading Company",
      legalNameAr: "شركة الراشد للتجارة",
      contactPerson: "Ahmed Al-Rashid",
      email: "contact@alrashid-trading.com",
      phone: "+963-11-2234567",
      addressLine1: "Industrial Area, Building 45, Damascus",
      city: "Damascus",
      country: "Syria",
      taxId: "TAX-2024-001234",
      registrationNumber: "BL-2024-5678",
      bankName: "Commercial Bank of Syria",
      bankAccountNumber: "1234567890",
      swiftCode: "CBSYSYDA",
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      vendorCode: "SUP-002",
      legalName: "Syrian Medical Supplies Co.",
      legalNameAr: "شركة المستلزمات الطبية السورية",
      contactPerson: "Dr. Fatima Hassan",
      email: "info@syrmedical.com",
      phone: "+963-11-3345678",
      addressLine1: "Medical District, Street 12, Aleppo",
      city: "Aleppo",
      country: "Syria",
      taxId: "TAX-2024-002345",
      registrationNumber: "BL-2024-6789",
      bankName: "Syria International Islamic Bank",
      bankAccountNumber: "9876543210",
      swiftCode: "SIIBSYDA",
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      vendorCode: "SUP-003",
      legalName: "BuildRight Construction Services",
      legalNameAr: "خدمات البناء الصحيح",
      contactPerson: "Eng. Omar Khalil",
      email: "projects@buildright.sy",
      phone: "+963-11-4456789",
      addressLine1: "Construction Zone, Block C, Homs",
      city: "Homs",
      country: "Syria",
      taxId: "TAX-2024-003456",
      registrationNumber: "BL-2024-7890",
      bankName: "Bank of Syria and Overseas",
      bankAccountNumber: "5555666677",
      swiftCode: "BSYOSYDA",
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const insertedVendors = await db.insert(vendors).values(vendorData).$returningId();

  // ============================================================================
  // SEED PURCHASE REQUESTS (3 PRs with different statuses)
  // ============================================================================
  const prData = [
    {
      organizationId,
      operatingUnitId,
      prNumber: "PR-2026-0001",
      projectId: 1,
      projectTitle: "Emergency Health Response Program",
      category: "goods" as const,
      urgency: "high" as const,
      donorName: "USAID",
      budgetCode: "BC-2026-HEALTH-001",
      subBudgetLine: "Medical Supplies",
      currency: "USD",
      prTotalUSD: "15750.00",
      requesterName: "Dr. Sarah Ahmed",
      requesterEmail: "sarah.ahmed@org.com",
      department: "Health Programs",
      neededBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      justification: "Urgent medical supplies needed for the emergency health response program in northern regions.",
      status: "approved" as const,
      isDeleted: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      organizationId,
      operatingUnitId,
      prNumber: "PR-2026-0002",
      projectId: 2,
      projectTitle: "Education Support Initiative",
      category: "goods" as const,
      urgency: "normal" as const,
      donorName: "UNICEF",
      budgetCode: "BC-2026-EDU-002",
      subBudgetLine: "School Supplies",
      currency: "USD",
      prTotalUSD: "8500.00",
      requesterName: "Layla Mahmoud",
      requesterEmail: "layla.mahmoud@org.com",
      department: "Education Programs",
      neededBy: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      justification: "School supplies and educational materials for 500 students in rural areas.",
      status: "submitted" as const,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      organizationId,
      operatingUnitId,
      prNumber: "PR-2026-0003",
      projectId: 1,
      projectTitle: "Emergency Health Response Program",
      category: "services" as const,
      urgency: "low" as const,
      donorName: "WHO",
      budgetCode: "BC-2026-HEALTH-002",
      subBudgetLine: "Training Services",
      currency: "USD",
      prTotalUSD: "12000.00",
      requesterName: "Dr. Khalid Ibrahim",
      requesterEmail: "khalid.ibrahim@org.com",
      department: "Health Programs",
      neededBy: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      justification: "Professional training services for 25 community health workers.",
      status: "draft" as const,
      isDeleted: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
  ];

  const insertedPRs = await db.insert(purchaseRequests).values(prData).$returningId();

  // ============================================================================
  // SEED PR LINE ITEMS
  // ============================================================================
  const prLineItemsData = [
    // PR-2026-0001 Line Items (Medical Supplies)
    {
      purchaseRequestId: insertedPRs[0].id,
      lineNumber: 1,
      description: "Surgical Masks (Box of 50)",
      descriptionAr: "كمامات جراحية (علبة 50 قطعة)",
      quantity: "100",
      unit: "box",
      unitPrice: "25.00",
      totalPrice: "2500.00",
      specifications: "3-ply disposable surgical masks, FDA approved",
      createdAt: now,
      updatedAt: now,
    },
    {
      purchaseRequestId: insertedPRs[0].id,
      lineNumber: 2,
      description: "Nitrile Examination Gloves (Box of 100)",
      descriptionAr: "قفازات فحص نيتريل (علبة 100 قطعة)",
      quantity: "200",
      unit: "box",
      unitPrice: "15.00",
      totalPrice: "3000.00",
      specifications: "Powder-free, medium and large sizes",
      createdAt: now,
      updatedAt: now,
    },
    {
      purchaseRequestId: insertedPRs[0].id,
      lineNumber: 3,
      description: "Digital Thermometers",
      descriptionAr: "موازين حرارة رقمية",
      quantity: "50",
      unit: "piece",
      unitPrice: "35.00",
      totalPrice: "1750.00",
      specifications: "Non-contact infrared thermometers with LCD display",
      createdAt: now,
      updatedAt: now,
    },
    {
      purchaseRequestId: insertedPRs[0].id,
      lineNumber: 4,
      description: "First Aid Kits (Complete)",
      descriptionAr: "حقائب إسعافات أولية (كاملة)",
      quantity: "100",
      unit: "kit",
      unitPrice: "85.00",
      totalPrice: "8500.00",
      specifications: "WHO standard first aid kit with 50+ items",
      createdAt: now,
      updatedAt: now,
    },
    // PR-2026-0002 Line Items (School Supplies)
    {
      purchaseRequestId: insertedPRs[1].id,
      lineNumber: 1,
      description: "Student Backpacks",
      descriptionAr: "حقائب مدرسية",
      quantity: "500",
      unit: "piece",
      unitPrice: "12.00",
      totalPrice: "6000.00",
      specifications: "Durable fabric, multiple compartments, suitable for ages 6-12",
      createdAt: now,
      updatedAt: now,
    },
    {
      purchaseRequestId: insertedPRs[1].id,
      lineNumber: 2,
      description: "Notebook Set (5 notebooks)",
      descriptionAr: "طقم دفاتر (5 دفاتر)",
      quantity: "500",
      unit: "set",
      unitPrice: "5.00",
      totalPrice: "2500.00",
      specifications: "A5 size, lined pages, 100 pages each",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(purchaseRequestLineItems).values(prLineItemsData);

  // ============================================================================
  // SEED PURCHASE ORDERS (1 PO linked to approved PR)
  // ============================================================================
  const poData = [
    {
      organizationId,
      operatingUnitId,
      poNumber: "PO-2026-0001",
      purchaseRequestId: insertedPRs[0].id,
      supplierId: insertedSuppliers[1].id,
      poDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      deliveryLocation: "Main Warehouse, Damascus",
      deliveryLocationAr: "المستودع الرئيسي، دمشق",
      paymentTerms: "Net 30 days after delivery",
      currency: "USD",
      totalAmount: "15750.00",
      status: "sent" as const,
      termsAndConditions: "Standard procurement terms apply.",
      isDeleted: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
  ];

  const insertedPOs = await db.insert(purchaseOrders).values(poData).$returningId();

  // ============================================================================
  // SEED PO LINE ITEMS
  // ============================================================================
  const poLineItemsData = [
    {
      purchaseOrderId: insertedPOs[0].id,
      lineNumber: 1,
      description: "Surgical Masks (Box of 50)",
      descriptionAr: "كمامات جراحية (علبة 50 قطعة)",
      quantity: "100",
      unit: "box",
      unitPrice: "25.00",
      totalPrice: "2500.00",
      createdAt: now,
      updatedAt: now,
    },
    {
      purchaseOrderId: insertedPOs[0].id,
      lineNumber: 2,
      description: "Nitrile Examination Gloves (Box of 100)",
      descriptionAr: "قفازات فحص نيتريل (علبة 100 قطعة)",
      quantity: "200",
      unit: "box",
      unitPrice: "15.00",
      totalPrice: "3000.00",
      createdAt: now,
      updatedAt: now,
    },
    {
      purchaseOrderId: insertedPOs[0].id,
      lineNumber: 3,
      description: "Digital Thermometers",
      descriptionAr: "موازين حرارة رقمية",
      quantity: "50",
      unit: "piece",
      unitPrice: "35.00",
      totalPrice: "1750.00",
      createdAt: now,
      updatedAt: now,
    },
    {
      purchaseOrderId: insertedPOs[0].id,
      lineNumber: 4,
      description: "First Aid Kits (Complete)",
      descriptionAr: "حقائب إسعافات أولية (كاملة)",
      quantity: "100",
      unit: "kit",
      unitPrice: "85.00",
      totalPrice: "8500.00",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(purchaseOrderLineItems).values(poLineItemsData);

  // ============================================================================
  // SEED GOODS RECEIPT NOTES (1 GRN linked to PO)
  // ============================================================================
  const grnData = [
    {
      organizationId,
      operatingUnitId,
      grnNumber: "GRN-2026-0001",
      purchaseOrderId: insertedPOs[0].id,
      grnDate: now,
      receivedBy: "Warehouse Manager",
      inspectedBy: "Quality Control Officer",
      deliveryNoteNumber: "DN-2026-12345",
      invoiceNumber: "INV-2026-98765",
      warehouse: "Main Warehouse, Damascus",
      warehouseAr: "المستودع الرئيسي، دمشق",
      status: "pending_inspection" as const,
      remarks: "Partial delivery received. Remaining items expected next week.",
      remarksAr: "تم استلام تسليم جزئي. الأصناف المتبقية متوقعة الأسبوع القادم.",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const insertedGRNs = await db.insert(goodsReceiptNotes).values(grnData).$returningId();

  // ============================================================================
  // SEED GRN LINE ITEMS
  // ============================================================================
  const grnLineItemsData = [
    {
      grnId: insertedGRNs[0].id,
      lineNumber: 1,
      description: "Surgical Masks (Box of 50)",
      orderedQty: "100",
      receivedQty: "100",
      acceptedQty: "100",
      rejectedQty: "0",
      unit: "box",
      remarks: "All boxes in good condition",
      createdAt: now,
      updatedAt: now,
    },
    {
      grnId: insertedGRNs[0].id,
      lineNumber: 2,
      description: "Nitrile Examination Gloves (Box of 100)",
      orderedQty: "200",
      receivedQty: "150",
      acceptedQty: "145",
      rejectedQty: "5",
      unit: "box",
      rejectionReason: "5 boxes damaged during transport",
      remarks: "50 boxes pending delivery",
      createdAt: now,
      updatedAt: now,
    },
    {
      grnId: insertedGRNs[0].id,
      lineNumber: 3,
      description: "Digital Thermometers",
      orderedQty: "50",
      receivedQty: "50",
      acceptedQty: "48",
      rejectedQty: "2",
      unit: "piece",
      rejectionReason: "2 units not functioning",
      remarks: "Replacement requested",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(grnLineItems).values(grnLineItemsData);

  // ============================================================================
  // SEED STOCK ITEMS
  // ============================================================================
  const stockItemsData = [
    {
      organizationId,
      itemCode: "STK-MED-001",
      itemName: "Surgical Masks (Box of 50)",
      itemNameAr: "كمامات جراحية (علبة 50 قطعة)",
      category: "Medical Supplies",
      unitType: "box",
      currentQuantity: "250",
      minimumQuantity: "100",
      maximumQuantity: "500",
      reorderLevel: "150",
      warehouseLocation: "Warehouse A, Shelf 1",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      itemCode: "STK-MED-002",
      itemName: "Nitrile Examination Gloves",
      itemNameAr: "قفازات فحص نيتريل",
      category: "Medical Supplies",
      unitType: "box",
      currentQuantity: "75",
      minimumQuantity: "100",
      maximumQuantity: "400",
      reorderLevel: "120",
      warehouseLocation: "Warehouse A, Shelf 2",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      itemCode: "STK-OFF-001",
      itemName: "A4 Paper (Ream of 500)",
      itemNameAr: "ورق A4 (رزمة 500 ورقة)",
      category: "Office Supplies",
      unitType: "ream",
      currentQuantity: "45",
      minimumQuantity: "20",
      maximumQuantity: "100",
      reorderLevel: "30",
      warehouseLocation: "Warehouse B, Shelf 5",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      itemCode: "STK-OFF-002",
      itemName: "Printer Toner Cartridge",
      itemNameAr: "خرطوشة حبر طابعة",
      category: "Office Supplies",
      unitType: "piece",
      currentQuantity: "8",
      minimumQuantity: "5",
      maximumQuantity: "20",
      reorderLevel: "8",
      warehouseLocation: "Warehouse B, Shelf 6",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(stockItems).values(stockItemsData);

  // ============================================================================
  // SEED VEHICLES
  // ============================================================================
  const vehiclesData = [
    {
      organizationId,
      operatingUnitId,
      plateNumber: "DMS-12345",
      brand: "Toyota",
      model: "Land Cruiser",
      year: 2022,
      chassisNumber: "JTMHY7AJ5N4123456",
      fuelType: "diesel" as const,
      currentOdometer: "45000",
      status: "active" as const,
      notes: "Main field vehicle for program activities",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      operatingUnitId,
      plateNumber: "DMS-67890",
      brand: "Toyota",
      model: "Hilux",
      year: 2021,
      chassisNumber: "JTFSS22P5N0654321",
      fuelType: "diesel" as const,
      currentOdometer: "62000",
      status: "active" as const,
      notes: "Assigned to logistics team",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      operatingUnitId,
      plateNumber: "DMS-11111",
      brand: "Nissan",
      model: "Patrol",
      year: 2020,
      chassisNumber: "JN1TBNT30Z0111111",
      fuelType: "petrol" as const,
      currentOdometer: "78000",
      status: "under_maintenance" as const,
      notes: "Scheduled for annual service",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(vehicles).values(vehiclesData);

  // ============================================================================
  // SEED DRIVERS
  // ============================================================================
  // Format date as YYYY-MM-DD string for date type columns
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  const driversData = [
    {
      organizationId,
      operatingUnitId,
      driverId: "EMP-DRV-001",
      fullName: "Mahmoud Al-Sayed",
      fullNameAr: "محمود السيد",
      staffId: null,
      licenseNumber: "DL-2020-123456",
      licenseType: "heavy",
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      licenseIssuingCountry: "Syria",
      phone: "+963-11-5551234",
      email: "mahmoud.driver@org.com",
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      operatingUnitId,
      driverId: "EMP-DRV-002",
      fullName: "Hassan Ibrahim",
      fullNameAr: "حسن إبراهيم",
      staffId: null,
      licenseNumber: "DL-2019-654321",
      licenseType: "light",
      licenseExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      licenseIssuingCountry: "Syria",
      phone: "+963-11-5552345",
      email: "hassan.driver@org.com",
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      organizationId,
      operatingUnitId,
      driverId: "EMP-DRV-003",
      fullName: "Ali Mustafa",
      fullNameAr: "علي مصطفى",
      staffId: null,
      licenseNumber: "DL-2021-789012",
      licenseType: "heavy",
      licenseExpiry: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
      licenseIssuingCountry: "Syria",
      phone: "+963-11-5553456",
      email: "ali.driver@org.com",
      status: "on_leave" as const,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(drivers).values(driversData);

  return {
    success: true,
    message: "Logistics test data seeded successfully",
    counts: {
      vendors: vendorData.length,
      purchaseRequests: prData.length,
      purchaseOrders: poData.length,
      goodsReceiptNotes: grnData.length,
      stockItems: stockItemsData.length,
      vehicles: vehiclesData.length,
      drivers: driversData.length,
    },
  };
}

// Import eq for the check
import { eq } from "drizzle-orm";
