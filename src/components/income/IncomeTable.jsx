import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { MoreHorizontal, TrendingUp, CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const categoryColors = [
  "bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700", "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700", "bg-gray-100 text-gray-700"
];

function InlineText({ value, onSave }) {
  const [val, setVal] = useState(value || "");
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => onSave(val);
  return (
    <Input ref={ref} value={val} onChange={e => setVal(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onSave(value); }}
      className="h-7 text-sm px-2 py-0 min-w-[120px]" />
  );
}

function InlineNumber({ value, onSave }) {
  const [val, setVal] = useState(value || 0);
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const save = () => onSave(Number(val));
  return (
    <Input ref={ref} type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onSave(value); }}
      className="h-7 text-sm px-2 py-0 w-[110px]" />
  );
}

export default function IncomeTable({ incomes, projects, contacts = [], onEdit, onDelete, onUpdate, showProject = false, selectedIncomes = [], onSelectAll, onSelectIncome, onViewContact }) {
  const [editingCell, setEditingCell] = useState(null);

  const { data: dropdownLists = [] } = useQuery({ queryKey: ["dropdown-lists"], queryFn: () => base44.entities.DropdownList.list() });
  const { data: paymentSources = [] } = useQuery({ queryKey: ["paymentSources"], queryFn: () => base44.entities.PaymentSource.list("name") });

  const incomeCategories = dropdownLists.find(l => l.list_name === "income_categories")?.options || ["sales", "investment", "rental", "other"];

  const getCategoryConfig = (category) => {
    const list = dropdownLists.find(l => l.list_name === "income_categories");
    const customColor = list?.colors?.[category];
    const color = customColor || categoryColors[incomeCategories.indexOf(category) % categoryColors.length] || categoryColors[categoryColors.length - 1];
    const label = category ? category.charAt(0).toUpperCase() + category.slice(1) : "—";
    return { label, color };
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);

  const handleUpdate = (id, field, value) => {
    setEditingCell(null);
    onUpdate?.(id, field, value);
  };

  const isEditing = (id, field) => editingCell?.id === id && editingCell?.field === field;
  const startEdit = (id, field, e) => { e.stopPropagation(); setEditingCell({ id, field }); };

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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="w-12">
              <Checkbox checked={selectedIncomes.length === incomes.length && incomes.length > 0} onCheckedChange={onSelectAll} />
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
            const config = getCategoryConfig(income.category);
            return (
              <motion.tr key={income.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="hover:bg-gray-50/50 transition-colors group">
                <TableCell>
                  <Checkbox checked={selectedIncomes.includes(income.id)} onCheckedChange={() => onSelectIncome(income.id)} />
                </TableCell>

                {/* Date */}
                <TableCell className="font-medium text-gray-600 cursor-pointer" onClick={(e) => startEdit(income.id, 'date', e)}>
                  {isEditing(income.id, 'date') ? (
                    <Popover open onOpenChange={(open) => !open && setEditingCell(null)}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {income.date ? format(new Date(income.date), "dd/MM/yy") : "Pick"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={income.date ? new Date(income.date) : undefined}
                          onSelect={(d) => handleUpdate(income.id, 'date', d?.toISOString())} />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">
                      {income.date ? format(new Date(income.date), "dd/MM/yy") : "—"}
                    </span>
                  )}
                </TableCell>

                {/* Category */}
                <TableCell className="cursor-pointer" onClick={(e) => startEdit(income.id, 'category', e)}>
                  {isEditing(income.id, 'category') ? (
                    <Select value={income.category || ""} onValueChange={(v) => handleUpdate(income.id, 'category', v)} open onOpenChange={(open) => !open && setEditingCell(null)}>
                      <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {incomeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`${config.color} border-0 hover:opacity-80`}>{config.label}</Badge>
                  )}
                </TableCell>

                {/* Project */}
                {showProject && (
                  <TableCell className="text-gray-600 cursor-pointer" onClick={(e) => startEdit(income.id, 'project_id', e)}>
                    {isEditing(income.id, 'project_id') ? (
                      <Select value={income.project_id || ""} onValueChange={(v) => handleUpdate(income.id, 'project_id', v)} open onOpenChange={(open) => !open && setEditingCell(null)}>
                        <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">
                        {projects?.find(p => p.id === income.project_id)?.name || "—"}
                      </span>
                    )}
                  </TableCell>
                )}

                {/* Source */}
                <TableCell className="font-medium text-gray-900 cursor-pointer" onClick={(e) => startEdit(income.id, 'source', e)}>
                  {isEditing(income.id, 'source') ? (
                    <Select value={income.source || ""} onValueChange={(v) => handleUpdate(income.id, 'source', v)} open onOpenChange={(open) => !open && setEditingCell(null)}>
                      <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {contacts.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    (() => {
                      const contact = contacts.find(c => c.name === income.source);
                      return contact ? (
                        <button onClick={(e) => { e.stopPropagation(); onViewContact?.(contact); }} className="text-left hover:text-[#1e3a5f] underline decoration-dotted underline-offset-2 transition-colors">
                          {income.source}
                        </button>
                      ) : <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">{income.source || "—"}</span>;
                    })()
                  )}
                </TableCell>

                {/* Description */}
                <TableCell className="text-gray-500 max-w-xs cursor-pointer" onClick={(e) => startEdit(income.id, 'description', e)}>
                  {isEditing(income.id, 'description') ? (
                    <InlineText value={income.description} onSave={(v) => handleUpdate(income.id, 'description', v)} />
                  ) : (
                    <span className="truncate block hover:text-[#1e3a5f] hover:underline decoration-dotted">{income.description || "—"}</span>
                  )}
                </TableCell>

                {/* Payment Source */}
                <TableCell className="text-gray-600 cursor-pointer" onClick={(e) => startEdit(income.id, 'payment_source', e)}>
                  {isEditing(income.id, 'payment_source') ? (
                    <Select value={income.payment_source || ""} onValueChange={(v) => handleUpdate(income.id, 'payment_source', v)} open onOpenChange={(open) => !open && setEditingCell(null)}>
                      <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {paymentSources.map(ps => <SelectItem key={ps.id} value={ps.name}>{ps.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="hover:text-[#1e3a5f] hover:underline decoration-dotted">{income.payment_source || "—"}</span>
                  )}
                </TableCell>

                {/* Amount */}
                <TableCell className="text-right font-semibold text-emerald-600 cursor-pointer" onClick={(e) => startEdit(income.id, 'amount', e)}>
                  {isEditing(income.id, 'amount') ? (
                    <div className="flex justify-end">
                      <InlineNumber value={income.amount} onSave={(v) => handleUpdate(income.id, 'amount', v)} />
                    </div>
                  ) : (
                    <span className="hover:text-emerald-800 hover:underline decoration-dotted">{formatCurrency(income.amount)}</span>
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
                      <DropdownMenuItem onClick={() => onEdit?.(income)}>Open Form</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete?.(income)} className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            );
          })}
          <TableRow className="bg-gray-50 border-t-2 border-gray-200">
            <TableCell colSpan={showProject ? 7 : 6} className="text-right font-bold text-gray-900">Total</TableCell>
            <TableCell className="text-right font-bold text-emerald-600 text-lg">{formatCurrency(incomes.reduce((sum, i) => sum + (i.amount || 0), 0))}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </motion.div>
  );
}