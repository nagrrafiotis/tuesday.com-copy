import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Landmark, Banknote, Wallet } from "lucide-react";

const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));
const fmtSigned = n => (n >= 0 ? "+" : "") + new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

const isBank = src => src && src.toLowerCase().includes("bank");
const isCash = src => !src || src.toLowerCase().includes("cash") || src.toLowerCase().includes("ταμε") || src.toLowerCase().includes("ταμεί");

export default function PaymentSourceSummary() {
  const { data: transactions = [] } = useQuery({
    queryKey: ["bank-transactions"],
    queryFn: () => base44.entities.BankTransaction.list("-date"),
    staleTime: 30000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-summary"],
    queryFn: () => base44.entities.Invoice.list("-date"),
    staleTime: 30000,
  });

  const summary = useMemo(() => {
    // All transactions (no month filter — show ALL time totals)
    const bankIncome = transactions
      .filter(t => t.transaction_type === "credit" && isBank(t.payment_source))
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    const bankExpense = transactions
      .filter(t => t.transaction_type === "debit" && isBank(t.payment_source))
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    const cashIncome = transactions
      .filter(t => t.transaction_type === "credit" && isCash(t.payment_source))
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    const cashExpense = transactions
      .filter(t => t.transaction_type === "debit" && isCash(t.payment_source))
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    // Add income invoices to bank income (non-transferred to avoid double count)
    const invoiceIncomeBank = invoices
      .filter(i => i.type === "income" && i.status !== "transferred" && isBank(i.payment_source))
      .reduce((s, i) => s + Math.abs(i.total_amount || 0), 0);

    const invoiceIncomeCash = invoices
      .filter(i => i.type === "income" && i.status !== "transferred" && isCash(i.payment_source))
      .reduce((s, i) => s + Math.abs(i.total_amount || 0), 0);

    // Other sources (not bank, not cash)
    const otherIncome = transactions
      .filter(t => t.transaction_type === "credit" && !isBank(t.payment_source) && !isCash(t.payment_source))
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    const otherExpense = transactions
      .filter(t => t.transaction_type === "debit" && !isBank(t.payment_source) && !isCash(t.payment_source))
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    return {
      bank: {
        income: bankIncome + invoiceIncomeBank,
        expense: bankExpense,
        invoiceIncome: invoiceIncomeBank,
      },
      cash: {
        income: cashIncome + invoiceIncomeCash,
        expense: cashExpense,
        invoiceIncome: invoiceIncomeCash,
      },
      other: {
        income: otherIncome,
        expense: otherExpense,
      },
      totalIncome: bankIncome + invoiceIncomeBank + cashIncome + invoiceIncomeCash + otherIncome,
      totalExpense: bankExpense + cashExpense + otherExpense,
    };
  }, [transactions, invoices]);

  const sections = [
    {
      key: "bank",
      label: "Τράπεζα (Bank)",
      icon: Landmark,
      color: "blue",
      data: summary.bank,
      invoiceNote: summary.bank.invoiceIncome > 0 ? `Συμπ. τιμολόγια: ${fmt(summary.bank.invoiceIncome)}` : null,
    },
    {
      key: "cash",
      label: "Μετρητά (Cash)",
      icon: Wallet,
      color: "amber",
      data: summary.cash,
      invoiceNote: summary.cash.invoiceIncome > 0 ? `Συμπ. τιμολόγια: ${fmt(summary.cash.invoiceIncome)}` : null,
    },
    ...(summary.other.income > 0 || summary.other.expense > 0 ? [{
      key: "other",
      label: "Άλλες Πηγές",
      icon: Banknote,
      color: "gray",
      data: summary.other,
      invoiceNote: null,
    }] : []),
  ];

  const colorMap = {
    blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", label: "text-blue-800" },
    amber: { bg: "bg-amber-50", icon: "bg-amber-100 text-amber-600", label: "text-amber-800" },
    gray: { bg: "bg-gray-50", icon: "bg-gray-100 text-gray-600", label: "text-gray-800" },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <Landmark className="w-5 h-5 text-[#1e3a5f]" />
        <h3 className="font-semibold text-[#1e3a5f]">Συνολικές Κινήσεις ανά Κατηγορία</h3>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
          <div className="p-1.5 bg-green-100 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Σύνολο Εσόδων</p>
            <p className="font-bold text-green-700">{fmt(summary.totalIncome)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-red-50 rounded-lg p-3">
          <div className="p-1.5 bg-red-100 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Σύνολο Εξόδων</p>
            <p className="font-bold text-red-700">{fmt(summary.totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* Per category */}
      <div className="space-y-3">
        {sections.map(({ key, label, icon: Icon, color, data, invoiceNote }) => {
          const net = data.income - data.expense;
          const maxVal = Math.max(data.income, data.expense, 1);
          const c = colorMap[color];
          return (
            <div key={key} className={`${c.bg} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${c.icon}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`font-semibold text-sm ${c.label}`}>{label}</span>
                </div>
                <span className={`text-sm font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fmtSigned(net)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Income */}
                <div className="bg-white/70 rounded-lg p-2.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" /> Έσοδα
                    </span>
                    <span className="text-xs font-bold text-green-700">{fmt(data.income)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${(data.income / maxVal) * 100}%` }} />
                  </div>
                  {invoiceNote && (
                    <p className="text-[10px] text-gray-400 mt-1">{invoiceNote}</p>
                  )}
                </div>

                {/* Expense */}
                <div className="bg-white/70 rounded-lg p-2.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-500" /> Έξοδα
                    </span>
                    <span className="text-xs font-bold text-red-700">{fmt(data.expense)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(data.expense / maxVal) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}