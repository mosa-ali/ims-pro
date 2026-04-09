import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Plus, Edit2, Zap, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function WorkflowAutomation() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: workflows, isLoading } = trpc.logistics.governance.getWorkflowAutomation.useQuery({});

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
            <h1 className="text-3xl font-bold">{isRTL ? "أتمتة سير العمل" : "Workflow Automation"}</h1>
            <p className="text-gray-600">{isRTL ? "إنشاء وإدارة سير العمل التلقائي" : "Create and manage automated workflows"}</p>
          </div>
        </div>
        <Button onClick={() => setLocation("/organization/logistics/governance/workflow/new")}>
          <Plus className="w-4 h-4 me-2" />
          {isRTL ? "سير عمل جديد" : "New Workflow"}
        </Button>
      </div>

      {/* Workflow Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "إجمالي سير العمل" : "Total Workflows"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows?.totalWorkflows || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "نشطة" : "Active"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{workflows?.activeWorkflows || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "التنفيذات اليوم" : "Executions Today"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{workflows?.executionsToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "معدل النجاح" : "Success Rate"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{workflows?.successRate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {isRTL ? "سير العمل النشط" : "Active Workflows"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflows?.activeWorkflowsList && workflows.activeWorkflowsList.length > 0 ? (
              workflows.activeWorkflowsList.map((workflow: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{workflow.name}</p>
                    <p className="text-sm text-gray-600">{workflow.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-600">{isRTL ? "المشغل" : "Trigger"}: {workflow.trigger}</span>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-600">{workflow.executionCount} {isRTL ? "تنفيذ" : "executions"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{isRTL ? "نشط" : "Active"}</Badge>
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد سير عمل نشطة" : "No active workflows"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Templates */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "قوالب سير العمل" : "Workflow Templates"}</CardTitle>
          <CardDescription>{isRTL ? "قوالب جاهزة للاستخدام" : "Ready-to-use templates"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows?.templates && workflows.templates.length > 0 ? (
              workflows.templates.map((template: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <p className="font-semibold mb-2">{template.name}</p>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="space-y-1 text-xs mb-3">
                    {template.steps && template.steps.map((step: string, sidx: number) => (
                      <div key={sidx} className="flex items-center gap-2">
                        <span className="text-blue-600">→</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    {isRTL ? "استخدام" : "Use"}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد قوالب" : "No templates"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "قواعد الأتمتة" : "Automation Rules"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflows?.automationRules && workflows.automationRules.length > 0 ? (
              workflows.automationRules.map((rule: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{rule.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{isRTL ? "الشرط" : "Condition"}: {rule.condition}</p>
                      <p className="text-sm text-gray-600">{isRTL ? "الإجراء" : "Action"}: {rule.action}</p>
                    </div>
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? (isRTL ? "مفعل" : "Enabled") : (isRTL ? "معطل" : "Disabled")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد قواعد" : "No rules"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {isRTL ? "سجل التنفيذ" : "Execution History"}
          </CardTitle>
          <CardDescription>{isRTL ? "آخر 20 تنفيذ" : "Last 20 executions"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {workflows?.executionHistory && workflows.executionHistory.length > 0 ? (
              workflows.executionHistory.map((execution: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-semibold">{execution.workflowName}</p>
                    <p className="text-gray-600">{new Date(execution.timestamp).toLocaleString()}</p>
                  </div>
                  <Badge variant={execution.status === "success" ? "default" : execution.status === "pending" ? "secondary" : "destructive"}>
                    {execution.status === "success" ? (isRTL ? "نجح" : "Success") :
                     execution.status === "pending" ? (isRTL ? "معلق" : "Pending") :
                     (isRTL ? "فشل" : "Failed")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد تنفيذات" : "No executions"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مقاييس الأداء" : "Performance Metrics"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "متوسط الوقت" : "Avg Time"}</p>
              <p className="text-2xl font-bold text-green-600">{workflows?.avgExecutionTime || 0}ms</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "أسرع تنفيذ" : "Fastest"}</p>
              <p className="text-2xl font-bold text-blue-600">{workflows?.fastestExecution || 0}ms</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "أبطأ تنفيذ" : "Slowest"}</p>
              <p className="text-2xl font-bold text-orange-600">{workflows?.slowestExecution || 0}ms</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "معدل الأخطاء" : "Error Rate"}</p>
              <p className="text-2xl font-bold text-red-600">{workflows?.errorRate || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
