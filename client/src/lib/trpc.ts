import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";
import { createTRPCClient, httpBatchLink } from "@trpc/client";


export interface ReportGenerateArgs {
  reportId: string;
  fiscalYear?: string;
  periodStart?: string; // 'YYYY-MM-DD' — explicit reporting window (optional)
  periodEnd?: string;   // 'YYYY-MM-DD'
  projectId?: number;
  projectIds?: number[];
  donorId?: number;
  grantId?: number;
  currency?: string;
}

export interface ReportEnvelope<T = any> {
  status: 'ok' | 'not_implemented' | 'error';
  reportId: string;
  category: string;
  data: T | null;
  message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpcClient = createTRPCClient<any>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_URL ?? "/api/trpc",
      headers() {
        const token = localStorage.getItem("pms_auth_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

/**
 * Call any financeDashboard procedure imperatively.
 * Usage:  financeQuery("getKPICards", { fiscalYear, currency })
 */
export function financeQuery(
  procedure: string,
  input: Record<string, unknown> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (trpcClient as any).financeDashboard[procedure].query(input);
}

/**
 * Call any financialReports procedure imperatively.
 * Usage:  reportQuery("getExportHistory", {})
 * Usage:  reportQuery("getExecutiveKPIs", { projectIds: [1, 2] })
 * Maps to financialReportsRouter procedures in finance-router-1.ts
 */
export function reportQuery(
  procedure: string,
  input: Record<string, unknown> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (trpcClient as any).financialReports[procedure].query(input);
}

/**
 * Mutate via financialReports router.
 * Usage:  reportMutate("logGeneratedReport", { reportType, fileName, filePath, format })
 */
export function reportMutate(
  procedure: string,
  input: Record<string, unknown> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (trpcClient as any).financialReports[procedure].mutate(input);
}

/** Generate any report via the single dispatcher on financialReports. */
export function reportGenerate(args: ReportGenerateArgs): Promise<ReportEnvelope> {
  return (trpcClient as any).financialReports.generateReport.query(args);
}

/** One call: fiscal years, projects, grants, donors, operating units, catalogue. */
export function reportFilterMeta(): Promise<any> {
  return (trpcClient as any).financialReports.getFilterMeta.query();
}

/** Real financial intelligence insights for the current scope. */
export function reportIntelligence(args: { projectIds?: number[]; fiscalYear?: string } = {}): Promise<any> {
  return (trpcClient as any).financialReports.getFinancialIntelligence.query(args);
}

export const trpc = createTRPCReact<AppRouter>();