import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";

/**
 * User Management Section for Organization Settings
 * Allows Organization Admins to manage users within their organization
 */

interface UserFormData {
 name: string;
 email: string;
 role: "user" | "organization_admin";
 modulePermissions: string[];
}

const AVAILABLE_MODULES = [
 { id: "projects", label: "Project Management" },
 { id: "hr", label: "Human Resources" },
 { id: "financial", label: "Financial Management" },
 { id: "logistics", label: "Logistics & Procurement" },
 { id: "meal", label: "MEAL" },
 { id: "donor", label: "Donor CRM" },
 { id: "risk", label: "Risk & Compliance" },
 { id: "assets", label: "Assets & Fleet" },
];

export default function UserManagementSection() {
  const { t } = useTranslation();
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingUser, setEditingUser] = useState<any>(null);
 const [formData, setFormData] = useState<UserFormData>({
 name: "",
 email: "",
 role: "user",
 modulePermissions: [],
 });

 // Fetch organization users - organizationId comes from scope headers
 const { data: users = [], refetch } = trpc.ims.userAssignments.listOrganizationUsers.useQuery({});

 // Mutations
 const addUserMutation = trpc.ims.userAssignments.addOrganizationUser.useMutation({
 onSuccess: () => {
 refetch();
 },
 });

 const updateUserMutation = trpc.ims.userAssignments.updateOrganizationUser.useMutation({
 onSuccess: () => {
 refetch();
 },
 });

 const removeUserMutation = trpc.ims.userAssignments.removeOrganizationUser.useMutation({
 onSuccess: () => {
 refetch();
 },
 });

 const handleOpenDialog = (user?: any) => {
 if (user) {
 setEditingUser(user);
 setFormData({
 name: user.name,
 email: user.email,
 role: user.role,
 modulePermissions: user.modulePermissions || [],
 });
 } else {
 setEditingUser(null);
 setFormData({
 name: "",
 email: "",
 role: "user",
 modulePermissions: [],
 });
 }
 setIsDialogOpen(true);
 };

 const handleCloseDialog = () => {
 setIsDialogOpen(false);
 setEditingUser(null);
 setFormData({
 name: "",
 email: "",
 role: "user",
 modulePermissions: [],
 });
 };

 const handleSubmit = async () => {
 // Validate form
 if (!formData.name || !formData.email) {
 toast.error("Please fill in all required fields");
 return;
 }

 // Email validation
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailRegex.test(formData.email)) {
 toast.error("Please enter a valid email address");
 return;
 }

 try {
 if (editingUser) {
 await updateUserMutation.mutateAsync({
 userId: editingUser.id,
 role: formData.role,
 modulePermissions: formData.modulePermissions,
 });
 toast.success(`User ${formData.name} updated successfully`);
 } else {
 await addUserMutation.mutateAsync({
 name: formData.name,
 email: formData.email,
 role: formData.role,
 modulePermissions: formData.modulePermissions,
 });
 toast.success(`User ${formData.name} added successfully`);
 }
 handleCloseDialog();
 } catch (error: any) {
 toast.error(error.message || "Failed to save user");
 }
 };

 const handleDelete = async (userId: number, userName: string) => {
 if (confirm(`Are you sure you want to remove ${userName} from the organization?`)) {
 try {
 await removeUserMutation.mutateAsync({
 userId,
 });
 toast.success(`User ${userName} removed successfully`);
 } catch (error: any) {
 toast.error(error.message || "Failed to remove user");
 }
 }
 };

 const toggleModulePermission = (moduleId: string) => {
 setFormData((prev) => ({
 ...prev,
 modulePermissions: prev.modulePermissions.includes(moduleId)
 ? prev.modulePermissions.filter((id) => id !== moduleId)
 : [...prev.modulePermissions, moduleId],
 }));
 };

 return (
 <div className="space-y-6">
 {/* Header with Add User Button */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold">Organization Users</h3>
 <p className="text-sm text-muted-foreground">
 Manage user access, roles, and module permissions
 </p>
 </div>
 <Button onClick={() => handleOpenDialog()}>
 <Plus className="h-4 w-4 me-2" />
 Add User
 </Button>
 </div>

 {/* Users List */}
 {users.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-12">
 <User className="h-12 w-12 text-muted-foreground mb-4" />
 <p className="text-muted-foreground text-center">
 No users yet. Click "Add User" to invite team members.
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-3">
 {users.map((user) => (
 <Card key={user.id}>
 <CardContent className="flex items-center justify-between p-4">
 <div className="flex items-center gap-4">
 <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
 <User className="h-5 w-5 text-primary" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <p className="font-medium">{user.name}</p>
 {user.role === "organization_admin" && (
 <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1">
 <Shield className="h-3 w-3" />
 Admin
 </span>
 )}
 </div>
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Mail className="h-3 w-3" />
 {user.email}
 </div>
 {user.modulePermissions && user.modulePermissions.length > 0 && (
 <p className="text-xs text-muted-foreground mt-1">
 Access to: {user.modulePermissions.join(", ")}
 </p>
 )}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleOpenDialog(user)}
 >
 <Edit className="h-4 w-4" />
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleDelete(user.id, user.name || "User")}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 {/* Add/Edit User Dialog */}
 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {editingUser ? "Edit User" : "Add New User"}
 </DialogTitle>
 <DialogDescription>
 {editingUser
 ? "Update user information, role, and module permissions"
 : "Add a new user to your organization and assign their role and permissions"}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-6 py-4">
 {/* Name Field */}
 <div className="space-y-2">
 <Label htmlFor="name">
 Full Name <span className="text-red-500">*</span>
 </Label>
 <Input
 id="name"
 placeholder={t.placeholders.enterUserSFullName}
 value={formData.name}
 onChange={(e) =>
 setFormData((prev) => ({ ...prev, name: e.target.value }))
 }
 />
 </div>

 {/* Email Field */}
 <div className="space-y-2">
 <Label htmlFor="email">
 Email Address <span className="text-red-500">*</span>
 </Label>
 <Input
 id="email"
 type="email"
 placeholder={t.placeholders.userExampleCom}
 value={formData.email}
 onChange={(e) =>
 setFormData((prev) => ({ ...prev, email: e.target.value }))
 }
 />
 <p className="text-xs text-muted-foreground">
 User will receive an invitation email to join the organization
 </p>
 </div>

 {/* Role Selection */}
 <div className="space-y-2">
 <Label htmlFor="role">
 Role <span className="text-red-500">*</span>
 </Label>
 <Select
 value={formData.role}
 onValueChange={(value: "user" | "organization_admin") =>
 setFormData((prev) => ({ ...prev, role: value }))
 }
 >
 <SelectTrigger id="role">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="user">User</SelectItem>
 <SelectItem value="organization_admin">
 Organization Admin
 </SelectItem>
 </SelectContent>
 </Select>
 <p className="text-xs text-muted-foreground">
 Organization Admins can manage users and settings
 </p>
 </div>

 {/* Module Permissions */}
 <div className="space-y-3">
 <Label>Module Permissions</Label>
 <p className="text-xs text-muted-foreground">
 Select which modules this user can access
 </p>
 <div className="grid grid-cols-2 gap-3 border rounded-lg p-4">
 {AVAILABLE_MODULES.map((module) => (
 <div key={module.id} className="flex items-center space-x-2">
 <Checkbox
 id={module.id}
 checked={formData.modulePermissions.includes(module.id)}
 onCheckedChange={() => toggleModulePermission(module.id)}
 />
 <label
 htmlFor={module.id}
 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
 >
 {module.label}
 </label>
 </div>
 ))}
 </div>
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={handleCloseDialog}>
 Cancel
 </Button>
 <Button onClick={handleSubmit}>
 {editingUser ? "Update User" : "Add User"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
