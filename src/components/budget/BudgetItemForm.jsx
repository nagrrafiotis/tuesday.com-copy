import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Wrench, Package, Truck, Receipt, Plus, X, BookmarkPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const categoryIcons = {
  labor: Users,
  subcontractor: Wrench,
  materials: Package,
  equipment: Truck,
  general_expenses: Receipt,
};

export default function BudgetItemForm({ item, projectId, open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    category: "materials",
    subcategory: "",
    description: "",
    quantity: 1,
    unit: "",
    unit_cost: 0,
    total_cost: 0,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const userEditingRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      userEditingRef.current = false;
      if (item) {
        setFormData({
          category: item.category || "materials",
          subcategory: item.subcategory || "",
          description: item.description || "",
          quantity: item.quantity ?? 1,
          unit: item.unit || "",
          unit_cost: item.unit_cost ?? 0,
          total_cost: item.total_cost ?? 0,
          notes: item.notes || "",
        });
      } else {
        setFormData({ category: "materials", subcategory: "", description: "", quantity: 1, unit: "", unit_cost: 0, total_cost: 0, notes: "" });
      }
    }
  }, [item, open]);

  // Auto-calc total only when user edits qty/unit_cost
  useEffect(() => {
    if (!userEditingRef.current) return;
    const total = (Number(formData.quantity) || 0) * (Number(formData.unit_cost) || 0);
    setFormData(prev => ({ ...prev, total_cost: total }));
  }, [formData.quantity, formData.unit_cost]);

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list("name"),
    enabled: open,
  });

  const { data: dropdownLists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
    enabled: open,
  });

  const unitsList = dropdownLists.find(l => l.list_name === "units");
  const units = unitsList?.options || [];

  const expenseCategoriesList = dropdownLists.find(l => l.list_name === "expense_categories");
  const defaultCategories = ["labor", "subcontractor", "materials", "equipment", "general_expenses"];
  const categories = (expenseCategoriesList?.options || defaultCategories).map(cat => ({
    value: cat,
    label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    icon: categoryIcons[cat] || Receipt,
  }));

  const createSubcategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.Subcategory.create(data),
    onSuccess: (newSubcat) => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setFormData(prev => ({ ...prev, subcategory: newSubcat.name }));
      setShowNewSubcategory(false);
      setNewSubcategoryName("");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const qty = Number(formData.quantity) || 0;
    const uc = Number(formData.unit_cost) || 0;
    await onSubmit({
      project_id: projectId,
      category: formData.category,
      subcategory: formData.subcategory,
      description: formData.description,
      quantity: qty,
      unit: formData.unit,
      unit_cost: uc,
      total_cost: Number(formData.total_cost) || qty * uc,
      notes: formData.notes,
    });
    setSaving(false);
  };

  const handleSaveAsTemplate = async () => {
    const templateName = prompt("Όνομα προτύπου:");
    if (!templateName?.trim()) return;
    setSavingTemplate(true);
    await base44.entities.BudgetTemplate.create({
      name: templateName.trim(),
      category: formData.category,
      subcategory: formData.subcategory,
      description: formData.description,
      unit: formData.unit,
      unit_cost: Number(formData.unit_cost) || 0,
    });
    queryClient.invalidateQueries({ queryKey: ["budget-templates"] });
    setSavingTemplate(false);
    alert("Πρότυπο αποθηκεύτηκε!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1e3a5f]">
            {item ? "Επεξεργασία Budget Item" : "Νέο Budget Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Κατηγορία *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v, subcategory: "" })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Υποκατηγορία</Label>
              {!showNewSubcategory ? (
                <div className="flex gap-2 mt-1.5">
                  <SearchableSelect
                    value={formData.subcategory}
                    onValueChange={(v) => setFormData({ ...formData, subcategory: v })}
                    items={subcategories.map(s => ({ value: s.name, label: s.name }))}
                    placeholder="Αναζήτηση..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowNewSubcategory(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    placeholder="Νέα υποκατηγορία"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); if (newSubcategoryName.trim()) createSubcategoryMutation.mutate({ name: newSubcategoryName }); }
                    }}
                  />
                  <Button type="button" size="icon" onClick={() => { if (newSubcategoryName.trim()) createSubcategoryMutation.mutate({ name: newSubcategoryName }); }} disabled={!newSubcategoryName.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => { setShowNewSubcategory(false); setNewSubcategoryName(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Περιγραφή</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Σύντομη περιγραφή..."
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Ποσότητα</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => { userEditingRef.current = true; setFormData({ ...formData, quantity: e.target.value }); }}
                step="0.01"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Μονάδα</Label>
              <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Τιμή/Μον. (€)</Label>
              <Input
                type="number"
                value={formData.unit_cost}
                onChange={(e) => { userEditingRef.current = true; setFormData({ ...formData, unit_cost: e.target.value }); }}
                step="0.01"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Σύνολο (€)</Label>
              <Input
                type="number"
                value={formData.total_cost}
                onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                step="0.01"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Σημειώσεις</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Προαιρετικές σημειώσεις..."
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button type="button" variant="outline" size="sm" onClick={handleSaveAsTemplate} disabled={savingTemplate} className="text-[#1e3a5f] border-[#1e3a5f]/30">
              <BookmarkPlus className="w-4 h-4 mr-1.5" />
              Αποθήκευση ως Πρότυπο
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Ακύρωση</Button>
              <Button type="submit" disabled={saving} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                {saving ? "Αποθήκευση..." : item ? "Ενημέρωση" : "Προσθήκη"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}