import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  // Scope isolation (extracted from request headers)
  organizationId: number | null;
  operatingUnitId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Extract scope from request headers (sent by frontend context)
  const orgIdHeader = opts.req.headers['x-organization-id'];
  const ouIdHeader = opts.req.headers['x-operating-unit-id'];
  
  const organizationId = orgIdHeader ? parseInt(String(orgIdHeader), 10) : null;
  const operatingUnitId = ouIdHeader ? parseInt(String(ouIdHeader), 10) : null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    organizationId,
    operatingUnitId,
  };
}
