import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

// Heuristic: if payment_source contains "τιμολ" (τιμολόγιο) or "invoice" case-insensitive → invoice, else cash
const isInvoice = (paymentSource) => {
  if (!paymentSource) return false;
  const lower = paymentSource.toLowerCase();
  return lower.includes("τιμολ") || lower.includes("invoice") || lower.includes("τιμ.");
};

export default function ExpenseSummaryBySubcategory({ expenses = [] }) {
  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No expenses yet</h3>
        <p className="text-gray-500">Add your first expense to start tracking costs</p>
      </div>
    );
  }

  // Determine all unique payment sources
  const allSources = paymentSources.map(ps => ps.name);

  // Group expenses by subcategory (fallback to category if no subcategory)
  const grouped = {};
  expenses.forEach((exp) => {
    const key = exp.subcategory || exp.category || "—";
    if (!grouped[key]) grouped[key] = { total: 0, bySource: {} };
    grouped[key].total += exp.amount || 0;
    const src = exp.payment_source || "—";
    grouped[key].bySource[src] = (grouped[key].bySource[src] || 0) + (exp.amount || 0);
  });

  // Compute totals per source
  const sourceSet = new Set();
  expenses.forEach(e => sourceSet.add(e.payment_source || "—"));
  const sources = [...sourceSet].sort();

  const grandTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grandBySource = {};
  sources.forEach(src => {
    grandBySource[src] = expenses
      .filter(e => (e.payment_source || "—") === src)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  });

  // Get phase for subcategory
  const getPhase = (subcatName) => {
    const subcat = subcategories.find(s => s.name === subcatName);
    if (!subcat?.phase_id) return null;
    return phases.find(p => p.id === subcat.phase_id);
  };

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const pa = getPhase(a);
    const pb = getPhase(b);
    const orderA = pa ? phases.findIndex(p => p.id === pa.id) : 9999;
    const orderB = pb ? phases.findIndex(p => p.id === pb.id) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="bg-gray-50 font-semibold">Phase</TableHead>
            <TableHead className="bg-gray-50 font-semibold">Subcategory</TableHead>
            {sources.map(src => (
              <TableHead key={src} className="text-right bg-gray-50 font-semibold whitespace-nowrap">
                {src}
              </TableHead>
            ))}
            <TableHead className="text-right bg-gray-50 font-semibold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedKeys.map((key) => {
            const row = grouped[key];
            const phase = getPhase(key);
            return (
              <TableRow key={key} className="hover:bg-gray-50/50">
                <TableCell>
                  {phase ? (
                    <Badge className={`${phase.color} border-0`}>{phase.name}</Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-gray-800">{key}</TableCell>
                {sources.map(src => (
                  <TableCell key={src} className="text-right text-gray-700">
                    {row.bySource[src] ? formatCurrency(row.bySource[src]) : <span className="text-gray-300">—</span>}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold text-[#1e3a5f]">
                  {formatCurrency(row.total)}
                </TableCell>
              </TableRow>
            );
          })}

          {/* Grand Total Row */}
          <TableRow className="bg-gray-50 border-t-2 border-gray-200">
            <TableCell colSpan={2} className="font-bold text-gray-900">Total</TableCell>
            {sources.map(src => (
              <TableCell key={src} className="text-right font-bold text-gray-900">
                {formatCurrency(grandBySource[src])}
              </TableCell>
            ))}
            <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">
              {formatCurrency(grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}