import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { format } from "date-fns";

export default function BidOpeningMinutesPrint() {
  const { currentOrganization } = useOrganization();
  const { isRTL } = useLanguage();

  const [, params] = useRoute(
    "/organization/logistics/bid-opening-minutes/:id/print"
  );
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: bom, isLoading } =
    trpc.logistics.bidOpeningMinutes.getById.useQuery(
      { id },
      { enabled: !!id }
    );

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        {isRTL ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="p-8 text-center">
        {isRTL
          ? "لم يتم العثور على محضر فتح العروض"
          : "Bid Opening Minutes not found"}
      </div>
    );
  }

  const prNumber = bom.purchaseRequest?.prNumber || "-";
  const currency = bom.purchaseRequest?.currency || "USD";
  const prTotal = parseFloat(
    String(
      bom.purchaseRequest?.prTotalUsd ||
        bom.purchaseRequest?.prTotal ||
        "0"
    )
  );

  const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "yyyy-MM-dd");
  };

  return (
    <div
      className="print-report"
      style={{
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        fontSize: "9pt",
        lineHeight: "1.3",
        color: "#1a1a1a",
        background: "white",
      }}
    >
      {/* PRINT CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            margin: 0;
          }
          .print-report {
            width: 100%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          background: "#1e3a5f",
          color: "white",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>
              {currentOrganization?.name}
            </div>
            <div style={{ fontSize: "8pt", opacity: 0.8 }}>
              IMS - Procurement
            </div>
          </div>

          <div style={{ textAlign: "right", fontSize: "8pt" }}>
            <div>Bid Opening Minutes</div>
            <div>{formatDate(bom.openingDate)}</div>
          </div>
        </div>

        <div style={{ fontSize: "14pt", fontWeight: 700 }}>
          {bom.minutesNumber || `BOM-${bom.id}`}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "10px 12px" }}>
        {/* METADATA */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div><strong>PR Reference:</strong> {prNumber}</div>
            <div><strong>Status:</strong> {(bom.status || "draft").replace(/_/g, " ")}</div>
            <div><strong>Opening Mode:</strong> {(bom.openingMode || "in_person").replace(/_/g, " ")}</div>
          </div>

          <div style={{ flex: 1 }}>
            <div><strong>Currency:</strong> {currency}</div>
            <div><strong>PR Total:</strong> {currency} {prTotal.toLocaleString()}</div>
            <div><strong>CBA Reference:</strong> {bom.bidAnalysis?.cbaNumber || "-"}</div>
          </div>
        </div>

        {/* OPENING DETAILS */}
        <div className="no-break" style={{ marginBottom: "10px" }}>
          <div style={{ fontWeight: 700, marginBottom: "4px", borderBottom: "2px solid #00a8a8" }}>
            Opening Details
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <div><strong>Date:</strong> {formatDate(bom.openingDate)}</div>
              <div><strong>Time:</strong> {bom.openingTime || "-"}</div>
            </div>

            <div style={{ flex: 1 }}>
              <div><strong>Venue:</strong> {bom.openingVenue || "-"}</div>
              <div><strong>Mode:</strong> {(bom.openingMode || "in_person").replace(/_/g, " ")}</div>
            </div>
          </div>
        </div>

        {/* COMMITTEE */}
        <div className="no-break">
          <div style={{ fontWeight: 700, marginBottom: "4px", borderBottom: "2px solid #00a8a8" }}>
            Bid Opening Committee
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ border: "1px solid #ccc", padding: "4px" }}>#</th>
                <th style={{ border: "1px solid #ccc", padding: "4px" }}>Role</th>
                <th style={{ border: "1px solid #ccc", padding: "4px" }}>Name</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>1</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>Chairperson</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{bom.chairpersonName || "-"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>2</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>Member</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{bom.member1Name || "-"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>3</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>Member</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{bom.member2Name || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div style={{ marginTop: "10px", padding: "8px", border: "1px solid #ccc", background: "#f8fafc", fontSize: "8pt" }}>
          The committee opened bids for PR <strong>{prNumber}</strong> at{" "}
          <strong>{bom.openingVenue}</strong> on{" "}
          <strong>{formatDate(bom.openingDate)}</strong>.
        </div>

        {/* OBSERVATIONS */}
        {bom.openingNotes && (
          <div style={{ marginTop: "10px" }}>
            <strong>Observations:</strong>
            <p style={{ fontSize: "8pt" }}>{bom.openingNotes}</p>
          </div>
        )}

        {/* DECLARATION */}
        <div style={{ marginTop: "12px", border: "2px solid #444", padding: "8px", fontSize: "8pt" }}>
          <strong>Declaration:</strong>
          <p>
            We certify that the above minutes accurately reflect the proceedings of the bid opening session.
          </p>
        </div>
      </div>
    </div>
  );
}