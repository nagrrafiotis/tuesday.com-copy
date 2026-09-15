import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, TrendingDown, Users } from "lucide-react";

const CASH_RE = /cash|μετρητά|ταμείο/i;
const isCash = r => r.payment_method === "cash" || CASH_RE.test(r.payment_source || "");

export default function CashRegisterCard() {
  const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

  const { data: expenses = [] } = useQuery({
    queryKey: ["general-expenses"],
    queryFn: () => base44.entities.GeneralExpense.list("-date"),
  });
  const { data: incomes = [] } = useQuery({
    queryKey: ["general-income"],
    queryFn: () => base44.entities.GeneralIncome.list("-date"),
  });

  const cashIncomes = incomes.filter(isCash);
  const cashExpenses = expenses.filter(isCash);
  const totalCashIn = cashIncomes.reduce((s, r) => s + (r.total_amount || 0), 0);
  const totalCashOut = cashExpenses.reduce((s, r) => s + (r.amount || 0), 0);
  const balance = totalCashIn - totalCashOut;

  const partnerTotals = {};
  cashExpenses.forEach(r => {
    const p = r.partner;
    if (!p) return;
    if (!partnerTotals[p]) partnerTotals[p] = { amount: 0, count: 0 };
    partnerTotals[p].amount += r.amount || 0;
    partnerTotals[p].count += 1;
  });
  const partnerRows = Object.entries(partnerTotals).sort((a, b) => b[1].amount - a[1].amount);
  const totalToPartners = partnerRows.reduce((s, [, v]) => s + v.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-[#1e3a5f]">Ταμείο PRVK (Cash)</h3>
          <p className="text-xs text-gray-500">Έσοδα & έξοδα σε μετρητά, υπόλοιπο ταμείου και αποστολές σε εταίρους</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Έσοδα Cash</span>
            </div>
            <p className="text-xl font-bold text-emerald-700 tabular-nums">{fmt(totalCashIn)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{cashIncomes.length} εγγραφές</p>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4">
            <div className="flex items-center gap-2 text-rose-700 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">Έξοδα Cash</span>
            </div>
            <p className="text-xl font-bold text-rose-700 tabular-nums">{fmt(totalCashOut)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{cashExpenses.length} εγγραφές</p>
          </div>
          <div className={`rounded-lg border p-4 ${balance >= 0 ? "border-[#1e3a5f]/20 bg-[#1e3a5f]/5" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-[#1e3a5f]" />
              <span className="text-xs font-medium text-gray-600">Υπόλοιπο Ταμείου</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${balance >= 0 ? "text-[#1e3a5f]" : "text-red-600"}`}>{fmt(balance)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">έσοδα − έξοδα</p>
          </div>
        </div>

        {/* Partner distributions */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#c9a962]" />
            <h4 className="text-sm font-semibold text-[#1e3a5f]">Αποστολές σε εταίρους (cash)</h4>
          </div>
          {partnerRows.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              Δεν έχουν καταχωρηθεί αποστολές σε εταίρους.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Εταίρος</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Ποσό</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 w-24">Εγγραφές</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerRows.map(([name, v], i) => (
                    <tr key={name} className="border-b border-gray-50 last:border-0 hover:bg-amber-50/40">
                      <td className="px-3 py-2 font-medium text-[#1e3a5f]">{name}</td>
                      <td className="px-3 py-2 text-right font-semibold text-rose-700 tabular-nums">{fmt(v.amount)}</td>
                      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{v.count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-600">Σύνολο</td>
                    <td className="px-3 py-2 text-right font-bold text-[#1e3a5f] tabular-nums">{fmt(totalToPartners)}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}