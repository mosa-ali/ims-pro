/**
 * Bank Reconciliation Matching Service
 * 
 * Provides auto-matching and manual matching logic for bank reconciliation
 */

export interface BankTransaction {
  id: number;
  transactionDate: Date;
  amount: number;
  description: string;
  referenceNumber: string | null;
  transactionType: 'debit' | 'credit';
}

export interface GLEntry {
  id: number;
  entryDate: Date;
  amount: number;
  description: string;
  referenceNumber: string | null;
  accountCode: string;
  debitCredit: 'debit' | 'credit';
}

export interface MatchSuggestion {
  bankTransactionId: number;
  glEntryId: number;
  confidence: number; // 0-100
  matchReason: string;
}

/**
 * Auto-match bank transactions with GL entries
 * Returns array of match suggestions with confidence scores
 */
export function autoMatchTransactions(
  bankTransactions: BankTransaction[],
  glEntries: GLEntry[]
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];

  for (const bankTx of bankTransactions) {
    for (const glEntry of glEntries) {
      const match = calculateMatchScore(bankTx, glEntry);
      
      if (match.confidence >= 70) {
        suggestions.push({
          bankTransactionId: bankTx.id,
          glEntryId: glEntry.id,
          confidence: match.confidence,
          matchReason: match.reason,
        });
      }
    }
  }

  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence);

  // Remove duplicate matches (keep highest confidence)
  const uniqueSuggestions: MatchSuggestion[] = [];
  const matchedBankTxIds = new Set<number>();
  const matchedGLEntryIds = new Set<number>();

  for (const suggestion of suggestions) {
    if (
      !matchedBankTxIds.has(suggestion.bankTransactionId) &&
      !matchedGLEntryIds.has(suggestion.glEntryId)
    ) {
      uniqueSuggestions.push(suggestion);
      matchedBankTxIds.add(suggestion.bankTransactionId);
      matchedGLEntryIds.add(suggestion.glEntryId);
    }
  }

  return uniqueSuggestions;
}

/**
 * Calculate match score between bank transaction and GL entry
 */
function calculateMatchScore(
  bankTx: BankTransaction,
  glEntry: GLEntry
): { confidence: number; reason: string } {
  let confidence = 0;
  const reasons: string[] = [];

  // 1. Amount match (40 points)
  if (Math.abs(bankTx.amount - glEntry.amount) < 0.01) {
    confidence += 40;
    reasons.push('Exact amount match');
  } else if (Math.abs(bankTx.amount - glEntry.amount) < bankTx.amount * 0.01) {
    // Within 1% tolerance
    confidence += 30;
    reasons.push('Amount match within 1% tolerance');
  }

  // 2. Transaction type match (20 points)
  if (bankTx.transactionType === glEntry.debitCredit) {
    confidence += 20;
    reasons.push('Transaction type match');
  }

  // 3. Reference number match (30 points)
  if (
    bankTx.referenceNumber &&
    glEntry.referenceNumber &&
    bankTx.referenceNumber.toLowerCase() === glEntry.referenceNumber.toLowerCase()
  ) {
    confidence += 30;
    reasons.push('Reference number match');
  } else if (
    bankTx.referenceNumber &&
    glEntry.referenceNumber &&
    (bankTx.referenceNumber.toLowerCase().includes(glEntry.referenceNumber.toLowerCase()) ||
      glEntry.referenceNumber.toLowerCase().includes(bankTx.referenceNumber.toLowerCase()))
  ) {
    confidence += 15;
    reasons.push('Partial reference number match');
  }

  // 4. Date proximity (10 points)
  const dateDiff = Math.abs(
    bankTx.transactionDate.getTime() - glEntry.entryDate.getTime()
  );
  const daysDiff = dateDiff / (1000 * 60 * 60 * 24);

  if (daysDiff === 0) {
    confidence += 10;
    reasons.push('Same date');
  } else if (daysDiff <= 3) {
    confidence += 7;
    reasons.push('Within 3 days');
  } else if (daysDiff <= 7) {
    confidence += 5;
    reasons.push('Within 7 days');
  }

  // 5. Description similarity (bonus points, max 10)
  const descSimilarity = calculateDescriptionSimilarity(
    bankTx.description,
    glEntry.description
  );
  if (descSimilarity > 0.7) {
    confidence += 10;
    reasons.push('High description similarity');
  } else if (descSimilarity > 0.5) {
    confidence += 5;
    reasons.push('Moderate description similarity');
  }

  return {
    confidence: Math.min(confidence, 100),
    reason: reasons.join(', '),
  };
}

/**
 * Calculate similarity between two description strings
 * Returns value between 0 and 1
 */
function calculateDescriptionSimilarity(desc1: string, desc2: string): number {
  if (!desc1 || !desc2) return 0;

  const words1 = desc1.toLowerCase().split(/\s+/);
  const words2 = desc2.toLowerCase().split(/\s+/);

  const commonWords = words1.filter((word) => words2.includes(word));

  return (commonWords.length * 2) / (words1.length + words2.length);
}

/**
 * Validate manual match between bank transaction and GL entry
 * Returns validation result with warnings if applicable
 */
export function validateManualMatch(
  bankTx: BankTransaction,
  glEntry: GLEntry
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check amount difference
  const amountDiff = Math.abs(bankTx.amount - glEntry.amount);
  if (amountDiff > 0.01) {
    warnings.push(
      `Amount mismatch: Bank ${bankTx.amount} vs GL ${glEntry.amount} (diff: ${amountDiff.toFixed(2)})`
    );
  }

  // Check transaction type
  if (bankTx.transactionType !== glEntry.debitCredit) {
    warnings.push(
      `Transaction type mismatch: Bank ${bankTx.transactionType} vs GL ${glEntry.debitCredit}`
    );
  }

  // Check date difference
  const dateDiff = Math.abs(
    bankTx.transactionDate.getTime() - glEntry.entryDate.getTime()
  );
  const daysDiff = dateDiff / (1000 * 60 * 60 * 24);

  if (daysDiff > 30) {
    warnings.push(
      `Large date difference: ${Math.round(daysDiff)} days between transactions`
    );
  }

  // Always allow manual match, but return warnings
  return {
    valid: true,
    warnings,
  };
}
