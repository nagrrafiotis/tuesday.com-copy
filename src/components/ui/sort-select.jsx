import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

const DEFAULT_OPTIONS = [
  { value: "newest", label: "Νεότερα πρώτα" },
  { value: "oldest", label: "Παλαιότερα πρώτα" },
  { value: "alpha_asc", label: "Αλφαβητικά Α→Ω" },
  { value: "alpha_desc", label: "Αλφαβητικά Ω→Α" },
];

/**
 * Reusable sort dropdown.
 * options: [{ value, label }, ...] — defaults to date + alphabetical (Greek labels)
 * value: current sort key
 * onChange: (value) => void
 */
export default function SortSelect({ value, onChange, options = DEFAULT_OPTIONS, className = "w-44" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
        <SelectValue placeholder="Ταξινόμηση" />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Applies a sort key to an array of records and returns a new sorted array.
 *  Supports: newest, oldest, alpha_asc, alpha_desc (uses `name` or `description` or `payee` or `title`).
 *  Pass a custom labelKey if needed.
 */
export function applySort(items, sortKey, labelKey) {
  const pick = (r) => labelKey
    ? (typeof labelKey === "function" ? labelKey(r) : r[labelKey])
    : (r.name || r.description || r.payee || r.employee_name || r.title || "");

  switch (sortKey) {
    case "alpha_asc":
      return [...items].sort((a, b) => String(pick(a) || "").localeCompare(String(pick(b) || ""), "el"));
    case "alpha_desc":
      return [...items].sort((a, b) => String(pick(b) || "").localeCompare(String(pick(a) || ""), "el"));
    case "oldest": {
      const d = (r) => new Date(r.date || r.payment_date || r.created_date || 0);
      return [...items].sort((a, b) => d(a) - d(b));
    }
    case "newest":
    default: {
      const d = (r) => new Date(r.date || r.payment_date || r.created_date || 0);
      return [...items].sort((a, b) => d(b) - d(a));
    }
  }
}