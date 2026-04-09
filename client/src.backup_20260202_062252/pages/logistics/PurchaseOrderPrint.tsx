/**
 * Purchase Order Print View
 * Official document format for printing
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function PurchaseOrderPrint() {
  const { user } = useAuth();
  const [, params] = useRoute("/logistics/purchase-orders/:id/print");
  const id = params?.id ? parseInt(params.id) : 0;
  const organizationId = (user as any)?.organizationId || 1;

  const { data: po, isLoading } = trpc.logistics.purchaseOrders.getById.useQuery({ id, organizationId }, { enabled: !!id });

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!po) return <div className="p-8 text-center">Purchase Order not found</div>;

  const lineItems = po.lineItems || [];
  const columns = ["#", "Description", "Qty", "Unit", "Unit Price", "Total"];
  const rows = lineItems.map((item: any, idx: number) => [
    (idx + 1).toString(),
    item.description,
    item.quantity?.toString() || "0",
    item.unit || "-",
    `${po.currency} ${parseFloat(item.unitPrice || "0").toLocaleString()}`,
    `${po.currency} ${parseFloat(item.totalPrice || "0").toLocaleString()}`
  ]);

  const signatures = [
    { role: "Prepared By", name: "", date: "" },
    { role: "Reviewed By", name: "", date: "" },
    { role: "Authorized By", name: "", date: "" }
  ];

  return (
    <OfficialPrintTemplate
      formTitle="Purchase Order"
      formTitleAr="أمر شراء"
      documentNumber={po.poNumber}
      documentDate={po.poDate ? format(new Date(po.poDate), "yyyy-MM-dd") : ""}
      metadata={[
        { label: "Supplier", value: po.supplierName || "-" },
        { label: "PR Reference", value: po.prNumber || "-" },
        { label: "Delivery Date", value: po.deliveryDate ? format(new Date(po.deliveryDate), "yyyy-MM-dd") : "-" },
        { label: "Payment Terms", value: po.paymentTerms || "-" },
        { label: "Delivery Location", value: po.deliveryLocation || "-" },
        { label: "Total Amount", value: `${po.currency} ${parseFloat(po.totalAmount || "0").toLocaleString()}` }
      ]}
      tableColumns={columns}
      tableRows={rows}
      signatures={signatures}
      notes={po.termsAndConditions || ""}
    />
  );
}
