import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Mail, Plus, RefreshCw, X, Copy, Check } from "lucide-react";
import { format } from "date-fns";

const ROLES = [
  { value: "org_admin", label: "Organization Admin", description: "Full access to organization" },
  { value: "program_manager", label: "Program Manager", description: "Manage projects and programs" },
  { value: "finance_manager", label: "Finance Manager", description: "Manage budgets and finances" },
  { value: "meal_officer", label: "MEAL Officer", description: "Monitoring, evaluation, and learning" },
  { value: "case_worker", label: "Case Worker", description: "Manage cases and beneficiaries" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
];

export default function Invitations() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const orgId = parseInt(id || "0");

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: org } = trpc.organizations.getById.useQuery({ id: orgId });
  const { data: invitations, refetch } = trpc.invitations.list.useQuery({ organizationId: orgId });

  const createMutation = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation created successfully");
      const inviteUrl = `${window.location.origin}/invitations/accept/${data.token}`;
      navigator.clipboard.writeText(inviteUrl);
      toast.info("Invitation link copied to clipboard");
      setOpen(false);
      setEmail("");
      setRole("viewer");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create invitation");
    },
  });

  const cancelMutation = trpc.invitations.cancel.useMutation({
    onSuccess: () => {
      toast.success("Invitation cancelled");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel invitation");
    },
  });

  const resendMutation = trpc.invitations.resend.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to resend invitation");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate({
      email,
      organizationId: orgId,
      role: role as any,
    });
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invitations/accept/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    toast.success("Invitation link copied to clipboard");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "default",
      accepted: "secondary",
      expired: "destructive",
      cancelled: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getRoleLabel = (roleValue: string) => {
    return ROLES.find((r) => r.value === roleValue)?.label || roleValue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/organizations/${orgId}/settings`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Invitations</h1>
            <p className="text-muted-foreground">{org?.name}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Invite User to Organization</DialogTitle>
                <DialogDescription>
                  Send an invitation to join {org?.name}. The invitation will expire in 7 days.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="font-medium">{r.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending & Recent Invitations</CardTitle>
          <CardDescription>
            Manage user invitations for this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations && invitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation: any) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getRoleLabel(invitation.role)}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {invitation.invitedByName || "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invitation.expiresAt && !isNaN(new Date(invitation.expiresAt).getTime())
                        ? format(new Date(invitation.expiresAt), "MMM dd, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {invitation.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(invitation.token)}
                          >
                            {copiedToken === invitation.token ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resendMutation.mutate({ invitationId: invitation.id })}
                            disabled={resendMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate({ invitationId: invitation.id })}
                            disabled={cancelMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-muted-foreground">—</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Invitations Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start inviting users to join your organization
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Send First Invitation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
