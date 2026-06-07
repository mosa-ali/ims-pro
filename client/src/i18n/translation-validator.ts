// ============================================================================
// TRANSLATION VALIDATION UTILITY
// Phase 5: Enterprise Validation Tool
// Validates all translations for completeness and consistency
// ============================================================================

import { Language, translations as allTranslations, Translations } from './translations-trilingual';

export interface ValidationReport {
  isValid: boolean;
  missingKeys: MissingKeyReport[];
  duplicateKeys: string[];
  emptyValues: EmptyValueReport[];
  invalidPaths: InvalidPathReport[];
  languageComparison: LanguageComparisonReport;
  summary: ValidationSummary;
}

export interface MissingKeyReport {
  language: Language;
  keyPath: string;
  expectedIn: Language[];
}

export interface EmptyValueReport {
  language: Language;
  keyPath: string;
  value: string;
}

export interface InvalidPathReport {
  keyPath: string;
  issue: string;
}

export interface LanguageComparisonReport {
  en: {
    totalKeys: number;
    structure: Record<string, any>;
  };
  ar: {
    totalKeys: number;
    structure: Record<string, any>;
  };
  it: {
    totalKeys: number;
    structure: Record<string, any>;
  };
  structureConsistent: boolean;
}

export interface ValidationSummary {
  allLanguagesHaveKeys: boolean;
  allKeysPopulated: boolean;
  allStructuresConsistent: boolean;
  readyForProduction: boolean;
  totalErrors: number;
  totalWarnings: number;
}

class TranslationValidator {
  private missingKeys: MissingKeyReport[] = [];
  private duplicateKeys: Set<string> = new Set();
  private emptyValues: EmptyValueReport[] = [];
  private invalidPaths: InvalidPathReport[] = [];
  private keyStructures: Record<Language, Set<string>> = { en: new Set(), ar: new Set(), it: new Set() };

  /**
   * Main validation function
   */
  validate(): ValidationReport {
    this.missingKeys = [];
    this.duplicateKeys.clear();
    this.emptyValues = [];
    this.invalidPaths = [];
    this.keyStructures = { en: new Set(), ar: new Set(), it: new Set() };

    // Extract all keys from each language
    const languages: Language[] = ['en', 'ar', 'it'];
    for (const lang of languages) {
      this.extractKeysRecursively(allTranslations[lang], '', lang);
    }

    // Validate consistency across languages
    this.validateKeyConsistency();

    // Validate empty values
    this.validateEmptyValues();

    // Build comparison report
    const languageComparison = this.buildLanguageComparison();

    // Build summary
    const summary = this.buildSummary();

    return {
      isValid: this.missingKeys.length === 0 && this.emptyValues.length === 0 && this.invalidPaths.length === 0,
      missingKeys: this.missingKeys,
      duplicateKeys: Array.from(this.duplicateKeys),
      emptyValues: this.emptyValues,
      invalidPaths: this.invalidPaths,
      languageComparison,
      summary,
    };
  }

  /**
   * Recursively extract all translation keys
   */
  private extractKeysRecursively(obj: any, prefix: string, language: Language): void {
    if (obj === null || obj === undefined) {
      if (prefix) {
        this.invalidPaths.push({
          keyPath: prefix,
          issue: `Null or undefined value in ${language}`,
        });
      }
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const keyPath = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        this.keyStructures[language].add(keyPath);

        // Check for empty strings
        if (value === '') {
          this.emptyValues.push({
            language,
            keyPath,
            value: '',
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        this.extractKeysRecursively(value, keyPath, language);
      }
    }
  }

  /**
   * Validate that all keys exist in all languages
   */
  private validateKeyConsistency(): void {
    const allKeys = new Set<string>();

    // Collect all unique keys
    this.keyStructures.en.forEach((key) => allKeys.add(key));
    this.keyStructures.ar.forEach((key) => allKeys.add(key));
    this.keyStructures.it.forEach((key) => allKeys.add(key));

    // Check each key exists in all languages
    allKeys.forEach((keyPath) => {
      const languages: Language[] = ['en', 'ar', 'it'];
      const missingIn: Language[] = [];

      languages.forEach((lang) => {
        if (!this.keyStructures[lang].has(keyPath)) {
          missingIn.push(lang);
        }
      });

      if (missingIn.length > 0) {
        this.missingKeys.push({
          language: missingIn[0],
          keyPath,
          expectedIn: missingIn,
        });
      }
    });
  }

  /**
   * Validate that no empty strings exist
   */
  private validateEmptyValues(): void {
    // Already done in extractKeysRecursively
  }

  /**
   * Build language comparison report
   */
  private buildLanguageComparison(): LanguageComparisonReport {
    return {
      en: {
        totalKeys: this.keyStructures.en.size,
        structure: this.buildStructureFromKeys(this.keyStructures.en),
      },
      ar: {
        totalKeys: this.keyStructures.ar.size,
        structure: this.buildStructureFromKeys(this.keyStructures.ar),
      },
      it: {
        totalKeys: this.keyStructures.it.size,
        structure: this.buildStructureFromKeys(this.keyStructures.it),
      },
      structureConsistent:
        this.keyStructures.en.size === this.keyStructures.ar.size && this.keyStructures.ar.size === this.keyStructures.it.size,
    };
  }

  /**
   * Build structure from keys
   */
  private buildStructureFromKeys(keys: Set<string>): Record<string, any> {
    const structure: Record<string, any> = {};

    keys.forEach((keyPath) => {
      const parts = keyPath.split('.');
      let current = structure;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = true;
    });

    return structure;
  }

  /**
   * Build validation summary
   */
  private buildSummary(): ValidationSummary {
    const enCount = this.keyStructures.en.size;
    const arCount = this.keyStructures.ar.size;
    const itCount = this.keyStructures.it.size;

    const allLanguagesHaveKeys = enCount > 0 && arCount > 0 && itCount > 0;
    const allKeysPopulated = this.emptyValues.length === 0;
    const allStructuresConsistent = enCount === arCount && arCount === itCount;
    const readyForProduction = this.missingKeys.length === 0 && allKeysPopulated && allStructuresConsistent;

    return {
      allLanguagesHaveKeys,
      allKeysPopulated,
      allStructuresConsistent,
      readyForProduction,
      totalErrors: this.missingKeys.length + this.emptyValues.length + this.invalidPaths.length,
      totalWarnings: this.duplicateKeys.size,
    };
  }
}

/**
 * Validate all translations
 */
export function validateTranslations(): ValidationReport {
  const validator = new TranslationValidator();
  return validator.validate();
}

/**
 * Generate validation report as string
 */
export function generateValidationReportText(): string {
  const report = validateTranslations();

  let text = '='.repeat(80) + '\n';
  text += 'TRANSLATION VALIDATION REPORT\n';
  text += '='.repeat(80) + '\n\n';

  text += `Status: ${report.isValid ? '✓ VALID' : '✗ INVALID'}\n\n`;

  text += 'LANGUAGE KEY COUNTS:\n';
  text += `  EN: ${report.languageComparison.en.totalKeys} keys\n`;
  text += `  AR: ${report.languageComparison.ar.totalKeys} keys\n`;
  text += `  IT: ${report.languageComparison.it.totalKeys} keys\n`;
  text += `  Consistent: ${report.languageComparison.structureConsistent ? 'Yes' : 'No'}\n\n`;

  if (report.missingKeys.length > 0) {
    text += `MISSING KEYS (${report.missingKeys.length}):\n`;
    report.missingKeys.forEach((item) => {
      text += `  - ${item.keyPath} (missing in: ${item.expectedIn.join(', ')})\n`;
    });
    text += '\n';
  }

  if (report.emptyValues.length > 0) {
    text += `EMPTY VALUES (${report.emptyValues.length}):\n`;
    report.emptyValues.forEach((item) => {
      text += `  - ${item.language}: ${item.keyPath}\n`;
    });
    text += '\n';
  }

  if (report.invalidPaths.length > 0) {
    text += `INVALID PATHS (${report.invalidPaths.length}):\n`;
    report.invalidPaths.forEach((item) => {
      text += `  - ${item.keyPath}: ${item.issue}\n`;
    });
    text += '\n';
  }

  text += 'SUMMARY:\n';
  text += `  Total Errors: ${report.summary.totalErrors}\n`;
  text += `  Total Warnings: ${report.summary.totalWarnings}\n`;
  text += `  Ready for Production: ${report.summary.readyForProduction ? 'Yes' : 'No'}\n`;
  text += '\n' + '='.repeat(80) + '\n';

  return text;
}

/**
 * Console log validation report
 */
export function logValidationReport(): void {
  console.log(generateValidationReportText());
}
