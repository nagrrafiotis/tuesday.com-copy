import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EditInvoiceDialog({ open, onClose, invoice, projects, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) setForm({ ...invoice });
  }, [invoice]);

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
  });

  const { data: dropdownLists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("name"),
  });

  const handleVendorSelect = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    setForm(f => ({
      ...f,
      vendor_client: contact.name,
      vendor_eponymia: contact.eponymia || f.vendor_eponymia || "",
      vendor_afm: contact.afm || f.vendor_afm || "",
    }));
  };

  const expenseCategories = dropdownLists.find(l => l.list_name === "expense_categories")?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"];

  const currentPhaseId = subcategories.find(s => s.name === form.subcategory)?.phase_id || "";
  const filteredSubs = currentPhaseId ? subcategories.filter(s => s.phase_id === currentPhaseId) : subcategories;

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const { id, created_date, updated_date, created_by, ...data } = form;
    await base44.entities.Invoice.update(invoice.id, data);
    onSaved();
    setSaving(false);
    onClose();
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <Pencil className="w-5 h-5" /> Edit Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type || "expense"} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={form.project_id || ""} onValueChange={(v) => set("project_id", v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Vendor / Client</Label>
              <SearchableSelect
                value={contacts.find(c => c.name === form.vendor_client)?.id || ""}
                onValueChange={handleVendorSelect}
                placeholder="Επιλογή από επαφές..."
                items={contacts.map(c => ({
                  value: c.id,
                  label: c.name + (c.afm ? ` (${c.afm})` : ""),
                }))}
                triggerClassName="h-9 w-full"
              />
              <Input
                value={form.vendor_client || ""}
                onChange={e => set("vendor_client", e.target.value)}
                className="h-9 mt-1"
                placeholder="ή πληκτρολογήστε όνομα"
              />
            </div>
            <div>
              <Label className="text-xs">Επωνυμία</Label>
              <Input value={form.vendor_eponymia || ""} onChange={e => set("vendor_eponymia", e.target.value)} className="h-9" placeholder="Επωνυμία εταιρείας" />
            </div>
            <div>
              <Label className="text-xs">ΑΦΜ</Label>
              <Input value={form.vendor_afm || ""} onChange={e => set("vendor_afm", e.target.value)} className="h-9" placeholder="π.χ. 123456789" />
            </div>
            <div>
              <Label className="text-xs">Invoice #</Label>
              <Input value={form.invoice_number || ""} onChange={e => set("invoice_number", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.due_date || ""} onChange={e => set("due_date", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <SearchableSelect
                value={form.category || ""}
                onValueChange={(v) => set("category", v)}
                placeholder="Select category"
                items={expenseCategories.map(cat => ({ value: cat, label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
                triggerClassName="h-9 w-full"
              />
            </div>
            <div>
              <Label className="text-xs">Phase</Label>
              <SearchableSelect
                value={currentPhaseId}
                onValueChange={(phaseId) => {
                  const firstSub = subcategories.find(s => s.phase_id === phaseId);
                  set("subcategory", firstSub?.name || "");
                }}
                placeholder="Select phase"
                items={phases.map(p => ({ value: p.id, label: p.name }))}
                triggerClassName="h-9 w-full"
              />
            </div>
            <div>
              <Label className="text-xs">Subcategory</Label>
              <SearchableSelect
                value={form.subcategory || ""}
                onValueChange={(v) => set("subcategory", v)}
                placeholder="Select subcategory"
                items={filteredSubs.map(s => ({ value: s.name, label: s.name }))}
                triggerClassName="h-9 w-full"
              />
            </div>
            <div>
              <Label className="text-xs">Payment Source</Label>
              <Select value={form.payment_source || ""} onValueChange={(v) => set("payment_source", v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {paymentSources.map(ps => <SelectItem key={ps.id} value={ps.name}>{ps.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <Select value={form.payment_method || ""} onValueChange={(v) => set("payment_method", v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Input value={form.description || ""} onChange={e => set("description", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Subtotal</Label>
              <Input type="number" step="0.01" value={form.subtotal || ""} onChange={e => set("subtotal", Number(e.target.value))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Tax Amount</Label>
              <Input type="number" step="0.01" value={form.tax_amount || ""} onChange={e => set("tax_amount", Number(e.target.value))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Total Amount</Label>
              <Input type="number" step="0.01" value={form.total_amount || ""} onChange={e => set("total_amount", Number(e.target.value))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes || ""} onChange={e => set("notes", e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}