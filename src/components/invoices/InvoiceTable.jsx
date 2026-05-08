import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  CheckCircle2, ArrowRight, Pencil, Trash2, Building2, Calendar, Eye, Download,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

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
  onEdit, onDelete, onTransfer, onBulkDelete,
}) {
  const exportToExcel = () => {
    const rows = [
      ["Ημερομηνία", "Φάση", "Κατηγορία", "Υποκατηγορία", "Έργο", "Vendor / Client", "Επωνυμία", "ΑΦΜ", "Αρ. Τιμολογίου", "Τύπος", "Κατάσταση", "Πηγή Πληρωμής", "Σύνολο (€)", "Σημειώσεις"],
      ...invoices.map(inv => {
        const projectName = projects?.find(p => p.id === inv.project_id)?.name || "";
        return [
          inv.date?.slice(0,10) || "",
          "", // phase - not directly stored
          inv.category?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "",
          inv.subcategory || "",
          projectName,
          inv.vendor_client || "",
          inv.vendor_eponymia || "",
          inv.vendor_afm || "",
          inv.invoice_number || "",
          inv.type === "expense" ? "Expense" : "Income",
          inv.status === "transferred" ? "Transferred" : "Pending",
          inv.payment_method || "",
          inv.total_amount ?? "",
          inv.notes || "",
        ];
      }),
      [],
      ["", "", "", "", "", "", "", "", "", "ΣΥΝΟΛΟ", invoices.reduce((s, i) => s + (i.total_amount || 0), 0)],
    ];
    const bom = "\uFEFF";
    const csv = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `invoices_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  const [editingCell, setEditingCell] = useState(null);
  const [bulkField, setBulkField] = useState(null); // "phase" | "category" | "subcategory"
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [expandedCol, setExpandedCol] = useState(null);

  const toggleCol = (col) => setExpandedCol(prev => prev === col ? null : col);
  const colClass = (col) => expandedCol === col ? "whitespace-normal break-words max-w-xs" : "whitespace-nowrap max-w-[120px] truncate";
  const queryClient = useQueryClient();

  const { data: subcategories = [] } = useQuery({ queryKey: ["subcategories"], queryFn: () => base44.entities.Subcategory.list() });
  const { data: phases = [] } = useQuery({ queryKey: ["phases"], queryFn: () => base44.entities.ProjectPhase.list("order") });
  const { data: paymentSources = [] } = useQuery({ queryKey: ["paymentSources"], queryFn: () => base44.entities.PaymentSource.list("name") });
  const { data: dropdownLists = [] } = useQuery({ queryKey: ["dropdown-lists"], queryFn: () => base44.entities.DropdownList.list() });

  const expenseCategories = dropdownLists.find(l => l.list_name === "expense_categories")?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"];

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(updates.map(({ id, data }) => base44.entities.Invoice.update(id, data)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  // If the edited invoice is part of a multi-selection, apply to all selected; otherwise just to itself
  const handleCategoryUpdate = (invoice, value) => {
    setEditingCell(null);
    const targets = selectedInvoices.includes(invoice.id)
      ? invoices.filter(inv => selectedInvoices.includes(inv.id))
      : [invoice];
    if (targets.length > 1) {
      bulkUpdateMutation.mutate(targets.map(inv => ({ id: inv.id, data: { ...inv, category: value } })));
    } else {
      updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, category: value } });
    }
  };

  const handleSubcategoryUpdate = (invoice, value) => {
    setEditingCell(null);
    const targets = selectedInvoices.includes(invoice.id)
      ? invoices.filter(inv => selectedInvoices.includes(inv.id))
      : [invoice];
    if (targets.length > 1) {
      bulkUpdateMutation.mutate(targets.map(inv => ({ id: inv.id, data: { ...inv, subcategory: value } })));
    } else {
      updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, subcategory: value } });
    }
  };

  const handleBulkUpdate = (field, value) => {
    const selected = invoices.filter(inv => selectedInvoices.includes(inv.id));
    const updates = selected.map(inv => {
      let update = { ...inv };
      if (field === "category") update.category = value;
      else if (field === "subcategory") update.subcategory = value;
      else if (field === "phase") {
        const firstSub = subcategories.find(s => s.phase_id === value);
        update.subcategory = firstSub?.name || "";
      }
      return { id: inv.id, data: update };
    });
    bulkUpdateMutation.mutate(updates);
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
    <div className="w-full">
      {selectedInvoices.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1e3a5f]/5 border-b border-[#1e3a5f]/10 flex-wrap sticky top-0 z-30">
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

          <div className="ml-auto flex items-center gap-2">
            <Button onClick={exportToExcel} variant="outline" size="sm" className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <Download className="w-3 h-3 mr-1" />Export
            </Button>
            <Button onClick={onBulkDelete} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 h-7 text-xs">
              <Trash2 className="w-3 h-3 mr-1" />Διαγραφή
            </Button>
          </div>
        </div>
      )}
      <div className="flex justify-end px-3 py-2 border-b border-gray-100">
        <Button variant="outline" size="sm" onClick={exportToExcel} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
          <Download className="w-4 h-4 mr-1" /> Export Excel
        </Button>
      </div>
      <div className="overflow-auto max-h-[480px] w-full">
      <Table className="w-auto min-w-full">
        <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm">
          <TableRow className="bg-gray-50">
            <TableHead className="w-10 bg-gray-50">
              <Checkbox
                checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            {[
              { key: "date", label: "Date" },
              { key: "phase", label: "Phase" },
              { key: "category", label: "Category" },
              { key: "subcategory", label: "Subcategory" },
              { key: "project", label: "Project" },
              { key: "vendor", label: "Vendor / Client" },
              { key: "afm", label: "ΑΦΜ" },
              { key: "invoice_num", label: "Invoice #" },
              { key: "type", label: "Type" },
              { key: "status", label: "Status" },
              { key: "method", label: "Payment Source" },
            ].map(({ key, label }) => (
              <TableHead
                key={key}
                className={`bg-gray-50 cursor-pointer select-none ${expandedCol === key ? "whitespace-normal" : "whitespace-nowrap"}`}
                onDoubleClick={() => toggleCol(key)}
                title="Double-click to expand/collapse column"
              >
                <span className={`flex items-center gap-1 ${expandedCol === key ? "text-[#1e3a5f]" : ""}`}>
                  {label}
                  {expandedCol === key && <span className="text-[10px] text-[#1e3a5f] font-normal ml-1">↔</span>}
                </span>
              </TableHead>
            ))}
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
                className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${selectedInvoices.includes(invoice.id) ? 'bg-blue-50/40' : ''}`}
                onClick={() => setViewingInvoice(invoice)}
              >
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={() => onSelectInvoice(invoice.id)}
                  />
                </TableCell>

                <TableCell className={`text-gray-600 cursor-pointer ${colClass("date")}`} onClick={e => { e.stopPropagation(); setEditingCell(`date-${invoice.id}`); }}>
                   {editingCell === `date-${invoice.id}` ? (
                     <Input
                       type="date"
                       value={invoice.date || ""}
                       onChange={e => {
                         const newVal = e.target.value;
                         updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, date: newVal } });
                         setEditingCell(null);
                       }}
                       className="h-7 text-xs"
                       autoFocus
                       onBlur={() => setEditingCell(null)}
                     />
                   ) : (
                     <span className="hover:text-[#1e3a5f]">{safeFormatDate(invoice.date)}</span>
                   )}
                </TableCell>

                <TableCell className="cursor-pointer" onClick={e => { e.stopPropagation(); setEditingCell(`phase-${invoice.id}`); }}>
                  {editingCell === `phase-${invoice.id}` ? (
                    <SearchableSelect
                      value={subcategories.find(s => s.name === invoice.subcategory)?.phase_id || ""}
                      onValueChange={(phaseId) => {
                        // When phase changes, pick first subcategory of that phase
                        const firstSub = subcategories.find(s => s.phase_id === phaseId);
                        const newSubcategory = firstSub?.name || "";
                        // Apply to all selected invoices if this one is selected
                        const targets = selectedInvoices.includes(invoice.id)
                          ? invoices.filter(inv => selectedInvoices.includes(inv.id))
                          : [invoice];
                        if (targets.length > 1) {
                          bulkUpdateMutation.mutate(targets.map(inv => ({ id: inv.id, data: { ...inv, subcategory: newSubcategory } })));
                        } else {
                          updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, subcategory: newSubcategory } });
                        }
                        setEditingCell(null);
                      }}
                      items={phases.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="Phase"
                      triggerClassName="h-7 text-xs min-w-[130px]"
                    />
                  ) : phase
                    ? <Badge className={`${phase.color} border-0 gap-1.5 hover:opacity-80`}><Layers className="w-3 h-3" />{phase.name}</Badge>
                    : <span className="text-gray-400 hover:text-[#1e3a5f]">—</span>}
                </TableCell>

                <TableCell className="cursor-pointer" onClick={e => { e.stopPropagation(); setEditingCell(invoice.id); }}>
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

                <TableCell className={`cursor-pointer text-gray-600 text-sm ${colClass("subcategory")}`} onClick={e => { e.stopPropagation(); setEditingCell(`sub-${invoice.id}`); }}>
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

                <TableCell className={`text-gray-600 text-sm ${colClass("project")}`}>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-gray-400 shrink-0" />{projectName}
                  </span>
                </TableCell>

                <TableCell className={`font-medium text-gray-900 text-sm cursor-pointer ${colClass("vendor")}`} onClick={e => { e.stopPropagation(); setEditingCell(`vendor-${invoice.id}`); }}>
                   {editingCell === `vendor-${invoice.id}` ? (
                     <Input
                       value={invoice.vendor_client || ""}
                       onChange={e => {
                         const newVal = e.target.value;
                         updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, vendor_client: newVal } });
                         setEditingCell(null);
                       }}
                       className="h-7 text-xs"
                       autoFocus
                       onBlur={() => setEditingCell(null)}
                     />
                   ) : (
                     <span className="hover:text-[#1e3a5f]">{invoice.vendor_client || "—"}</span>
                   )}
                </TableCell>

                <TableCell className={`text-gray-500 text-xs ${colClass("afm")}`}>
                  {invoice.vendor_afm || "—"}
                </TableCell>

                <TableCell className={`text-gray-400 text-xs cursor-pointer ${colClass("invoice_num")}`} onClick={e => { e.stopPropagation(); setEditingCell(`invoice-num-${invoice.id}`); }}>
                   {editingCell === `invoice-num-${invoice.id}` ? (
                     <Input
                       value={invoice.invoice_number || ""}
                       onChange={e => {
                         const newVal = e.target.value;
                         updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, invoice_number: newVal } });
                         setEditingCell(null);
                       }}
                       className="h-7 text-xs"
                       autoFocus
                       onBlur={() => setEditingCell(null)}
                     />
                   ) : (
                     <span className="flex items-center gap-1 hover:text-[#1e3a5f]">
                       {invoice.invoice_number ? (
                         <><Hash className="w-3 h-3" />{invoice.invoice_number}</>
                       ) : "—"}
                     </span>
                   )}
                </TableCell>

                <TableCell>
                  <Badge className={invoice.type === "expense" ? "bg-red-100 text-red-700 border-0 text-xs" : "bg-green-100 text-green-700 border-0 text-xs"}>
                    {invoice.type === "expense" ? "Expense" : "Income"}
                  </Badge>
                </TableCell>

                <TableCell onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => updateInvoiceMutation.mutate({
                      id: invoice.id,
                      data: { ...invoice, status: invoice.status === "transferred" ? "pending" : "transferred" }
                    })}
                    title="Click to toggle status"
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    {invoice.status === "transferred"
                      ? <Badge className="bg-blue-100 text-blue-700 border-0 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Transferred</Badge>
                      : <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Pending</Badge>}
                  </button>
                </TableCell>

                <TableCell className={`text-gray-600 text-sm cursor-pointer ${colClass("method")}`} onClick={e => { e.stopPropagation(); setEditingCell(`method-${invoice.id}`); }}>
                   {editingCell === `method-${invoice.id}` ? (
                     <SearchableSelect
                       value={invoice.payment_method || ""}
                       onValueChange={(v) => {
                         // Apply to all selected invoices if this one is selected
                         const targets = selectedInvoices.includes(invoice.id)
                           ? invoices.filter(inv => selectedInvoices.includes(inv.id))
                           : [invoice];
                         if (targets.length > 1) {
                           bulkUpdateMutation.mutate(targets.map(inv => ({ id: inv.id, data: { ...inv, payment_method: v } })));
                         } else {
                           updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, payment_method: v } });
                         }
                         setEditingCell(null);
                       }}
                       items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
                       placeholder="Select source"
                       triggerClassName="h-7 text-xs min-w-[130px]"
                     />
                   ) : (
                     <span className="capitalize hover:text-[#1e3a5f]">{invoice.payment_method ? invoice.payment_method : "—"}</span>
                   )}
                </TableCell>

                <TableCell className="text-right font-semibold text-[#1e3a5f] whitespace-nowrap cursor-pointer" onClick={e => { e.stopPropagation(); setEditingCell(`total-${invoice.id}`); }}>
                   {editingCell === `total-${invoice.id}` ? (
                     <Input
                       type="number"
                       step="0.01"
                       value={invoice.total_amount || ""}
                       onChange={e => {
                         const newVal = Number(e.target.value);
                         updateInvoiceMutation.mutate({ id: invoice.id, data: { ...invoice, total_amount: newVal } });
                         setEditingCell(null);
                       }}
                       className="h-7 text-xs text-right"
                       autoFocus
                       onBlur={() => setEditingCell(null)}
                     />
                   ) : (
                     <span className="hover:text-[#152a45]">{formatCurrency(invoice.total_amount)}</span>
                   )}
                </TableCell>

                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setViewingInvoice(invoice)} className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-500 transition-colors" title="View details">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
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
            <TableCell colSpan={11} className="text-right font-bold text-gray-900">Total</TableCell>
            <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">
              {formatCurrency(invoices.reduce((s, i) => s + (i.total_amount || 0), 0))}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      </div>

      {/* View Invoice Dialog */}
      {viewingInvoice && (
        <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
                <Receipt className="w-5 h-5" />
                {viewingInvoice.vendor_client}
                {viewingInvoice.invoice_number && <span className="text-sm font-normal text-gray-400">#{viewingInvoice.invoice_number}</span>}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Image */}
              {viewingInvoice.image_url && (
                <a href={viewingInvoice.image_url} target="_blank" rel="noopener noreferrer">
                  <img src={viewingInvoice.image_url} alt="Invoice" className="w-full rounded-lg border border-gray-200 hover:opacity-90 transition-opacity" />
                </a>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Date</p>
                  <p className="font-medium">{safeFormatDate(viewingInvoice.date)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Due Date</p>
                  <p className="font-medium">{safeFormatDate(viewingInvoice.due_date)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Type</p>
                  <Badge className={viewingInvoice.type === "expense" ? "bg-red-100 text-red-700 border-0" : "bg-green-100 text-green-700 border-0"}>
                    {viewingInvoice.type === "expense" ? "Expense" : "Income"}
                  </Badge>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  {viewingInvoice.status === "transferred"
                    ? <Badge className="bg-blue-100 text-blue-700 border-0 gap-1"><CheckCircle2 className="w-3 h-3" />Transferred</Badge>
                    : <Badge className="bg-yellow-100 text-yellow-700 border-0">Pending</Badge>}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Category</p>
                  <p className="font-medium">{viewingInvoice.category || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Subcategory / Phase</p>
                  <p className="font-medium">{viewingInvoice.subcategory || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Payment Source</p>
                  <p className="font-medium">{viewingInvoice.payment_source || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Payment Method</p>
                  <p className="font-medium capitalize">{viewingInvoice.payment_method ? viewingInvoice.payment_method.replace('_', ' ') : "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Επωνυμία</p>
                  <p className="font-medium">{viewingInvoice.vendor_eponymia || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">ΑΦΜ</p>
                  <p className="font-medium">{viewingInvoice.vendor_afm || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Project</p>
                  <p className="font-medium">{projects?.find(p => p.id === viewingInvoice.project_id)?.name || "—"}</p>
                </div>
                {viewingInvoice.description && (
                  <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="font-medium">{viewingInvoice.description}</p>
                  </div>
                )}
              </div>

              {/* Line items */}
              {viewingInvoice.items?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Line Items</p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Description</th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Qty</th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Unit Price</th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingInvoice.items.map((item, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-700">{item.description}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex flex-col items-end gap-1 text-sm border-t border-gray-100 pt-3">
                {viewingInvoice.subtotal != null && <div className="flex gap-6"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(viewingInvoice.subtotal)}</span></div>}
                {viewingInvoice.tax_amount != null && <div className="flex gap-6"><span className="text-gray-500">Tax</span><span className="font-medium">{formatCurrency(viewingInvoice.tax_amount)}</span></div>}
                <div className="flex gap-6 text-base"><span className="font-semibold text-[#1e3a5f]">Total</span><span className="font-bold text-[#1e3a5f]">{formatCurrency(viewingInvoice.total_amount)}</span></div>
              </div>

              {viewingInvoice.notes && (
                <div className="bg-amber-50 rounded-lg p-3 text-sm text-gray-600">
                  <p className="text-xs text-amber-600 font-medium mb-1">Notes</p>
                  <p>{viewingInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setViewingInvoice(null); onEdit(viewingInvoice); }} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => setViewingInvoice(null)} className="flex-1 flex items-center justify-center gap-2 bg-[#1e3a5f] text-white rounded-lg py-2 text-sm hover:bg-[#152a45] transition-colors">
                  Close
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}