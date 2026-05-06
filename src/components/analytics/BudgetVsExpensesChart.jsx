import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const budget = payload.find(p => p.dataKey === "budget")?.value || 0;
  const expenses = payload.find(p => p.dataKey === "expenses")?.value || 0;
  const diff = budget - expenses;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-2 truncate">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1e3a5f] inline-block" /> Προϋπολογισμός
          </span>
          <span className="font-semibold text-[#1e3a5f]">{formatCurrency(budget)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#c9a962] inline-block" /> Πραγματικά
          </span>
          <span className="font-semibold text-[#c9a962]">{formatCurrency(expenses)}</span>
        </div>
        <div className="border-t pt-1.5 flex justify-between gap-4">
          <span className="text-gray-500">Διαφορά</span>
          <span className={`font-bold ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function BudgetVsExpensesChart() {
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
    staleTime: 30000,
  });

  const { data: budgetItems = [] } = useQuery({
    queryKey: ["all-budget-items"],
    queryFn: () => base44.entities.BudgetItem.list(),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list(),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // Build per-project data
  const chartData = projects
    .map((project) => {
      const budget = budgetItems
        .filter(b => b.project_id === project.id)
        .reduce((sum, b) => sum + (b.total_cost || 0), 0);

      const expensesTotal = expenses
        .filter(e => e.project_id === project.id)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const invoicesTotal = invoices
        .filter(inv => inv.project_id === project.id && inv.type === "expense")
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      const actualTotal = expensesTotal + invoicesTotal;

      return { name: project.name, budget, expenses: actualTotal, diff: budget - actualTotal };
    })
    .filter(d => d.budget > 0 || d.expenses > 0); // show only projects with data

  if (chartData.length === 0) return null;

  const overBudgetCount = chartData.filter(d => d.diff < 0).length;
  const onBudgetCount = chartData.filter(d => d.diff >= 0 && d.budget > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <TrendingUp className="w-5 h-5" />
            Budget vs Πραγματικά Expenses
          </CardTitle>
          <div className="flex items-center gap-2">
            {overBudgetCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {overBudgetCount} υπέρβαση
              </Badge>
            )}
            {onBudgetCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {onBudgetCount} εντός budget
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
            barCategoryGap="30%"
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={70}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              formatter={(value) => value === "budget" ? "Προϋπολογισμός" : "Πραγματικά Expenses"}
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <Bar dataKey="budget" name="budget" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="expenses" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.expenses > entry.budget && entry.budget > 0 ? "#ef4444" : "#c9a962"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary table */}
        <div className="mt-4 space-y-2">
          {chartData.map((d) => {
            const pct = d.budget > 0 ? Math.round((d.expenses / d.budget) * 100) : null;
            const over = d.expenses > d.budget && d.budget > 0;
            return (
              <div key={d.name} className="flex items-center gap-3 text-sm">
                <span className="w-36 truncate text-gray-700 font-medium shrink-0">{d.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-500" : "bg-[#c9a962]"}`}
                    style={{ width: `${Math.min(pct || 0, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-12 text-right shrink-0 ${over ? "text-red-600" : "text-gray-500"}`}>
                  {pct !== null ? `${pct}%` : "—"}
                </span>
                <span className={`text-xs w-20 text-right shrink-0 font-medium ${d.diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {d.diff >= 0 ? "+" : ""}{formatCurrency(d.diff)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}