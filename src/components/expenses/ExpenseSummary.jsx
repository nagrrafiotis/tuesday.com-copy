import React from "react";
import { motion } from "framer-motion";
import { Users, Wrench, Package, Truck, Receipt, DollarSign } from "lucide-react";

const categoryConfig = {
  labor: { label: "Labor", icon: Users, color: "bg-blue-500" },
  subcontractor: { label: "Subcontractor", icon: Wrench, color: "bg-purple-500" },
  materials: { label: "Materials", icon: Package, color: "bg-amber-500" },
  equipment: { label: "Equipment", icon: Truck, color: "bg-emerald-500" },
  general_expenses: { label: "General Expenses", icon: Receipt, color: "bg-gray-500" },
};

export default function ExpenseSummary({ expenses, budget }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const byCategory = Object.keys(categoryConfig).map((key) => {
    const categoryExpenses = expenses.filter((e) => e.category === key);
    const total = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    return {
      key,
      ...categoryConfig[key],
      total,
      count: categoryExpenses.length,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
    };
  });

  const budgetUsed = budget ? (totalExpenses / budget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Total & Budget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1e3a5f] rounded-2xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/10">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-white/70">Total Expenses</span>
        </div>
        <p className="text-3xl font-bold mb-4">{formatCurrency(totalExpenses)}</p>

        {budget && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Budget Used</span>
              <span className="font-medium">{budgetUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  budgetUsed > 90 ? "bg-red-400" : budgetUsed > 75 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              />
            </div>
            <p className="text-sm text-white/60">
              {formatCurrency(budget - totalExpenses)} remaining of {formatCurrency(budget)}
            </p>
          </div>
        )}
      </motion.div>

      {/* By Category */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="font-semibold text-[#1e3a5f] mb-4">By Category</h3>
        <div className="space-y-4">
          {byCategory.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${cat.color} bg-opacity-10`}>
                      <Icon className={`w-3.5 h-3.5 ${cat.color.replace("bg-", "text-")}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                    <span className="text-xs text-gray-400">({cat.count})</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${cat.color} transition-all`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}