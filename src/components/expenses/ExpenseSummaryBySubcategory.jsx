import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, FileText, ChevronDown, ChevronRight, ExternalLink, Image, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

function InvoiceThumb({ inv }) {
  const [open, setOpen] = useState(false);
  const url = inv.image_url;
  const isPdf = url && url.toLowerCase().includes(".pdf");
  const isImg = url && /\.(png|jpg|jpeg|webp|gif)$/i.test(url);

  return (
    <div className="flex items-center gap-2 py-0.5">
      {/* Thumbnail / icon */}
      {isImg ? (
        <button onClick={() => setOpen(true)} className="shrink-0">
          <img src={url} alt="invoice" className="w-8 h-8 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
        </button>
      ) : url ? (
        <a href={url} target="_blank" rel="noreferrer" className="shrink-0 w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-red-50 hover:bg-red-100 transition-colors">
          <FileText className="w-4 h-4 text-red-500" />
        </a>
      ) : (
        <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50">
          <Receipt className="w-3.5 h-3.5 text-gray-300" />
        </div>
      )}

      {/* Invoice info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
            {inv.vendor_client || inv.description || "—"}
          </span>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
              <ExternalLink className="w-3 h-3 text-gray-400 hover:text-[#1e3a5f]" />
            </a>
          )}
        </div>
        {inv.invoice_number && (
          <div className="text-[10px] text-gray-400"># {inv.invoice_number}</div>
        )}
      </div>

      <span className="ml-auto shrink-0 text-xs font-semibold text-amber-700 whitespace-nowrap">
        {formatCurrency(inv.total_amount)}
      </span>

      {/* Lightbox */}
      {open && isImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img src={url} alt="invoice" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default function ExpenseSummaryBySubcategory({ expenses = [], invoices = [], budgetItems = [] }) {
  const [expandedRows, setExpandedRows] = useState({});

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
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

  const getPhase = (subcatName) => {
    const subcat = subcategories.find(s => s.name === subcatName);
    if (!subcat?.phase_id) return null;
    return phases.find(p => p.id === subcat.phase_id);
  };

  // Group expenses & invoices by subcategory
  const grouped = {};

  expenses.forEach((exp) => {
    const key = exp.subcategory || exp.category || "—";
    if (!grouped[key]) grouped[key] = { expenses: [], invoices: [] };
    grouped[key].expenses.push(exp);
  });

  projectInvoices.forEach((inv) => {
    const key = inv.subcategory || inv.category || "—";
    if (!grouped[key]) grouped[key] = { expenses: [], invoices: [] };
    grouped[key].invoices.push(inv);
  });

  // Budget per subcategory
  const budgetBySubcat = {};
  budgetItems.forEach(item => {
    const key = item.subcategory || item.category || "—";
    budgetBySubcat[key] = (budgetBySubcat[key] || 0) + (item.total_cost || 0);
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const pa = getPhase(a);
    const pb = getPhase(b);
    const orderA = pa ? phases.findIndex(p => p.id === pa.id) : 9999;
    const orderB = pb ? phases.findIndex(p => p.id === pb.id) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const grandExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grandInvoices = projectInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const grandActual = grandExpenses + grandInvoices;
  const grandBudget = Object.values(budgetBySubcat).reduce((s, v) => s + v, 0);

  const hasBudget = budgetItems.length > 0;

  const toggleRow = (key) => setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));

  const exportToExcel = () => {
    const rows = [
      ["Φάση", "Υποκατηγορία", "Τύπος", "Payee / Vendor", "Περιγραφή", "Ημερομηνία", "Πηγή Πληρωμής", "Ποσό (€)"],
    ];
    sortedKeys.forEach(key => {
      const row = grouped[key];
      const phase = getPhase(key);
      row.expenses.forEach(exp => {
        rows.push([phase?.name || "—", key, "Expense", exp.payee || "", exp.description || "", exp.date?.slice(0,10) || "", exp.payment_source || "", exp.amount ?? ""]);
      });
      row.invoices.forEach(inv => {
        rows.push([phase?.name || "—", key, "Invoice", inv.vendor_client || "", inv.description || "", inv.date?.slice(0,10) || "", inv.payment_source || "", inv.total_amount ?? ""]);
      });
    });
    rows.push([]);
    rows.push(["", "ΣΥΝΟΛΟ", "", "", "", "", "", grandActual]);
    const bom = "\uFEFF";
    const csv = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
      <div className="flex justify-end px-4 pt-3 pb-1">
        <Button variant="outline" size="sm" onClick={exportToExcel} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="bg-gray-50 font-semibold w-8"></TableHead>
            <TableHead className="bg-gray-50 font-semibold">Phase</TableHead>
            <TableHead className="bg-gray-50 font-semibold">Subcategory</TableHead>
            <TableHead className="text-right bg-gray-50 font-semibold">Expenses</TableHead>
            <TableHead className="text-right bg-amber-50 font-semibold text-amber-700">Invoices</TableHead>
            <TableHead className="text-right bg-blue-50 font-semibold text-[#1e3a5f]">Total Actual</TableHead>
            {hasBudget && (
              <>
                <TableHead className="text-right bg-gray-50 font-semibold text-gray-600">Budget</TableHead>
                <TableHead className="text-right bg-gray-50 font-semibold text-gray-600">Variance</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedKeys.map((key) => {
            const row = grouped[key];
            const phase = getPhase(key);
            const expenseTotal = row.expenses.reduce((s, e) => s + (e.amount || 0), 0);
            const invoiceTotal = row.invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
            const actual = expenseTotal + invoiceTotal;
            const budget = budgetBySubcat[key] || 0;
            const variance = budget - actual;
            const isExpanded = expandedRows[key];
            const hasDetails = row.expenses.length > 0 || row.invoices.length > 0;

            return (
              <React.Fragment key={key}>
                {/* Summary row */}
                <TableRow
                  className={`hover:bg-gray-50/50 transition-colors ${hasDetails ? "cursor-pointer" : ""}`}
                  onClick={() => hasDetails && toggleRow(key)}
                >
                  <TableCell className="w-8 text-gray-400">
                    {hasDetails && (
                      isExpanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                    )}
                  </TableCell>
                  <TableCell>
                    {phase ? (
                      <Badge className={`${phase.color} border-0`}>{phase.name}</Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">{key}</TableCell>
                  <TableCell className="text-right text-gray-700">
                    {expenseTotal ? formatCurrency(expenseTotal) : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="text-right text-amber-700 font-medium">
                    {invoiceTotal ? formatCurrency(invoiceTotal) : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#1e3a5f]">
                    {formatCurrency(actual)}
                  </TableCell>
                  {hasBudget && (
                    <>
                      <TableCell className="text-right text-gray-600">
                        {budget ? formatCurrency(budget) : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {budget ? (variance >= 0 ? "+" : "") + formatCurrency(variance) : <span className="text-gray-300">—</span>}
                      </TableCell>
                    </>
                  )}
                </TableRow>

                {/* Expanded detail rows */}
                {isExpanded && (
                  <TableRow className="bg-gray-50/50">
                    <TableCell colSpan={hasBudget ? 8 : 6} className="py-0">
                      <div className="pl-10 pr-4 py-3 space-y-4">
                        {/* Expenses list */}
                        {row.expenses.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Expenses</p>
                            <div className="space-y-1">
                              {row.expenses.map((exp) => (
                                <div key={exp.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                  <div>
                                    <span className="font-medium text-gray-800">{exp.payee || exp.description || "—"}</span>
                                    {exp.description && exp.payee && (
                                      <span className="ml-2 text-gray-400 text-xs">{exp.description}</span>
                                    )}
                                    {exp.date && (
                                      <span className="ml-2 text-gray-400 text-xs">{exp.date?.slice(0, 10)}</span>
                                    )}
                                    {exp.payment_source && (
                                      <Badge variant="outline" className="ml-2 text-xs py-0 h-4">{exp.payment_source}</Badge>
                                    )}
                                  </div>
                                  <span className="font-semibold text-gray-900 ml-4 whitespace-nowrap">{formatCurrency(exp.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Invoices list */}
                        {row.invoices.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Invoices / Παραστατικά</p>
                            <div className="space-y-1.5">
                              {row.invoices.map((inv) => (
                                <InvoiceThumb key={inv.id} inv={inv} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}

          {/* Grand Total */}
          <TableRow className="bg-gray-50 border-t-2 border-gray-200">
            <TableCell colSpan={3} className="font-bold text-gray-900">Σύνολο</TableCell>
            <TableCell className="text-right font-bold text-gray-900">{formatCurrency(grandExpenses)}</TableCell>
            <TableCell className="text-right font-bold text-amber-700">{formatCurrency(grandInvoices)}</TableCell>
            <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">{formatCurrency(grandActual)}</TableCell>
            {hasBudget && (
              <>
                <TableCell className="text-right font-bold text-gray-700">{formatCurrency(grandBudget)}</TableCell>
                <TableCell className={`text-right font-bold text-lg ${(grandBudget - grandActual) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {(grandBudget - grandActual) >= 0 ? "+" : ""}{formatCurrency(grandBudget - grandActual)}
                </TableCell>
              </>
            )}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}