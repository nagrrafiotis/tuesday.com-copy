import React from "react";
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ExpenseSummary({ expenses, budget }) {
  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

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
    </div>
  );
}