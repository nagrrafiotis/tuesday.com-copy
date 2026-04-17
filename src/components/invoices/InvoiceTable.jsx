import React, { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Receipt, TrendingUp, Hash, Layers, Users, Wrench, Package, Truck,
  CheckCircle2, ArrowRight, Pencil, Trash2, Building2, Calendar,
} from "lucide-react";
import { format } from "date-fns";

const categoryIcons = {
  labor: Users, subcontractor: Wrench, materials: Package, equipment: Truck, general_expenses: Receipt,
};
const categoryColors = {
  labor: "bg-blue-100 text-blue-700", subcontractor: "bg-purple-100 text-purple-700",
  materials: "bg-amber-100 text-amber-700", equipment: "bg-emerald-100 text-emerald-700",
  general_expenses: "bg-gray-100 text-gray-700",
};

const formatCurrency = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

const safeFormatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd/MM/yy");
};

export default function InvoiceTable({
  invoices, projects,
  selectedInvoices = [], onSelectAll, onSelectInvoice,
  onEdit, onDelete, onTransfer,
}) {
  const [editingCell, setEditingCell] = useState(null);
  const [bulkField, setBulkField] = useState(null); // "phase" | "category" | "subcategory"
  const queryClient = useQueryClient();

  const { data: subcategories = [] } = useQuery({ queryKey: ["subcategories"], queryFn: () => base44.entities.Subcategory.list() });
  const { data: phases = [] } = useQuery({ queryKey: ["phases"], queryFn: () => base44.entities.ProjectPhase.list("order") });
  const { data: dropdownLists = [] } = useQuery({ queryKey: ["dropdown-lists"], queryFn: () => base44.entities.DropdownList.list() });

  const expenseCategories = dropdownLists.find(l => l.list_name === "expense_categories")?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"];

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const handleCategoryUpdate = (invoice, value) => {
    setEditingCell(null);
    updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, category: value } });
  };

  const handleSubcategoryUpdate = (invoice, value) => {
    setEditingCell(null);
    updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, subcategory: value } });
  };

  const handleBulkUpdate = (field, value) => {
    const selected = invoices.filter(inv => selectedInvoices.includes(inv.id));
    selected.forEach(inv => {
      let update = { ...inv };
      if (field === "category") update.category = value;
      else if (field === "subcategory") update.subcategory = value;
      else if (field === "phase") {
        const firstSub = subcategories.find(s => s.phase_id === value);
        update.subcategory = firstSub?.name || "";
      }
      updateInvoiceMutation.mutate({ id: inv.id, data: update });
    });
    setBulkField(null);
  };

  const getProjectPhase = (subcategoryName) => {
    if (!subcategoryName) return null;
    const sub = subcategories.find(s => s.name === subcategoryName);
    if (!sub?.phase_id) return null;
    const phase = phases.find(p => p.id === sub.phase_id);
    if (!phase) return null;
    return { name: phase.name, color: phase.color || "bg-blue-100 text-blue-700" };
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>No invoices found</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[480px] w-full">
      {selectedInvoices.length > 1 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1e3a5f]/5 border-b border-[#1e3a5f]/10 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-[#1e3a5f] font-semibold">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-xs">{selectedInvoices.length}</span>
            επιλεγμένα
          </span>
          <span className="text-gray-300 text-sm">|</span>
          <span className="text-xs text-gray-500 font-medium">Εφαρμογή σε όλα:</span>

          {/* Bulk Phase */}
          {bulkField === "phase" ? (
            <SearchableSelect
              value=""
              onValueChange={(v) => handleBulkUpdate("phase", v)}
              items={phases.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Επιλογή Phase..."
              triggerClassName="h-7 text-xs min-w-[150px]"
            />
          ) : (
            <button onClick={() => setBulkField("phase")} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 transition-colors">
              <Layers className="w-3 h-3" /> Phase
            </button>
          )}

          {/* Bulk Category */}
          {bulkField === "category" ? (
            <SearchableSelect
              value=""
              onValueChange={(v) => handleBulkUpdate("category", v)}
              items={expenseCategories.map(cat => ({ value: cat, label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
              placeholder="Επιλογή Category..."
              triggerClassName="h-7 text-xs min-w-[160px]"
            />
          ) : (
            <button onClick={() => setBulkField("category")} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 transition-colors">
              <Receipt className="w-3 h-3" /> Category
            </button>
          )}

          {/* Bulk Subcategory */}
          {bulkField === "subcategory" ? (
            <SearchableSelect
              value=""
              onValueChange={(v) => handleBulkUpdate("subcategory", v)}
              items={subcategories.map(s => ({ value: s.name, label: s.name }))}
              placeholder="Επιλογή Subcategory..."
              triggerClassName="h-7 text-xs min-w-[160px]"
            />
          ) : (
            <button onClick={() => setBulkField("subcategory")} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 transition-colors">
              <Wrench className="w-3 h-3" /> Subcategory
            </button>
          )}

          {bulkField && (
            <button onClick={() => setBulkField(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">✕</button>
          )}
        </div>
      )}
      <Table className="w-auto min-w-full">
        <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm">
          <TableRow className="bg-gray-50">
            <TableHead className="w-10 bg-gray-50">
              <Checkbox
                checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Date</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Phase</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Category</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Subcategory</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Project</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Vendor / Client</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Invoice #</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Type</TableHead>
            <TableHead className="bg-gray-50 whitespace-nowrap">Status</TableHead>
            <TableHead className="text-right bg-gray-50 whitespace-nowrap">Total</TableHead>
            <TableHead className="bg-gray-50 w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice, index) => {
            const Icon = categoryIcons[invoice.category] || Receipt;
            const catColor = categoryColors[invoice.category] || "bg-gray-100 text-gray-700";
            const catLabel = invoice.category
              ? invoice.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              : "—";
            const phase = getProjectPhase(invoice.subcategory);
            const projectName = projects?.find(p => p.id === invoice.project_id)?.name || "—";

            return (
              <motion.tr
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`hover:bg-gray-50/50 transition-colors group ${selectedInvoices.includes(invoice.id) ? 'bg-blue-50/40' : ''}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={() => onSelectInvoice(invoice.id)}
                  />
                </TableCell>

                <TableCell className="text-gray-600 whitespace-nowrap">
                  {safeFormatDate(invoice.date)}
                </TableCell>

                <TableCell className="cursor-pointer" onClick={() => setEditingCell(`phase-${invoice.id}`)}>
                  {editingCell === `phase-${invoice.id}` ? (
                    <SearchableSelect
                      value={subcategories.find(s => s.name === invoice.subcategory)?.phase_id || ""}
                      onValueChange={(phaseId) => {
                        // When phase changes, pick first subcategory of that phase
                        const firstSub = subcategories.find(s => s.phase_id === phaseId);
                        handleSubcategoryUpdate(invoice, firstSub?.name || "");
                      }}
                      items={phases.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="Phase"
                      triggerClassName="h-7 text-xs min-w-[130px]"
                    />
                  ) : phase
                    ? <Badge className={`${phase.color} border-0 gap-1.5 hover:opacity-80`}><Layers className="w-3 h-3" />{phase.name}</Badge>
                    : <span className="text-gray-400 hover:text-[#1e3a5f]">—</span>}
                </TableCell>

                <TableCell className="cursor-pointer" onClick={() => setEditingCell(invoice.id)}>
                  {editingCell === invoice.id ? (
                    <SearchableSelect
                      value={invoice.category || ""}
                      onValueChange={(v) => handleCategoryUpdate(invoice, v)}
                      items={expenseCategories.map(cat => ({ value: cat, label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
                      placeholder="Category"
                      triggerClassName="h-7 text-xs min-w-[130px]"
                    />
                  ) : invoice.category
                    ? <Badge className={`${catColor} border-0 gap-1.5 hover:opacity-80`}><Icon className="w-3 h-3" />{catLabel}</Badge>
                    : <span className="text-gray-400 hover:text-[#1e3a5f]">—</span>}
                </TableCell>

                <TableCell className="cursor-pointer text-gray-600 text-sm" onClick={() => setEditingCell(`sub-${invoice.id}`)}>
                  {editingCell === `sub-${invoice.id}` ? (() => {
                    const currentPhaseId = subcategories.find(s => s.name === invoice.subcategory)?.phase_id;
                    const filteredSubs = currentPhaseId
                      ? subcategories.filter(s => s.phase_id === currentPhaseId)
                      : subcategories;
                    return (
                      <SearchableSelect
                        value={invoice.subcategory || ""}
                        onValueChange={(v) => handleSubcategoryUpdate(invoice, v)}
                        items={filteredSubs.map(s => ({ value: s.name, label: s.name }))}
                        placeholder="Subcategory"
                        triggerClassName="h-7 text-xs min-w-[140px]"
                      />
                    );
                  })()
                    : invoice.subcategory
                    ? <span className="hover:text-[#1e3a5f]">{invoice.subcategory}</span>
                    : <span className="text-gray-400 hover:text-[#1e3a5f]">—</span>}
                </TableCell>

                <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-gray-400" />{projectName}
                  </span>
                </TableCell>

                <TableCell className="font-medium text-gray-900 text-sm">{invoice.vendor_client}</TableCell>

                <TableCell className="text-gray-400 text-xs">
                  {invoice.invoice_number
                    ? <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{invoice.invoice_number}</span>
                    : "—"}
                </TableCell>

                <TableCell>
                  <Badge className={invoice.type === "expense" ? "bg-red-100 text-red-700 border-0 text-xs" : "bg-green-100 text-green-700 border-0 text-xs"}>
                    {invoice.type === "expense" ? "Expense" : "Income"}
                  </Badge>
                </TableCell>

                <TableCell>
                  {invoice.status === "transferred"
                    ? <Badge className="bg-blue-100 text-blue-700 border-0 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Transferred</Badge>
                    : <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Pending</Badge>}
                </TableCell>

                <TableCell className="text-right font-semibold text-[#1e3a5f] whitespace-nowrap">
                  {formatCurrency(invoice.total_amount)}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {invoice.status !== "transferred" && (
                      <Button size="sm" onClick={() => onTransfer(invoice)} className="bg-[#c9a962] hover:bg-[#b8954f] text-white gap-1 h-7 text-xs px-2">
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                    <button onClick={() => onEdit(invoice)} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(invoice.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </motion.tr>
            );
          })}
          <TableRow className="bg-gray-50 border-t-2 border-gray-200">
            <TableCell colSpan={10} className="text-right font-bold text-gray-900">Total</TableCell>
            <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">
              {formatCurrency(invoices.reduce((s, i) => s + (i.total_amount || 0), 0))}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}