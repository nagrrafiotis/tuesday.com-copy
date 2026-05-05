import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

function InlineText({ value, onSave, className = "" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  useEffect(() => { if (!editing) setVal(value || ""); }, [value, editing]);
  if (!editing) return (
    <span onClick={() => { setVal(value || ""); setEditing(true); }} className={`cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 min-w-[40px] inline-block ${className}`}>{value || <span className="text-gray-300">—</span>}</span>
  );
  return <input autoFocus className="w-full border border-[#1e3a5f] rounded px-1 py-0.5 text-sm outline-none" value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onSave(val); setEditing(false); }} onKeyDown={e => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }} />;
}

function InlineSelect({ value, onSave, items, placeholder = "Select", renderDisplay }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  if (!editing) return (
    <span onClick={() => setEditing(true)} className="cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 min-w-[40px] inline-block">
      {renderDisplay ? renderDisplay(value) : (value || <span className="text-gray-300">—</span>)}
    </span>
  );

  return (
    <div className="relative">
      <div className="fixed inset-0 z-40" onMouseDown={() => setEditing(false)} />
      <div className="absolute z-50 top-0 left-0 bg-white border border-[#1e3a5f] rounded shadow-lg min-w-[160px] max-h-[220px] overflow-y-auto">
        {items.map(item => (
          <div
            key={item.value}
            onMouseDown={(e) => { e.stopPropagation(); onSave(item.value); setEditing(false); }}
            className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-[#1e3a5f] hover:text-white ${
              item.value === value ? "bg-blue-50 font-medium" : ""
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function InlineNumber({ value, onSave, className = "" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  useEffect(() => { if (!editing) setVal(value ?? ""); }, [value, editing]);
  if (!editing) return (
    <span onClick={() => { setVal(value ?? ""); setEditing(true); }} className={`cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 min-w-[40px] inline-block ${className}`}>{value != null ? value : <span className="text-gray-300">—</span>}</span>
  );
  return <input autoFocus type="number" className="w-full border border-[#1e3a5f] rounded px-1 py-0.5 text-sm outline-none" value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onSave(parseFloat(val)); setEditing(false); }} onKeyDown={e => { if (e.key === "Enter") { onSave(parseFloat(val)); setEditing(false); } if (e.key === "Escape") setEditing(false); }} />;
}

export default function BudgetTable({ budgetItems, onEdit, onDelete, onUpdate, selectedItems = [], onSelectAll, onSelectItem }) {
  const [columnWidths, setColumnWidths] = useState({
    phase: 140,
    category: 150,
    subcategory: 150,
    payee: 150,
    description: 200,
    payment: 150,
    quantity: 100,
    unit: 100,
    unitCost: 120,
    total: 120,
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

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const { data: dropdownLists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  const expenseCategories = dropdownLists.find(l => l.list_name === "expense_categories")?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"];
  const units = dropdownLists.find(l => l.list_name === "units")?.options || ["m²", "m³", "m", "kg", "ton", "pcs", "hr", "day", "ls"];

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

  if (!budgetItems || budgetItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No budget items yet</h3>
        <p className="text-gray-500">Add your first budget item to start planning</p>
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
                checked={budgetItems.length > 0 && selectedItems.length === budgetItems.length}
                onCheckedChange={() => onSelectAll()}
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.phase }} className="relative group bg-gray-50">
              Phase
              <div
                onMouseDown={(e) => handleMouseDown('phase', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.category }} className="relative group bg-gray-50">
              Category
              <div
                onMouseDown={(e) => handleMouseDown('category', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.subcategory }} className="relative group bg-gray-50">
              Subcategory
              <div
                onMouseDown={(e) => handleMouseDown('subcategory', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.payee }} className="relative group bg-gray-50">
              Payee
              <div
                onMouseDown={(e) => handleMouseDown('payee', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.description }} className="relative group bg-gray-50">
              Description
              <div
                onMouseDown={(e) => handleMouseDown('description', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.payment }} className="relative group bg-gray-50">
              Payment Source
              <div
                onMouseDown={(e) => handleMouseDown('payment', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.quantity }} className="text-right relative group bg-gray-50">
              Qty
              <div
                onMouseDown={(e) => handleMouseDown('quantity', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.unit }} className="relative group bg-gray-50">
              Unit
              <div
                onMouseDown={(e) => handleMouseDown('unit', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.unitCost }} className="text-right relative group bg-gray-50">
              Unit Cost
              <div
                onMouseDown={(e) => handleMouseDown('unitCost', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.total }} className="text-right relative group bg-gray-50">
              Total
              <div
                onMouseDown={(e) => handleMouseDown('total', e)}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </TableHead>
            <TableHead className="w-12 bg-gray-50"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgetItems.map((item, index) => {
            const Icon = categoryIcons[item.category] || Receipt;
            const color = categoryColors[item.category] || "bg-gray-100 text-gray-700";
            const label = item.category ? item.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "General";

            return (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => onSelectItem(item.id)}
                  />
                </TableCell>
                <TableCell>
                  {(() => {
                    const phase = getProjectPhase(item.subcategory);
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
                  <InlineSelect
                    value={item.category}
                    onSave={v => onUpdate?.(item, { category: v })}
                    items={expenseCategories.map(cat => ({ value: cat, label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
                    placeholder="Category"
                    renderDisplay={(v) => {
                      if (!v) return <span className="text-gray-300">—</span>;
                      const Ic = categoryIcons[v] || Receipt;
                      const cl = categoryColors[v] || "bg-gray-100 text-gray-700";
                      const lbl = v.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cl}`}><Ic className="w-3 h-3" />{lbl}</span>;
                    }}
                  />
                </TableCell>
                <TableCell className="text-gray-600">
                  <InlineSelect
                    value={item.subcategory}
                    onSave={v => onUpdate?.(item, { subcategory: v })}
                    items={[...subcategories].sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ value: s.name, label: s.name }))}
                    placeholder="Subcategory"
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                 <InlineText value={item.payee} onSave={v => onUpdate?.(item, { payee: v })} />
                </TableCell>
                <TableCell className="text-gray-500">
                 <InlineText value={item.description} onSave={v => onUpdate?.(item, { description: v })} />
                </TableCell>
                <TableCell className="text-gray-600">
                  <InlineSelect
                    value={item.payment_source}
                    onSave={v => onUpdate?.(item, { payment_source: v })}
                    items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
                    placeholder="Payment Source"
                  />
                </TableCell>
                <TableCell className="text-right text-gray-600">
                <InlineNumber value={item.quantity} onSave={v => {
                  const newQty = isNaN(v) ? 0 : v;
                  const uc = item.unit_cost || 0;
                  onUpdate?.(item, { quantity: newQty, total_cost: newQty * uc });
                }} />
                </TableCell>
                <TableCell className="text-gray-600">
                  <InlineSelect
                    value={item.unit}
                    onSave={v => onUpdate?.(item, { unit: v })}
                    items={units.map(u => ({ value: u, label: u }))}
                    placeholder="Unit"
                  />
                </TableCell>
                <TableCell className="text-right text-gray-600">
                <InlineNumber value={item.unit_cost} onSave={v => {
                  const newUc = isNaN(v) ? 0 : v;
                  const qty = item.quantity || 0;
                  onUpdate?.(item, { unit_cost: newUc, total_cost: qty * newUc });
                }} className="text-right" />
                </TableCell>
                <TableCell className="text-right font-semibold text-[#c9a962]">
                <InlineNumber value={item.total_cost} onSave={v => onUpdate?.(item, { total_cost: isNaN(v) ? 0 : v })} className="text-right font-semibold text-[#c9a962]" />
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
                      <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(item)} className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            );
          })}
          <TableRow className="bg-gray-50 border-t-2 border-gray-200">
            <TableCell colSpan={10} className="text-right font-bold text-gray-900">
              Total
            </TableCell>
            <TableCell className="text-right font-bold text-[#c9a962] text-lg">
              {formatCurrency(budgetItems.reduce((sum, item) => sum + (item.total_cost || 0), 0))}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      </div>
    </motion.div>
  );
}