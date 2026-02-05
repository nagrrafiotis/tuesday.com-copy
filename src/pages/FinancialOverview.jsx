import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FinancialOverview() {
  const [projectFilter, setProjectFilter] = useState("all");

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: incomes = [], isLoading: incomesLoading } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredExpenses = projectFilter === "all" 
    ? expenses 
    : expenses.filter(e => e.project_id === projectFilter);

  const filteredIncomes = projectFilter === "all"
    ? incomes
    : incomes.filter(i => i.project_id === projectFilter);

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const byPaymentSource = paymentSources.map((ps) => {
    const income = filteredIncomes
      .filter(i => i.payment_source === ps.name)
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    const expense = filteredExpenses
      .filter(e => e.payment_source === ps.name)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      name: ps.name,
      income,
      expense,
      balance: income - expense,
    };
  });

  const exportToExcel = () => {
    const csvData = [
      ["Payment Source", "Income (€)", "Expenses (€)", "Balance (€)"],
      ...byPaymentSource.map((ps) => [
        ps.name,
        ps.income,
        ps.expense,
        ps.balance,
      ]),
      ["", "", "", ""],
      ["Summary", "", "", ""],
      ["Total Income", totalIncome, "", ""],
      ["Total Expenses", totalExpenses, "", ""],
      ["Net Profit/Loss", netProfit, "", ""],
    ];

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `financial_overview_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (expensesLoading || incomesLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Financial Overview</h1>
            <p className="text-gray-500 mt-1">Track income, expenses, and balances</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">
                  Total Income
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">
                  {formatCurrency(totalIncome)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-700">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">
                  {formatCurrency(totalExpenses)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`${netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className={`text-sm font-medium ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  Net Profit/Loss
                </CardTitle>
                <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                  {formatCurrency(netProfit)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* By Payment Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-xl font-semibold text-[#1e3a5f] mb-6">Balance by Payment Source</h2>
          <div className="space-y-4">
            {byPaymentSource.map((ps, index) => (
              <motion.div
                key={ps.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="border border-gray-100 rounded-xl p-4 hover:border-[#c9a962]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#1e3a5f]/10">
                      <Wallet className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{ps.name}</h3>
                  </div>
                  <div className={`text-lg font-bold ${ps.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(ps.balance)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Income</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(ps.income)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expenses</p>
                    <p className="font-semibold text-red-600">{formatCurrency(ps.expense)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}