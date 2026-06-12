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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Users, Wrench, Package, Truck, Receipt, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applyRules } from "@/lib/categoryRules";

const categoryIcons = {
  labor: Users,
  subcontractor: Wrench,
  materials: Package,
  equipment: Truck,
  general_expenses: Receipt,
};

export default function ExpenseForm({ expense, projectId, projects = [], open, onClose, onSubmit }) {
  const [formData, setFormData] = useState(
    expense || {
      project_id: projectId || "",
      category: "materials",
      subcategory: "",
      payee: "",
      description: "",
      date: new Date().toISOString(),
      amount: "",
      payment_source: "",
    }
  );

  useEffect(() => {
    if (expense) {
      setFormData(expense);
    } else {
      setFormData({
        project_id: projectId || "",
        category: "materials",
        subcategory: "",
        payee: "",
        description: "",
        date: new Date().toISOString(),
        amount: "",
        payment_source: "",
      });
    }
  }, [expense, projectId]);
  const [loading, setLoading] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [showNewPaymentSource, setShowNewPaymentSource] = useState(false);
  const [newPaymentSourceName, setNewPaymentSourceName] = useState("");
  
  const queryClient = useQueryClient();
  
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

  const { data: lists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
    enabled: open,
  });

  const { data: categoryRules = [] } = useQuery({
    queryKey: ["category-rules"],
    queryFn: () => base44.entities.CategoryRule.list("-priority"),
    enabled: open,
    staleTime: 60000,
  });

  const expenseCategoriesList = lists.find(l => l.list_name === "expense_categories");
  const categories = (expenseCategoriesList?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"]).map(cat => ({
    value: cat,
    label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    icon: categoryIcons[cat] || Receipt
  }));
  
  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setFormData({ ...formData, payee: newContact.name });
      setShowNewContact(false);
      setNewContactName("");
    },
  });
  
  const createSubcategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.Subcategory.create(data),
    onSuccess: (newSubcat) => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setFormData({ ...formData, subcategory: newSubcat.name });
      setShowNewSubcategory(false);
      setNewSubcategoryName("");
    },
  });
  
  const createPaymentSourceMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentSource.create(data),
    onSuccess: (newSource) => {
      queryClient.invalidateQueries({ queryKey: ["paymentSources"] });
      setFormData({ ...formData, payment_source: newSource.name });
      setShowNewPaymentSource(false);
      setNewPaymentSourceName("");
    },
  });
  
  const filteredSubcategories = subcategories;

  // Auto-categorize when payee or description changes
  const handlePayeeOrDescriptionChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    // Only auto-categorize if user hasn't manually set a non-default category
    const text = `${field === "payee" ? value : updated.payee} ${field === "description" ? value : updated.description}`;
    const match = applyRules(text, categoryRules);
    if (match) {
      updated.category = match.category;
      if (match.subcategory) updated.subcategory = match.subcategory;
    }
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...formData,
      amount: Number(formData.amount),
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1e3a5f]">
            {expense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!projectId && (
            <div>
              <Label>Project *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(v) => setFormData({ ...formData, project_id: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                    items={filteredSubcategories.map(s => ({ value: s.name, label: s.name }))}
                    placeholder="Search subcategory..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewSubcategory(true)}
                  >
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
                        if (newSubcategoryName.trim()) {
                          createSubcategoryMutation.mutate({ 
                            name: newSubcategoryName
                          });
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => {
                      if (newSubcategoryName.trim()) {
                        createSubcategoryMutation.mutate({ 
                          name: newSubcategoryName
                        });
                      }
                    }}
                    disabled={!newSubcategoryName.trim() || createSubcategoryMutation.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setShowNewSubcategory(false);
                      setNewSubcategoryName("");
                    }}
                  >
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
                  onValueChange={(v) => handlePayeeOrDescriptionChange("payee", v)}
                  items={contacts.map(c => ({ 
                    value: c.name, 
                    label: c.name,
                    subtitle: [c.phone, c.company].filter(Boolean).join(' • ')
                  }))}
                  placeholder="Search payee..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewContact(true)}
                  className="shrink-0"
                >
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
                    onClick={() => {
                      if (newContactName.trim()) {
                        createContactMutation.mutate({ 
                          name: newContactName,
                          category: "supplier"
                        });
                      }
                    }}
                    disabled={!newContactName.trim() || createContactMutation.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewContact(false);
                      setNewContactName("");
                    }}
                  >
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
              onChange={(e) => handlePayeeOrDescriptionChange("description", e.target.value)}
              placeholder="Brief description of the expense..."
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(new Date(formData.date), "dd/MM/yy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date ? new Date(formData.date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, date: date?.toISOString() })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Amount (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="mt-1.5"
                required
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewPaymentSource(true)}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newPaymentSourceName}
                  onChange={(e) => setNewPaymentSourceName(e.target.value)}
                  placeholder="e.g., Bank 01, Cash, Cash X"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newPaymentSourceName.trim()) {
                        createPaymentSourceMutation.mutate({ name: newPaymentSourceName });
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newPaymentSourceName.trim()) {
                      createPaymentSourceMutation.mutate({ name: newPaymentSourceName });
                    }
                  }}
                  disabled={!newPaymentSourceName.trim() || createPaymentSourceMutation.isPending}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewPaymentSource(false);
                    setNewPaymentSourceName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.project_id}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              {loading ? "Saving..." : expense ? "Update Expense" : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}