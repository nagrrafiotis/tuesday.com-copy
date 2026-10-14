import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

const categoryColors = {
  labor: "bg-blue-100 text-blue-700",
  subcontractor: "bg-purple-100 text-purple-700",
  materials: "bg-amber-100 text-amber-700",
  equipment: "bg-orange-100 text-orange-700",
  general_expenses: "bg-gray-100 text-gray-700",
};

const vatOf = (i) => (i.total_cost || 0) * ((i.vat_percent || 0) / 100);

export default function BudgetGroupRows({ name, items, onEdit, onDelete }) {
  const subTotal = items.reduce((s, i) => s + (i.total_cost || 0), 0);
  const subVat = items.reduce((s, i) => s + vatOf(i), 0);

  return (
    <>
      <TableRow className="bg-[#1e3a5f]/5 hover:bg-[#1e3a5f]/5">
        <TableCell colSpan={11} className="font-bold text-[#1e3a5f] py-2">
          {name || "Χωρίς υποκατηγορία"}
          <span className="ml-2 text-xs font-normal text-gray-500">({items.length})</span>
        </TableCell>
      </TableRow>

      {items.map((item) => (
        <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
          <TableCell>
            <Badge className={`${categoryColors[item.category] || "bg-gray-100 text-gray-700"} border-0 text-xs`}>
              {item.category?.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "—"}
            </Badge>
          </TableCell>
          <TableCell className="text-gray-600 text-sm">{item.subcategory || <span className="text-gray-300">—</span>}</TableCell>
          <TableCell className="text-gray-700 text-sm max-w-[200px] truncate">{item.description || <span className="text-gray-300">—</span>}</TableCell>
          <TableCell className="text-right text-gray-600 text-sm">{item.quantity ?? "—"}</TableCell>
          <TableCell className="text-gray-500 text-sm">{item.unit || "—"}</TableCell>
          <TableCell className="text-right text-gray-600 text-sm">{item.unit_cost ? formatCurrency(item.unit_cost) : <span className="text-gray-300">—</span>}</TableCell>
          <TableCell className="text-right font-semibold text-[#1e3a5f]">{formatCurrency(item.total_cost)}</TableCell>
          <TableCell className="text-right text-gray-600 text-sm">{item.vat_percent ?? 0}%</TableCell>
          <TableCell className="text-right text-gray-600 text-sm">{formatCurrency(vatOf(item))}</TableCell>
          <TableCell className="text-right font-semibold text-[#1e3a5f]">{formatCurrency((item.total_cost || 0) + vatOf(item))}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1 justify-end">
              <Button size="sm" variant="ghost" onClick={() => onEdit(item)} className="text-gray-400 hover:text-[#1e3a5f] h-7 w-7 p-0">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(item)} className="text-gray-400 hover:text-red-600 h-7 w-7 p-0">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}

      <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
        <TableCell colSpan={6} className="text-right text-sm font-semibold text-gray-600">
          Υποσύνολο {name || "Χωρίς υποκατηγορία"}
        </TableCell>
        <TableCell className="text-right font-semibold text-[#1e3a5f]">{formatCurrency(subTotal)}</TableCell>
        <TableCell />
        <TableCell className="text-right font-semibold text-gray-700">{formatCurrency(subVat)}</TableCell>
        <TableCell className="text-right font-semibold text-[#1e3a5f]">{formatCurrency(subTotal + subVat)}</TableCell>
        <TableCell />
      </TableRow>
    </>
  );
}