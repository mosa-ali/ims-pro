import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, FileText, Download } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function AuditTrailCompliance() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: audit, isLoading } = trpc.logistics.governance.getAuditTrail.useQuery({});

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
            <h1 className="text-3xl font-bold">{isRTL ? "سجل التدقيق والامتثال" : "Audit Trail & Compliance"}</h1>
            <p className="text-gray-600">{isRTL ? "تتبع جميع التغييرات والأنشطة" : "Track all changes and activities"}</p>
          </div>
        </div>
      </div>

      {/* Audit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "إجمالي الأحداث" : "Total Events"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit?.totalEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "اليوم" : "Today"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{audit?.todayEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "التغييرات" : "Changes"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{audit?.changeCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "الأخطاء" : "Errors"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{audit?.errorCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isRTL ? "آخر أحداث التدقيق" : "Recent Audit Events"}
          </CardTitle>
          <CardDescription>{isRTL ? "آخر 50 حدث" : "Last 50 events"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {audit?.recentEvents && audit.recentEvents.length > 0 ? (
              audit.recentEvents.map((event: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-semibold">{event.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600">{event.user}</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <Badge variant={event.type === "create" ? "default" : event.type === "update" ? "secondary" : "destructive"}>
                    {event.type === "create" ? (isRTL ? "إنشاء" : "Create") :
                     event.type === "update" ? (isRTL ? "تحديث" : "Update") :
                     (isRTL ? "حذف" : "Delete")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد أحداث" : "No events"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity by Type */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "النشاط حسب النوع" : "Activity by Type"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {audit?.activityByType && audit.activityByType.length > 0 ? (
              audit.activityByType.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-semibold">{activity.type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(activity.count / (audit?.totalEvents || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{activity.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "نشاط المستخدمين" : "User Activity"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {audit?.userActivity && audit.userActivity.length > 0 ? (
              audit.userActivity.map((user: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{user.eventCount} {isRTL ? "حدث" : "events"}</p>
                    <Badge variant="secondary">{user.lastActivity}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "حالة الامتثال" : "Compliance Status"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{isRTL ? "معايير الامتثال" : "Compliance Standards"}</p>
              <div className="space-y-2">
                {audit?.complianceStandards && audit.complianceStandards.length > 0 ? (
                  audit.complianceStandards.map((standard: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{standard.name}</span>
                      <Badge variant={standard.compliant ? "default" : "destructive"}>
                        {standard.compliant ? (isRTL ? "متوافق" : "Compliant") : (isRTL ? "غير متوافق" : "Non-Compliant")}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm">{isRTL ? "لا توجد معايير" : "No standards"}</p>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{isRTL ? "التقارير المتاحة" : "Available Reports"}</p>
              <div className="space-y-2">
                {audit?.availableReports && audit.availableReports.length > 0 ? (
                  audit.availableReports.map((report: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{report.name}</span>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm">{isRTL ? "لا توجد تقارير" : "No reports"}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "الاحتفاظ بالبيانات" : "Data Retention"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-semibold">{isRTL ? "فترة الاحتفاظ" : "Retention Period"}</span>
              <span>{audit?.retentionPeriod || "90 days"}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-semibold">{isRTL ? "السجلات المحفوظة" : "Archived Records"}</span>
              <span>{audit?.archivedRecords || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-semibold">{isRTL ? "آخر تنظيف" : "Last Cleanup"}</span>
              <span>{audit?.lastCleanup ? new Date(audit.lastCleanup).toLocaleDateString() : "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
