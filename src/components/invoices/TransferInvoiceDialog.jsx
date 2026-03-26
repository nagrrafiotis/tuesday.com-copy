import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Receipt, TrendingUp } from "lucide-react";

const formatCurrency = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

export default function TransferInvoiceDialog({ invoice, projects, onClose, onTransferred }) {
  const [type, setType] = useState(invoice.type || "expense");
  const [projectId, setProjectId] = useState(invoice.project_id || "");
  const [paymentSource, setPaymentSource] = useState(invoice.payment_source || "");
  const [loading, setLoading] = useState(false);

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const handleTransfer = async () => {
    setLoading(true);

    if (type === "expense") {
      await base44.entities.Expense.create({
        project_id: projectId || undefined,
        category: invoice.category || "general_expenses",
        subcategory: invoice.subcategory || undefined,
        payee: invoice.vendor_client,
        description: invoice.description || invoice.invoice_number || "",
        date: invoice.date || new Date().toISOString().split("T")[0],
        amount: invoice.total_amount,
        payment_source: paymentSource || undefined,
      });
    } else {
      await base44.entities.Income.create({
        project_id: projectId || undefined,
        source: invoice.vendor_client,
        description: invoice.description || invoice.invoice_number || "",
        date: invoice.date || new Date().toISOString().split("T")[0],
        amount: invoice.total_amount,
        payment_source: paymentSource || undefined,
        category: invoice.category || "other",
      });
    }

    await base44.entities.Invoice.update(invoice.id, { status: "transferred" });
    setLoading(false);
    onTransferred();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <ArrowRight className="w-5 h-5" /> Transfer Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="font-semibold text-gray-800">{invoice.vendor_client}</div>
            <div className="text-gray-500">{invoice.description || invoice.invoice_number}</div>
            <div className="text-xl font-bold text-[#1e3a5f] mt-1">{formatCurrency(invoice.total_amount)}</div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Transfer as</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType("expense")}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                  type === "expense" ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Receipt className="w-4 h-4" /> Expense
              </button>
              <button
                onClick={() => setType("income")}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                  type === "income" ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Income
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No project</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Payment Source</Label>
            <Select value={paymentSource} onValueChange={setPaymentSource}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select payment source (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {paymentSources.map(ps => <SelectItem key={ps.id} value={ps.name}>{ps.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleTransfer} disabled={loading} className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45] gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Transfer to {type === "expense" ? "Expenses" : "Income"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}