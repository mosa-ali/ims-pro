import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, UserX } from "lucide-react";

type OrgRole = "org_admin" | "program_manager" | "finance_manager" | "meal_officer" | "case_worker" | "viewer";

const roleLabels: Record<OrgRole, string> = {
  org_admin: "Organization Admin",
  program_manager: "Program Manager",
  finance_manager: "Finance Manager",
  meal_officer: "MEAL Officer",
  case_worker: "Case Worker",
  viewer: "Viewer",
};

export default function UserManagement() {
  const { user } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "viewer" as OrgRole,
  });
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "viewer" as OrgRole,
  });

  const organizationId = user?.currentOrganizationId;
  
  const { data: users, isLoading, refetch } = trpc.userManagement.list.useQuery(
    { organizationId: organizationId || undefined },
    { enabled: !!organizationId && user?.role === 'admin' }
  );

  const inviteMutation = trpc.userManagement.invite.useMutation({
    onSuccess: () => {
      toast.success("User invited successfully");
      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "viewer" });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to invite user");
    },
  });

  const updateMutation = trpc.userManagement.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setEditingUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const removeFromOrgMutation = trpc.userManagement.removeFromOrg.useMutation({
    onSuccess: () => {
      toast.success("User removed from organization");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove user");
    },
  });

  const handleInvite = () => {
    if (!organizationId) return;
    inviteMutation.mutate({
      email: inviteForm.email,
      organizationId,
      role: inviteForm.role,
    });
  };

  const handleUpdate = (userId: number) => {
    if (!organizationId) return;
    updateMutation.mutate({
      userId,
      organizationId,
      role: editForm.role,
      name: editForm.name,
      email: editForm.email,
    });
  };

  const handleRemoveFromOrg = () => {
    if (!organizationId || !userToDelete) return;
    removeFromOrgMutation.mutate({
      userId: userToDelete,
      organizationId,
    });
  };

  const startEdit = (user: any) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: "", email: "", role: "viewer" });
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You need administrator privileges to access user management.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage users and their roles within your organization
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Users</CardTitle>
            <CardDescription>
              View and manage users in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found. Invite users to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        {editingUser === u.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          u.name || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser === u.id ? (
                          <Input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          u.email || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser === u.id ? (
                          <Select
                            value={editForm.role}
                            onValueChange={(value) => setEditForm({ ...editForm, role: value as OrgRole })}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(roleLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{roleLabels[u.role as OrgRole]}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'admin' ? 'default' : 'outline'}>
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingUser === u.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(u.id)}
                              disabled={updateMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setUserToDelete(u.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Invite User Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as OrgRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending || !inviteForm.email}>
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove User Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User from Organization?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the user's access to this organization. They will no longer be able to view or manage organization data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveFromOrg}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
