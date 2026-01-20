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

const categories = [
  { value: "labor", label: "Labor", icon: Users },
  { value: "subcontractor", label: "Subcontractor", icon: Wrench },
  { value: "materials", label: "Materials", icon: Package },
  { value: "equipment", label: "Equipment", icon: Truck },
  { value: "general_expenses", label: "General Expenses", icon: Receipt },
];

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
  const [showNewPayee, setShowNewPayee] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState("");
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [showNewPaymentSource, setShowNewPaymentSource] = useState(false);
  const [newPaymentSourceName, setNewPaymentSourceName] = useState("");
  
  const queryClient = useQueryClient();
  
  const { data: payees = [] } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list("name"),
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
  
  const createPayeeMutation = useMutation({
    mutationFn: (data) => base44.entities.Payee.create(data),
    onSuccess: (newPayee) => {
      queryClient.invalidateQueries({ queryKey: ["payees"] });
      setFormData({ ...formData, payee: newPayee.name });
      setShowNewPayee(false);
      setNewPayeeName("");
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
  
  const filteredSubcategories = subcategories.filter(
    (s) => s.parent_category === formData.category
  );

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
                  <Select
                    value={formData.subcategory}
                    onValueChange={(v) => setFormData({ ...formData, subcategory: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                            name: newSubcategoryName, 
                            parent_category: formData.category 
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
                          name: newSubcategoryName, 
                          parent_category: formData.category 
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
            {!showNewPayee ? (
              <div className="flex gap-2 mt-1.5">
                <Select
                  value={formData.payee}
                  onValueChange={(v) => setFormData({ ...formData, payee: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select payee" />
                  </SelectTrigger>
                  <SelectContent>
                    {payees.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewPayee(true)}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newPayeeName}
                  onChange={(e) => setNewPayeeName(e.target.value)}
                  placeholder="New payee name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newPayeeName.trim()) {
                        createPayeeMutation.mutate({ name: newPayeeName, category: formData.category });
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newPayeeName.trim()) {
                      createPayeeMutation.mutate({ name: newPayeeName, category: formData.category });
                    }
                  }}
                  disabled={!newPayeeName.trim() || createPayeeMutation.isPending}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewPayee(false);
                    setNewPayeeName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    {formData.date ? format(new Date(formData.date), "PPP") : "Select date"}
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
                <Select
                  value={formData.payment_source}
                  onValueChange={(v) => setFormData({ ...formData, payment_source: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select payment source" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentSources.map((ps) => (
                      <SelectItem key={ps.id} value={ps.name}>
                        {ps.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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