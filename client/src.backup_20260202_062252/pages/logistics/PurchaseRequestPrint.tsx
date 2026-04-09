/**
 * Purchase Request Print View
 * Official document format for printing
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function PurchaseRequestPrint() {
  const { user } = useAuth();
  const [, params] = useRoute("/logistics/purchase-requests/:id/print");
  const id = params?.id ? parseInt(params.id) : 0;
  const organizationId = (user as any)?.organizationId || 1;

  const { data: pr, isLoading } = trpc.logistics.purchaseRequests.getById.useQuery({ id, organizationId }, { enabled: !!id });

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!pr) return <div className="p-8 text-center">Purchase Request not found</div>;

  const lineItems = pr.lineItems || [];
  const columns = ["#", "Description", "Qty", "Unit", "Unit Price", "Total"];
  const rows = lineItems.map((item: any, idx: number) => [
    (idx + 1).toString(),
    item.description,
    item.quantity?.toString() || "0",
    item.unit || "-",
    `${pr.currency} ${parseFloat(item.unitPrice || "0").toLocaleString()}`,
    `${pr.currency} ${parseFloat(item.totalPrice || "0").toLocaleString()}`
  ]);

  const signatures = [
    { role: "Requested By", name: pr.requesterName || "", date: pr.createdAt ? format(new Date(pr.createdAt), "yyyy-MM-dd") : "" },
    { role: "Reviewed By", name: "", date: "" },
    { role: "Approved By", name: "", date: "" }
  ];

  return (
    <OfficialPrintTemplate
      formTitle="Purchase Request"
      formTitleAr="طلب شراء"
      documentNumber={pr.prNumber}
      documentDate={pr.createdAt ? format(new Date(pr.createdAt), "yyyy-MM-dd") : ""}
      metadata={[
        { label: "Project", value: pr.projectTitle || "-" },
        { label: "Category", value: pr.category || "-" },
        { label: "Urgency", value: pr.urgency || "Normal" },
        { label: "Donor", value: pr.donor || "-" },
        { label: "Budget Code", value: pr.budgetCode || "-" },
        { label: "Department", value: pr.department || "-" },
        { label: "Needed By", value: pr.neededByDate ? format(new Date(pr.neededByDate), "yyyy-MM-dd") : "-" },
        { label: "Total Amount", value: `${pr.currency} ${parseFloat(pr.totalAmount || "0").toLocaleString()}` }
      ]}
      tableColumns={columns}
      tableRows={rows}
      signatures={signatures}
      notes={pr.justificationEn || ""}
    />
  );
}
