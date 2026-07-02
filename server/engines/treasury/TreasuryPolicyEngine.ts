import {
  TreasuryPolicy,
  TreasuryPolicyViolation,
  defaultTreasuryPolicy,
} from "./TreasuryTypes";

export class TreasuryPolicyEngine {
  resolvePolicy(policy?: Partial<TreasuryPolicy>): TreasuryPolicy {
    const definedPolicy = Object.fromEntries(
      Object.entries(policy ?? {}).filter(([, value]) => value !== undefined),
    ) as Partial<TreasuryPolicy>;

    return {
      ...defaultTreasuryPolicy,
      ...definedPolicy,
    };
  }

  createViolation(input: {
    policyKey: TreasuryPolicyViolation["policyKey"];
    message: string;
    actualValue: number | string;
    limitValue: number | string;
    severity?: TreasuryPolicyViolation["severity"];
  }): TreasuryPolicyViolation {
    return {
      policyKey: input.policyKey,
      message: input.message,
      actualValue: input.actualValue,
      limitValue: input.limitValue,
      severity: input.severity ?? "warning",
    };
  }
}
