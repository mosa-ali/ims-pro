import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * System Health & Readiness Endpoint
 * 
 * Enterprise-grade health checking following fail-fast principles.
 * Returns 200 OK ONLY when ALL dependencies are healthy.
 * 
 * Checks:
 * - API service is running
 * - Database connection is healthy
 * - Authentication system is initialized
 * - Required environment variables are loaded
 */

export const healthRouter = Router();

interface HealthCheck {
  name: string;
  status: "healthy" | "unhealthy";
  message?: string;
  timestamp: string;
}

interface HealthResponse {
  status: "ready" | "unavailable";
  timestamp: string;
  checks: HealthCheck[];
  version: string;
}

/**
 * Check database connection health
 */
async function checkDatabase(): Promise<HealthCheck> {
  try {
    // Simple query to verify database connectivity
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection is null");
    }
    await db.execute(sql`SELECT 1`);
    
    return {
      name: "database",
      status: "healthy",
      message: "Database connection established",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "database",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Database connection failed",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check authentication system initialization
 */
function checkAuth(): HealthCheck {
  try {
    // Verify critical auth environment variables are loaded
    const requiredAuthVars = [
      "JWT_SECRET",
      "OAUTH_SERVER_URL",
      "VITE_APP_ID",
    ];

    const missing = requiredAuthVars.filter(
      (varName) => !process.env[varName]
    );

    if (missing.length > 0) {
      return {
        name: "authentication",
        status: "unhealthy",
        message: `Missing auth environment variables: ${missing.join(", ")}`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      name: "authentication",
      status: "healthy",
      message: "Authentication system initialized",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "authentication",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Auth check failed",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check required environment variables
 */
function checkEnvironment(): HealthCheck {
  try {
    const requiredVars = [
      "DATABASE_URL",
      "JWT_SECRET",
      "OAUTH_SERVER_URL",
      "VITE_APP_ID",
      "OWNER_OPEN_ID",
    ];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      return {
        name: "environment",
        status: "unhealthy",
        message: `Missing required environment variables: ${missing.join(", ")}`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      name: "environment",
      status: "healthy",
      message: "All required environment variables loaded",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "environment",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Environment check failed",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * GET /health/ready
 * 
 * Returns 200 OK only when ALL checks pass.
 * Returns 503 Service Unavailable if any check fails.
 */
healthRouter.get("/ready", async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  
  try {
    // Run all health checks
    const checks: HealthCheck[] = [
      {
        name: "api",
        status: "healthy",
        message: "API service is running",
        timestamp,
      },
      await checkDatabase(),
      checkAuth(),
      checkEnvironment(),
    ];

    // Determine overall status
    const allHealthy = checks.every((check) => check.status === "healthy");
    const status = allHealthy ? "ready" : "unavailable";

    const response: HealthResponse = {
      status,
      timestamp,
      checks,
      version: process.env.npm_package_version || "1.0.0",
    };

    // Return 200 ONLY if all checks pass
    const statusCode = allHealthy ? 200 : 503;
    
    // Log health check results
    if (!allHealthy) {
      console.error("[Health Check] System unavailable:", {
        timestamp,
        failedChecks: checks.filter((c) => c.status === "unhealthy"),
      });
    }

    res.status(statusCode).json(response);
  } catch (error) {
    // Unexpected error during health check
    console.error("[Health Check] Unexpected error:", error);
    
    res.status(503).json({
      status: "unavailable",
      timestamp,
      checks: [
        {
          name: "system",
          status: "unhealthy",
          message: error instanceof Error ? error.message : "Health check failed",
          timestamp,
        },
      ],
      version: process.env.npm_package_version || "1.0.0",
    });
  }
});

/**
 * GET /health/live
 * 
 * Simple liveness probe - returns 200 if the process is running.
 * Does not check dependencies.
 */
healthRouter.get("/live", (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});
