import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { MoreHorizontal, Users, Wrench, Package, Truck, Receipt, Layers, CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const categoryIcons = {
  labor: Users, subcontractor: Wrench, materials: Package, equipment: Truck, general_expenses: Receipt,
};
const categoryColors = {
  labor: "bg-blue-100 text-blue-700", subcontractor: "bg-purple-100 text-purple-700",
  materials: "bg-amber-100 text-amber-700", equipment: "bg-emerald-100 text-emerald-700",
  general_expenses: "bg-gray-100 text-gray-700",
};

function InlineText({ value, onSave }) {
  const [val, setVal] = useState(value || "");
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => onSave(val);
  return (
    <Input
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onSave(value); }}
      className="h-7 text-sm px-2 py-0 min-w-[120px]"
    />
  );
}

function InlineNumber({ value, onSave }) {
  const [val, setVal] = useState(value || 0);
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const save = () => onSave(Number(val));
  return (
    <Input
      ref={ref}
      type="number"
      step="0.01"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onSave(value); }}
      className="h-7 text-sm px-2 py-0 w-[110px]"
    />
  );
}

export default function ExpenseTable({ expenses, projects, contacts = [], onEdit, onDelete, onUpdate, showProject = false, selectedExpenses = [], onSelectAll, onSelectExpense, onViewContact }) {
  const [editingCell, setEditingCell] = useState(null);

  const { data: subcategories = [] } = useQuery({ queryKey: ["subcategories"], queryFn: () => base44.entities.Subcategory.list() });
  const { data: phases = [] } = useQuery({ queryKey: ["phases"], queryFn: () => base44.entities.ProjectPhase.list("order") });
  const { data: paymentSources = [] } = useQuery({ queryKey: ["paymentSources"], queryFn: () => base44.entities.PaymentSource.list("name") });
  const { data: dropdownLists = [] } = useQuery({ queryKey: ["dropdown-lists"], queryFn: () => base44.entities.DropdownList.list() });

  const expenseCategories = dropdownLists.find(l => l.list_name === "expense_categories")?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"];

  const getProjectPhase = (subcategoryName) => {
    if (!subcategoryName) return null;
    const sub = subcategories.find(s => s.name === subcategoryName);
    if (!sub?.phase_id) return null;
    const phase = phases.find(p => p.id === sub.phase_id);
    if (!phase) return null;
    return { name: phase.name, color: phase.color || "bg-blue-100 text-blue-700" };
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);

  const handleUpdate = (id, field, value) => {
    setEditingCell(null);
    onUpdate?.(id, field, value);
  };

  const isEditing = (id, field) => editingCell?.id === id && editingCell?.field === field;

  const startEdit = (id, field, e) => {
    e.stopPropagation();
    setEditingCell({ id, field });
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-100 w-full">
      <div className="overflow-auto max-h-[calc(100vh-300px)] w-full relative">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm">
            <TableRow className="bg-gray-50">
              <TableHead className="w-12 bg-gray-50">
                <Checkbox checked={selectedExpenses.length === expenses.length && expenses.length > 0} onCheckedChange={onSelectAll} />
              </TableHead>
              <TableHead className="bg-gray-50">Date</TableHead>
              <TableHead className="bg-gray-50">Phase</TableHead>
              <TableHead className="bg-gray-50">Category</TableHead>
              <TableHead className="bg-gray-50">Subcategory</TableHead>
              {showProject && <TableHead className="bg-gray-50">Project</TableHead>}
              <TableHead className="bg-gray-50">Payee</TableHead>
              <TableHead className="bg-gray-50">Description</TableHead>
              <TableHead className="bg-gray-50">Payment Source</TableHead>
              <TableHead className="text-right bg-gray-50">Amount</TableHead>
              <TableHead className="w-12 bg-gray-50"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense, index) => {
              const Icon = categoryIcons[expense.category] || Receipt;
              const color = categoryColors[expense.category] || "bg-gray-100 text-gray-700";
              const label = expense.category ? expense.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "General";

              return (
                <motion.tr key={expense.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="hover:bg-gray-50/50 transition-colors group">
                  <TableCell>
                    <Checkbox checked={selectedExpenses.includes(expense.id)} onCheckedChange={() => onSelectExpense(expense.id)} />
                  </TableCell>

                  <TableCell className="font-medium text-gray-600 cursor-pointer" onClick={(e) => startEdit(expense.id, 'date', e)}>
                    {isEditing(expense.id, 'date') ? (
                      <Popover open onOpenChange={(open) => !open && setEditingCell(null)}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {expense.date ? format(new Date(expense.date), "dd/MM/yy") : "Pick"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={expense.date ? new Date(expense.date) : undefined}
                            onSelect={(d) => handleUpdate(expense.id, 'date', d?.toISOString())} />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">
                        {expense.date ? format(new Date(expense.date), "dd/MM/yy") : "—"}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {(() => {
                      const phase = getProjectPhase(expense.subcategory);
                      return phase ? <Badge className={`${phase.color} border-0 gap-1.5`}><Layers className="w-3 h-3" />{phase.name}</Badge> : <span className="text-gray-400">—</span>;
                    })()}
                  </TableCell>

                  <TableCell className="cursor-pointer" onClick={(e) => startEdit(expense.id, 'category', e)}>
                    {isEditing(expense.id, 'category') ? (
                      <SearchableSelect
                        value={expense.category}
                        onValueChange={(v) => handleUpdate(expense.id, 'category', v)}
                        items={expenseCategories.map(cat => ({ value: cat, label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
                        placeholder="Category"
                        triggerClassName="h-7 text-xs w-[150px]"
                      />
                    ) : (
                      <Badge className={`${color} border-0 gap-1.5 hover:opacity-80`}><Icon className="w-3 h-3" />{label}</Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-gray-600 cursor-pointer" onClick={(e) => startEdit(expense.id, 'subcategory', e)}>
                    {isEditing(expense.id, 'subcategory') ? (
                      <SearchableSelect
                        value={expense.subcategory || ""}
                        onValueChange={(v) => handleUpdate(expense.id, 'subcategory', v)}
                        items={[...subcategories].sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ value: s.name, label: s.name }))}
                        placeholder="Subcategory"
                        triggerClassName="h-7 text-xs w-[150px]"
                      />
                    ) : (
                      <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">{expense.subcategory || "—"}</span>
                    )}
                  </TableCell>

                  {showProject && (
                    <TableCell className="text-gray-600 cursor-pointer" onClick={(e) => startEdit(expense.id, 'project_id', e)}>
                      {isEditing(expense.id, 'project_id') ? (
                        <SearchableSelect
                          value={expense.project_id || ""}
                          onValueChange={(v) => handleUpdate(expense.id, 'project_id', v)}
                          items={(projects || []).map(p => ({ value: p.id, label: p.name }))}
                          placeholder="Project"
                          triggerClassName="h-7 text-xs w-[150px]"
                        />
                      ) : (
                        <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">
                          {projects?.find(p => p.id === expense.project_id)?.name || "—"}
                        </span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="font-medium text-gray-900 cursor-pointer" onClick={(e) => startEdit(expense.id, 'payee', e)}>
                    {isEditing(expense.id, 'payee') ? (
                      <SearchableSelect
                        value={expense.payee || ""}
                        onValueChange={(v) => handleUpdate(expense.id, 'payee', v)}
                        items={contacts.map(c => ({ value: c.name, label: c.name }))}
                        placeholder="Payee"
                        triggerClassName="h-7 text-xs w-[150px]"
                      />
                    ) : (
                      (() => {
                        const contact = contacts.find(c => c.name === expense.payee);
                        return contact ? (
                          <button onClick={(e) => { e.stopPropagation(); onViewContact?.(contact); }} className="text-left hover:text-[#1e3a5f] underline decoration-dotted underline-offset-2 transition-colors">
                            {expense.payee}
                          </button>
                        ) : <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">{expense.payee || "—"}</span>;
                      })()
                    )}
                  </TableCell>

                  <TableCell className="text-gray-500 cursor-pointer" onClick={(e) => startEdit(expense.id, 'description', e)}>
                    {isEditing(expense.id, 'description') ? (
                      <InlineText value={expense.description} onSave={(v) => handleUpdate(expense.id, 'description', v)} />
                    ) : (
                      expense.description ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="max-w-xs truncate block cursor-pointer hover:text-[#1e3a5f] hover:underline decoration-dotted">{expense.description}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm"><p>{expense.description}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : <span className="text-gray-400 hover:text-[#1e3a5f]">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-gray-600 cursor-pointer" onClick={(e) => startEdit(expense.id, 'payment_source', e)}>
                    {isEditing(expense.id, 'payment_source') ? (
                      <SearchableSelect
                        value={expense.payment_source || ""}
                        onValueChange={(v) => handleUpdate(expense.id, 'payment_source', v)}
                        items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
                        placeholder="Payment Source"
                        triggerClassName="h-7 text-xs w-[150px]"
                      />
                    ) : (
                      <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">{expense.payment_source || "—"}</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right font-semibold text-[#1e3a5f] cursor-pointer" onClick={(e) => startEdit(expense.id, 'amount', e)}>
                    {isEditing(expense.id, 'amount') ? (
                      <div className="flex justify-end">
                        <InlineNumber value={expense.amount} onSave={(v) => handleUpdate(expense.id, 'amount', v)} />
                      </div>
                    ) : (
                      <span className="hover:text-[#c9a962] hover:underline decoration-dotted">{formatCurrency(expense.amount)}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(expense)}>Open Form</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(expense)} className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              );
            })}
            <TableRow className="bg-gray-50 border-t-2 border-gray-200">
              <TableCell colSpan={showProject ? 9 : 8} className="text-right font-bold text-gray-900">Total</TableCell>
              <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">{formatCurrency(expenses.reduce((sum, e) => sum + (e.amount || 0), 0))}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}