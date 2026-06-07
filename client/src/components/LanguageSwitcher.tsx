/**
 * UNIFIED LANGUAGE SWITCHER COMPONENT
 * ============================================================================
 * Single, production-ready component with multiple UI variants
 * Replaces both legacy LanguageSwitcher and AdvancedLanguageSwitcher
 * Supports: English, العربية, Italiano
 * ============================================================================
 */

'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useLanguageSelector } from '@/i18n/TranslationProvider';

type LanguageSwitcherVariant = 'outline' | 'ghost' | 'default';
type LanguageSwitcherStyle = 'dropdown' | 'minimal' | 'full';

interface LanguageSwitcherProps {
  /** UI style variant: dropdown (default), minimal (compact buttons), or full (detailed view) */
  style?: LanguageSwitcherStyle;
  /** Button variant: outline, ghost, or default */
  variant?: LanguageSwitcherVariant;
  /** Show full language labels in dropdown (default: false) */
  showLabels?: boolean;
  /** Compact mode (smaller icon button) (default: true) */
  compact?: boolean;
  /** CSS class for custom styling */
  className?: string;
}

/**
 * Primary Language Switcher Component
 * Default dropdown style with customizable variants
 * Ideal for headers, navigation, and toolbars
 */
export function LanguageSwitcher({
  style = 'dropdown',
  variant = 'outline',
  showLabels = false,
  compact = true,
  className = '',
}: LanguageSwitcherProps) {
  const { currentLanguage, languages, changeLanguage, isCurrentLanguage } = useLanguageSelector();

  const currentLanguageLabel = languages.find((lang) => lang.code === currentLanguage);

  if (style === 'minimal') {
    return <MinimalLanguageSwitcher className={className} />;
  }

  if (style === 'full') {
    return <FullLanguageSelector className={className} />;
  }

  // Default: dropdown style
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={compact ? 'icon' : 'default'} className={className}>
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          {showLabels && !compact && <span className="ml-2">{currentLanguageLabel?.label}</span>}
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Select Language</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`cursor-pointer ${isCurrentLanguage(lang.code) ? 'bg-accent font-semibold' : ''}`}
          >
            <div className="flex w-full items-center justify-between">
              <span>{lang.label}</span>
              <span className="text-xs text-muted-foreground">{lang.nativeLabel}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Minimal Language Switcher - Compact button group
 * Shows language codes with flag emojis
 * Ideal for sidebars and compact layouts
 */
export function MinimalLanguageSwitcher({ className = '' }: { className?: string }) {
  const { currentLanguage, languages, changeLanguage, isCurrentLanguage } = useLanguageSelector();

  const languageFlags: Record<string, string> = {
    en: '🇬🇧',
    ar: '🇸🇦',
    it: '🇮🇹',
  };

  return (
    <div className={`flex items-center gap-1 rounded-md border border-input bg-background p-1 ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`px-2 py-1 rounded text-sm transition-colors ${
            isCurrentLanguage(lang.code) ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
          }`}
          title={lang.label}
          aria-label={`Switch to ${lang.label}`}
        >
          <span className="mr-1">{languageFlags[lang.code] || lang.code.toUpperCase()}</span>
          <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Full Language Selector - Detailed card-based view
 * Shows native language names and selection indicators
 * Ideal for settings pages and language preference modals
 */
export function FullLanguageSelector({ className = '' }: { className?: string }) {
  const { currentLanguage, languages, changeLanguage, isCurrentLanguage } = useLanguageSelector();

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold">Select Language</h3>

      <div className="grid gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
              isCurrentLanguage(lang.code)
                ? 'border-primary bg-primary/10 font-semibold'
                : 'border-input hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{lang.label}</p>
                <p className="text-sm text-muted-foreground">{lang.nativeLabel}</p>
              </div>
              {isCurrentLanguage(lang.code) && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  ✓
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


