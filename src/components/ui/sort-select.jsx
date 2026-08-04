import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

/**
 * SortableHeader — renders the column label with two small up/down arrows
 * that the user clicks to sort by that column.
 *
 * Props:
 *  - label: text shown for the column header
 *  - field: stable field key used by applySort
 *  - sortField: currently active field key (or null)
 *  - sortDirection: "asc" | "desc" (current active direction for `field`)
 *  - onSort: (field, direction) => void
 *  - align: "left" | "right" (default "left")
 *  - disabled: hide arrows when true (e.g. for actions / file columns)
 */
export default function SortableHeader({ label, field, sortField, sortDirection, onSort, align = "left", disabled = false }) {
  if (disabled) return <span>{label}</span>;
  const isActiveAsc = sortField === field && sortDirection === "asc";
  const isActiveDesc = sortField === field && sortDirection === "desc";
  const sort = (dir) => {
    if (sortField === field && sortDirection === dir) return;
    onSort(field, dir);
  };
  return (
    <div className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end ml-auto" : ""}`}>
      <span>{label}</span>
      <span className="inline-flex flex-col leading-none -space-y-1">
        <ChevronUp
          className={`w-3 h-3 cursor-pointer transition-colors ${isActiveAsc ? "text-[#1e3a5f]" : "text-gray-300 hover:text-gray-600"}`}
          onClick={(e) => { e.stopPropagation(); sort("asc"); }}
        />
        <ChevronDown
          className={`w-3 h-3 cursor-pointer transition-colors ${isActiveDesc ? "text-[#1e3a5f]" : "text-gray-300 hover:text-gray-600"}`}
          onClick={(e) => { e.stopPropagation(); sort("desc"); }}
        />
      </span>
    </div>
  );
}

/**
 * Apply sort by field + direction to an array.
 *
 *  - Date columns:  "date" or any field ending in "_date"
 *  - Numeric columns: fields matching /amount|price|cost|salary|payment|total|net\b/i
 *  - All other fields are sorted alphabetically with the Greek locale
 *
 * Consumers pass sortField + sortDirection (from SortableHeader).
 */
export function applySort(items, sortField, sortDirection) {
  if (!sortField) return items;
  const dir = sortDirection === "asc" ? 1 : -1;

  // Date column (or column names ending with _date)
  const isDateField = sortField === "date" || /_date$/.test(sortField);
  // Numeric columns: amounts, prices, costs, salaries
  const isNumericField = /amount|price|cost|salary|payment|total|net\b/i.test(sortField);

  if (isDateField) {
    const d = (r) => new Date(r[sortField] || r.date || r.payment_date || r.created_date || 0);
    return [...items].sort((a, b) => {
      const da = d(a), db = d(b);
      if (isNaN(da) && isNaN(db)) return 0;
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return (da - db) * dir;
    });
  }
  if (isNumericField) {
    const v = (r) => Number(r[sortField] ?? 0) || 0;
    return [...items].sort((a, b) => (v(a) - v(b)) * dir);
  }
  // Default: text sort by the named field with Greek locale
  return [...items].sort((a, b) => {
    const va = String(a[sortField] ?? "");
    const vb = String(b[sortField] ?? "");
    return va.localeCompare(vb, "el") * dir;
  });
}