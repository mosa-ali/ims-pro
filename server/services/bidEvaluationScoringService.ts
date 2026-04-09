/**
 * Bid Evaluation Scoring Service
 * Non-bypassable governance engine for technical, financial, and final scoring
 * 
 * Governance Rules:
 * - Technical max = 50 (always, with normalization if Samples section enabled)
 * - Financial max = 50 (auto-calculated from lowest price)
 * - Final max = 100 (technical + financial)
 * - Technical threshold = 70% of 50 = 35 (hard stop)
 * - Mandatory hard-stop: if any mandatory criterion = 0 → Not Qualified
 * - Payment Terms: mutually exclusive (only one option can be scored per bidder)
 */

export interface CriterionConfig {
  id: number;
  sectionNumber: number;
  criteriaType: "technical" | "financial";
  name: string;
  maxScore: number;
  isMandatoryHardStop: boolean;
  isConditional: boolean;
  isApplicable: boolean;
  optionGroup?: string | null;
}

export interface ScoringConfig {
  mandatoryCriteria: number[]; // criterionIds that must be > 0
  technicalMaxScore: number; // always 50
  financialMaxScore: number; // always 50
  technicalThreshold: number; // 70% of technicalMaxScore = 35
}

export interface QualificationResult {
  isQualified: boolean;
  reasons: string[];
  technicalScore: number;
  financialScore: number;
  finalScore: number;
  percentage: number;
  /**
   * Governance flag: true when bidder offer price exceeds PR prTotalUsd.
   * Does NOT affect financial score — for review/audit purposes only.
   */
  isAboveBudget: boolean;
}

/**
 * Build scoring config from criteria list
 * Identifies mandatory hard-stop criteria and computes raw technical max
 */
export function buildScoringConfig(criteria: CriterionConfig[]): ScoringConfig & { rawTechnicalMax: number } {
  const mandatoryCriteria = criteria
    .filter(c => c.isMandatoryHardStop && c.criteriaType === "technical" && c.isApplicable)
    .map(c => c.id);

  // Calculate raw technical max from applicable technical criteria
  // For payment terms option group, only count the highest max score option
  const optionGroups = new Map<string, number>();
  let rawTechnicalMax = 0;

  for (const c of criteria) {
    if (c.criteriaType !== "technical" || !c.isApplicable) continue;

    if (c.optionGroup) {
      const currentMax = optionGroups.get(c.optionGroup) || 0;
      if (c.maxScore > currentMax) {
        optionGroups.set(c.optionGroup, c.maxScore);
      }
    } else {
      rawTechnicalMax += c.maxScore;
    }
  }

  // Add the highest option from each group
  optionGroups.forEach((maxVal) => {
    rawTechnicalMax += maxVal;
  });

  return {
    mandatoryCriteria,
    technicalMaxScore: 50,
    financialMaxScore: 50,
    technicalThreshold: 35, // 70% of 50
    rawTechnicalMax,
  };
}

/**
 * Calculate technical score from section scores
 * Applies normalization if rawTechnicalMax !== 50
 * ENFORCED: Never exceeds 50
 */
export function calculateTechnicalScore(
  bidderScores: Map<number, number>,
  criteria: CriterionConfig[],
  rawTechnicalMax: number,
  technicalMaxScore: number = 50
): number {
  let rawTotal = 0;

  // Sum only applicable technical criteria scores
  // For option groups, only the selected (non-zero) option counts
  const optionGroupScores = new Map<string, number>();

  for (const c of criteria) {
    if (c.criteriaType !== "technical" || !c.isApplicable) continue;

    const score = bidderScores.get(c.id) ?? 0;

    if (c.optionGroup) {
      // For option groups, take the non-zero score (only one should be non-zero)
      const currentGroupScore = optionGroupScores.get(c.optionGroup) || 0;
      if (score > 0) {
        optionGroupScores.set(c.optionGroup, Math.max(currentGroupScore, score));
      }
    } else {
      rawTotal += Math.max(0, score);
    }
  }

  // Add option group scores
  optionGroupScores.forEach((score) => {
    rawTotal += score;
  });

  // Normalize if raw max differs from 50
  if (rawTechnicalMax > 0 && rawTechnicalMax !== technicalMaxScore) {
    const normalized = (rawTotal / rawTechnicalMax) * technicalMaxScore;
    return Math.min(Math.round(normalized * 100) / 100, technicalMaxScore);
  }

  // Clamp to max
  return Math.min(Math.round(rawTotal * 100) / 100, technicalMaxScore);
}

/**
 * Check if bidder passes mandatory criteria
 * HARD-STOP: If any mandatory criterion = 0, bidder fails
 */
export function checkMandatoryCompliance(
  bidderScores: Map<number, number>,
  mandatoryCriteria: number[]
): { passed: boolean; failedCriteria: number[] } {
  const failedCriteria: number[] = [];

  for (const criterionId of mandatoryCriteria) {
    const score = bidderScores.get(criterionId) ?? 0;
    if (score === 0) {
      failedCriteria.push(criterionId);
    }
  }

  return {
    passed: failedCriteria.length === 0,
    failedCriteria,
  };
}

/**
 * Calculate financial score based on lowest price
 * Formula: (lowestPrice / bidderPrice) * 50, clamped to max 50
 */
export function calculateFinancialScore(
  bidderPrice: number | undefined,
  lowestPrice: number,
  financialMaxScore: number = 50
): number {
  if (!bidderPrice || bidderPrice <= 0) {
    return 0;
  }

  if (lowestPrice <= 0) {
    return 0;
  }

  const score = (lowestPrice / bidderPrice) * financialMaxScore;
  return Math.min(Math.round(score * 100) / 100, financialMaxScore);
}

/**
 * Calculate final score
 * ENFORCED: Never exceeds 100
 */
export function calculateFinalScore(
  technicalScore: number,
  financialScore: number
): number {
  const total = technicalScore + financialScore;
  return Math.min(Math.round(total * 100) / 100, 100);
}

/**
 * Determine qualification status
 * Single source of truth for qualification logic
 */
export function determineStatus(input: {
  mandatoryPassed: boolean;
  technicalScore: number;
  technicalThreshold: number;
  priceValid: boolean;
  failedMandatoryCriteria: number[];
}): { status: "qualified" | "not_qualified"; reasons: string[] } {
  const reasons: string[] = [];

  if (!input.mandatoryPassed) {
    reasons.push(`Mandatory criteria not met (${input.failedMandatoryCriteria.length} failed)`);
    return { status: "not_qualified", reasons };
  }

  if (input.technicalScore < input.technicalThreshold) {
    reasons.push(
      `Technical score (${input.technicalScore.toFixed(2)}) below minimum threshold (${input.technicalThreshold})`
    );
    return { status: "not_qualified", reasons };
  }

  if (!input.priceValid) {
    reasons.push("Total Offer Price is missing or invalid");
    return { status: "not_qualified", reasons };
  }

  return { status: "qualified", reasons };
}

/**
 * Build disqualification reasons for display
 */
export function buildDisqualificationReasons(
  mandatoryPassed: boolean,
  technicalScore: number,
  technicalThreshold: number,
  priceValid: boolean,
  failedMandatoryCriteria: number[],
  criteriaMap?: Map<number, string>
): string[] {
  const reasons: string[] = [];

  if (!mandatoryPassed && failedMandatoryCriteria.length > 0) {
    if (criteriaMap) {
      const names = failedMandatoryCriteria
        .map(id => criteriaMap.get(id) || `#${id}`)
        .join(", ");
      reasons.push(`Mandatory criteria failed: ${names}`);
    } else {
      reasons.push(
        `Mandatory criteria failed: ${failedMandatoryCriteria.length} criterion/criteria scored 0`
      );
    }
  }

  if (technicalScore < technicalThreshold) {
    reasons.push(
      `Technical score (${technicalScore.toFixed(2)}/50) is below 70% threshold (${technicalThreshold}/50)`
    );
  }

  if (!priceValid) {
    reasons.push("Total Offer Price is missing or invalid (must be > 0)");
  }

  return reasons;
}

/**
 * Validate input score against criterion max
 */
export function validateScore(
  score: number,
  criterionMaxScore: number
): { valid: boolean; error?: string; clampedScore?: number } {
  if (score < 0) {
    return { valid: false, error: "Score cannot be negative" };
  }

  if (score > criterionMaxScore) {
    return {
      valid: false,
      error: `Score cannot exceed ${criterionMaxScore}`,
      clampedScore: criterionMaxScore,
    };
  }

  return { valid: true };
}

/**
 * Governance: Check if bidder offer exceeds PR budget ceiling (prTotalUsd).
 * Returns true when bidderPrice > prTotalUsd AND prTotalUsd > 0.
 * Does NOT affect scoring — flag only.
 */
export function checkBudgetCeiling(
  bidderPrice: number | undefined,
  prTotalUsd: number | undefined
): boolean {
  if (!bidderPrice || bidderPrice <= 0) return false;
  if (!prTotalUsd || prTotalUsd <= 0) return false;
  return bidderPrice > prTotalUsd;
}

/**
 * Validate total offer price
 */
export function validateTotalOfferPrice(
  price: number | undefined
): { valid: boolean; error?: string } {
  if (price === undefined || price === null) {
    return { valid: false, error: "Total Offer Price is required" };
  }

  if (price <= 0) {
    return { valid: false, error: "Total Offer Price must be greater than 0" };
  }

  return { valid: true };
}

/**
 * Validate payment terms: only one option in the group can be scored per bidder
 * Returns the selected option criterion ID or null
 */
export function validatePaymentTerms(
  bidderScores: Map<number, number>,
  paymentTermsCriteria: CriterionConfig[]
): { valid: boolean; selectedId: number | null; error?: string } {
  const scoredOptions = paymentTermsCriteria.filter(c => {
    const score = bidderScores.get(c.id) ?? 0;
    return score > 0;
  });

  if (scoredOptions.length > 1) {
    return {
      valid: false,
      selectedId: null,
      error: "Only one payment terms option can be scored per bidder",
    };
  }

  return {
    valid: true,
    selectedId: scoredOptions.length === 1 ? scoredOptions[0].id : null,
  };
}

/**
 * Compute all scores for a bidder (comprehensive calculation)
 */
export function computeBidderScores(input: {
  bidderScores: Map<number, number>;
  totalOfferPrice: number | undefined;
  lowestPrice: number;
  criteria: CriterionConfig[];
  config: ScoringConfig & { rawTechnicalMax: number };
  /** Optional: PR prTotalUsd for ABOVE_BUDGET_REVIEW_REQUIRED governance flag */
  prTotalUsd?: number;
}): QualificationResult {
  const {
    bidderScores,
    totalOfferPrice,
    lowestPrice,
    criteria,
    config,
    prTotalUsd,
  } = input;

  // Step 1: Calculate technical score (with normalization)
  const technicalScore = calculateTechnicalScore(
    bidderScores,
    criteria,
    config.rawTechnicalMax,
    config.technicalMaxScore
  );

  // Step 2: Check mandatory compliance
  const mandatoryCheck = checkMandatoryCompliance(bidderScores, config.mandatoryCriteria);

  // Step 3: Validate price
  const priceValidation = validateTotalOfferPrice(totalOfferPrice);
  const priceValid = priceValidation.valid;

  // Step 4: Calculate financial score
  const financialScore = calculateFinancialScore(
    totalOfferPrice,
    lowestPrice,
    config.financialMaxScore
  );

  // Step 5: Calculate final score
  const finalScore = calculateFinalScore(technicalScore, financialScore);

  // Step 6: Determine qualification
  const statusResult = determineStatus({
    mandatoryPassed: mandatoryCheck.passed,
    technicalScore,
    technicalThreshold: config.technicalThreshold,
    priceValid,
    failedMandatoryCriteria: mandatoryCheck.failedCriteria,
  });

  // Step 7: Build reasons
  const criteriaNameMap = new Map(criteria.map(c => [c.id, c.name]));
  const reasons = buildDisqualificationReasons(
    mandatoryCheck.passed,
    technicalScore,
    config.technicalThreshold,
    priceValid,
    mandatoryCheck.failedCriteria,
    criteriaNameMap
  );

  // Step 8: Governance flag — does NOT affect score
  const isAboveBudget = checkBudgetCeiling(totalOfferPrice, prTotalUsd);

  return {
    isQualified: statusResult.status === "qualified",
    reasons,
    technicalScore,
    financialScore,
    finalScore,
    percentage: (finalScore / 100) * 100,
    isAboveBudget,
  };
}
