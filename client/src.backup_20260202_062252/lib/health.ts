/**
 * Health check utility for frontend readiness gate
 */

export interface HealthStatus {
  status: "READY" | "NOT_READY";
  services: {
    api: boolean;
    database: boolean;
    auth: boolean;
    env: boolean;
  };
  timestamp: string;
  reason?: string;
}

export async function checkBackendReady(): Promise<HealthStatus> {
  try {
    const res = await fetch("/health/ready", {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.reason || "Backend not ready");
    }

    return await res.json();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to connect to backend"
    );
  }
}
