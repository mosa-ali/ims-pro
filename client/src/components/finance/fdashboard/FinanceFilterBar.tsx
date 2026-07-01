// ============================================================================
// FINANCE DESIGN SYSTEM — FinanceFilterBar
// Standardised filter row used across all finance pages.
// Supports dropdown selectors, quick-filter chips, and a "More Filters" CTA.
// ============================================================================

import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdown {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  minWidth?: string;
  disabled?: boolean;
}

export interface QuickFilter<T extends string = string> {
  label: string;
  value: T;
}

interface FinanceFilterBarProps {
  /** Dropdown selectors rendered left-to-right. */
  dropdowns?: FilterDropdown[];
  /** Quick-select chip group (e.g. All | Critical | High | Medium | Low). */
  quickFilters?: QuickFilter[];
  activeQuickFilter?: string;
  onQuickFilterChange?: (value: string) => void;
  /** Search bar (optional). */
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** "More Filters" button. */
  onMoreFilters?: () => void;
  moreFiltersLabel?: string;
  className?: string;
}

export function FinanceFilterBar({
  dropdowns = [],
  quickFilters,
  activeQuickFilter,
  onQuickFilterChange,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  onMoreFilters,
  moreFiltersLabel,
  className = "",
}: FinanceFilterBarProps) {
  const { isRTL } = useLanguage();

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-3 ${className}`}
    >
      {/* Dropdown selectors */}
      {dropdowns.map((dd) => (
        <div key={dd.id} className="relative">
          <select
            value={dd.value}
            onChange={(e) => dd.onChange(e.target.value)}
            className={`h-8 appearance-none rounded border border-slate-300 bg-white ${
              isRTL ? "pr-3 pl-8" : "pl-3 pr-8"
            } text-[12px] font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-blue-200`}
            style={{ minWidth: dd.minWidth ?? "140px" }}
          >
            {dd.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 ${
              isRTL ? "left-2" : "right-2"
            }`}
          />
        </div>
      ))}

      {/* Quick-filter chips */}
      {quickFilters && quickFilters.length > 0 && (
        <div className="flex items-center gap-1">
          {quickFilters.map((qf) => (
            <button
              key={qf.value}
              onClick={() => onQuickFilterChange?.(qf.value)}
              className={`rounded px-2.5 py-1 text-[11px] font-bold transition-colors ${
                activeQuickFilter === qf.value
                  ? "bg-[#003b70] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {qf.label}
            </button>
          ))}
        </div>
      )}

      {/* Inline search */}
      {showSearch && (
        <div className="relative">
          <Search
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 ${
              isRTL ? "right-2.5" : "left-2.5"
            }`}
          />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className={`h-8 rounded border border-slate-300 bg-white text-[12px] outline-none ring-blue-200 transition focus:ring-2 ${
              isRTL ? "pr-8 pl-3" : "pl-8 pr-3"
            }`}
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange?.("")}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${
                isRTL ? "left-2" : "right-2"
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* More Filters */}
      {(onMoreFilters || moreFiltersLabel) && (
        <button
          onClick={onMoreFilters}
          className={`${isRTL ? "mr-auto" : "ml-auto"} inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {moreFiltersLabel ?? "More Filters"}
        </button>
      )}
    </div>
  );
}

// ─── Page-level full-width search bar ────────────────────────────────────────

interface FinanceSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FinanceSearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: FinanceSearchBarProps) {
  const { isRTL } = useLanguage();
  return (
    <div className={`relative ${className}`}>
      <Search
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${
          isRTL ? "right-3" : "left-3"
        }`}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded border border-slate-300 bg-white text-[13px] outline-none ring-blue-200 transition focus:ring-2 ${
          isRTL ? "pr-10 pl-3" : "pl-10 pr-3"
        }`}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${
            isRTL ? "left-3" : "right-3"
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
