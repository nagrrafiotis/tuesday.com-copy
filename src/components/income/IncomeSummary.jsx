import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const colorToBg = {
  "bg-emerald-100 text-emerald-700": "bg-emerald-500",
  "bg-blue-100 text-blue-700": "bg-blue-500",
  "bg-purple-100 text-purple-700": "bg-purple-500",
  "bg-amber-100 text-amber-700": "bg-amber-500",
  "bg-pink-100 text-pink-700": "bg-pink-500",
  "bg-indigo-100 text-indigo-700": "bg-indigo-500",
  "bg-rose-100 text-rose-700": "bg-rose-500",
  "bg-cyan-100 text-cyan-700": "bg-cyan-500",
  "bg-orange-100 text-orange-700": "bg-orange-500",
  "bg-teal-100 text-teal-700": "bg-teal-500",
  "bg-violet-100 text-violet-700": "bg-violet-500",
  "bg-lime-100 text-lime-700": "bg-lime-500",
  "bg-gray-100 text-gray-700": "bg-gray-500",
};

export default function IncomeSummary({ incomes }) {
  const { data: dropdownLists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  const incomeList = dropdownLists.find(l => l.list_name === "income_categories");
  const incomeCategories = incomeList?.options || ["sales", "investment", "rental", "other"];
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalIncome = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

  const byCategory = incomeCategories.map((category) => {
    const categoryIncomes = incomes.filter((i) => i.category === category);
    const total = categoryIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const customColor = incomeList?.colors?.[category];
    const bgColor = customColor ? colorToBg[customColor] || "bg-gray-500" : "bg-gray-500";
    
    return {
      key: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      color: bgColor,
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