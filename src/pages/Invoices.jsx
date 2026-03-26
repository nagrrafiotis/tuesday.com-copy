import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ScanLine, Plus, ChevronDown, ChevronUp, ArrowRight, Receipt, TrendingUp,
  FileText, Calendar, Building2, Hash, Loader2, Trash2, CheckCircle2
} from "lucide-react";
import ScanInvoiceDialog from "../components/invoices/ScanInvoiceDialog";
import TransferInvoiceDialog from "../components/invoices/TransferInvoiceDialog";

const formatCurrency = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

export default function Invoices() {
  const queryClient = useQueryClient();
  const [scanOpen, setScanOpen] = useState(false);
  const [transferInvoice, setTransferInvoice] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const deleteInvoice = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || "—";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">Scan invoices and transfer them to expenses or income</p>
        </div>
        <Button onClick={() => setScanOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] gap-2">
          <ScanLine className="w-4 h-4" />
          Scan Invoice
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No invoices yet</h3>
          <p className="text-gray-500 mb-4">Scan your first invoice to get started</p>
          <Button onClick={() => setScanOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] gap-2">
            <ScanLine className="w-4 h-4" /> Scan Invoice
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
                onClick={() => toggleExpand(invoice.id)}
              >
                <div className="flex-shrink-0">
                  {invoice.type === "expense" ? (
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-red-500" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{invoice.vendor_client}</span>
                    {invoice.invoice_number && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Hash className="w-3 h-3" />{invoice.invoice_number}
                      </span>
                    )}
                    <Badge className={invoice.type === "expense" ? "bg-red-100 text-red-700 border-0" : "bg-green-100 text-green-700 border-0"}>
                      {invoice.type === "expense" ? "Expense" : "Income"}
                    </Badge>
                    {invoice.status === "transferred" && (
                      <Badge className="bg-blue-100 text-blue-700 border-0 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Transferred
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {invoice.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(invoice.date), "dd/MM/yyyy")}
                      </span>
                    )}
                    {invoice.project_id && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{getProjectName(invoice.project_id)}
                      </span>
                    )}
                    {invoice.category && <span className="capitalize">{invoice.category}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-[#1e3a5f] text-lg">{formatCurrency(invoice.total_amount)}</span>

                  {invoice.status !== "transferred" && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setTransferInvoice(invoice); }}
                      className="bg-[#c9a962] hover:bg-[#b8954f] text-white gap-1 h-8 text-xs"
                    >
                      <ArrowRight className="w-3 h-3" /> Transfer
                    </Button>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteInvoice.mutate(invoice.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {expandedId === invoice.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Detail */}
              <AnimatePresence>
                {expandedId === invoice.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: invoice image + info */}
                        <div className="space-y-4">
                          {invoice.image_url && (
                            <img
                              src={invoice.image_url}
                              alt="Invoice"
                              className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-white"
                            />
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {invoice.invoice_number && (
                              <div>
                                <span className="text-gray-400 text-xs">Invoice #</span>
                                <p className="font-medium">{invoice.invoice_number}</p>
                              </div>
                            )}
                            {invoice.due_date && (
                              <div>
                                <span className="text-gray-400 text-xs">Due Date</span>
                                <p className="font-medium">{format(new Date(invoice.due_date), "dd/MM/yyyy")}</p>
                              </div>
                            )}
                            {invoice.payment_source && (
                              <div>
                                <span className="text-gray-400 text-xs">Payment Source</span>
                                <p className="font-medium">{invoice.payment_source}</p>
                              </div>
                            )}
                            {invoice.subcategory && (
                              <div>
                                <span className="text-gray-400 text-xs">Subcategory</span>
                                <p className="font-medium">{invoice.subcategory}</p>
                              </div>
                            )}
                          </div>
                          {invoice.notes && (
                            <div>
                              <span className="text-gray-400 text-xs">Notes</span>
                              <p className="text-sm text-gray-700 mt-1">{invoice.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Right: line items */}
                        <div>
                          {invoice.items && invoice.items.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Line Items</h4>
                              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 text-gray-500 text-xs">
                                    <tr>
                                      <th className="text-left px-3 py-2">Description</th>
                                      <th className="text-right px-3 py-2">Qty</th>
                                      <th className="text-right px-3 py-2">Unit Price</th>
                                      <th className="text-right px-3 py-2">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {invoice.items.map((item, i) => (
                                      <tr key={i} className="border-t border-gray-100">
                                        <td className="px-3 py-2">{item.description}</td>
                                        <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-right pr-1">
                                {invoice.subtotal != null && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
                                  </div>
                                )}
                                {invoice.tax_amount != null && invoice.tax_amount > 0 && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-[#1e3a5f] border-t border-gray-200 pt-1">
                                  <span>Total</span><span>{formatCurrency(invoice.total_amount)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic">No line items extracted</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <ScanInvoiceDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        projects={projects}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })}
      />

      {transferInvoice && (
        <TransferInvoiceDialog
          invoice={transferInvoice}
          projects={projects}
          onClose={() => setTransferInvoice(null)}
          onTransferred={() => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["income"] });
            setTransferInvoice(null);
          }}
        />
      )}
    </div>
  );
}