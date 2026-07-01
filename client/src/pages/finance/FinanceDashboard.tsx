import { Suspense } from "react";
import { Loader2 } from "lucide-react";

/**
 * Finance Dashboard Page - Wrapper for the dashboard components
 * Handles loading and error states
 */
export default function FinanceDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading Finance Dashboard...</p>
          </div>
        </div>
      }
    >
      <div className="flex h-screen bg-surface overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="text-center py-12">
                <h1 className="text-4xl font-black text-primary mb-4">
                  Executive Financial Intelligence Dashboard
                </h1>
                <p className="text-lg text-muted-foreground">
                  Real-time financial insights and project analysis
                </p>
              </div>

              {/* Placeholder for dashboard content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-primary mb-4">
                    Dashboard Loading...
                  </h2>
                  <p className="text-muted-foreground">
                    The finance dashboard components are being loaded. Please wait.
                  </p>
                </div>
                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-primary mb-4">
                    Quick Stats
                  </h3>
                  <p className="text-muted-foreground">
                    Financial metrics will appear here.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </Suspense>
  );
}
