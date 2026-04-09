import { useState, useEffect, useRef } from "react";

/**
 * System Health Hook
 * 
 * Checks backend readiness on application load.
 * Implements session-level caching to prevent repeated health checks during navigation.
 * 
 * Health checks run ONLY on:
 * - Application startup (first mount)
 * - Hard refresh (sessionStorage cleared)
 * - Explicit retry (manual action)
 * 
 * Health checks DO NOT run on:
 * - Route changes
 * - Component remounts during navigation
 * - Subsequent page visits in the same session
 * 
 * Returns:
 * - status: "checking" | "ready" | "unavailable"
 * - retry: Function to manually retry health check
 */

interface HealthResponse {
 status: "ready" | "unavailable";
 timestamp: string;
 checks: Array<{
 name: string;
 status: "healthy" | "unhealthy";
 message?: string;
 }>;
}

const HEALTH_CACHE_KEY = "ims_system_health_status";
const HEALTH_TIMESTAMP_KEY = "ims_system_health_timestamp";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function useSystemHealth() {
 // Check if we have a cached "ready" status from this session
 const getCachedStatus = (): "checking" | "ready" | "unavailable" => {
 try {
 const cachedStatus = sessionStorage.getItem(HEALTH_CACHE_KEY);
 const cachedTimestamp = sessionStorage.getItem(HEALTH_TIMESTAMP_KEY);
 
 if (cachedStatus === "ready" && cachedTimestamp) {
 const timestamp = parseInt(cachedTimestamp, 10);
 const now = Date.now();
 
 // If cache is still valid (within 5 minutes), use it
 if (now - timestamp < CACHE_DURATION_MS) {
 console.log("[Health Check] Using cached ready status, skipping health check");
 return "ready";
 }
 }
 } catch (error) {
 console.warn("[Health Check] Failed to read cache:", error);
 }
 
 return "checking";
 };

 const [status, setStatus] = useState<"checking" | "ready" | "unavailable">(getCachedStatus);
 const [retryCount, setRetryCount] = useState(0);
 const [errorMessage, setErrorMessage] = useState<string | undefined>();
 
 // Use ref to track if we've already run the health check in this component instance
 const hasCheckedRef = useRef(false);

 const cacheReadyStatus = () => {
 try {
 sessionStorage.setItem(HEALTH_CACHE_KEY, "ready");
 sessionStorage.setItem(HEALTH_TIMESTAMP_KEY, Date.now().toString());
 } catch (error) {
 console.warn("[Health Check] Failed to cache status:", error);
 }
 };

 const clearCache = () => {
 try {
 sessionStorage.removeItem(HEALTH_CACHE_KEY);
 sessionStorage.removeItem(HEALTH_TIMESTAMP_KEY);
 } catch (error) {
 console.warn("[Health Check] Failed to clear cache:", error);
 }
 };

 const checkHealth = async () => {
 try {
 const response = await fetch("/health/ready", {
 method: "GET",
 headers: {
 "Content-Type": "application/json",
 },
 });

 if (response.ok) {
 const data: HealthResponse = await response.json();
 
 if (data.status === "ready") {
 setStatus("ready");
 setRetryCount(0);
 setErrorMessage(undefined);
 cacheReadyStatus(); // Cache the ready status
 return true;
 } else {
 // Backend returned 200 but status is not ready
 const unhealthyChecks = data.checks
 .filter((c) => c.status === "unhealthy")
 .map((c) => c.name)
 .join(", ");
 
 setErrorMessage(`System checks failed: ${unhealthyChecks}`);
 setStatus("unavailable");
 clearCache(); // Clear cache on failure
 return false;
 }
 } else {
 // Backend returned error status
 setStatus("unavailable");
 setErrorMessage(`Backend returned ${response.status}: ${response.statusText}`);
 clearCache(); // Clear cache on failure
 return false;
 }
 } catch (error) {
 // Network error or backend not reachable
 setStatus("unavailable");
 setErrorMessage(
 error instanceof Error ? error.message : "Cannot connect to backend"
 );
 clearCache(); // Clear cache on failure
 return false;
 }
 };

 const retry = () => {
 console.log("[Health Check] Manual retry triggered");
 clearCache(); // Clear cache on manual retry
 setStatus("checking");
 setRetryCount(0); // Reset retry count on manual retry
 hasCheckedRef.current = false; // Allow check to run again
 };

 useEffect(() => {
 // If we already have a cached "ready" status, don't run the check
 if (status === "ready") {
 hasCheckedRef.current = true;
 return;
 }

 // If we've already checked in this component instance and we're not retrying, skip
 if (hasCheckedRef.current && status !== "checking") {
 return;
 }

 let timeoutId: NodeJS.Timeout;

 const performHealthCheck = async () => {
 hasCheckedRef.current = true;
 const isHealthy = await checkHealth();

 if (!isHealthy && retryCount < 5) {
 // Exponential backoff: 1s, 2s, 4s, 8s, 16s
 const delay = Math.min(1000 * Math.pow(2, retryCount), 16000);
 
 console.log(
 `[Health Check] Backend unavailable, retrying in ${delay}ms (attempt ${retryCount + 1}/5)`
 );

 timeoutId = setTimeout(() => {
 setRetryCount((prev) => prev + 1);
 hasCheckedRef.current = false; // Allow retry
 }, delay);
 } else if (!isHealthy && retryCount >= 5) {
 // Max retries reached
 console.error("[Health Check] Max retries reached, system unavailable");
 setStatus("unavailable");
 }
 };

 if (status === "checking" && !hasCheckedRef.current) {
 performHealthCheck();
 }

 return () => {
 if (timeoutId) {
 clearTimeout(timeoutId);
 }
 };
 }, [status, retryCount]);

 return {
 status,
 retry,
 errorMessage,
 };
}
