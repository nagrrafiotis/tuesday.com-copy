import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Loader2 } from "lucide-react";

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
            <div>
              <Label className="text-xs">Vendor / Client</Label>
              <Input value={form.vendor_client || ""} onChange={e => set("vendor_client", e.target.value)} className="h-9" />
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
              <Input value={form.category || ""} onChange={e => set("category", e.target.value)} className="h-9" />
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