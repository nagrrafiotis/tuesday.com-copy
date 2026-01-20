import React from "react";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "navy" }) {
  const colorClasses = {
    navy: "bg-[#1e3a5f] text-white",
    gold: "bg-[#c9a962] text-white",
    white: "bg-white text-[#1e3a5f] border border-gray-100",
    green: "bg-emerald-500 text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 ${colorClasses[color]} shadow-sm`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${color === "white" ? "text-gray-500" : "text-white/70"}`}>
            {title}
          </p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className={`text-sm mt-1 ${color === "white" ? "text-gray-400" : "text-white/60"}`}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${color === "white" ? "bg-gray-50" : "bg-white/10"}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1">
          <span className={`text-sm ${trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
          <span className={`text-xs ${color === "white" ? "text-gray-400" : "text-white/50"}`}>
            vs last month
          </span>
        </div>
      )}
    </motion.div>
  );
}