import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function AutoNumberingTemplates() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: templates, isLoading } = trpc.logistics.governance.getAutoNumberingTemplates.useQuery({});

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
            <h1 className="text-3xl font-bold">{isRTL ? "الترقيم التلقائي والقوالب" : "Auto-Numbering & Templates"}</h1>
            <p className="text-gray-600">{isRTL ? "إدارة قوالب الترقيم التلقائي" : "Manage auto-numbering templates"}</p>
          </div>
        </div>
        <Button onClick={() => setLocation("/organization/logistics/governance/auto-numbering/new")}>
          <Plus className="w-4 h-4 me-2" />
          {isRTL ? "قالب جديد" : "New Template"}
        </Button>
      </div>

      {/* Active Templates */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "القوالب النشطة" : "Active Templates"}</CardTitle>
          <CardDescription>{isRTL ? "قوالب الترقيم المستخدمة حالياً" : "Currently used numbering templates"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates?.activeTemplates && templates.activeTemplates.length > 0 ? (
              templates.activeTemplates.map((template: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{template.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{isRTL ? "الصيغة" : "Format"}: <code className="bg-gray-100 px-2 py-1 rounded">{template.format}</code></span>
                      <span className="text-sm text-gray-600">|</span>
                      <span className="text-sm text-gray-600">{isRTL ? "المثال" : "Example"}: {template.example}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{template.usageCount} {isRTL ? "استخدام" : "uses"}</Badge>
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد قوالب نشطة" : "No active templates"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Types */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "أنواع المستندات" : "Document Types"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates?.documentTypes && templates.documentTypes.length > 0 ? (
              templates.documentTypes.map((doc: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <p className="font-semibold mb-2">{doc.name}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isRTL ? "البادئة" : "Prefix"}:</span>
                      <span className="font-mono">{doc.prefix}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isRTL ? "الرقم التالي" : "Next Number"}:</span>
                      <span className="font-mono">{doc.nextNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isRTL ? "الحد الأقصى" : "Max"}:</span>
                      <span className="font-mono">{doc.maxNumber}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد أنواع مستندات" : "No document types"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Variables */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "متغيرات القالب" : "Template Variables"}</CardTitle>
          <CardDescription>{isRTL ? "المتغيرات المتاحة للاستخدام في القوالب" : "Available variables for use in templates"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {templates?.variables && templates.variables.length > 0 ? (
              templates.variables.map((variable: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold"><code>{variable.code}</code></p>
                    <p className="text-sm text-gray-600">{variable.description}</p>
                  </div>
                  <span className="text-sm text-gray-600">{variable.example}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد متغيرات" : "No variables"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Examples */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "أمثلة على القوالب" : "Template Examples"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates?.examples && templates.examples.length > 0 ? (
              templates.examples.map((example: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg bg-blue-50">
                  <p className="font-semibold mb-2">{example.name}</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">{isRTL ? "الصيغة" : "Format"}:</span> <code className="bg-white px-2 py-1 rounded">{example.format}</code></p>
                    <p><span className="text-gray-600">{isRTL ? "الناتج" : "Output"}:</span> <code className="bg-white px-2 py-1 rounded">{example.output}</code></p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد أمثلة" : "No examples"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inactive Templates */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "القوالب المعطلة" : "Inactive Templates"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {templates?.inactiveTemplates && templates.inactiveTemplates.length > 0 ? (
              templates.inactiveTemplates.map((template: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg opacity-60">
                  <div>
                    <p className="font-semibold">{template.name}</p>
                    <p className="text-sm text-gray-600">{template.format}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{isRTL ? "معطل" : "Inactive"}</Badge>
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد قوالب معطلة" : "No inactive templates"}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
