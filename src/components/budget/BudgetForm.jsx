import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Wrench, Package, Truck, Receipt, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const categoryIcons = {
  labor: Users,
  subcontractor: Wrench,
  materials: Package,
  equipment: Truck,
  general_expenses: Receipt,
};

export default function BudgetForm({ item, open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    category: "",
    subcategory: "",
    payee: "",
    description: "",
    payment_source: "",
    quantity: 1,
    unit: "",
    unit_cost: 0,
    total_cost: 0,
  });
  const [saving, setSaving] = useState(false);
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [showNewPaymentSource, setShowNewPaymentSource] = useState(false);
  const [newPaymentSourceName, setNewPaymentSourceName] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      if (item) {
        setFormData({
          category: item.category || "",
          subcategory: item.subcategory || "",
          payee: item.payee || "",
          description: item.description || "",
          payment_source: item.payment_source || "",
          quantity: item.quantity || 1,
          unit: item.unit || "",
          unit_cost: item.unit_cost || 0,
          total_cost: item.total_cost || 0,
        });
      } else {
        setFormData({
          category: "",
          subcategory: "",
          payee: "",
          description: "",
          payment_source: "",
          quantity: 1,
          unit: "",
          unit_cost: 0,
          total_cost: 0,
        });
      }
    }
  }, [item, open]);

  useEffect(() => {
    const total = (Number(formData.quantity) || 0) * (Number(formData.unit_cost) || 0);
    setFormData(prev => ({ ...prev, total_cost: total }));
  }, [formData.quantity, formData.unit_cost]);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("name"),
    enabled: open,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list("name"),
    enabled: open,
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
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

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setFormData(prev => ({ ...prev, payee: newContact.name }));
      setShowNewContact(false);
      setNewContactName("");
    },
  });

  const createPaymentSourceMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentSource.create(data),
    onSuccess: (newSource) => {
      queryClient.invalidateQueries({ queryKey: ["paymentSources"] });
      setFormData(prev => ({ ...prev, payment_source: newSource.name }));
      setShowNewPaymentSource(false);
      setNewPaymentSourceName("");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      category: formData.category || "",
      subcategory: formData.subcategory || "",
      payee: formData.payee || "",
      description: formData.description || "",
      payment_source: formData.payment_source || "",
      quantity: Number(formData.quantity) || 0,
      unit: formData.unit || "",
      unit_cost: Number(formData.unit_cost) || 0,
      total_cost: (Number(formData.quantity) || 0) * (Number(formData.unit_cost) || 0),
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1e3a5f]">
            {item ? "Edit Budget Item" : "Add Budget Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
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
              <Label>Subcategory</Label>
              {!showNewSubcategory ? (
                <div className="flex gap-2 mt-1.5">
                  <SearchableSelect
                    value={formData.subcategory}
                    onValueChange={(v) => setFormData({ ...formData, subcategory: v })}
                    items={subcategories.map(s => ({ value: s.name, label: s.name }))}
                    placeholder="Search subcategory..."
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
                    placeholder="New subcategory"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubcategoryName.trim()) createSubcategoryMutation.mutate({ name: newSubcategoryName });
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => { if (newSubcategoryName.trim()) createSubcategoryMutation.mutate({ name: newSubcategoryName }); }}
                    disabled={!newSubcategoryName.trim() || createSubcategoryMutation.isPending}
                  >
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
            <Label>Payee / Vendor *</Label>
            {!showNewContact ? (
              <div className="flex gap-2 mt-1.5">
                <SearchableSelect
                  value={formData.payee}
                  onValueChange={(v) => setFormData({ ...formData, payee: v })}
                  items={contacts.map(c => ({ value: c.name, label: c.name, subtitle: [c.phone, c.company].filter(Boolean).join(' • ') }))}
                  placeholder="Search payee..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={() => setShowNewContact(true)} className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2 mt-1.5">
                <Input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Contact name"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => { if (newContactName.trim()) createContactMutation.mutate({ name: newContactName, category: "supplier" }); }}
                    disabled={!newContactName.trim() || createContactMutation.isPending}
                  >
                    Add
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowNewContact(false); setNewContactName(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description..."
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                step="0.01"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Cost (€)</Label>
              <Input
                type="number"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                step="0.01"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Total (€)</Label>
              <Input
                type="number"
                value={formData.total_cost}
                disabled
                className="mt-1.5 bg-gray-50"
              />
            </div>
          </div>

          <div>
            <Label>Payment Source</Label>
            {!showNewPaymentSource ? (
              <div className="flex gap-2 mt-1.5">
                <SearchableSelect
                  value={formData.payment_source}
                  onValueChange={(v) => setFormData({ ...formData, payment_source: v })}
                  items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
                  placeholder="Search payment source..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={() => setShowNewPaymentSource(true)} className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newPaymentSourceName}
                  onChange={(e) => setNewPaymentSourceName(e.target.value)}
                  placeholder="e.g., Bank 01, Cash"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newPaymentSourceName.trim()) createPaymentSourceMutation.mutate({ name: newPaymentSourceName });
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => { if (newPaymentSourceName.trim()) createPaymentSourceMutation.mutate({ name: newPaymentSourceName }); }}
                  disabled={!newPaymentSourceName.trim() || createPaymentSourceMutation.isPending}
                >
                  Add
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowNewPaymentSource(false); setNewPaymentSourceName(""); }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a5f] hover:bg-[#152a45]">
              {saving ? "Saving..." : item ? "Update Budget Item" : "Add Budget Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}