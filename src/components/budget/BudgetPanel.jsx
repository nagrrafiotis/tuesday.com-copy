import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, BookOpen, Receipt, Download } from "lucide-react";
import BudgetGroupRows from "./BudgetGroupRows";
import BudgetCategoryGroup, { leadingNumberOf } from "./BudgetCategoryGroup";
import BudgetItemForm from "./BudgetItemForm";
import BudgetTemplatesDialog from "./BudgetTemplatesDialog";
import OffersPanel from "./OffersPanel";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

export default function BudgetPanel({ projectId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateDefaults, setTemplateDefaults] = useState(null);
  const [view, setView] = useState("budget");
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["budget-items", projectId],
    queryFn: () => base44.entities.BudgetItem.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] });
      setShowForm(false);
      setEditingItem(null);
      setTemplateDefaults(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BudgetItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] }),
  });

  const handleSubmit = async (data) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleApplyTemplate = (template) => {
    setShowTemplates(false);
    setEditingItem(null);
    setTemplateDefaults({
      category: template.category,
      subcategory: template.subcategory || "",
      description: template.description || "",
      unit: template.unit || "",
      unit_cost: template.unit_cost || 0,
      quantity: 1,
      total_cost: template.unit_cost || 0,
      vat_percent: 24,
      notes: "",
    });
    setShowForm(true);
  };

  const subKey = (i) => (i.subcategory || "").trim().toLowerCase();
  const sortedItems = [...items].sort((a, b) => {
    if (!subKey(a) && !subKey(b)) return 0;
    if (!subKey(a)) return 1;
    if (!subKey(b)) return -1;
    return subKey(a).localeCompare(subKey(b), "el", { numeric: true });
  });
  const vatOf = (i) => (i.total_cost || 0) * ((i.vat_percent || 0) / 100);
  const grandTotal = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);
  const totalVat = items.reduce((sum, i) => sum + vatOf(i), 0);
  const grandFinal = grandTotal + totalVat;

  const exportToExcel = () => {
    const rows = [
      ["Κατηγορία", "Υποκατηγορία", "Περιγραφή", "Ποσότητα", "Μονάδα", "Τιμή/Μονάδα (€)", "Σύνολο (€)", "ΦΠΑ %", "ΦΠΑ (€)", "Τελικό με ΦΠΑ (€)", "Σημειώσεις"],
      ...sortedItems.map(item => [
        item.category?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "",
        item.subcategory || "",
        item.description || "",
        item.quantity ?? "",
        item.unit || "",
        item.unit_cost ?? "",
        item.total_cost ?? "",
        item.vat_percent ?? 0,
        vatOf(item),
        (item.total_cost || 0) + vatOf(item),
        item.notes || "",
      ]),
      [],
      ["", "", "", "", "", "ΣΥΝΟΛΟ", grandTotal, "", totalVat, grandFinal],
    ];
    const bom = "\uFEFF";
    const csv = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `budget_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // Group by subcategory (already sorted, empty subcategory last)
  const groups = [];
  sortedItems.forEach((item) => {
    const key = subKey(item);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, name: (item.subcategory || "").trim(), items: [item] });
  });

  // Higher-level grouping by the leading number of the subcategory
  const categories = [];
  groups.forEach((g) => {
    const num = leadingNumberOf(g.name);
    const catKey = num || "__none__";
    const last = categories[categories.length - 1];
    if (last && last.key === catKey) last.groups.push(g);
    else categories.push({ key: catKey, num, groups: [g] });
  });

  if (isLoading) return <div className="text-center py-12 text-gray-500">Φόρτωση...</div>;

  return (
    <div>
      {/* View toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 mb-4">
        <button onClick={() => setView("budget")} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${view === "budget" ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:bg-gray-50"}`}>Προϋπολογισμός</button>
        <button onClick={() => setView("offers")} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${view === "offers" ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:bg-gray-50"}`}>Προσφορές</button>
      </div>

      {view === "budget" && (
      <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTemplates(true)}
            className="text-[#1e3a5f] border-[#1e3a5f]/30"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Πρότυπα
          </Button>
          {items.length > 0 && (
            <Button variant="outline" onClick={exportToExcel} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          )}
        </div>
        <Button
          onClick={() => { setEditingItem(null); setTemplateDefaults(null); setShowForm(true); }}
          className="bg-[#1e3a5f] hover:bg-[#152a45]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Νέο Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Δεν υπάρχουν budget items</h3>
          <p className="text-gray-500 mb-4">Προσθέστε items ή χρησιμοποιήστε ένα πρότυπο</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setShowTemplates(true)}>
              <BookOpen className="w-4 h-4 mr-2" /> Από Πρότυπο
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]">
              <Plus className="w-4 h-4 mr-2" /> Νέο Item
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="bg-gray-50 font-semibold">Κατηγορία</TableHead>
                <TableHead className="bg-gray-50 font-semibold">Υποκατηγορία</TableHead>
                <TableHead className="bg-gray-50 font-semibold">Περιγραφή</TableHead>
                <TableHead className="text-right bg-gray-50 font-semibold">Ποσ.</TableHead>
                <TableHead className="bg-gray-50 font-semibold">Μον.</TableHead>
                <TableHead className="text-right bg-gray-50 font-semibold">Τιμή/Μον.</TableHead>
                <TableHead className="text-right bg-gray-50 font-semibold text-[#1e3a5f]">Σύνολο</TableHead>
                <TableHead className="text-right bg-gray-50 font-semibold">ΦΠΑ %</TableHead>
                <TableHead className="text-right bg-gray-50 font-semibold">ΦΠΑ (€)</TableHead>
                <TableHead className="text-right bg-gray-50 font-semibold text-[#1e3a5f]">Τελικό</TableHead>
                <TableHead className="bg-gray-50 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => {
                const catItems = cat.groups.flatMap((g) => g.items);
                return (
                  <BudgetCategoryGroup key={cat.key} num={cat.num} items={catItems} storageKey={projectId}>
                    {cat.groups.map((g) => (
                      <BudgetGroupRows
                        key={g.key || "__none__"}
                        name={g.name}
                        storageKey={projectId}
                        items={g.items}
                        onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
                        onDelete={(item) => { if (window.confirm("Διαγραφή item;")) deleteMutation.mutate(item.id); }}
                      />
                    ))}
                  </BudgetCategoryGroup>
                );
              })}

              {/* Grand Total */}
              <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                <TableCell colSpan={6} className="font-bold text-gray-900">Σύνολο Προϋπολογισμού</TableCell>
                <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">{formatCurrency(grandTotal)}</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold text-gray-700">{formatCurrency(totalVat)}</TableCell>
                <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">{formatCurrency(grandFinal)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
      </>
      )}

      {view === "offers" && (
        <OffersPanel projectId={projectId} />
      )}

      <BudgetItemForm
        item={editingItem || (templateDefaults ? templateDefaults : null)}
        projectId={projectId}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(null); setTemplateDefaults(null); }}
        onSubmit={handleSubmit}
      />

      <BudgetTemplatesDialog
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApply={handleApplyTemplate}
      />
    </div>
  );
}