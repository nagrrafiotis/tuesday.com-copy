import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

export default function ExpenseSummaryBySubcategory({ expenses = [], invoices = [] }) {
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

  const projectInvoices = invoices.filter(inv => inv.type === "expense");

  if (expenses.length === 0 && projectInvoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No expenses yet</h3>
        <p className="text-gray-500">Add your first expense to start tracking costs</p>
      </div>
    );
  }

  // Get phase for subcategory
  const getPhase = (subcatName) => {
    const subcat = subcategories.find(s => s.name === subcatName);
    if (!subcat?.phase_id) return null;
    return phases.find(p => p.id === subcat.phase_id);
  };

  // Group expenses by subcategory → by payment source
  const grouped = {};

  expenses.forEach((exp) => {
    const key = exp.subcategory || exp.category || "—";
    if (!grouped[key]) grouped[key] = { expenseBySource: {}, invoiceTotal: 0 };
    const src = exp.payment_source || "—";
    grouped[key].expenseBySource[src] = (grouped[key].expenseBySource[src] || 0) + (exp.amount || 0);
  });

  // Group invoices by subcategory
  projectInvoices.forEach((inv) => {
    const key = inv.subcategory || inv.category || "—";
    if (!grouped[key]) grouped[key] = { expenseBySource: {}, invoiceTotal: 0 };
    grouped[key].invoiceTotal += inv.total_amount || 0;
  });

  // Collect all unique payment sources from expenses
  const sourceSet = new Set();
  expenses.forEach(e => sourceSet.add(e.payment_source || "—"));
  const sources = [...sourceSet].sort();

  const grandBySource = {};
  sources.forEach(src => {
    grandBySource[src] = expenses
      .filter(e => (e.payment_source || "—") === src)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  });
  const grandInvoices = projectInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const grandTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0) + grandInvoices;

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const pa = getPhase(a);
    const pb = getPhase(b);
    const orderA = pa ? phases.findIndex(p => p.id === pa.id) : 9999;
    const orderB = pb ? phases.findIndex(p => p.id === pb.id) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const hasInvoices = projectInvoices.length > 0;

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
            {hasInvoices && (
              <TableHead className="text-right bg-amber-50 font-semibold whitespace-nowrap text-amber-700">
                Invoices
              </TableHead>
            )}
            <TableHead className="text-right bg-gray-50 font-semibold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedKeys.map((key) => {
            const row = grouped[key];
            const phase = getPhase(key);
            const rowExpenseTotal = sources.reduce((sum, src) => sum + (row.expenseBySource[src] || 0), 0);
            const rowTotal = rowExpenseTotal + (row.invoiceTotal || 0);
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
                    {row.expenseBySource[src] ? formatCurrency(row.expenseBySource[src]) : <span className="text-gray-300">—</span>}
                  </TableCell>
                ))}
                {hasInvoices && (
                  <TableCell className="text-right text-amber-700 font-medium">
                    {row.invoiceTotal ? formatCurrency(row.invoiceTotal) : <span className="text-gray-300">—</span>}
                  </TableCell>
                )}
                <TableCell className="text-right font-semibold text-[#1e3a5f]">
                  {formatCurrency(rowTotal)}
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
            {hasInvoices && (
              <TableCell className="text-right font-bold text-amber-700">
                {formatCurrency(grandInvoices)}
              </TableCell>
            )}
            <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">
              {formatCurrency(grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}