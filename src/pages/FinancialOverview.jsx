import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, Download,
  Building2, BarChart3, ArrowUpRight, ArrowDownRight, Target
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#1e3a5f", "#c9a962", "#10b981", "#ef4444", "#8b5cf6", "#f59e0b"];

export default function FinancialOverview() {
  const [activeTab, setActiveTab] = useState("overall");

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
    staleTime: 60000,
  });
  const { data: incomes = [], isLoading: incomesLoading } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
    staleTime: 60000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
    staleTime: 60000,
  });
  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
    staleTime: 60000,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const fmt = (amount) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount || 0);

  const totalIncome = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalDirectExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalInvoiceExpenses = invoices.filter(i => i.type === "expense" && i.status !== "transferred").reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalExpenses = totalDirectExpenses + totalInvoiceExpenses;
  const netProfit = totalIncome - totalExpenses;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

  // Per project stats
  const projectStats = projects.map((p) => {
    const pExpenses = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + (e.amount || 0), 0);
    const pInvoiceExpenses = invoices.filter(i => i.project_id === p.id && i.type === "expense" && i.status !== "transferred").reduce((s, i) => s + (i.total_amount || 0), 0);
    const totalExpenses = pExpenses + pInvoiceExpenses;
    const pIncome = incomes.filter(i => i.project_id === p.id).reduce((s, i) => s + (i.amount || 0), 0);
    const budget = p.budget || 0;
    const budgetUsed = budget > 0 ? (totalExpenses / budget) * 100 : 0;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      budget,
      expenses: totalExpenses,
      expensesBreakdown: { direct: pExpenses, invoices: pInvoiceExpenses },
      income: pIncome,
      net: pIncome - totalExpenses,
      budgetUsed,
      budgetRemaining: budget - totalExpenses,
    };
  });

  // By payment source
  const byPaymentSource = paymentSources.map((ps) => ({
    name: ps.name,
    income: incomes.filter(i => i.payment_source === ps.name).reduce((s, i) => s + (i.amount || 0), 0),
    expense: expenses.filter(e => e.payment_source === ps.name).reduce((s, e) => s + (e.amount || 0), 0),
  })).map(ps => ({ ...ps, balance: ps.income - ps.expense }));

  // Expense by category (overall)
  const expByCat = {};
  expenses.forEach(e => { expByCat[e.category || "other"] = (expByCat[e.category || "other"] || 0) + (e.amount || 0); });
  const expCatData = Object.entries(expByCat).map(([name, value]) => ({ name, value }));

  // Income by category
  const incByCat = {};
  incomes.forEach(i => { incByCat[i.category || "other"] = (incByCat[i.category || "other"] || 0) + (i.amount || 0); });
  const incCatData = Object.entries(incByCat).map(([name, value]) => ({ name, value }));

  // Project chart data
  const projectChartData = projectStats.map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    Budget: p.budget,
    Expenses: p.expenses,
    Income: p.income,
  }));

  const exportCSV = () => {
    const rows = [
      ["Project", "Budget (€)", "Expenses (€)", "Income (€)", "Net (€)", "Budget Used %"],
      ...projectStats.map(p => [p.name, p.budget, p.expenses, p.income, p.net, p.budgetUsed.toFixed(1)]),
      [],
      ["OVERALL", totalBudget, totalExpenses, totalIncome, netProfit, ""],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `financial_overview_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const statusColors = {
    planning: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    on_hold: "bg-gray-100 text-gray-700",
    completed: "bg-emerald-100 text-emerald-700",
  };

  if (expensesLoading || incomesLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f]/20 border-t-[#1e3a5f] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Financial Overview</h1>
            <p className="text-gray-500 mt-1">Overall & per-project income, expenses and budget analysis</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Income", value: fmt(totalIncome), icon: TrendingUp, color: "bg-emerald-50 border-emerald-200 text-emerald-700", iconColor: "text-emerald-600" },
            { label: "Total Expenses", value: fmt(totalExpenses), icon: TrendingDown, color: "bg-red-50 border-red-200 text-red-700", iconColor: "text-red-600" },
            { label: "Net Profit / Loss", value: fmt(netProfit), icon: DollarSign, color: netProfit >= 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-orange-50 border-orange-200 text-orange-700", iconColor: netProfit >= 0 ? "text-blue-600" : "text-orange-600" },
            { label: "Total Budget", value: fmt(totalBudget), icon: Target, color: "bg-purple-50 border-purple-200 text-purple-700", iconColor: "text-purple-600" },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className={`border ${k.color}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                  <CardTitle className="text-xs font-medium">{k.label}</CardTitle>
                  <k.icon className={`h-4 w-4 ${k.iconColor}`} />
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="text-xl font-bold">{k.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overall">Overall</TabsTrigger>
            <TabsTrigger value="perproject">Per Project</TabsTrigger>
            <TabsTrigger value="sources">Payment Sources</TabsTrigger>
          </TabsList>

          {/* OVERALL TAB */}
          <TabsContent value="overall" className="space-y-6">
            {/* Project comparison chart */}
            {projectChartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Budget vs Expenses vs Income by Project</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectChartData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" angle={0} textAnchor="middle" interval={0} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="Budget" fill="#c9a962" radius={[4,4,0,0]} />
                    <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
                    <Bar dataKey="Income" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expenses by category */}
              {expCatData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Expenses by Category</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expCatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                        {expCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Income by category */}
              {incCatData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Income by Category</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={incCatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                        {incCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </TabsContent>

          {/* PER PROJECT TAB */}
          <TabsContent value="perproject" className="space-y-4">
            {projectStats.length === 0 && (
              <div className="text-center py-16 text-gray-400">No projects found</div>
            )}
            {projectStats.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#1e3a5f]/10">
                      <Building2 className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                      <Badge className={`${statusColors[p.status] || "bg-gray-100 text-gray-700"} border-0 text-xs mt-0.5`}>
                        {p.status?.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className={`text-xl font-bold flex items-center gap-1 ${p.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {p.net >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    {fmt(p.net)}
                    <span className="text-sm font-normal text-gray-400 ml-1">net</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-xs text-purple-600 font-medium">Budget</p>
                    <p className="text-lg font-bold text-purple-900">{fmt(p.budget)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-xs text-red-600 font-medium">Expenses</p>
                    <p className="text-lg font-bold text-red-900">{fmt(p.expenses)}</p>
                    {p.expensesBreakdown.invoices > 0 && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-[10px] text-red-400">Direct: {fmt(p.expensesBreakdown.direct)}</p>
                        <p className="text-[10px] text-red-400">Invoices: {fmt(p.expensesBreakdown.invoices)}</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-emerald-600 font-medium">Income</p>
                    <p className="text-lg font-bold text-emerald-900">{fmt(p.income)}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${p.budgetRemaining >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
                    <p className={`text-xs font-medium ${p.budgetRemaining >= 0 ? "text-blue-600" : "text-orange-600"}`}>Budget Remaining</p>
                    <p className={`text-lg font-bold ${p.budgetRemaining >= 0 ? "text-blue-900" : "text-orange-900"}`}>{fmt(p.budgetRemaining)}</p>
                  </div>
                </div>

                {p.budget > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Budget used</span>
                      <span className={p.budgetUsed > 100 ? "text-red-600 font-semibold" : "text-gray-600"}>{p.budgetUsed.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(p.budgetUsed, 100)} className={`h-2 ${p.budgetUsed > 100 ? "[&>div]:bg-red-500" : "[&>div]:bg-[#1e3a5f]"}`} />
                  </div>
                )}
              </motion.div>
            ))}
          </TabsContent>

          {/* PAYMENT SOURCES TAB */}
          <TabsContent value="sources" className="space-y-4">
            {byPaymentSource.length === 0 && (
              <div className="text-center py-16 text-gray-400">No payment sources configured</div>
            )}
            {byPaymentSource.map((ps, i) => (
              <motion.div key={ps.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#1e3a5f]/10">
                      <Wallet className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{ps.name}</h3>
                  </div>
                  <div className={`text-xl font-bold ${ps.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {fmt(ps.balance)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-emerald-600 text-xs font-medium">Income</p>
                    <p className="font-bold text-emerald-900">{fmt(ps.income)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-red-600 text-xs font-medium">Expenses</p>
                    <p className="font-bold text-red-900">{fmt(ps.expense)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}