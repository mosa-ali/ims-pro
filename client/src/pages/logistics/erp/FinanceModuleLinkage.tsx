import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, DollarSign, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function FinanceModuleLinkage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: finance, isLoading } = trpc.logistics.erpIntegration.getFinanceLinkage.useQuery({});

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/organization/logistics/fleet")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isRTL ? "ربط وحدة المالية" : "Finance Module Linkage"}</h1>
            <p className="text-gray-600">{isRTL ? "ربط البيانات المالية مع نظام ERP" : "Link financial data with ERP system"}</p>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "إجمالي الفواتير" : "Total Invoices"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finance?.totalInvoices || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {isRTL ? "المبلغ الإجمالي" : "Total Amount"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${finance?.totalAmount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "مدفوعة" : "Paid"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${finance?.paidAmount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "معلقة" : "Pending"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${finance?.pendingAmount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "حالة الفواتير" : "Invoice Status"}</CardTitle>
          <CardDescription>{isRTL ? "توزيع الفواتير حسب الحالة" : "Invoice distribution by status"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-semibold">{isRTL ? "مدفوعة" : "Paid"}</span>
              <Badge variant="default">{finance?.paidInvoices || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="font-semibold">{isRTL ? "معلقة الدفع" : "Pending Payment"}</span>
              <Badge variant="secondary">{finance?.pendingInvoices || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="font-semibold">{isRTL ? "متأخرة" : "Overdue"}</span>
              <Badge variant="destructive">{finance?.overdueInvoices || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-semibold">{isRTL ? "مرفوضة" : "Rejected"}</span>
              <Badge variant="secondary">{finance?.rejectedInvoices || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "آخر المعاملات" : "Recent Transactions"}</CardTitle>
          <CardDescription>{isRTL ? "آخر 10 معاملات مالية" : "Last 10 financial transactions"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {finance?.recentTransactions && finance.recentTransactions.length > 0 ? (
              finance.recentTransactions.map((txn: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{txn.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">{new Date(txn.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${txn.amount}</p>
                    <Badge variant={txn.status === "paid" ? "default" : "secondary"}>
                      {txn.status === "paid" ? (isRTL ? "مدفوعة" : "Paid") : (isRTL ? "معلقة" : "Pending")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد معاملات" : "No transactions"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {isRTL ? "المقاييس المالية" : "Financial Metrics"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "متوسط قيمة الفاتورة" : "Avg Invoice Value"}</p>
              <p className="text-2xl font-bold text-blue-600">${finance?.avgInvoiceValue || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "معدل التحصيل" : "Collection Rate"}</p>
              <p className="text-2xl font-bold text-green-600">{finance?.collectionRate || 0}%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "متوسط أيام الدفع" : "Avg Days to Pay"}</p>
              <p className="text-2xl font-bold text-purple-600">{finance?.avgDaysToPay || 0} {isRTL ? "يوم" : "days"}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "المبلغ المتأخر" : "Overdue Amount"}</p>
              <p className="text-2xl font-bold text-orange-600">${finance?.overdueAmount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Reconciliation */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "تسوية الحسابات" : "Account Reconciliation"}</CardTitle>
          <CardDescription>{isRTL ? "حالة تسوية الحسابات مع ERP" : "Account reconciliation status with ERP"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-semibold">{isRTL ? "آخر تسوية" : "Last Reconciliation"}</span>
              <span>{finance?.lastReconciliation ? new Date(finance.lastReconciliation).toLocaleDateString() : "-"}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-semibold">{isRTL ? "الفرق" : "Variance"}</span>
              <Badge variant={finance?.variance === 0 ? "default" : "destructive"}>
                ${finance?.variance || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-semibold">{isRTL ? "حالة التسوية" : "Reconciliation Status"}</span>
              <Badge variant={finance?.reconciliationStatus === "complete" ? "default" : "secondary"}>
                {finance?.reconciliationStatus === "complete" ? (isRTL ? "مكتملة" : "Complete") : (isRTL ? "معلقة" : "Pending")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
