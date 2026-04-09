import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Eye,
  GitBranch,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

export default function EmailTemplateVersions() {
  const { user } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  // Form state for new version
  const [versionForm, setVersionForm] = useState({
    name: "",
    nameAr: "",
    subject: "",
    subjectAr: "",
    bodyHtml: "",
    bodyHtmlAr: "",
    changeDescription: "",
    changeDescriptionAr: "",
  });

  // Form state for A/B test
  const [testForm, setTestForm] = useState({
    testName: "",
    testNameAr: "",
    testDescription: "",
    testDescriptionAr: "",
    versionAId: "",
    versionBId: "",
    trafficSplitPercentage: 50,
  });

  // Get templates for organization
  const { data: templates } = trpc.emailTemplate.list.useQuery(
    { organizationId: selectedOrg || 0 },
    { enabled: !!selectedOrg }
  );

  // Get versions for selected template
  const { data: versions, isLoading: versionsLoading, refetch: refetchVersions } = trpc.emailTemplateVersion.getVersions.useQuery(
    { templateId: selectedTemplate || 0, organizationId: selectedOrg || 0 },
    { enabled: !!selectedTemplate && !!selectedOrg }
  );

  // Get A/B tests
  const { data: abTests, isLoading: testsLoading, refetch: refetchTests } = trpc.emailTemplateVersion.getABTests.useQuery(
    { templateId: selectedTemplate || 0, organizationId: selectedOrg || 0 },
    { enabled: !!selectedTemplate && !!selectedOrg }
  );

  // Mutations
  const createVersionMutation = trpc.emailTemplateVersion.createVersion.useMutation({
    onSuccess: () => {
      toast.success("Template version created successfully");
      resetVersionForm();
      refetchVersions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create version");
    },
  });

  const publishMutation = trpc.emailTemplateVersion.publishVersion.useMutation({
    onSuccess: () => {
      toast.success("Version published successfully");
      refetchVersions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish version");
    },
  });

  const rollbackMutation = trpc.emailTemplateVersion.rollback.useMutation({
    onSuccess: () => {
      toast.success("Version rolled back successfully");
      refetchVersions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to rollback version");
    },
  });

  const deleteVersionMutation = trpc.emailTemplateVersion.deleteVersion.useMutation({
    onSuccess: () => {
      toast.success("Version deleted successfully");
      refetchVersions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete version");
    },
  });

  const createABTestMutation = trpc.emailTemplateVersion.createABTest.useMutation({
    onSuccess: () => {
      toast.success("A/B test created successfully");
      resetTestForm();
      refetchTests();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create A/B test");
    },
  });

  const startABTestMutation = trpc.emailTemplateVersion.startABTest.useMutation({
    onSuccess: () => {
      toast.success("A/B test started successfully");
      refetchTests();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start A/B test");
    },
  });

  const resetVersionForm = () => {
    setVersionForm({
      name: "",
      nameAr: "",
      subject: "",
      subjectAr: "",
      bodyHtml: "",
      bodyHtmlAr: "",
      changeDescription: "",
      changeDescriptionAr: "",
    });
    setIsCreatingVersion(false);
  };

  const resetTestForm = () => {
    setTestForm({
      testName: "",
      testNameAr: "",
      testDescription: "",
      testDescriptionAr: "",
      versionAId: "",
      versionBId: "",
      trafficSplitPercentage: 50,
    });
    setIsCreatingTest(false);
  };

  const handleCreateVersion = async () => {
    if (!selectedTemplate || !selectedOrg) {
      toast.error("Please select a template");
      return;
    }

    if (!versionForm.name || !versionForm.subject || !versionForm.bodyHtml) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createVersionMutation.mutateAsync({
        templateId: selectedTemplate,
        organizationId: selectedOrg,
        ...versionForm,
      });
    } catch (error) {
      console.error("Error creating version:", error);
    }
  };

  const handlePublish = (versionId: number) => {
    if (!selectedOrg) return;
    publishMutation.mutate({ versionId, organizationId: selectedOrg });
  };

  const handleRollback = (versionId: number) => {
    if (!selectedOrg) return;
    if (confirm("Are you sure you want to rollback to this version?")) {
      rollbackMutation.mutate({ versionId, organizationId: selectedOrg });
    }
  };

  const handleDeleteVersion = (versionId: number) => {
    if (!selectedOrg) return;
    if (confirm("Are you sure you want to delete this version?")) {
      deleteVersionMutation.mutate({ versionId, organizationId: selectedOrg });
    }
  };

  const handleCreateABTest = async () => {
    if (!selectedTemplate || !selectedOrg) {
      toast.error("Please select a template");
      return;
    }

    if (!testForm.testName || !testForm.versionAId || !testForm.versionBId) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createABTestMutation.mutateAsync({
        templateId: selectedTemplate,
        organizationId: selectedOrg,
        versionAId: parseInt(testForm.versionAId),
        versionBId: parseInt(testForm.versionBId),
        ...testForm,
      });
    } catch (error) {
      console.error("Error creating A/B test:", error);
    }
  };

  const handleStartABTest = (testId: number) => {
    if (!selectedOrg) return;
    startABTestMutation.mutate({ testId, organizationId: selectedOrg });
  };

  if (!user?.organizationIds || user.organizationIds.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-muted-foreground">No organizations available</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Template Version Control</h1>
        <p className="text-muted-foreground">Manage template versions and run A/B tests</p>
      </div>

      {/* Organization & Template Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <Label>Organization</Label>
          <Select value={selectedOrg?.toString() || ""} onValueChange={(val) => setSelectedOrg(parseInt(val))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an organization" />
            </SelectTrigger>
            <SelectContent>
              {user.organizationIds.map((orgId) => (
                <SelectItem key={orgId} value={orgId.toString()}>
                  Organization {orgId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrg && (
          <div>
            <Label>Template</Label>
            <Select value={selectedTemplate?.toString() || ""} onValueChange={(val) => setSelectedTemplate(parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedTemplate && selectedOrg && (
        <Tabs defaultValue="versions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="versions">
              <GitBranch className="w-4 h-4 mr-2" />
              Versions
            </TabsTrigger>
            <TabsTrigger value="ab-tests">
              <BarChart3 className="w-4 h-4 mr-2" />
              A/B Tests
            </TabsTrigger>
          </TabsList>

          {/* Versions Tab */}
          <TabsContent value="versions" className="space-y-6">
            {/* Create Version Form */}
            {isCreatingVersion && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Version</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name (English)</Label>
                      <Input
                        value={versionForm.name}
                        onChange={(e) => setVersionForm({ ...versionForm, name: e.target.value })}
                        placeholder="Version name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Name (Arabic)</Label>
                      <Input
                        value={versionForm.nameAr}
                        onChange={(e) => setVersionForm({ ...versionForm, nameAr: e.target.value })}
                        placeholder="اسم الإصدار"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subject (English)</Label>
                      <Input
                        value={versionForm.subject}
                        onChange={(e) => setVersionForm({ ...versionForm, subject: e.target.value })}
                        placeholder="Email subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject (Arabic)</Label>
                      <Input
                        value={versionForm.subjectAr}
                        onChange={(e) => setVersionForm({ ...versionForm, subjectAr: e.target.value })}
                        placeholder="موضوع البريد الإلكتروني"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Body HTML (English)</Label>
                    <Textarea
                      value={versionForm.bodyHtml}
                      onChange={(e) => setVersionForm({ ...versionForm, bodyHtml: e.target.value })}
                      placeholder="<html>...</html>"
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Body HTML (Arabic)</Label>
                    <Textarea
                      value={versionForm.bodyHtmlAr}
                      onChange={(e) => setVersionForm({ ...versionForm, bodyHtmlAr: e.target.value })}
                      placeholder="<html>...</html>"
                      rows={6}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Change Description (English)</Label>
                      <Textarea
                        value={versionForm.changeDescription}
                        onChange={(e) => setVersionForm({ ...versionForm, changeDescription: e.target.value })}
                        placeholder="What changed in this version?"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Change Description (Arabic)</Label>
                      <Textarea
                        value={versionForm.changeDescriptionAr}
                        onChange={(e) => setVersionForm({ ...versionForm, changeDescriptionAr: e.target.value })}
                        placeholder="ما الذي تغير في هذا الإصدار؟"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateVersion} disabled={createVersionMutation.isPending}>
                      {createVersionMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Version
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetVersionForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Versions List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Template Versions</CardTitle>
                  <CardDescription>Manage and publish template versions</CardDescription>
                </div>
                {!isCreatingVersion && (
                  <Button onClick={() => setIsCreatingVersion(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Version
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {versionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : versions && versions.length > 0 ? (
                  <div className="space-y-4">
                    {versions.map((version) => (
                      <div key={version.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{version.name}</h3>
                              <Badge variant="outline">v{version.versionNumber}</Badge>
                              {version.isPublished ? (
                                <Badge className="bg-green-100 text-green-800">Published</Badge>
                              ) : (
                                <Badge variant="secondary">Draft</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{version.subject}</p>
                            {version.changeDescription && (
                              <p className="text-sm text-muted-foreground mt-1">{version.changeDescription}</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(version.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {version.isPublished && (
                          <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded text-sm text-green-700 dark:text-green-200">
                            <Check className="w-4 h-4 inline mr-2" />
                            Published by {version.publishedBy} on {new Date(version.publishedAt!).toLocaleString()}
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {!version.isPublished && (
                            <Button
                              size="sm"
                              onClick={() => handlePublish(version.id)}
                              disabled={publishMutation.isPending}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Publish
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRollback(version.id)}
                            disabled={rollbackMutation.isPending}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Rollback
                          </Button>
                          {!version.isPublished && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteVersion(version.id)}
                              disabled={deleteVersionMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No versions yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* A/B Tests Tab */}
          <TabsContent value="ab-tests" className="space-y-6">
            {/* Create A/B Test Form */}
            {isCreatingTest && (
              <Card>
                <CardHeader>
                  <CardTitle>Create A/B Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Test Name</Label>
                      <Input
                        value={testForm.testName}
                        onChange={(e) => setTestForm({ ...testForm, testName: e.target.value })}
                        placeholder="Test name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Test Name (Arabic)</Label>
                      <Input
                        value={testForm.testNameAr}
                        onChange={(e) => setTestForm({ ...testForm, testNameAr: e.target.value })}
                        placeholder="اسم الاختبار"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={testForm.testDescription}
                      onChange={(e) => setTestForm({ ...testForm, testDescription: e.target.value })}
                      placeholder="What are you testing?"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Version A</Label>
                      <Select value={testForm.versionAId} onValueChange={(val) => setTestForm({ ...testForm, versionAId: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select version A" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions?.map((v) => (
                            <SelectItem key={v.id} value={v.id.toString()}>
                              v{v.versionNumber} - {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Version B</Label>
                      <Select value={testForm.versionBId} onValueChange={(val) => setTestForm({ ...testForm, versionBId: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select version B" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions?.map((v) => (
                            <SelectItem key={v.id} value={v.id.toString()}>
                              v{v.versionNumber} - {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Traffic Split (%)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={testForm.trafficSplitPercentage}
                      onChange={(e) => setTestForm({ ...testForm, trafficSplitPercentage: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Version A: {testForm.trafficSplitPercentage}% | Version B: {100 - testForm.trafficSplitPercentage}%
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateABTest} disabled={createABTestMutation.isPending}>
                      {createABTestMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Test
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetTestForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* A/B Tests List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>A/B Tests</CardTitle>
                  <CardDescription>Run and manage A/B tests</CardDescription>
                </div>
                {!isCreatingTest && versions && versions.length >= 2 && (
                  <Button onClick={() => setIsCreatingTest(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Test
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {testsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : abTests && abTests.length > 0 ? (
                  <div className="space-y-4">
                    {abTests.map((test) => (
                      <div key={test.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{test.testName}</h3>
                              <Badge
                                variant={
                                  test.status === "running"
                                    ? "default"
                                    : test.status === "completed"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {test.status}
                              </Badge>
                            </div>
                            {test.testDescription && (
                              <p className="text-sm text-muted-foreground mt-1">{test.testDescription}</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-muted p-3 rounded space-y-2">
                          <p className="text-sm font-medium">Traffic Split: {test.trafficSplitPercentage}% / {100 - test.trafficSplitPercentage}%</p>
                          {test.startedAt && (
                            <p className="text-xs text-muted-foreground">
                              Started: {new Date(test.startedAt).toLocaleString()}
                            </p>
                          )}
                          {test.endedAt && (
                            <p className="text-xs text-muted-foreground">
                              Ended: {new Date(test.endedAt).toLocaleString()}
                            </p>
                          )}
                          {test.winnerId && (
                            <p className="text-xs font-medium text-green-600">
                              Winner: Version {test.winnerId} ({test.winnerMetric})
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {test.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => handleStartABTest(test.id)}
                              disabled={startABTestMutation.isPending}
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Start Test
                            </Button>
                          )}
                          {test.status === "running" && (
                            <Button size="sm" variant="outline" disabled>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Running
                            </Button>
                          )}
                          {test.status === "completed" && (
                            <Button size="sm" variant="outline" disabled>
                              <Check className="w-4 h-4 mr-2" />
                              Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {versions && versions.length < 2
                      ? "Create at least 2 versions to run A/B tests"
                      : "No A/B tests yet"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
