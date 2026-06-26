import { trpc } from "@/lib/trpc";
// json-patch removed: superjson handles date serialization correctly.
// The json-patch was breaking React Query structural sharing with tRPC + superjson,
// causing project data to be undefined/corrupted on the client side.

import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
// Legacy react-i18next removed — all translations use inline pattern via @/i18n/useTranslation
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { OperatingUnitProvider } from "@/contexts/OperatingUnitContext";
import { DeletedRecordsProvider } from "@/contexts/DeletedRecordsContext";
import { HealthGate } from "@/components/HealthGate";
import "./index.css";
import 'leaflet/dist/leaflet.css';


const queryClient = new QueryClient({
 defaultOptions: {
 queries: {
 // Foundation data caching strategy:
 // - User profile, roles, permissions: Cache forever (only invalidate on logout/role change)
 // - Organization context, OU list: Cache for 5 minutes (relatively stable)
 // - Other data: Default behavior (refetch on mount)
 staleTime: 1000 * 60 * 5, // 5 minutes default
 gcTime: 1000 * 60 * 30, // 30 minutes in cache (formerly cacheTime)
 refetchOnWindowFocus: false, // Don't refetch on tab focus
 refetchOnMount: false, // Don't refetch on component mount if data exists
 refetchOnReconnect: false, // Don't refetch on network reconnect
 retry: 1, // Only retry once on failure
 },
 },
});

// Prevent infinite refresh loops by not invalidating queries on organization changes
// Organization context manages its own state without triggering global invalidations

const redirectToLoginIfUnauthorized = (error: unknown) => {
 if (!(error instanceof TRPCClientError)) return;
 if (typeof window === "undefined") return;

 const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

 if (!isUnauthorized) return;

 window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
 if (event.type === "updated" && event.action.type === "error") {
 const error = event.query.state.error;
 redirectToLoginIfUnauthorized(error);
 // Auth errors are expected and handled by redirect above — do not log them as errors
 const isAuthError = error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG;
 if (!isAuthError) {
 console.error("[API Query Error]", error);
 }
 }
});

queryClient.getMutationCache().subscribe(event => {
 if (event.type === "updated" && event.action.type === "error") {
 const error = event.mutation.state.error;
 redirectToLoginIfUnauthorized(error);
 // Auth errors are expected and handled by redirect above — do not log them as errors
 const isAuthError = error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG;
 if (!isAuthError) {
 console.error("[API Mutation Error]", error);
 }
 }
});

const trpcClient = trpc.createClient({
 links: [
 httpBatchLink({
 url: "/api/trpc",
 transformer: superjson,
 fetch(input, init) {
 // Inject scope headers for data isolation
 // Note: Headers are read from localStorage but should be stable during request
 // to avoid triggering infinite re-fetches
 const headers = new Headers(init?.headers);
 
 // Only add org/ou headers if they exist
 // These are set by OrganizationContext and OperatingUnitContext
 const orgId = localStorage.getItem('pms_current_org');
 if (orgId) {
 headers.set('X-Organization-ID', orgId);
 }
 
 // Get current operating unit for the CURRENT organization
 // OU keys follow pattern: current_operating_unit_{userId}_{orgId}
 let ouId: string | null = null;
 if (orgId) {
 const ouKeys = Object.keys(localStorage).filter(k => 
 k.startsWith('current_operating_unit_') && k.endsWith('_' + orgId)
 );
 if (ouKeys.length > 0) {
 ouId = localStorage.getItem(ouKeys[0]);
 if (ouId) {
 headers.set('X-Operating-Unit-ID', ouId);
 }
 }
 }

 return globalThis.fetch(input, {
 ...(init ?? {}),
 credentials: "include",
 headers,
 });
 },
 }),
 ],
});

createRoot(document.getElementById("root")!).render(
 <LanguageProvider>
 <HealthGate>
 <trpc.Provider client={trpcClient} queryClient={queryClient}>
 <QueryClientProvider client={queryClient}>
 <OrganizationProvider>
 <OperatingUnitProvider>
 <DeletedRecordsProvider>
 <App />
 </DeletedRecordsProvider>
 </OperatingUnitProvider>
 </OrganizationProvider>
 </QueryClientProvider>
 </trpc.Provider>
 </HealthGate>
 </LanguageProvider>
);
