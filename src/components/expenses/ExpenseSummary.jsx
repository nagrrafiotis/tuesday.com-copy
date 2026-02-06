import React from "react";
import { motion } from "framer-motion";
import { DollarSign, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ExpenseSummary({ expenses, budget }) {
  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Group expenses by phase based on subcategory's phase_id
  const byPhase = phases.map((phase) => {
    // Find subcategories that belong to this phase
    const phaseSubcategories = subcategories
      .filter((s) => s.phase_id === phase.id)
      .map((s) => s.name);
    
    // Find expenses that have these subcategories
    const phaseExpenses = expenses.filter((e) => 
      e.subcategory && phaseSubcategories.includes(e.subcategory)
    );
    const total = phaseExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return {
      name: phase.name,
      color: phase.color || "bg-blue-100 text-blue-700",
      total,
      count: phaseExpenses.length,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
    };
  }).filter((p) => p.count > 0);

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

      {/* By Phase */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#1e3a5f]" />
          <h3 className="font-semibold text-[#1e3a5f]">By Phase</h3>
        </div>
        <div className="space-y-4">
          {byPhase.length > 0 ? (
            byPhase.map((phase, index) => (
              <motion.div
                key={phase.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-lg ${phase.color}`}>
                      <span className="text-xs font-medium">{phase.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">({phase.count})</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(phase.total)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${phase.color.split(" ")[0]} transition-all`}
                    style={{ width: `${phase.percentage}%` }}
                  />
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No phase data available</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}