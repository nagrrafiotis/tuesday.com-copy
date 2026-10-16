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

export default function BudgetCategoryGroup({ num, children, items }) {
  const [open, setOpen] = useState(true);
  const total = items.reduce((s, i) => s + (i.total_cost || 0), 0);
  const vat = items.reduce((s, i) => s + vatOf(i), 0);
  const label = num ? `Κατηγορία ${num}` : "Χωρίς αριθμό υποκατηγορίας";

  return (
    <>
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