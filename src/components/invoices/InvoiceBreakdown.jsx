import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Layers, Receipt, Tag } from "lucide-react";

const formatCurrency = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

const categoryColors = {
  labor: "bg-blue-100 text-blue-700",
  subcontractor: "bg-purple-100 text-purple-700",
  materials: "bg-amber-100 text-amber-700",
  equipment: "bg-emerald-100 text-emerald-700",
  general_expenses: "bg-gray-100 text-gray-700",
};

const labelify = (str) =>
  str ? str.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "—";

export default function InvoiceBreakdown({ invoices, expenses = [] }) {
  const { data: subcategories = [] } = useQuery({ queryKey: ["subcategories"], queryFn: () => base44.entities.Subcategory.list() });
  const { data: phases = [] } = useQuery({ queryKey: ["phases"], queryFn: () => base44.entities.ProjectPhase.list("order") });

  const getPhase = (subcategoryName) => {
    if (!subcategoryName) return null;
    const sub = subcategories.find((s) => s.name === subcategoryName);
    if (!sub?.phase_id) return null;
    return phases.find((p) => p.id === sub.phase_id) || null;
  };

  // Group by phase
  const byPhase = {};
  // Group by category
  const byCategory = {};
  // Group by subcategory
  const bySubcategory = {};

  // Process invoices
  invoices.forEach((inv) => {
    const amount = inv.total_amount || 0;
    const phase = getPhase(inv.subcategory);
    const phaseLabel = phase?.name || "Χωρίς Phase";
    const catLabel = inv.category ? labelify(inv.category) : "Χωρίς Category";
    const subLabel = inv.subcategory || "Χωρίς Subcategory";

    byPhase[phaseLabel] = (byPhase[phaseLabel] || 0) + amount;
    byCategory[catLabel] = { total: (byCategory[catLabel]?.total || 0) + amount, color: categoryColors[inv.category] || "bg-gray-100 text-gray-700" };
    bySubcategory[subLabel] = (bySubcategory[subLabel] || 0) + amount;
  });

  // Process expenses
  expenses.forEach((exp) => {
    const amount = exp.amount || 0;
    const phase = getPhase(exp.subcategory);
    const phaseLabel = phase?.name || "Χωρίς Phase";
    const catLabel = exp.category ? labelify(exp.category) : "Χωρίς Category";
    const subLabel = exp.subcategory || "Χωρίς Subcategory";

    byPhase[phaseLabel] = (byPhase[phaseLabel] || 0) + amount;
    byCategory[catLabel] = { total: (byCategory[catLabel]?.total || 0) + amount, color: categoryColors[exp.category] || "bg-gray-100 text-gray-700" };
    bySubcategory[subLabel] = (bySubcategory[subLabel] || 0) + amount;
  });

  const total = invoices.reduce((s, i) => s + (i.total_amount || 0), 0) + expenses.reduce((s, e) => s + (e.amount || 0), 0);
  if (total === 0) return null;

  const bar = (amount) => (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className="bg-[#1e3a5f] h-1.5 rounded-full" style={{ width: `${Math.min(100, (amount / total) * 100)}%` }} />
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Phase breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
          <Layers className="w-4 h-4 text-[#1e3a5f]" /> Ανά Phase
        </div>
        <div className="space-y-2">
          {Object.entries(byPhase).sort((a, b) => b[1] - a[1]).map(([label, amount]) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-gray-600">
                <span className="truncate max-w-[120px]" title={label}>{label}</span>
                <span className="font-semibold text-gray-800 whitespace-nowrap ml-2">{formatCurrency(amount)}</span>
              </div>
              {bar(amount)}
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
          <Receipt className="w-4 h-4 text-[#1e3a5f]" /> Ανά Category
        </div>
        <div className="space-y-2">
          {Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total).map(([label, { total: amt, color }]) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-gray-600">
                <span className={`inline-flex items-center px-1.5 rounded text-xs font-medium ${color}`}>{label}</span>
                <span className="font-semibold text-gray-800 whitespace-nowrap ml-2">{formatCurrency(amt)}</span>
              </div>
              {bar(amt)}
            </div>
          ))}
        </div>
      </div>

      {/* Subcategory breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
          <Tag className="w-4 h-4 text-[#1e3a5f]" /> Ανά Subcategory
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {Object.entries(bySubcategory).sort((a, b) => b[1] - a[1]).map(([label, amount]) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-gray-600">
                <span className="truncate max-w-[120px]" title={label}>{label}</span>
                <span className="font-semibold text-gray-800 whitespace-nowrap ml-2">{formatCurrency(amount)}</span>
              </div>
              {bar(amount)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}