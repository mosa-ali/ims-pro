/**
 * Goods Receipt Note Print View
 * Official document format for printing
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function GoodsReceiptPrint() {
  const { user } = useAuth();
  const [, params] = useRoute("/logistics/grn/:id/print");
  const id = params?.id ? parseInt(params.id) : 0;
  const organizationId = (user as any)?.organizationId || 1;

  const { data: grn, isLoading } = trpc.logistics.grn.getById.useQuery({ id, organizationId }, { enabled: !!id });

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!grn) return <div className="p-8 text-center">Goods Receipt Note not found</div>;

  const lineItems = grn.lineItems || [];
  const columns = ["#", "Description", "Ordered Qty", "Received Qty", "Unit", "Condition", "Notes"];
  const rows = lineItems.map((item: any, idx: number) => [
    (idx + 1).toString(),
    item.description,
    item.orderedQuantity?.toString() || "0",
    item.receivedQuantity?.toString() || "0",
    item.unit || "-",
    item.condition || "Good",
    item.notes || "-"
  ]);

  const signatures = [
    { role: "Received By", name: grn.receivedBy || "", date: grn.receivedDate ? format(new Date(grn.receivedDate), "yyyy-MM-dd") : "" },
    { role: "Inspected By", name: grn.inspectedBy || "", date: "" },
    { role: "Approved By", name: "", date: "" }
  ];

  return (
    <OfficialPrintTemplate
      formTitle="Goods Receipt Note"
      formTitleAr="إشعار استلام البضائع"
      documentNumber={grn.grnNumber}
      documentDate={grn.receivedDate ? format(new Date(grn.receivedDate), "yyyy-MM-dd") : ""}
      metadata={[
        { label: "PO Reference", value: grn.poNumber || "-" },
        { label: "Supplier", value: grn.supplierName || "-" },
        { label: "Delivery Location", value: grn.deliveryLocation || "-" },
        { label: "Delivery Note No.", value: grn.deliveryNoteNumber || "-" },
        { label: "Invoice No.", value: grn.invoiceNumber || "-" },
        { label: "Status", value: grn.status || "Pending" }
      ]}
      tableColumns={columns}
      tableRows={rows}
      signatures={signatures}
      notes={grn.remarks || ""}
    />
  );
}
