import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { DollarSign, CreditCard } from "lucide-react";

const CATEGORY_COLORS = {
  labor: "#3b82f6",
  subcontractor: "#8b5cf6",
  materials: "#10b981",
  equipment: "#f59e0b",
  general_expenses: "#6b7280",
};

const PAYMENT_SOURCE_COLORS = [
  "#0073EA", "#00C875", "#FDAB3D", "#E2445C", "#9CD326", 
  "#784BD1", "#FF158A", "#00B2FF", "#579BFC", "#A25DDC"
];

export default function ExpenseCharts({ expenses }) {
  // Expenses per category
  const categoryData = expenses.reduce((acc, expense) => {
    const cat = expense.category;
    if (!acc[cat]) {
      acc[cat] = { category: cat, amount: 0, count: 0 };
    }
    acc[cat].amount += expense.amount;
    acc[cat].count += 1;
    return acc;
  }, {});

  const categoryChartData = Object.values(categoryData).map(item => ({
    name: item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    amount: item.amount,
    count: item.count,
  }));

  // Expenses per payment source
  const paymentSourceData = expenses.reduce((acc, expense) => {
    const source = expense.payment_source || 'Not specified';
    if (!acc[source]) {
      acc[source] = { source, amount: 0, count: 0 };
    }
    acc[source].amount += expense.amount;
    acc[source].count += 1;
    return acc;
  }, {});

  const paymentSourceChartData = Object.values(paymentSourceData).map(item => ({
    name: item.source,
    amount: item.amount,
    count: item.count,
  }));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
          <p className="text-sm text-gray-600">
            Amount: <span className="font-semibold text-[#1e3a5f]">{formatCurrency(payload[0].value)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Transactions: <span className="font-semibold">{payload[0].payload.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Expenses per Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#1e3a5f]" />
            Expenses per Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData}>
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={12}
              />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {categoryChartData.map((entry, index) => {
                  const originalKey = Object.keys(categoryData).find(
                    key => categoryData[key].category === expenses.find(e => 
                      e.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) === entry.name.replace(/_/g, ' ')
                    )?.category
                  );
                  const color = CATEGORY_COLORS[Object.keys(categoryData)[index]] || CATEGORY_COLORS[originalKey] || "#6b7280";
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>


    </div>
  );
}