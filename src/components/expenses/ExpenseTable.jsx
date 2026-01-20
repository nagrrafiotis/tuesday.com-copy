import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { MoreHorizontal, Users, Wrench, Package, Truck, Receipt } from "lucide-react";

const categoryConfig = {
  labor: { label: "Labor", icon: Users, color: "bg-blue-100 text-blue-700" },
  subcontractor: { label: "Subcontractor", icon: Wrench, color: "bg-purple-100 text-purple-700" },
  materials: { label: "Materials", icon: Package, color: "bg-amber-100 text-amber-700" },
  equipment: { label: "Equipment", icon: Truck, color: "bg-emerald-100 text-emerald-700" },
  general_expenses: { label: "General", icon: Receipt, color: "bg-gray-100 text-gray-700" },
};

export default function ExpenseTable({ expenses, projects, onEdit, onDelete, showProject = false }) {
  const getProjectName = (projectId) => {
    const project = projects?.find((p) => p.id === projectId);
    return project?.name || "Unknown";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No expenses yet</h3>
        <p className="text-gray-500">Add your first expense to start tracking costs</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            {showProject && <TableHead>Project</TableHead>}
            <TableHead>Payee</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Payment Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense, index) => {
            const config = categoryConfig[expense.category] || categoryConfig.general_expenses;
            const Icon = config.icon;

            return (
              <motion.tr
                key={expense.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <TableCell className="font-medium text-gray-600">
                  {format(new Date(expense.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge className={`${config.color} border-0 gap-1.5`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                    {expense.subcategory && (
                      <div className="text-xs text-gray-500">{expense.subcategory}</div>
                    )}
                  </div>
                </TableCell>
                {showProject && (
                  <TableCell className="text-gray-600">
                    {getProjectName(expense.project_id)}
                  </TableCell>
                )}
                <TableCell className="font-medium text-gray-900">{expense.payee}</TableCell>
                <TableCell className="text-gray-500 max-w-xs truncate">
                  {expense.description || "—"}
                </TableCell>
                <TableCell className="text-gray-600">
                  {expense.payment_source || "—"}
                </TableCell>
                <TableCell className="text-right font-semibold text-[#1e3a5f]">
                  {formatCurrency(expense.amount)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(expense)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete?.(expense)} className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </motion.div>
  );
}