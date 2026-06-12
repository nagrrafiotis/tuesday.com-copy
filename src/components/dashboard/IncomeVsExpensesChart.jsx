import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const fmt = (v) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const income = payload.find(p => p.dataKey === "Έσοδα")?.value || 0;
  const expenses = payload.find(p => p.dataKey === "Έξοδα")?.value || 0;
  const balance = income - expenses;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[180px]">
      <p className="font-semibold text-[#1e3a5f] mb-2 truncate max-w-[200px]">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-emerald-600">Έσοδα</span>
          <span className="font-bold text-emerald-700">{fmt(income)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-red-500">Έξοδα</span>
          <span className="font-bold text-red-600">{fmt(expenses)}</span>
        </div>
        <div className={`flex justify-between gap-4 border-t border-gray-100 pt-1 mt-1`}>
          <span className="text-gray-600 font-medium">Υπόλοιπο</span>
          <span className={`font-bold ${balance >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(balance)}</span>
        </div>
      </div>
    </div>
  );
};

export default function IncomeVsExpensesChart() {
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

  const chartData = projects
    .map((project) => {
      const projExpenses = expenses.filter(e => e.project_id === project.id)
        .reduce((s, e) => s + (e.amount || 0), 0);
      const projInvExpenses = invoices.filter(inv => inv.project_id === project.id && inv.type === "expense")
        .reduce((s, inv) => s + (inv.total_amount || 0), 0);
      const projIncomes = incomes.filter(i => i.project_id === project.id)
        .reduce((s, i) => s + (i.amount || 0), 0);
      const projInvIncomes = invoices.filter(inv => inv.project_id === project.id && inv.type === "income" && inv.status === "transferred")
        .reduce((s, inv) => s + (inv.total_amount || 0), 0);

      const totalExpenses = projExpenses + projInvExpenses;
      const totalIncomes = projIncomes + projInvIncomes;
      return {
        name: project.name.length > 18 ? project.name.slice(0, 16) + "…" : project.name,
        fullName: project.name,
        Έσοδα: totalIncomes,
        Έξοδα: totalExpenses,
        balance: totalIncomes - totalExpenses,
      };
    })
    .filter(d => d.Έσοδα > 0 || d.Έξοδα > 0);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#1e3a5f]">Έσοδα vs Έξοδα ανά Έργο</h2>
        <p className="text-xs text-gray-400 mt-0.5">Διαθέσιμο υπόλοιπο ανά έργο</p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Bar dataKey="Έσοδα" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Έξοδα" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Balance pills */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
        {chartData.map(d => (
          <div key={d.fullName} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            d.balance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            <span className="truncate max-w-[120px]">{d.fullName}</span>
            <span className="font-bold">{d.balance >= 0 ? "+" : ""}{fmt(d.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}