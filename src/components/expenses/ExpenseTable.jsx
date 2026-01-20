import React, { useState } from "react";
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
  const [columnWidths, setColumnWidths] = useState({
    date: 120,
    category: 150,
    project: 150,
    payee: 150,
    description: 200,
    payment: 150,
    amount: 120,
  });
  const [resizing, setResizing] = useState(null);

  const getProjectName = (projectId) => {
    const project = projects?.find((p) => p.id === projectId);
    return project?.name || "Unknown";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleMouseDown = (column, e) => {
    e.preventDefault();
    setResizing({ column, startX: e.clientX, startWidth: columnWidths[column] });
  };

  React.useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(80, resizing.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizing.column]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

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
            <TableHead style={{ width: columnWidths.date }} className="relative group">
              Date
              <div
                onMouseDown={(e) => handleMouseDown('date', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.category }} className="relative group">
              Category
              <div
                onMouseDown={(e) => handleMouseDown('category', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            {showProject && (
              <TableHead style={{ width: columnWidths.project }} className="relative group">
                Project
                <div
                  onMouseDown={(e) => handleMouseDown('project', e)}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </TableHead>
            )}
            <TableHead style={{ width: columnWidths.payee }} className="relative group">
              Payee
              <div
                onMouseDown={(e) => handleMouseDown('payee', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.description }} className="relative group">
              Description
              <div
                onMouseDown={(e) => handleMouseDown('description', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.payment }} className="relative group">
              Payment Source
              <div
                onMouseDown={(e) => handleMouseDown('payment', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.amount }} className="text-right relative group">
              Amount
              <div
                onMouseDown={(e) => handleMouseDown('amount', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
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
                  {format(new Date(expense.date), "d MMM yyyy")}
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