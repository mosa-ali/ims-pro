import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Shield, Users, TrendingUp } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Integrated Management System (IMS)</span>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Humanitarian Program Management
              <span className="block text-primary mt-2">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform for managing grants, projects, MEAL frameworks, 
              surveys, and case management for humanitarian and development organizations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary" />}
            title="Multi-Tenant Security"
            description="Complete data isolation between organizations with enterprise-grade security"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-primary" />}
            title="Case Management"
            description="Track protection, PSS, complaints, and referrals with comprehensive workflows"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-primary" />}
            title="MEAL Framework"
            description="Monitor indicators, track evidence, and generate donor-compliant reports"
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8 text-primary" />}
            title="Bilingual Support"
            description="Full English and Arabic support with Right-to-Left (RTL) layout"
          />
        </div>

        {/* Key Capabilities */}
        <div className="mt-24 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Comprehensive Features</h2>
            <p className="text-muted-foreground mt-2">Everything you need to manage humanitarian programs</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Capability title="Grant Management" items={[
              "Proposal tracking",
              "Approval workflows",
              "Document management",
              "Donor reporting"
            ]} />
            <Capability title="Project Management" items={[
              "Project planning",
              "Budget tracking",
              "Timeline management",
              "Team collaboration"
            ]} />
            <Capability title="Financial Management" items={[
              "Budget creation",
              "Expenditure tracking",
              "Variance analysis",
              "Financial forecasting"
            ]} />
            <Capability title="MEAL Framework" items={[
              "Indicator tracking",
              "Evidence collection",
              "Progress monitoring",
              "Impact reporting"
            ]} />
            <Capability title="Survey Tools" items={[
              "Form builder",
              "Data collection",
              "Response analysis",
              "Export capabilities"
            ]} />
            <Capability title="Case Management" items={[
              "Case registration",
              "Referral tracking",
              "Complaint handling",
              "Activity logging"
            ]} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 Integrated Management System (IMS). Built for humanitarian organizations.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg border bg-card">
      <div className="p-3 rounded-full bg-primary/10">
        {icon}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Capability({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-6 rounded-lg border bg-card space-y-3">
      <h3 className="font-semibold text-lg">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
