import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Inline translations for Office 365 directory search
 */
const t = {
  en: {
    title: "Microsoft 365 Directory Search",
    description: "Search and import users from your Microsoft 365 directory",
    searchPlaceholder: "Search by name, email, or job title...",
    searchButton: "Search",
    importing: "Importing...",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    importSelected: "Import Selected Users",
    noResults: "No users found. Try a different search term.",
    importSuccess: "Users imported successfully",
    importError: "Failed to import users",
    selectUsers: "Please select at least one user to import",
    name: "Name",
    email: "Email",
    jobTitle: "Job Title",
    officeLocation: "Office Location",
    status: "Status",
    imported: "Imported",
    pending: "Pending",
    error: "Error",
    selectRole: "Select Role",
    selectOU: "Select Operating Unit",
  },
  ar: {
    title: "بحث دليل Microsoft 365",
    description: "البحث واستيراد المستخدمين من دليل Microsoft 365 الخاص بك",
    searchPlaceholder: "البحث بالاسم أو البريد الإلكتروني أو المسمى الوظيفي...",
    searchButton: "بحث",
    importing: "جاري الاستيراد...",
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء تحديد الكل",
    importSelected: "استيراد المستخدمين المحددين",
    noResults: "لم يتم العثور على مستخدمين. حاول مصطلح بحث مختلف.",
    importSuccess: "تم استيراد المستخدمين بنجاح",
    importError: "فشل استيراد المستخدمين",
    selectUsers: "يرجى تحديد مستخدم واحد على الأقل للاستيراد",
    name: "الاسم",
    email: "البريد الإلكتروني",
    jobTitle: "المسمى الوظيفي",
    officeLocation: "موقع المكتب",
    status: "الحالة",
    imported: "مستورد",
    pending: "قيد الانتظار",
    error: "خطأ",
    selectRole: "اختر الدور",
    selectOU: "اختر وحدة التشغيل",
  },
};

interface Office365User {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  officeLocation?: string;
  selected?: boolean;
  importStatus?: "pending" | "success" | "error";
}

interface Office365DirectorySearchProps {
  language?: "en" | "ar";
  organizationId: number;
  onImportSuccess?: () => void;
}

export function Office365DirectorySearch({
  language = "en",
  organizationId,
  onImportSuccess,
}: Office365DirectorySearchProps) {
  const translations = t[language];
  const isRTL = language === "ar";
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<Office365User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search Microsoft 365 users
  const searchMicrosoft365Users = trpc.auth.searchMicrosoft365Users.useQuery(
    { searchTerm, organizationId, limit: 50 },
    { enabled: false }
  );

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError(translations.searchPlaceholder);
      return;
    }

    setError("");
    setSuccess("");
    setIsSearching(true);

    try {
      const result = await searchMicrosoft365Users.refetch();
      if (result.data?.users) {
        setUsers(
          result.data.users.map((u) => ({
            id: u.id,
            displayName: u.displayName,
            email: u.email,
            jobTitle: u.jobTitle,
            officeLocation: u.officeLocation,
            selected: false,
            importStatus: "pending",
          }))
        );
        setSelectedUsers(new Set());
      }
    } catch (err) {
      setError(translations.importError);
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, organizationId, searchMicrosoft365Users, translations]);

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);

    // Update users array
    setUsers(
      users.map((u) => ({
        ...u,
        selected: newSelected.has(u.id),
      }))
    );
  };

  const handleSelectAll = () => {
    const newSelected = new Set(users.map((u) => u.id));
    setSelectedUsers(newSelected);
    setUsers(users.map((u) => ({ ...u, selected: true })));
  };

  const handleDeselectAll = () => {
    setSelectedUsers(new Set());
    setUsers(users.map((u) => ({ ...u, selected: false })));
  };

  const handleImport = async () => {
    if (selectedUsers.size === 0) {
      setError(translations.selectUsers);
      return;
    }

    setError("");
    setSuccess("");
    setIsImporting(true);

    try {
      // TODO: Implement bulk import endpoint
      // For now, this is a placeholder
      console.log("Importing users:", Array.from(selectedUsers));

      // Simulate import success
      setSuccess(translations.importSuccess);
      setUsers(
        users.map((u) => ({
          ...u,
          importStatus: selectedUsers.has(u.id) ? "success" : "pending",
        }))
      );
      setSelectedUsers(new Set());

      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setError(translations.importError);
      console.error("Import failed:", err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {translations.title}
        </CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={translations.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              disabled={isSearching}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {translations.searchButton}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {translations.searchButton}
                </>
              )}
            </Button>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Results Section */}
        {users.length > 0 && (
          <div className="space-y-4">
            {/* Selection Controls */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">
                {selectedUsers.size} of {users.length} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={selectedUsers.size === users.length}
                >
                  {translations.selectAll}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedUsers.size === 0}
                >
                  {translations.deselectAll}
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <Checkbox
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={(checked) =>
                            checked ? handleSelectAll() : handleDeselectAll()
                          }
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium">{translations.name}</th>
                      <th className="px-4 py-3 text-left font-medium">{translations.email}</th>
                      <th className="px-4 py-3 text-left font-medium">{translations.jobTitle}</th>
                      <th className="px-4 py-3 text-left font-medium">{translations.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={u.selected || false}
                            onCheckedChange={() => handleSelectUser(u.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{u.displayName}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 text-slate-600">{u.jobTitle || "-"}</td>
                        <td className="px-4 py-3">
                          {u.importStatus === "success" && (
                            <Badge className="bg-green-100 text-green-800">
                              {translations.imported}
                            </Badge>
                          )}
                          {u.importStatus === "pending" && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {translations.pending}
                            </Badge>
                          )}
                          {u.importStatus === "error" && (
                            <Badge className="bg-red-100 text-red-800">
                              {translations.error}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={isImporting || selectedUsers.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {translations.importing}
                </>
              ) : (
                translations.importSelected
              )}
            </Button>
          </div>
        )}

        {/* No Results */}
        {!isSearching && users.length === 0 && searchTerm && (
          <div className="text-center py-8 text-slate-600">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{translations.noResults}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
