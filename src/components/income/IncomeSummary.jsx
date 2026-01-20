import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign } from "lucide-react";

const categoryConfig = {
  sales: { label: "Sales", color: "bg-emerald-500" },
  investment: { label: "Investment", color: "bg-blue-500" },
  rental: { label: "Rental", color: "bg-purple-500" },
  other: { label: "Other", color: "bg-gray-500" },
};

export default function IncomeSummary({ incomes }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalIncome = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

  const byCategory = Object.keys(categoryConfig).map((key) => {
    const categoryIncomes = incomes.filter((i) => i.category === key);
    const total = categoryIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    return {
      key,
      ...categoryConfig[key],
      total,
      count: categoryIncomes.length,
      percentage: totalIncome > 0 ? (total / totalIncome) * 100 : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Total Income */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/10">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-white/70">Total Income</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
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
          {byCategory.map((cat, index) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
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
          ))}
        </div>
      </motion.div>
    </div>
  );
}