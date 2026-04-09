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

const redirectToLoginIfUnauthorized = (error: unknown) => {
 if (!(error instanceof TRPCClientError)) return;
 if (typeof window === "undefined") return;

 const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

 if (!isUnauthorized) return;

 window.location.href = '/login';
};

queryClient.getQueryCache().subscribe(event => {
 if (event.type === "updated" && event.action.type === "error") {
 const error = event.query.state.error;
 redirectToLoginIfUnauthorized(error);
 console.error("[API Query Error]", error);
 }
});

queryClient.getMutationCache().subscribe(event => {
 if (event.type === "updated" && event.action.type === "error") {
 const error = event.mutation.state.error;
 redirectToLoginIfUnauthorized(error);
 console.error("[API Mutation Error]", error);
 }
});

const trpcClient = trpc.createClient({
 links: [
 httpBatchLink({
 url: "/api/trpc",
 transformer: superjson,
 fetch(input, init) {
 // Inject scope headers for data isolation
 // Read from localStorage (where OrganizationContext and OperatingUnitContext store values)
 const orgId = localStorage.getItem('pms_current_org');
 
 // Get current operating unit for the CURRENT organization
 // OU keys follow pattern: current_operating_unit_{userId}_{orgId}
 // We must match the key that ends with the current orgId
 let ouId: string | null = null;
 if (orgId) {
 const ouKeys = Object.keys(localStorage).filter(k => 
 k.startsWith('current_operating_unit_') && k.endsWith('_' + orgId)
 );
 if (ouKeys.length > 0) {
 ouId = localStorage.getItem(ouKeys[0]);
 }
 }

 const headers = new Headers(init?.headers);
 if (orgId) {
 headers.set('X-Organization-ID', orgId);
 }
 if (ouId) {
 headers.set('X-Operating-Unit-ID', ouId);
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
