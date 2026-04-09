import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Edit, Trash2, User, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/useTranslation";

interface BeneficiariesTabProps {
  projectId: number;
}

export default function BeneficiariesTab({ projectId }: BeneficiariesTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state for multi-step registration
  const [formData, setFormData] = useState({
    // Step 1: Basic Demographics
    fullName: "",
    fullNameAr: "",
    gender: "",
    dateOfBirth: "",
    age: "",
    nationalId: "",
    campId: "",
    governorate: "",
    district: "",
    community: "",
    displacementStatus: "",
    
    // Step 2: Household Composition
    householdSize: "",
    adultMales: "",
    adultFemales: "",
    boys: "",
    girls: "",
    isHeadOfHousehold: false,
    vulnerabilityCategories: [] as string[],
    
    // Step 3: Service Enrollment (handled separately after beneficiary creation)
    
    // Step 4: Verification & Consent
    consentGiven: false,
    dataCollectorName: "",
    registrationDate: new Date().toISOString().split('T')[0],
  });

  const { data: beneficiaries, refetch } = trpc.beneficiaries.listByProject.useQuery(
    { projectId },
    { enabled: !!user?.organizationId }
  );

  const createMutation = trpc.beneficiaries.create.useMutation({
    onSuccess: () => {
      toast.success(t.messages.success.created);
      setShowAddDialog(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(t.messages.error.createFailed);
    },
  });

  const deleteMutation = trpc.beneficiaries.delete.useMutation({
    onSuccess: () => {
      toast.success(t.messages.success.deleted);
      refetch();
    },
    onError: (error: any) => {
      toast.error(t.messages.error.deleteFailed);
    },
  });

  const resetForm = () => {
    setFormData({
      fullName: "",
      fullNameAr: "",
      gender: "",
      dateOfBirth: "",
      age: "",
      nationalId: "",
      campId: "",
      governorate: "",
      district: "",
      community: "",
      displacementStatus: "",
      householdSize: "",
      adultMales: "",
      adultFemales: "",
      boys: "",
      girls: "",
      isHeadOfHousehold: false,
      vulnerabilityCategories: [],
      consentGiven: false,
      dataCollectorName: "",
      registrationDate: new Date().toISOString().split('T')[0],
    });
    setCurrentStep(1);
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.fullName || !formData.gender) {
        toast.error(t.messages.error.fillRequiredFields);
        return;
      }
    }
    if (currentStep === 4) {
      if (!formData.consentGiven) {
        toast.error(t.messages.error.consentRequired);
        return;
      }
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    createMutation.mutate({
      fullName: formData.fullName,
      fullNameAr: formData.fullNameAr || undefined,
      gender: formData.gender as "male" | "female" | "other",
      dateOfBirth: formData.dateOfBirth || undefined,
      age: formData.age ? parseInt(formData.age) : undefined,
      nationalId: formData.nationalId || undefined,
      campId: formData.campId || undefined,
      governorate: formData.governorate || undefined,
      district: formData.district || undefined,
      community: formData.community || undefined,
      displacementStatus: formData.displacementStatus as "idp" | "host" | "returnee" | undefined,
      householdSize: formData.householdSize ? parseInt(formData.householdSize) : undefined,
      adultMales: formData.adultMales ? parseInt(formData.adultMales) : undefined,
      adultFemales: formData.adultFemales ? parseInt(formData.adultFemales) : undefined,
      boys: formData.boys ? parseInt(formData.boys) : undefined,
      girls: formData.girls ? parseInt(formData.girls) : undefined,
      isHeadOfHousehold: formData.isHeadOfHousehold,
      vulnerabilityCategories: JSON.stringify(formData.vulnerabilityCategories),
      consentGiven: formData.consentGiven,
      dataCollectorName: formData.dataCollectorName || undefined,
      registrationDate: formData.registrationDate || undefined,
    });
  };

  const filteredBeneficiaries = beneficiaries?.filter((b: any) =>
    b.beneficiary.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.beneficiary.beneficiaryId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t.projectDetail.beneficiariesPageTitle}</h2>
          <p className="text-muted-foreground">
            {t.projectDetail.beneficiariesPageSubtitle}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.projectDetail.registerBeneficiary}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.projectDetail.searchBeneficiaries}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Beneficiaries List */}
      <div className="grid gap-4">
        {filteredBeneficiaries?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t.projectDetail.noBeneficiariesFound}</h3>
              <p className="text-muted-foreground text-center mb-4">
                {t.projectDetail.startRegisteringBeneficiary}
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.projectDetail.registerBeneficiary}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredBeneficiaries?.map((item: any) => {
            const b = item.beneficiary;
            return (
              <Card key={b.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{b.fullName}</h3>
                        <Badge variant="outline">{b.beneficiaryId}</Badge>
                        {b.gender && (
                          <Badge variant="secondary">
                            {b.gender === "male" ? t.projectDetail.genderMale : b.gender === "female" ? t.projectDetail.genderFemale : t.projectDetail.genderOther}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {b.age && (
                          <div>
                            <span className="text-muted-foreground">{t.projectDetail.age}:</span> {b.age}
                          </div>
                        )}
                        {b.governorate && (
                          <div>
                            <span className="text-muted-foreground">{t.projectDetail.governorate}:</span> {b.governorate}
                          </div>
                        )}
                        {b.district && (
                          <div>
                            <span className="text-muted-foreground">{t.projectDetail.district}:</span> {b.district}
                          </div>
                        )}
                        {b.displacementStatus && (
                          <div>
                            <span className="text-muted-foreground">{t.common.status}:</span>{" "}
                            {b.displacementStatus.toUpperCase()}
                          </div>
                        )}
                      </div>

                      {b.householdSize && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t.projectDetail.householdSize}:</span> {b.householdSize} {t.projectDetail.members}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t.messages.confirm.delete)) {
                            deleteMutation.mutate({ id: b.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Multi-Step Registration Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.projectDetail.registerNewBeneficiary}</DialogTitle>
            <DialogDescription>
              {t.projectDetail.step} {currentStep} {t.projectDetail.of} 4: {
                currentStep === 1 ? t.projectDetail.basicDemographics :
                currentStep === 2 ? t.projectDetail.householdComposition :
                currentStep === 3 ? t.projectDetail.serviceEnrollment :
                t.projectDetail.verificationConsent
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Basic Demographics */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">{t.projectDetail.fullName} *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder={t.projectDetail.enterFullName}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullNameAr">{t.projectDetail.fullNameAr}</Label>
                    <Input
                      id="fullNameAr"
                      value={formData.fullNameAr}
                      onChange={(e) => setFormData({ ...formData, fullNameAr: e.target.value })}
                      placeholder="الاسم الكامل"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="gender">{t.projectDetail.gender} *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.projectDetail.selectGender} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t.projectDetail.genderMale}</SelectItem>
                        <SelectItem value="female">{t.projectDetail.genderFemale}</SelectItem>
                        <SelectItem value="other">{t.projectDetail.genderOther}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">{t.projectDetail.dateOfBirth}</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">{t.projectDetail.age}</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder={t.projectDetail.age}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nationalId">{t.projectDetail.nationalId}</Label>
                    <Input
                      id="nationalId"
                      value={formData.nationalId}
                      onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      placeholder={t.projectDetail.nationalIdNumber}
                    />
                  </div>
                  <div>
                    <Label htmlFor="campId">{t.projectDetail.campId}</Label>
                    <Input
                      id="campId"
                      value={formData.campId}
                      onChange={(e) => setFormData({ ...formData, campId: e.target.value })}
                      placeholder={t.projectDetail.campId}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="governorate">{t.projectDetail.governorate}</Label>
                    <Input
                      id="governorate"
                      value={formData.governorate}
                      onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                      placeholder={t.projectDetail.governorate}
                    />
                  </div>
                  <div>
                    <Label htmlFor="district">{t.projectDetail.district}</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder={t.projectDetail.district}
                    />
                  </div>
                  <div>
                    <Label htmlFor="community">{t.projectDetail.community}</Label>
                    <Input
                      id="community"
                      value={formData.community}
                      onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                      placeholder={t.projectDetail.community}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="displacementStatus">{t.projectDetail.displacementStatus}</Label>
                  <Select value={formData.displacementStatus} onValueChange={(value) => setFormData({ ...formData, displacementStatus: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.projectDetail.selectStatus} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idp">{t.projectDetail.idp}</SelectItem>
                      <SelectItem value="host">{t.projectDetail.hostCommunity}</SelectItem>
                      <SelectItem value="returnee">{t.projectDetail.returnee}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Household Composition */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="householdSize">{t.projectDetail.householdSize}</Label>
                  <Input
                    id="householdSize"
                    type="number"
                    value={formData.householdSize}
                    onChange={(e) => setFormData({ ...formData, householdSize: e.target.value })}
                    placeholder={t.projectDetail.totalHouseholdMembers}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adultMales">{t.projectDetail.adultMales}</Label>
                    <Input
                      id="adultMales"
                      type="number"
                      value={formData.adultMales}
                      onChange={(e) => setFormData({ ...formData, adultMales: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adultFemales">{t.projectDetail.adultFemales}</Label>
                    <Input
                      id="adultFemales"
                      type="number"
                      value={formData.adultFemales}
                      onChange={(e) => setFormData({ ...formData, adultFemales: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="boys">{t.projectDetail.boys}</Label>
                    <Input
                      id="boys"
                      type="number"
                      value={formData.boys}
                      onChange={(e) => setFormData({ ...formData, boys: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="girls">{t.projectDetail.girls}</Label>
                    <Input
                      id="girls"
                      type="number"
                      value={formData.girls}
                      onChange={(e) => setFormData({ ...formData, girls: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isHeadOfHousehold"
                    checked={formData.isHeadOfHousehold}
                    onCheckedChange={(checked) => setFormData({ ...formData, isHeadOfHousehold: checked as boolean })}
                  />
                  <Label htmlFor="isHeadOfHousehold">{t.projectDetail.isHeadOfHousehold}</Label>
                </div>

                <div>
                  <Label>{t.projectDetail.vulnerabilityCategories}</Label>
                  <div className="space-y-2 mt-2">
                    {["disability", "chronic_illness", "single_headed_hh", "elderly", "pregnant_lactating"].map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={formData.vulnerabilityCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                vulnerabilityCategories: [...formData.vulnerabilityCategories, category]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                vulnerabilityCategories: formData.vulnerabilityCategories.filter(c => c !== category)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={category} className="capitalize">
                          {category.replace(/_/g, " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Service Enrollment */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {t.projectDetail.serviceEnrollmentMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Verification & Consent */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dataCollectorName">{t.projectDetail.dataCollectorName}</Label>
                  <Input
                    id="dataCollectorName"
                    value={formData.dataCollectorName}
                    onChange={(e) => setFormData({ ...formData, dataCollectorName: e.target.value })}
                    placeholder={t.projectDetail.dataCollectorPlaceholder}
                  />
                </div>

                <div>
                  <Label htmlFor="registrationDate">{t.projectDetail.registrationDate}</Label>
                  <Input
                    id="registrationDate"
                    type="date"
                    value={formData.registrationDate}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                  />
                </div>

                <div className="border p-4 rounded-lg space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consentGiven"
                      checked={formData.consentGiven}
                      onCheckedChange={(checked) => setFormData({ ...formData, consentGiven: checked as boolean })}
                    />
                    <div>
                      <Label htmlFor="consentGiven" className="font-semibold">
                        {t.projectDetail.consentTitle} *
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.projectDetail.consentText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t.common.back}
              </Button>
              <Button
                onClick={handleNext}
                disabled={createMutation.isPending}
              >
                {currentStep === 4 ? (
                  createMutation.isPending ? t.projectDetail.registering : t.projectDetail.registerBeneficiary
                ) : (
                  <>
                    {t.common.next}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
