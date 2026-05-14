import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

export default function PaymentSourceSummary() {
  const { data: transactions = [] } = useQuery({
    queryKey: ["bank-transactions"],
    queryFn: () => base44.entities.BankTransaction.list("-date"),
    staleTime: 30000,
  });

  const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const summary = useMemo(() => {
    const thisMonth = transactions.filter(t => {
      if (!t.date) return false;
      try {
        return isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd });
      } catch { return false; }
    });

    const bySource = {};
    thisMonth.forEach(t => {
      const src = t.payment_source || "Άγνωστη Πηγή";
      if (!bySource[src]) bySource[src] = { income: 0, expense: 0 };
      if (t.transaction_type === "credit") bySource[src].income += Math.abs(t.amount || 0);
      else bySource[src].expense += Math.abs(t.amount || 0);
    });

    const totalIncome = thisMonth.filter(t => t.transaction_type === "credit").reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const totalExpense = thisMonth.filter(t => t.transaction_type === "debit").reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    return { bySource, totalIncome, totalExpense };
  }, [transactions]);

  const sources = Object.entries(summary.bySource);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Landmark className="w-5 h-5 text-[#1e3a5f]" />
        <h3 className="font-semibold text-[#1e3a5f]">Κινήσεις Τρέχοντος Μήνα ανά Πηγή</h3>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
          <div className="p-1.5 bg-green-100 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Συνολικά Έσοδα</p>
            <p className="font-bold text-green-700">{fmt(summary.totalIncome)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-red-50 rounded-lg p-3">
          <div className="p-1.5 bg-red-100 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Συνολικά Έξοδα</p>
            <p className="font-bold text-red-700">{fmt(summary.totalExpense)}</p>
          </div>
        </div>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Δεν υπάρχουν κινήσεις αυτόν τον μήνα</p>
      ) : (
        <div className="space-y-2">
          {sources.map(([src, data]) => {
            const net = data.income - data.expense;
            const maxVal = Math.max(data.income, data.expense, 1);
            return (
              <div key={src} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{src}</span>
                  <span className={`text-sm font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {net >= 0 ? "+" : ""}{fmt(net)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span>Έσοδα</span>
                      <span className="text-green-600 font-medium">{fmt(data.income)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${(data.income / maxVal) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span>Έξοδα</span>
                      <span className="text-red-600 font-medium">{fmt(data.expense)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${(data.expense / maxVal) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}