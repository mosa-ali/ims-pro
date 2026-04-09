import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function OrganizationSwitcher() {
  const { t } = useTranslation();
  const { data: currentOrg, refetch: refetchCurrentOrg } = trpc.organizations.getCurrent.useQuery();
  const { data: userOrgs } = trpc.organizations.getUserOrganizations.useQuery();
  const [isOpen, setIsOpen] = useState(false);

  const switchMutation = trpc.organizations.switchOrganization.useMutation({
    onSuccess: () => {
      toast.success(t('common.orgSwitched'));
      refetchCurrentOrg();
      // Reload the page to refresh all organization-scoped data
      window.location.reload();
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.orgSwitchFailed'));
    },
  });

  const handleSwitch = (organizationId: number) => {
    if (organizationId === currentOrg?.id) {
      setIsOpen(false);
      return;
    }
    switchMutation.mutate({ organizationId });
    setIsOpen(false);
  };

  if (!userOrgs || userOrgs.length <= 1) {
    // Don't show switcher if user belongs to 0 or 1 organization
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentOrg?.name || t('common.selectOrganization')}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>{t('common.switchOrganization')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userOrgs.map((org: any) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="truncate">{org.name}</span>
            {currentOrg?.id === org.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
