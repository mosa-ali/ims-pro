import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Search, Download, Upload, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface BeneficiariesManagementProps {
  projectId: number;
}

export default function BeneficiariesManagement({ projectId }: BeneficiariesManagementProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sexFilter, setSexFilter] = useState("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<number[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  
  const [formData, setFormData] = useState({
    bnfCode: "",
    fullName: "",
    gender: "",
    age: 0,
    birthDate: "",
    totalFamilyMember: 0,
    phoneNumber: "",
    governorate: "",
    district: "",
    villageSite: "",
    serviceType: "",
    notes: "",
  });

  const { data: beneficiaries = [], isLoading } = trpc.beneficiaries.listByProject.useQuery({ projectId: projectId.toString() });

  const createMutation = trpc.beneficiaries.create.useMutation({
    onSuccess: () => {
      toast.success("Beneficiary registered successfully");
      utils.beneficiaries.listByProject.invalidate();
      setIsRegisterModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to register beneficiary: ${error.message}`);
    },
  });

  const deleteMutation = trpc.beneficiaries.delete.useMutation({
    onSuccess: () => {
      toast.success("Beneficiary deleted successfully");
      utils.beneficiaries.listByProject.invalidate();
      setSelectedBeneficiaries([]);
    },
    onError: (error) => {
      toast.error(`Failed to delete beneficiary: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      bnfCode: "",
      fullName: "",
      gender: "",
      age: 0,
      birthDate: "",
      totalFamilyMember: 0,
      phoneNumber: "",
      governorate: "",
      district: "",
      villageSite: "",
      serviceType: "",
      notes: "",
    });
  };

  const handleRegister = () => {
    if (!formData.fullName || !formData.gender) {
      toast.error("Full name and gender are required");
      return;
    }
    createMutation.mutate({
      projectId: projectId.toString(),
      ...formData,
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
    });
  };

  const handleBulkDelete = () => {
    if (selectedBeneficiaries.length === 0) {
      toast.error("Please select at least one beneficiary");
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedBeneficiaries.length} beneficiar${selectedBeneficiaries.length > 1 ? 'ies' : 'y'}?`)) {
      selectedBeneficiaries.forEach(id => {
        deleteMutation.mutate({ id });
      });
    }
  };

  const toggleBeneficiarySelection = (id: number) => {
    setSelectedBeneficiaries(prev =>
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const exportData = filteredBeneficiaries.map(b => ({
      "BNF Code": b.bnfCode || "",
      "Full Name": b.fullName || "",
      "Gender": b.gender || "",
      "Age": b.age || "",
      "Birth Date": b.birthDate ? new Date(b.birthDate).toLocaleDateString() : "",
      "Family Members": b.totalFamilyMember || 0,
      "Phone": b.phoneNumber || "",
      "Governorate": b.governorate || "",
      "District": b.district || "",
      "Village/Site": b.villageSite || "",
      "Service Type": b.serviceType || "",
      "Notes": b.notes || "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Beneficiaries");
    XLSX.writeFile(wb, `Project_${projectId}_Beneficiaries.xlsx`);
    toast.success("Beneficiaries exported successfully");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of jsonData) {
          try {
            await createMutation.mutateAsync({
              projectId,
              bnfCode: row['BNF Code'] || row['bnfCode'] || '',
              fullName: row['Full Name'] || row['fullName'] || '',
              gender: row['Gender'] || row['gender'] || '',
              age: parseInt(row['Age'] || row['age'] || '0'),
              birthDate: row['Birth Date'] || row['birthDate'] ? new Date(row['Birth Date'] || row['birthDate']) : undefined,
              totalFamilyMember: parseInt(row['Family Members'] || row['totalFamilyMember'] || '0'),
              phoneNumber: row['Phone'] || row['phoneNumber'] || '',
              governorate: row['Governorate'] || row['governorate'] || '',
              district: row['District'] || row['district'] || '',
              villageSite: row['Village/Site'] || row['villageSite'] || '',
              serviceType: row['Service Type'] || row['serviceType'] || '',
              notes: row['Notes'] || row['notes'] || '',
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }
        
        if (successCount > 0) {
          toast.success(`Imported ${successCount} beneficiar${successCount > 1 ? 'ies' : 'y'} successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
          utils.beneficiaries.list.invalidate();
        } else {
          toast.error(`Import failed: ${errorCount} beneficiar${errorCount > 1 ? 'ies' : 'y'} could not be imported`);
        }
      } catch (error) {
        toast.error("Import failed: Invalid file format");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredBeneficiaries = beneficiaries.filter((b: any) => {
    const matchesSearch = b.bnfCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSex = sexFilter === "all" || b.gender === sexFilter;
    const matchesAgeGroup = ageGroupFilter === "all" ||
      (ageGroupFilter === "0-17" && b.age && b.age < 18) ||
      (ageGroupFilter === "18-49" && b.age && b.age >= 18 && b.age < 50) ||
      (ageGroupFilter === "50+" && b.age && b.age >= 50);
    const matchesLocation = locationFilter === "all" || b.governorate === locationFilter;
    const matchesService = serviceFilter === "all" || b.serviceType === serviceFilter;
    return matchesSearch && matchesSex && matchesAgeGroup && matchesLocation && matchesService;
  });

  const uniqueLocations = Array.from(new Set(beneficiaries.map((b: any) => b.governorate).filter(Boolean)));
  const uniqueServices = Array.from(new Set(beneficiaries.map((b: any) => b.serviceType).filter(Boolean)));

  if (isLoading) {
    return <div className="p-8 text-center">Loading beneficiaries...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Beneficiaries Management</h2>
          <p className="text-sm text-muted-foreground">Register and manage project beneficiaries</p>
        </div>
        <div className="flex gap-2">
          {bulkDeleteMode && selectedBeneficiaries.length > 0 && (
            <Button onClick={handleBulkDelete} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedBeneficiaries.length})
            </Button>
          )}
          <Button onClick={() => setBulkDeleteMode(!bulkDeleteMode)} variant="outline" size="sm">
            {bulkDeleteMode ? "Cancel" : "Bulk Delete"}
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <Button onClick={() => setIsRegisterModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Register
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2 p-4 border-b flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search beneficiaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sexFilter} onValueChange={setSexFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sex</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Age Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            <SelectItem value="0-17">0-17 years</SelectItem>
            <SelectItem value="18-49">18-49 years</SelectItem>
            <SelectItem value="50+">50+ years</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {uniqueLocations.map((loc: string) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {uniqueServices.map((service: string) => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Beneficiaries Table */}
      <div className="flex-1 overflow-auto">
        {filteredBeneficiaries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No beneficiaries found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                {bulkDeleteMode && <th className="p-2 text-left">Select</th>}
                <th className="p-2 text-left">BNF Code</th>
                <th className="p-2 text-left">Full Name</th>
                <th className="p-2 text-left">Gender</th>
                <th className="p-2 text-left">Age</th>
                <th className="p-2 text-left">Phone</th>
                <th className="p-2 text-left">Location</th>
                <th className="p-2 text-left">Service Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredBeneficiaries.map((beneficiary: any) => (
                <tr key={beneficiary.id} className="border-b hover:bg-accent/50">
                  {bulkDeleteMode && (
                    <td className="p-2">
                      <Checkbox
                        checked={selectedBeneficiaries.includes(beneficiary.id)}
                        onCheckedChange={() => toggleBeneficiarySelection(beneficiary.id)}
                      />
                    </td>
                  )}
                  <td className="p-2 font-mono text-sm">{beneficiary.bnfCode || "-"}</td>
                  <td className="p-2 font-semibold">{beneficiary.fullName}</td>
                  <td className="p-2">
                    <Badge variant={beneficiary.gender === "Male" ? "default" : "secondary"}>
                      {beneficiary.gender}
                    </Badge>
                  </td>
                  <td className="p-2">{beneficiary.age || "-"}</td>
                  <td className="p-2 text-sm">{beneficiary.phoneNumber || "-"}</td>
                  <td className="p-2 text-sm">{beneficiary.governorate || "-"}</td>
                  <td className="p-2 text-sm">{beneficiary.serviceType || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Register Beneficiary Modal */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Beneficiary</DialogTitle>
            <DialogDescription>Enter beneficiary details for registration</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bnfCode">BNF Code</Label>
                <Input
                  id="bnfCode"
                  value={formData.bnfCode}
                  onChange={(e) => setFormData({ ...formData, bnfCode: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="totalFamilyMember">Total Family Members</Label>
                <Input
                  id="totalFamilyMember"
                  type="number"
                  value={formData.totalFamilyMember}
                  onChange={(e) => setFormData({ ...formData, totalFamilyMember: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+967..."
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="governorate">Governorate</Label>
                <Input
                  id="governorate"
                  value={formData.governorate}
                  onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                  placeholder="Enter governorate"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Enter district"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="villageSite">Village/Site</Label>
                <Input
                  id="villageSite"
                  value={formData.villageSite}
                  onChange={(e) => setFormData({ ...formData, villageSite: e.target.value })}
                  placeholder="Enter village/site"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Input
                id="serviceType"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                placeholder="e.g., Cash Assistance, Food Distribution"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Registering..." : "Register Beneficiary"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
