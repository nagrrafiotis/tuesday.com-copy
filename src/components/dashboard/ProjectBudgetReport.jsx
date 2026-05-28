import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formatCurrency = (v) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);

const statusColors = {
  planning: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  on_hold: "bg-gray-100 text-gray-600",
  completed: "bg-emerald-100 text-emerald-700",
};

const statusLabels = {
  planning: "Σχεδιασμός",
  in_progress: "Σε εξέλιξη",
  on_hold: "Σε αναμονή",
  completed: "Ολοκληρωμένο",
};

export default function ProjectBudgetReport() {
  const [expanded, setExpanded] = useState(true);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
    staleTime: 30000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
    staleTime: 30000,
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
    staleTime: 30000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
    staleTime: 30000,
  });

  // Per-project calculations
  const projectSummaries = projects.map((project) => {
    const projectExpenses = expenses.filter((e) => e.project_id === project.id);
    const projectIncomes = incomes.filter((i) => i.project_id === project.id);
    const projectInvoiceExpenses = invoices.filter(
      (inv) => inv.project_id === project.id && inv.type === "expense"
    );
    const projectInvoiceIncomes = invoices.filter(
      (inv) => inv.project_id === project.id && inv.type === "income"
    );

    const totalExpenses =
      projectExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
      projectInvoiceExpenses.reduce((s, i) => s + (i.total_amount || 0), 0);

    const totalIncomes =
      projectIncomes.reduce((s, i) => s + (i.amount || 0), 0) +
      projectInvoiceIncomes.reduce((s, i) => s + (i.total_amount || 0), 0);

    const balance = totalIncomes - totalExpenses;
    const budget = project.budget || 0;
    const budgetRemaining = budget - totalExpenses;
    const budgetUsedPct = budget > 0 ? Math.min(100, (totalExpenses / budget) * 100) : null;

    return {
      project,
      totalExpenses,
      totalIncomes,
      balance,
      budget,
      budgetRemaining,
      budgetUsedPct,
    };
  });

  const totals = projectSummaries.reduce(
    (acc, s) => ({
      expenses: acc.expenses + s.totalExpenses,
      incomes: acc.incomes + s.totalIncomes,
      balance: acc.balance + s.balance,
    }),
    { expenses: 0, incomes: 0, balance: 0 }
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 rounded-2xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-[#1e3a5f]">Συγκεντρωτική Αναφορά Προϋπολογισμού</h2>
            <p className="text-xs text-gray-400">Έσοδα – Έξοδα ανά έργο</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-6 text-sm">
            <div className="text-right">
              <p className="text-xs text-gray-400">Σύνολο Εξόδων</p>
              <p className="font-bold text-red-600">{formatCurrency(totals.expenses)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Σύνολο Εσόδων</p>
              <p className="font-bold text-emerald-600">{formatCurrency(totals.incomes)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Καθαρό Υπόλοιπο</p>
              <p className={`font-bold text-lg ${totals.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-6 pb-6 pt-2">
              {projectSummaries.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Δεν υπάρχουν έργα.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide">
                        <th className="text-left py-3 pr-4 font-semibold">Έργο</th>
                        <th className="text-left py-3 pr-4 font-semibold hidden sm:table-cell">Κατάσταση</th>
                        <th className="text-right py-3 pr-4 font-semibold">Έξοδα</th>
                        <th className="text-right py-3 pr-4 font-semibold">Έσοδα</th>
                        <th className="text-right py-3 pr-4 font-semibold">Καθαρό</th>
                        <th className="text-right py-3 font-semibold hidden md:table-cell">Υπόλοιπο Π/Υ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {projectSummaries.map(({ project, totalExpenses, totalIncomes, balance, budget, budgetRemaining, budgetUsedPct }) => (
                        <tr key={project.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="py-3 pr-4">
                            <Link
                              to={createPageUrl(`ProjectDetails?id=${project.id}`)}
                              className="font-medium text-[#1e3a5f] hover:underline flex items-center gap-1 group/link"
                            >
                              {project.name}
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                          <td className="py-3 pr-4 hidden sm:table-cell">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] || "bg-gray-100 text-gray-600"}`}>
                              {statusLabels[project.status] || project.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right text-red-600 font-medium">
                            {formatCurrency(totalExpenses)}
                          </td>
                          <td className="py-3 pr-4 text-right text-emerald-600 font-medium">
                            {formatCurrency(totalIncomes)}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {balance > 0 ? (
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              ) : balance < 0 ? (
                                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                              ) : (
                                <Minus className="w-3.5 h-3.5 text-gray-400" />
                              )}
                              <span className={`font-bold ${balance > 0 ? "text-emerald-600" : balance < 0 ? "text-red-600" : "text-gray-500"}`}>
                                {formatCurrency(balance)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-right hidden md:table-cell">
                            {budget > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className={`font-medium text-xs ${budgetRemaining >= 0 ? "text-gray-700" : "text-red-600"}`}>
                                  {formatCurrency(budgetRemaining)}
                                </span>
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${budgetUsedPct > 90 ? "bg-red-500" : budgetUsedPct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                                    style={{ width: `${budgetUsedPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-400">{Math.round(budgetUsedPct)}% χρησιμοποιήθηκε</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 italic">Χωρίς Π/Υ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                        <td colSpan={2} className="py-3 pr-4 font-bold text-[#1e3a5f]">Σύνολο</td>
                        <td className="py-3 pr-4 text-right font-bold text-red-600">{formatCurrency(totals.expenses)}</td>
                        <td className="py-3 pr-4 text-right font-bold text-emerald-600">{formatCurrency(totals.incomes)}</td>
                        <td className="py-3 pr-4 text-right">
                          <span className={`font-bold text-base ${totals.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatCurrency(totals.balance)}
                          </span>
                        </td>
                        <td className="py-3 hidden md:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}