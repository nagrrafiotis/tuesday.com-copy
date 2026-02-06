import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus } from "lucide-react";

export default function BudgetForm({ item, open, onClose, onSubmit }) {
  const [formData, setFormData] = useState(item || {
    category: "labor",
    subcategory: "",
    payee: "",
    description: "",
    payment_source: "",
    quantity: 1,
    unit: "piece",
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

  React.useEffect(() => {
    if (open) {
      if (item) {
        setFormData({
          category: item.category || "labor",
          subcategory: item.subcategory || "",
          payee: item.payee || "",
          description: item.description || "",
          payment_source: item.payment_source || "",
          quantity: item.quantity || 1,
          unit: item.unit || "piece",
          unit_cost: item.unit_cost || 0,
          total_cost: item.total_cost || 0,
        });
      } else {
        setFormData({
          category: "labor",
          subcategory: "",
          payee: "",
          description: "",
          payment_source: "",
          quantity: 1,
          unit: "piece",
          unit_cost: 0,
          total_cost: 0,
        });
      }
    }
  }, [item, open]);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("name"),
    enabled: open,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
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

  const unitsList = dropdownLists.find(l => l.list_name === "units");
  const units = unitsList?.options || ["piece", "m", "m2", "m3", "kg", "ton", "hour", "day"];

  const expenseCategoriesList = dropdownLists.find(l => l.list_name === "expense_categories");
  const categories = expenseCategoriesList?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const dataToSubmit = {
      ...formData,
      quantity: Number(formData.quantity) || 0,
      unit_cost: Number(formData.unit_cost) || 0,
      total_cost: (Number(formData.quantity) || 0) * (Number(formData.unit_cost) || 0),
    };

    await onSubmit(dataToSubmit);
    setSaving(false);
  };

  React.useEffect(() => {
    const total = (Number(formData.quantity) || 0) * (Number(formData.unit_cost) || 0);
    setFormData(prev => ({ ...prev, total_cost: total }));
  }, [formData.quantity, formData.unit_cost]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Budget Item" : "New Budget Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subcategory</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={formData.subcategory || ""}
                    onValueChange={(value) => setFormData(prev => ({...prev, subcategory: value || ""}))}
                    placeholder="Select subcategory"
                    items={subcategories.map(s => ({ value: s.name, label: s.name }))}
                  />
                </div>
                <Button type="button" size="icon" variant="outline" onClick={() => setShowNewSubcategory(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Payee</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={formData.payee || ""}
                  onValueChange={(value) => setFormData(prev => ({...prev, payee: value || ""}))}
                  placeholder="Select payee"
                  items={contacts.map(c => ({ value: c.name, label: c.name }))}
                />
              </div>
              <Button type="button" size="icon" variant="outline" onClick={() => setShowNewContact(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Item description..."
            />
          </div>

          <div>
            <Label>Payment Source</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={formData.payment_source || ""}
                  onValueChange={(value) => setFormData(prev => ({...prev, payment_source: value || ""}))}
                  placeholder="Select payment source"
                  items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
                />
              </div>
              <Button type="button" size="icon" variant="outline" onClick={() => setShowNewPaymentSource(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                step="0.01"
              />
            </div>

            <div>
              <Label>Unit</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unit Cost (€)</Label>
              <Input
                type="number"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                step="0.01"
              />
            </div>

            <div>
              <Label>Total (€)</Label>
              <Input
                type="number"
                value={formData.total_cost}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a5f] hover:bg-[#152a45]">
              {saving ? "Saving..." : item ? "Update" : "Create"}
            </Button>
          </div>
        </form>

        {/* New Subcategory Dialog */}
        <Dialog open={showNewSubcategory} onOpenChange={setShowNewSubcategory}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Subcategory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="Enter subcategory name..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewSubcategory(false)}>Cancel</Button>
                <Button onClick={() => createSubcategoryMutation.mutate({ name: newSubcategoryName })}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Contact Dialog */}
        <Dialog open={showNewContact} onOpenChange={setShowNewContact}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Enter contact name..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewContact(false)}>Cancel</Button>
                <Button onClick={() => createContactMutation.mutate({ name: newContactName })}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Payment Source Dialog */}
        <Dialog open={showNewPaymentSource} onOpenChange={setShowNewPaymentSource}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Payment Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newPaymentSourceName}
                  onChange={(e) => setNewPaymentSourceName(e.target.value)}
                  placeholder="Enter payment source name..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewPaymentSource(false)}>Cancel</Button>
                <Button onClick={() => createPaymentSourceMutation.mutate({ name: newPaymentSourceName })}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}