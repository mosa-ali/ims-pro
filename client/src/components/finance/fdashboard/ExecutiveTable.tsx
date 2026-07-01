// ============================================================================
// FINANCE DESIGN SYSTEM — ExecutiveTable
// Sortable, searchable, filterable enterprise data table with conditional
// formatting, sticky header, row hover, progress bars, and export button.
// ============================================================================

import { useState, useMemo, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Search } from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { EmptyState } from "./LoadingSkeleton";

export type SortDirection = "asc" | "desc" | null;

export interface TableColumn<T> {
  /** Column key (matches a key in T). */
  key: keyof T | string;
  /** Display header label. */
  label: string;
  /** Custom cell renderer. Receives the row object and returns a ReactNode. */
  render?: (row: T) => ReactNode;
  /** If true the column is sortable. Default: false. */
  sortable?: boolean;
  /** Tailwind class(es) for the <th> / <td> element. */
  className?: string;
  /** Force dir="ltr" on td (for numeric values). Default: false. */
  ltr?: boolean;
  /** Column is hidden on small screens. */
  hideOnMobile?: boolean;
  /** Alignment. Default: "start". */
  align?: "start" | "center" | "end";
}

export interface ExecutiveTableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  /** Row key extractor. */
  rowKey: (row: T, index: number) => string | number;
  /** Placeholder text when data is empty. */
  emptyMessage?: string;
  /** Enable built-in search. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Keys to search across. Defaults to all string/number columns. */
  searchKeys?: (keyof T)[];
  /** Export button. */
  showExport?: boolean;
  onExport?: () => void;
  exportLabel?: string;
  /** External query (controlled from parent). */
  externalQuery?: string;
  /** Custom row click handler. */
  onRowClick?: (row: T) => void;
  /** CSS class for the wrapper div. */
  className?: string;
  /** Override footer right slot. */
  footerRight?: ReactNode;
}

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") return <ChevronUp className="h-3 w-3" />;
  if (direction === "desc") return <ChevronDown className="h-3 w-3" />;
  return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
}

export function ExecutiveTable<
    T extends object
>({
  columns,
  data,
  rowKey,
  emptyMessage,
  searchable = true,
  searchPlaceholder = "Filter...",
  searchKeys,
  showExport = false,
  onExport,
  exportLabel = "Export",
  externalQuery,
  onRowClick,
  className = "",
  footerRight,
}: ExecutiveTableProps<T>) {
  const { isRTL } = useLanguage();
  const [internalQuery, setInternalQuery] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const query = externalQuery ?? internalQuery;

  const effectiveSearchKeys = useMemo(
    () => searchKeys ?? columns.map((c) => c.key as keyof T),
    [searchKeys, columns],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      effectiveSearchKeys.some((k) => {
        const v = row[k];
        return typeof v === "string"
          ? v.toLowerCase().includes(q)
          : typeof v === "number"
          ? String(v).includes(q)
          : false;
      }),
    );
  }, [data, query, effectiveSearchKeys]);

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol as keyof T];
      const bv = b[sortCol as keyof T];
      if (av === bv) return 0;
      const cmp = av! < bv! ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  function handleSort(key: string) {
    if (sortCol === key) {
      setSortDir(sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc");
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(key);
      setSortDir("desc");
    }
  }

  const alignClass = (align: TableColumn<T>["align"]) =>
    align === "center" ? "text-center" : align === "end" ? "text-end" : "text-start";

  return (
    <div className={`overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)] ${className}`}>
      {/* Toolbar */}
      {(searchable || showExport) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          {searchable && externalQuery === undefined && (
            <div className="relative hidden sm:block">
              <Search
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 ${isRTL ? "right-2.5" : "left-2.5"}`}
              />
              <input
                value={internalQuery}
                onChange={(e) => setInternalQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className={`h-8 rounded border border-slate-300 text-[12px] outline-none ring-blue-200 transition focus:ring-2 ${isRTL ? "pr-8 pl-3" : "pl-8 pr-3"}`}
              />
            </div>
          )}
          {showExport && (
            <button
              onClick={onExport}
              className={`${isRTL ? "mr-auto" : "ml-auto"} inline-flex items-center gap-1.5 rounded bg-[#003b70] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#002a55] transition-colors`}
            >
              <Download className="h-3.5 w-3.5" />
              {exportLabel}
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={[
                    "border-b border-slate-200 px-3 py-2.5 font-bold",
                    alignClass(col.align),
                    col.sortable ? "cursor-pointer select-none hover:bg-slate-100" : "",
                    col.className ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon direction={sortCol === String(col.key) ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-0">
                  <EmptyState
                    message={emptyMessage ?? "No records match the current filter."}
                    className="py-10"
                  />
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => (
                <tr
                  key={rowKey(row, idx)}
                  className={[
                    "border-b border-slate-100 transition-colors",
                    onRowClick ? "cursor-pointer hover:bg-blue-50/40" : "hover:bg-slate-50/50",
                  ].join(" ")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      dir={col.ltr ? "ltr" : undefined}
                      className={[
                        "px-3 py-2.5",
                        alignClass(col.align),
                        col.className ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
        <span>
          {sorted.length} of {data.length} records
        </span>
        {footerRight}
      </div>
    </div>
  );
}
