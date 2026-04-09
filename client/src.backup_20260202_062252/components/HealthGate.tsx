import { useSystemHealth } from "@/hooks/useSystemHealth";
import { SystemStatusScreen } from "@/components/SystemStatusScreen";

/**
 * Health Gate Component
 * 
 * Blocks app rendering until backend is ready.
 * Displays controlled status screens during health checks.
 * 
 * This is the enterprise-grade health gate that prevents:
 * - Blank screens
 * - Browser errors
 * - "Page unavailable" messages
 * - Silent failures
 */

interface HealthGateProps {
  children: React.ReactNode;
}

export function HealthGate({ children }: HealthGateProps) {
  const { status, retry, errorMessage } = useSystemHealth();

  // Show "System Initializing" screen while checking
  if (status === "checking") {
    return <SystemStatusScreen status="INITIALIZING" />;
  }

  // Show "System Unavailable" screen if backend is down
  if (status === "unavailable") {
    return (
      <SystemStatusScreen
        status="UNAVAILABLE"
        onRetry={retry}
        message={errorMessage}
      />
    );
  }

  // System is ready - render the app
  return <>{children}</>;
}
