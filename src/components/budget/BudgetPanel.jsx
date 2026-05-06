import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, BookOpen, Receipt } from "lucide-react";
import BudgetItemForm from "./BudgetItemForm";
import BudgetTemplatesDialog from "./BudgetTemplatesDialog";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

const categoryColors = {
  labor: "bg-blue-100 text-blue-700",
  subcontractor: "bg-purple-100 text-purple-700",
  materials: "bg-amber-100 text-amber-700",
  equipment: "bg-orange-100 text-orange-700",
  general_expenses: "bg-gray-100 text-gray-700",
};

export default function BudgetPanel({ projectId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateDefaults, setTemplateDefaults] = useState(null);
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
      notes: "",
    });
    setShowForm(true);
  };

  const grandTotal = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  // Group by category for display
  const grouped = {};
  items.forEach(item => {
    const key = item.category || "—";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  if (isLoading) return <div className="text-center py-12 text-gray-500">Φόρτωση...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowTemplates(true)}
            className="text-[#1e3a5f] border-[#1e3a5f]/30"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Πρότυπα
          </Button>
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
                <TableHead className="bg-gray-50 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <Badge className={`${categoryColors[item.category] || "bg-gray-100 text-gray-700"} border-0 text-xs`}>
                      {item.category?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">{item.subcategory || <span className="text-gray-300">—</span>}</TableCell>
                  <TableCell className="text-gray-700 text-sm max-w-[200px] truncate">{item.description || <span className="text-gray-300">—</span>}</TableCell>
                  <TableCell className="text-right text-gray-600 text-sm">{item.quantity ?? "—"}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{item.unit || "—"}</TableCell>
                  <TableCell className="text-right text-gray-600 text-sm">{item.unit_cost ? formatCurrency(item.unit_cost) : <span className="text-gray-300">—</span>}</TableCell>
                  <TableCell className="text-right font-semibold text-[#1e3a5f]">{formatCurrency(item.total_cost)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingItem(item); setShowForm(true); }}
                        className="text-gray-400 hover:text-[#1e3a5f] h-7 w-7 p-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (window.confirm("Διαγραφή item;")) deleteMutation.mutate(item.id); }}
                        className="text-gray-400 hover:text-red-600 h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Grand Total */}
              <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                <TableCell colSpan={6} className="font-bold text-gray-900">Σύνολο Προϋπολογισμού</TableCell>
                <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">{formatCurrency(grandTotal)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
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