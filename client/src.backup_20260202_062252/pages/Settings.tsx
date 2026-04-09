import { useLocation } from "wouter";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Shield, 
  List, 
  Mail, 
  Palette, 
  RefreshCw, 
  Settings as SettingsIcon,
  Globe,
  ChevronRight
} from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();

  const settingsSections = [
    {
      icon: Users,
      title: "User Management",
      description: "Manage system users and assign roles",
      path: "/settings/users",
      adminOnly: true,
    },
    {
      icon: Shield,
      title: "Roles & Permissions",
      description: "Define what each role can access and edit",
      path: "/settings/roles",
      adminOnly: true,
    },
    {
      icon: List,
      title: "Option Sets / Lookups",
      description: "Manage dropdown values used across the system",
      path: "/settings/options",
      adminOnly: true,
    },
    {
      icon: Globe,
      title: "Language & Localization",
      description: "Switch between Arabic and English interface",
      path: "/settings/language",
      adminOnly: false,
    },
    {
      icon: Mail,
      title: "Email & Notifications",
      description: "Control system notifications and templates",
      path: "/settings/notifications",
      adminOnly: true,
    },
    {
      icon: Palette,
      title: "Logo & Branding",
      description: "Customize system branding and appearance",
      path: "/settings/branding",
      adminOnly: true,
    },

    {
      icon: RefreshCw,
      title: "System Publish & Sync",
      description: "Control publishing and data synchronization",
      path: "/settings/sync",
      adminOnly: true,
    },
    {
      icon: SettingsIcon,
      title: "Administrator Access",
      description: "Advanced system controls and maintenance",
      path: "/settings/admin",
      adminOnly: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Application settings and preferences
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.path}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  // For now, show toast for unimplemented sections
                  if (section.path === "/settings/language") {
                    setLocation(section.path);
                  } else {
                    // toast.info("Coming soon");
                    setLocation(section.path);
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{section.title}</CardTitle>
                        {section.adminOnly && (
                          <span className="text-xs text-muted-foreground">Admin only</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
