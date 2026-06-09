import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, Plus, Pencil, Trash2, Search, CheckSquare, Square } from "lucide-react";
import RolePermissionTooltip from "@/components/RolePermissionTooltip";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

/**
 * Platform Users Management Page
 * 
 * Full CRUD interface for managing platform administrator accounts
 * - List all platform admins
 * - Add new platform admin
 * - Edit platform admin details
 * - Delete platform admin
 * - Search/filter functionality
 */

interface PlatformUser {
 id: number;
 openId: string;
 name: string | null;
 email: string | null;
 loginMethod: string | null;
 role: string;
 createdAt: Date;
 updatedAt: Date;
 lastSignedIn: Date;
}

export default function PlatformUsersPage() {
  const { t } = useTranslation();
const { direction, isRTL, language } = useLanguage();

 const [searchQuery, setSearchQuery] = useState("");
 const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
 const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
 const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
 const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
 const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
 const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
 const [deletionReason, setDeletionReason] = useState("");
 const [bulkDeletionReason, setBulkDeletionReason] = useState("");

 // Platform roles definition
 const platformRoles = [
 {
 id: 'platform_super_admin',
 name: t.settingsModule.platformSuperAdmin,
 permissions: 12,
 description: 'Full access to all platform functions including user management, organization control, system settings, and security configuration.',
 },
 {
 id: 'platform_admin',
 name: t.settingsModule.platformAdmin,
 permissions: 7,
 description: 'Management access to platform operations including user management, organization oversight, and system monitoring.',
 },
 {
 id: 'platform_auditor',
 name: t.settingsModule.platformAuditor,
 permissions: 5,
 description: 'Read-only access to platform data for audit and compliance purposes.',
 },
 ];

 // Form state
 const [formData, setFormData] = useState({
 name: "",
 email: "",
 authenticationProvider: "email" as "email" | "microsoft365" | "google" | "sso",
 externalIdentityId: "",
 platformRole: "platform_admin",
 });

 // Queries
 const utils = trpc.useUtils();
 const { data: users = [], isLoading } = trpc.ims.platformUsers.list.useQuery();

 // Mutations
 const createMutation = trpc.ims.platformUsers.create.useMutation({
 onSuccess: () => {
 toast.success(t.settingsModule.platformAdminCreatedSuccessfully);
 utils.ims.platformUsers.list.invalidate();
 setIsAddDialogOpen(false);
 resetForm();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateMutation = trpc.ims.platformUsers.update.useMutation({
 onSuccess: () => {
 toast.success(t.settingsModule.platformAdminUpdatedSuccessfully);
 utils.ims.platformUsers.list.invalidate();
 // Invalidate auth.me to refresh current user's session if they updated their own role
 utils.auth.me.invalidate();
 setIsEditDialogOpen(false);
 setSelectedUser(null);
 resetForm();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteMutation = trpc.ims.platformUsers.delete.useMutation({
 onSuccess: () => {
 toast.success(t.settingsModule.platformAdminDeletedSuccessfully);
 utils.ims.platformUsers.list.invalidate();
 setIsDeleteDialogOpen(false);
 setSelectedUser(null);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const bulkDeleteMutation = trpc.ims.platformUsers.bulkDelete.useMutation({
 onSuccess: (data) => {
 const message = `Successfully deleted ${data.deletedCount} of ${data.totalRequested} users`;
 toast.success(message);
 if (data.errors && data.errors.length > 0) {
 toast.error(`Some deletions failed: ${data.errors.join(', ')}`);
 }
 utils.ims.platformUsers.list.invalidate();
 setSelectedUserIds([]);
 setIsBulkDeleteDialogOpen(false);
 },
 onError: (error) => {
 toast.error(error.message);
 setIsBulkDeleteDialogOpen(false);
 },
 });

 // Handlers
 const resetForm = () => {
 setFormData({
 name: "",
 email: "",
 authenticationProvider: "email",
 externalIdentityId: "",
 platformRole: "platform_admin",
 });
 };

 const handleAdd = () => {
 setIsAddDialogOpen(true);
 resetForm();
 };

 const handleEdit = (user: PlatformUser) => {
 setSelectedUser(user);
 setFormData({
 name: user.name || "",
 email: user.email || "",
 authenticationProvider: (user.loginMethod as any) || "email",
 externalIdentityId: "",
 platformRole: user.role || "platform_admin",
 });
 setIsEditDialogOpen(true);
 };

 const handleDelete = (user: PlatformUser) => {
 setSelectedUser(user);
 setIsDeleteDialogOpen(true);
 };

 const handleSubmitAdd = () => {
 if (!formData.name || !formData.email) {
 toast.error(t.settingsModule.pleaseFillInAllRequiredFields);
 return;
 }

 createMutation.mutate({
 name: formData.name,
 email: formData.email,
 authenticationProvider: formData.authenticationProvider,
 externalIdentityId: formData.externalIdentityId || undefined,
 role: formData.platformRole as "platform_super_admin" | "platform_admin" | "platform_auditor",
 });
 };

 const handleSubmitEdit = () => {
 if (!selectedUser) return;

 if (!formData.name || !formData.email) {
 toast.error(t.settingsModule.pleaseFillInAllRequiredFields);
 return;
 }

 updateMutation.mutate({
 id: selectedUser.id,
 name: formData.name,
 email: formData.email,
 role: formData.platformRole as "platform_super_admin" | "platform_admin" | "platform_auditor",
 });
 };

 const handleConfirmDelete = () => {
 if (!selectedUser) return;
 if (!deletionReason.trim()) {
 toast.error(t.settingsModule.deletionReasonIsRequired);
 return;
 }
 deleteMutation.mutate({ id: selectedUser.id, deletionReason });
 setDeletionReason(""); // Reset after deletion
 };

 const handleSelectAll = () => {
 if (selectedUserIds.length === filteredUsers.length) {
 setSelectedUserIds([]);
 } else {
 setSelectedUserIds(filteredUsers.map(u => u.id));
 }
 };

 const handleSelectUser = (userId: number) => {
 setSelectedUserIds(prev => 
 prev.includes(userId) 
 ? prev.filter(id => id !== userId)
 : [...prev, userId]
 );
 };

 const handleBulkDelete = () => {
 setIsBulkDeleteDialogOpen(true);
 };

 const handleConfirmBulkDelete = () => {
 if (!bulkDeletionReason.trim()) {
 toast.error(t.settingsModule.deletionReasonIsRequired);
 return;
 }
 bulkDeleteMutation.mutate({ ids: selectedUserIds, deletionReason: bulkDeletionReason });
 setBulkDeletionReason(""); // Reset after deletion
 };

 // Filter users based on search query
 const filteredUsers = users.filter((user) => {
 const searchLower = searchQuery.toLowerCase();
 return (
 user.name?.toLowerCase().includes(searchLower) ||
 user.email?.toLowerCase().includes(searchLower)
 );
 });

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Page Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <BackButton href="~/platform/settings" iconOnly />
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-gray-900">
 {t.settingsModule.platformUsers}
 </h1>
 <p className="text-sm text-gray-500 mt-1">
 {'Manage who can administer the platform itself'}
 </p>
 </div>
 <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
 {t.settingsModule.mandatory}
 </Badge>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="container py-8">
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="text-lg font-bold">
 {t.settingsModule.platformAdministrators}
 </CardTitle>
 <CardDescription>
 {'Global users who can manage the entire platform'}
 </CardDescription>
 </div>
 <div className="flex items-center gap-2">
 {selectedUserIds.length > 0 && (
 <Button 
 variant="destructive" 
 onClick={handleBulkDelete}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {`Delete Selected (${selectedUserIds.length})`}
 </Button>
 )}
 <Button onClick={handleAdd}>
 <Plus className="w-4 h-4 me-2" />
 {t.settingsModule.addPlatformAdmin}
 </Button>
 </div>
 </div>

 {/* Search Bar */}
 <div className="mt-4 relative">
 <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
 <Input
 type="text"
 placeholder={t.settingsModule.searchByNameOrEmail}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-10"
 />
 </div>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="text-center py-12">
 <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
 <Users className="w-8 h-8 text-slate-600" />
 </div>
 <p className="text-sm text-gray-500">
 {t.settingsModule.loadingPlatformAdmins}
 </p>
 </div>
 ) : filteredUsers.length === 0 ? (
 <div className="text-center py-12">
 <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
 <Users className="w-8 h-8 text-slate-600" />
 </div>
 <h3 className="text-lg font-semibold text-gray-900 mb-2">
 {t.settingsModule.noPlatformAdminsFound}
 </h3>
 <p className="text-sm text-gray-500">
 {searchQuery
 ? (t.settingsModule.tryAdjustingYourSearchQuery)
 : (t.settingsModule.addYourFirstPlatformAdministratorTo)}
 </p>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-12">
 <button
 onClick={handleSelectAll}
 className="p-1 hover:bg-gray-100 rounded"
 >
 {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? (
 <CheckSquare className="w-5 h-5 text-blue-600" />
 ) : (
 <Square className="w-5 h-5 text-gray-400" />
 )}
 </button>
 </TableHead>
 <TableHead>{t.settingsModule.name}</TableHead>
 <TableHead>{t.settingsModule.email}</TableHead>
 <TableHead>{t.settingsModule.role}</TableHead>
 <TableHead>{t.settingsModule.loginMethod}</TableHead>
 <TableHead>{t.settingsModule.created}</TableHead>
 <TableHead>{t.settingsModule.lastSignIn}</TableHead>
 <TableHead className="text-center">{t.settingsModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredUsers.map((user) => (
 <TableRow key={user.id}>
 <TableCell>
 <button
 onClick={() => handleSelectUser(user.id)}
 className="p-1 hover:bg-gray-100 rounded"
 >
 {selectedUserIds.includes(user.id) ? (
 <CheckSquare className="w-5 h-5 text-blue-600" />
 ) : (
 <Square className="w-5 h-5 text-gray-400" />
 )}
 </button>
 </TableCell>
 <TableCell className="font-medium">{user.name || '-'}</TableCell>
 <TableCell>{user.email || '-'}</TableCell>
 <TableCell>
 <RolePermissionTooltip role={user.role || 'platform_admin'}>
 <Badge 
 variant="outline" 
 className={`capitalize cursor-help ${ user.role === 'platform_super_admin' ? 'bg-red-50 text-red-700 border-red-200' : user.role === 'platform_admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200' }`}
 >
 {platformRoles.find(r => r.id === user.role)?.name || user.role || 'Platform Admin'}
 </Badge>
 </RolePermissionTooltip>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="capitalize">
 {user.loginMethod || 'manus'}
 </Badge>
 </TableCell>
 <TableCell className="text-sm text-gray-500">
 {format(new Date(user.createdAt), 'MMM d, yyyy')}
 </TableCell>
 <TableCell className="text-sm text-gray-500">
 {format(new Date(user.lastSignedIn), 'MMM d, yyyy HH:mm')}
 </TableCell>
 <TableCell className="text-end">
 <div className="flex items-center justify-end gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleEdit(user)}
 >
 <Pencil className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(user)}
 className="text-red-600 hover:text-red-700 hover:bg-red-50"
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Add Dialog */}
 <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.settingsModule.addPlatformAdministrator}</DialogTitle>
 <DialogDescription>
 {'Create a new platform administrator account with full system access.'}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label htmlFor="name">{t.settingsModule.name} *</Label>
 <Input
 id="name"
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder={t.settingsModule.enterFullName}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="email">{t.settingsModule.email} *</Label>
 <Input
 id="email"
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 placeholder={t.settingsModule.enterEmailAddress}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="authenticationProvider">{t.settingsModule.authenticationMethod}</Label>
 <Select
 value={formData.authenticationProvider}
 onValueChange={(value: any) => setFormData({ ...formData, authenticationProvider: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.settingsModule.selectAuthenticationMethod} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="email">{t.settingsModule.emailPassword}</SelectItem>
 <SelectItem value="microsoft365">{'Microsoft 365 / Azure AD'}</SelectItem>
 <SelectItem value="google">{'Google OAuth'}</SelectItem>
 <SelectItem value="sso">{t.settingsModule.organizationSsoFuture}</SelectItem>
 </SelectContent>
 </Select>
 <p className="text-xs text-gray-500 mt-1">
 {'Email is the primary unique login identity. Authentication provider mapping is stored in user profile.'}
 </p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="platformRole">{t.settingsModule.platformRole} *</Label>
 <Select
 value={formData.platformRole}
 onValueChange={(value) => setFormData({ ...formData, platformRole: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.settingsModule.selectARole} />
 </SelectTrigger>
 <SelectContent>
 {platformRoles.map((role) => (
 <SelectItem key={role.id} value={role.id}>
 <div className="flex items-center justify-between w-full">
 <span>{role.name}</span>
 <span className="text-xs text-gray-500 ms-2">({role.permissions} {t.settingsModule.permissions})</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {formData.platformRole && (
 <p className="text-xs text-gray-500 mt-1">
 {platformRoles.find(r => r.id === formData.platformRole)?.description}
 </p>
 )}
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
 {t.settingsModule.cancel}
 </Button>
 <Button onClick={handleSubmitAdd} disabled={createMutation.isPending}>
 {createMutation.isPending
 ? (t.settingsModule.creating)
 : (t.settingsModule.createAdmin)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Dialog */}
 <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.settingsModule.editPlatformAdministrator}</DialogTitle>
 <DialogDescription>
 {'Update platform administrator details.'}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label htmlFor="edit-name">{t.settingsModule.name} *</Label>
 <Input
 id="edit-name"
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="edit-email">{t.settingsModule.email} *</Label>
 <Input
 id="edit-email"
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="edit-platformRole">{t.settingsModule.platformRole} *</Label>
 <Select
 value={formData.platformRole}
 onValueChange={(value) => setFormData({ ...formData, platformRole: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.settingsModule.selectARole} />
 </SelectTrigger>
 <SelectContent>
 {platformRoles.map((role) => (
 <SelectItem key={role.id} value={role.id}>
 <div className="flex items-center justify-between w-full">
 <span>{role.name}</span>
 <span className="text-xs text-gray-500 ms-2">({role.permissions} {t.settingsModule.permissions})</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {formData.platformRole && (
 <p className="text-xs text-gray-500 mt-1">
 {platformRoles.find(r => r.id === formData.platformRole)?.description}
 </p>
 )}
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
 {t.settingsModule.cancel}
 </Button>
 <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending}>
 {updateMutation.isPending
 ? (t.settingsModule.saving)
 : (t.settingsModule.saveChanges)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>
 {t.settingsModule.deletePlatformAdministrator}
 </AlertDialogTitle>
 <AlertDialogDescription>
 {`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone and will permanently remove this platform administrator account.`}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <div className="px-6 pb-4">
 <Label htmlFor="deletionReason" className="text-sm font-medium">
 {t.settingsModule.reasonForDeletion}
 </Label>
 <textarea
 id="deletionReason"
 value={deletionReason}
 onChange={(e) => setDeletionReason(e.target.value)}
 placeholder={t.settingsModule.pleaseProvideAReasonForDeleting}
 className={`w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none ${ deletionReason.length > 0 && deletionReason.length < 10 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500' }`}
 rows={3}
 required
 minLength={10}
 />
 {deletionReason.length > 0 && deletionReason.length < 10 && (
 <p className="text-red-500 text-sm mt-1">
 {`Reason must be at least 10 characters (${deletionReason.length}/10)`}
 </p>
 )}
 </div>
 <AlertDialogFooter>
 <AlertDialogCancel>{t.settingsModule.cancel}</AlertDialogCancel>
 <AlertDialogAction
 onClick={handleConfirmDelete}
 className="bg-red-600 hover:bg-red-700"
 disabled={deleteMutation.isPending || deletionReason.length < 10}
 >
 {deleteMutation.isPending
 ? (t.settingsModule.deleting)
 : (t.settingsModule.delete)}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>

 {/* Bulk Delete Confirmation Dialog */}
 <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>
 {t.settingsModule.deleteSelectedUsers}
 </AlertDialogTitle>
 <AlertDialogDescription>
 {`You are about to delete ${selectedUserIds.length} platform administrator${selectedUserIds.length > 1 ? 's' : ''}. This action will move them to the Deleted Records vault where they can be restored later.`}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <div className="px-6 pb-4">
 <Label htmlFor="bulkDeletionReason" className="text-sm font-medium">
 {t.settingsModule.reasonForDeletion}
 </Label>
 <textarea
 id="bulkDeletionReason"
 value={bulkDeletionReason}
 onChange={(e) => setBulkDeletionReason(e.target.value)}
 placeholder={t.settingsModule.pleaseProvideAReasonForDeleting1}
 className={`w-full mt-2 p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none ${ bulkDeletionReason.length > 0 && bulkDeletionReason.length < 10 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500' }`}
 rows={3}
 required
 minLength={10}
 />
 {bulkDeletionReason.length > 0 && bulkDeletionReason.length < 10 && (
 <p className="text-red-500 text-sm mt-1">
 {`Reason must be at least 10 characters (${bulkDeletionReason.length}/10)`}
 </p>
 )}
 </div>
 <AlertDialogFooter>
 <AlertDialogCancel>
 {t.settingsModule.cancel}
 </AlertDialogCancel>
 <AlertDialogAction
 onClick={handleConfirmBulkDelete}
 className="bg-red-600 hover:bg-red-700"
 disabled={bulkDeletionReason.length < 10}
 >
 {`Delete ${selectedUserIds.length} Users`}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 );
}
