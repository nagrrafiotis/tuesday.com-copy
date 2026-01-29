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
import { MoreHorizontal, TrendingUp, DollarSign } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const categoryConfig = {
  sales: { label: "Sales", color: "bg-emerald-100 text-emerald-700" },
  investment: { label: "Investment", color: "bg-blue-100 text-blue-700" },
  rental: { label: "Rental", color: "bg-purple-100 text-purple-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-700" },
};

export default function IncomeTable({ incomes, projects, contacts = [], onEdit, onDelete, showProject = false, selectedIncomes = [], onSelectAll, onSelectIncome, onViewContact }) {
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

  if (incomes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No income yet</h3>
        <p className="text-gray-500">Add your first income entry to start tracking revenue</p>
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
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIncomes.length === incomes.length && incomes.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            {showProject && <TableHead>Project</TableHead>}
            <TableHead>Source</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Payment Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incomes.map((income, index) => {
            const config = categoryConfig[income.category] || categoryConfig.other;

            return (
              <motion.tr
                key={income.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIncomes.includes(income.id)}
                    onCheckedChange={() => onSelectIncome(income.id)}
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-600">
                  {format(new Date(income.date), "dd/MM/yy")}
                </TableCell>
                <TableCell>
                  <Badge className={`${config.color} border-0`}>{config.label}</Badge>
                </TableCell>
                {showProject && (
                  <TableCell className="text-gray-600">{getProjectName(income.project_id)}</TableCell>
                )}
                <TableCell className="font-medium text-gray-900">
                  {(() => {
                    const contact = contacts.find(c => c.name === income.source);
                    return contact ? (
                      <button
                        onClick={() => onViewContact?.(contact)}
                        className="text-left hover:text-[#1e3a5f] underline decoration-dotted underline-offset-2 transition-colors"
                      >
                        {income.source}
                      </button>
                    ) : (
                      <span>{income.source}</span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-gray-500 max-w-xs truncate">
                  {income.description || "—"}
                </TableCell>
                <TableCell className="text-gray-600">{income.payment_source || "—"}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-600">
                  {formatCurrency(income.amount)}
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
                      <DropdownMenuItem onClick={() => onEdit?.(income)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete?.(income)} className="text-red-600">
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