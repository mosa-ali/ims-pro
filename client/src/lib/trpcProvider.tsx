// ============================================================================
// tRPC PROVIDER
// Wraps the app with QueryClient and tRPC provider.
// Must be placed inside AuthProvider / LanguageProvider but outside page routes.
// ============================================================================

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./trpc";

interface TrpcProviderProps {
  children: ReactNode;
}

export function TrpcProvider({ children }: TrpcProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Retry once on failure. Most finance queries are idempotent reads.
            retry: 1,
            // Keep stale data for 2 minutes before refetching in the background.
            staleTime: 2 * 60 * 1000,
            // Cache data for 5 minutes after component unmounts.
            gcTime: 5 * 60 * 1000,
            // Do not refetch on window focus — dashboards control their own refresh.
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClientInstance] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: (import.meta as any).env?.VITE_TRPC_URL ?? "/lib/trpc2",
          // Forward the auth token if present in localStorage.
          headers() {
            const token = localStorage.getItem("pms_auth_token");
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClientInstance} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
