import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);

  const { data: invitation, isLoading, error } = trpc.invitations.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation accepted! Welcome to the organization.");
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to accept invitation");
      setAccepting(false);
    },
  });

  const handleAccept = () => {
    if (!token) return;
    setAccepting(true);
    acceptMutation.mutate({ token });
  };

  // Auto-accept if user is logged in and invitation is valid
  useEffect(() => {
    if (user && invitation && invitation.status === "pending" && !accepting) {
      const expiresAt = new Date(invitation.expiresAt);
      if (expiresAt > new Date()) {
        handleAccept();
      }
    }
  }, [user, invitation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <CardTitle>Invitation Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle>Invitation Cancelled</CardTitle>
            <CardDescription>
              This invitation has been cancelled by the organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresAt = invitation.expiresAt ? new Date(invitation.expiresAt) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;

  if (isExpired || invitation.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation expired{expiresAt ? ` on ${format(expiresAt, "MMMM dd, yyyy")}` : ""}.
              Please contact the organization administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Mail className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{invitation.organizationName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Organization</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {invitation.organizationName}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Your Role</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6 capitalize">
                {invitation.role ? invitation.role.replace(/_/g, " ") : "Member"}
              </p>
            </div>
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Please sign in to accept this invitation
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                Sign In to Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepting || acceptMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Accepting invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Mail className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation.organizationName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Organization</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {invitation.organizationName}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Your Role</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6 capitalize">
              {invitation.role ? invitation.role.replace(/_/g, " ") : "Member"}
            </p>
          </div>
          <div className="text-center pt-4">
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? "Accepting..." : "Accept Invitation"}
            </Button>
            {expiresAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Expires on {format(expiresAt, "MMMM dd, yyyy")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
