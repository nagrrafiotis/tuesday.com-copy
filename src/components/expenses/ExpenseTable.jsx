import React, { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { MoreHorizontal, Users, Wrench, Package, Truck, Receipt, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const categoryIcons = {
  labor: Users,
  subcontractor: Wrench,
  materials: Package,
  equipment: Truck,
  general_expenses: Receipt,
};

const categoryColors = {
  labor: "bg-blue-100 text-blue-700",
  subcontractor: "bg-purple-100 text-purple-700",
  materials: "bg-amber-100 text-amber-700",
  equipment: "bg-emerald-100 text-emerald-700",
  general_expenses: "bg-gray-100 text-gray-700",
};

export default function ExpenseTable({ expenses, projects, contacts = [], onEdit, onDelete, showProject = false, selectedExpenses = [], onSelectAll, onSelectExpense, onViewContact }) {
  const [columnWidths, setColumnWidths] = useState({
    date: 120,
    phase: 140,
    category: 150,
    subcategory: 150,
    project: 150,
    payee: 150,
    description: 200,
    payment: 150,
    amount: 120,
  });
  const [resizing, setResizing] = useState(null);

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
  });

  const getProjectName = (projectId) => {
    const project = projects?.find((p) => p.id === projectId);
    return project?.name || "Unknown";
  };

  const getProjectPhase = (subcategoryName) => {
    if (!subcategoryName) return null;
    const subcategory = subcategories.find((s) => s.name === subcategoryName);
    if (!subcategory || !subcategory.phase_id) return null;
    const phase = phases.find((p) => p.id === subcategory.phase_id);
    if (!phase) return null;
    return {
      name: phase.name,
      color: phase.color || "bg-blue-100 text-blue-700"
    };
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

  const handleDoubleClick = (column) => {
    // Auto-resize column to fit content
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '14px Inter, system-ui, sans-serif';
    
    let maxWidth = 80;
    
    expenses.forEach(expense => {
      let text = '';
      switch(column) {
        case 'date':
          text = format(new Date(expense.date), "dd/MM/yy");
          break;
        case 'phase':
          const phase = getProjectPhase(expense.subcategory);
          text = phase?.name || "—";
          break;
        case 'category':
          text = expense.category ? expense.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "General";
          break;
        case 'subcategory':
          text = expense.subcategory || "—";
          break;
        case 'project':
          text = getProjectName(expense.project_id);
          break;
        case 'payee':
          text = expense.payee || "—";
          break;
        case 'description':
          text = expense.description || "—";
          break;
        case 'payment':
          text = expense.payment_source || "—";
          break;
        case 'amount':
          text = formatCurrency(expense.amount);
          break;
      }
      const width = context.measureText(text).width + 40; // padding
      maxWidth = Math.max(maxWidth, width);
    });
    
    setColumnWidths(prev => ({ ...prev, [column]: Math.min(maxWidth, 500) }));
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
      className="bg-white rounded-xl shadow-sm border border-gray-100 w-full"
    >
      <div className="overflow-auto max-h-[calc(100vh-300px)] w-full relative">
        <Table>
        <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm">
          <TableRow className="bg-gray-50">
            <TableHead className="w-12 bg-gray-50">
              <Checkbox
                checked={selectedExpenses.length === expenses.length && expenses.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.date }} className="relative group bg-gray-50">
              Date
              <div
                onMouseDown={(e) => handleMouseDown('date', e)}
                onDoubleClick={() => handleDoubleClick('date')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.phase }} className="relative group bg-gray-50">
              Phase
              <div
                onMouseDown={(e) => handleMouseDown('phase', e)}
                onDoubleClick={() => handleDoubleClick('phase')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.category }} className="relative group bg-gray-50">
              Category
              <div
                onMouseDown={(e) => handleMouseDown('category', e)}
                onDoubleClick={() => handleDoubleClick('category')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.subcategory }} className="relative group bg-gray-50">
              Subcategory
              <div
                onMouseDown={(e) => handleMouseDown('subcategory', e)}
                onDoubleClick={() => handleDoubleClick('subcategory')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            {showProject && (
              <TableHead style={{ width: columnWidths.project }} className="relative group bg-gray-50">
                Project
                <div
                  onMouseDown={(e) => handleMouseDown('project', e)}
                  onDoubleClick={() => handleDoubleClick('project')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </TableHead>
            )}
            <TableHead style={{ width: columnWidths.payee }} className="relative group bg-gray-50">
              Payee
              <div
                onMouseDown={(e) => handleMouseDown('payee', e)}
                onDoubleClick={() => handleDoubleClick('payee')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.description }} className="relative group bg-gray-50">
              Description
              <div
                onMouseDown={(e) => handleMouseDown('description', e)}
                onDoubleClick={() => handleDoubleClick('description')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.payment }} className="relative group bg-gray-50">
              Payment Source
              <div
                onMouseDown={(e) => handleMouseDown('payment', e)}
                onDoubleClick={() => handleDoubleClick('payment')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.amount }} className="text-right relative group bg-gray-50">
              Amount
              <div
                onMouseDown={(e) => handleMouseDown('amount', e)}
                onDoubleClick={() => handleDoubleClick('amount')}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead className="w-12 bg-gray-50"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense, index) => {
            const Icon = categoryIcons[expense.category] || Receipt;
            const color = categoryColors[expense.category] || "bg-gray-100 text-gray-700";
            const label = expense.category ? expense.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "General";

            return (
              <motion.tr
                key={expense.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedExpenses.includes(expense.id)}
                    onCheckedChange={() => onSelectExpense(expense.id)}
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-600">
                  {format(new Date(expense.date), "dd/MM/yy")}
                </TableCell>
                <TableCell>
                  {(() => {
                    const phase = getProjectPhase(expense.subcategory);
                    return phase ? (
                      <Badge className={`${phase.color} border-0 gap-1.5`}>
                        <Layers className="w-3 h-3" />
                        {phase.name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Badge className={`${color} border-0 gap-1.5`}>
                    <Icon className="w-3 h-3" />
                    {label}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600">
                  {expense.subcategory || "—"}
                </TableCell>
                {showProject && (
                  <TableCell className="text-gray-600">
                    {getProjectName(expense.project_id)}
                  </TableCell>
                )}
                <TableCell className="font-medium text-gray-900">
                  {(() => {
                    const contact = contacts.find(c => c.name === expense.payee);
                    return contact ? (
                      <button
                        onClick={() => onViewContact?.(contact)}
                        className="text-left hover:text-[#1e3a5f] underline decoration-dotted underline-offset-2 transition-colors"
                      >
                        {expense.payee}
                      </button>
                    ) : (
                      <span>{expense.payee}</span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-gray-500">
                  {expense.description ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="max-w-xs truncate block cursor-help">
                            {expense.description}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>{expense.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span>—</span>
                  )}
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
                      <DropdownMenuItem onClick={() => onEdit(expense)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(expense)} className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            );
          })}
          <TableRow className="bg-gray-50 border-t-2 border-gray-200">
            <TableCell colSpan={showProject ? 9 : 8} className="text-right font-bold text-gray-900">
              Total
            </TableCell>
            <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">
              {formatCurrency(expenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      </div>
    </motion.div>
  );
}