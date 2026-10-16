import React, { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

const vatOf = (i) => (i.total_cost || 0) * ((i.vat_percent || 0) / 100);

// Extracts the leading number of a subcategory (e.g. "1.0 Σκαπτικές" -> "1")
export const leadingNumberOf = (sub) => {
  const m = (sub || "").trim().match(/^(\d+)/);
  return m ? m[1] : null;
};

export default function BudgetCategoryGroup({ num, children, items, storageKey }) {
  const [open, setOpen] = useState(true);
  const total = items.reduce((s, i) => s + (i.total_cost || 0), 0);
  const vat = items.reduce((s, i) => s + vatOf(i), 0);
  const label = num ? `Κατηγορία ${num}` : "Χωρίς αριθμό υποκατηγορίας";

  const noteKey = `budget-group-note:${storageKey || ""}:${num || "__none__"}`;
  const [note, setNote] = useState(() => localStorage.getItem(noteKey) || "");
  const saveNote = (v) => {
    setNote(v);
    if (v) localStorage.setItem(noteKey, v);
    else localStorage.removeItem(noteKey);
  };

  return (
    <>
      {/* Group note — sits above the category header, spans full width */}
      <TableRow className="bg-[#fdf8ec]">
        <TableCell colSpan={11} className="py-2 px-3">
          <input
            value={note}
            onChange={(e) => saveNote(e.target.value)}
            placeholder="Σημείωση: σε τι αναφέρεται το κομμάτι του προϋπολογισμού..."
            className="block w-full bg-white/60 hover:bg-white focus:bg-white placeholder:text-amber-700/40 text-[#7a5c1f] text-lg font-bold rounded px-3 py-1.5 outline-none border border-[#c9a962]/40"
          />
        </TableCell>
      </TableRow>

      <TableRow
        onClick={() => setOpen((o) => !o)}
        className="bg-[#c9a962] hover:bg-[#b8985a] cursor-pointer select-none border-t-2 border-white"
      >
        <TableCell colSpan={6} className="font-bold text-white py-3 text-base">
          <span className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {label}
            <span className="font-normal text-white/70 text-sm">
              ({items.length} items)
            </span>
          </span>
        </TableCell>
        <TableCell className="text-right font-bold text-white py-3">{formatCurrency(total)}</TableCell>
        <TableCell />
        <TableCell className="text-right font-bold text-white/80 py-3">{formatCurrency(vat)}</TableCell>
        <TableCell className="text-right font-bold text-white py-3">{formatCurrency(total + vat)}</TableCell>
        <TableCell />
      </TableRow>
      {open && children}
    </>
  );
}