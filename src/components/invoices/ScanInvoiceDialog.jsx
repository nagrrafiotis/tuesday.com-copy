import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ScanLine, Upload, Loader2, ImageIcon } from "lucide-react";

export default function ScanInvoiceDialog({ open, onClose, projects, onCreated }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileRef = useRef();

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf && file.size > 9.5 * 1024 * 1024) {
      setFileError("PDF file is too large (max 10MB). Please compress it or use a smaller file.");
      return;
    }
    setImageFile(file);
    setImagePreview(isPdf ? null : URL.createObjectURL(file));
    setResult(null);
  };

  const handleScan = async () => {
    if (!imageFile) return;
    setScanning(true);
    setFileError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this invoice image and extract all information. Return a JSON with:
- invoice_number (string or null)
- vendor_client (string - the company/person name on the invoice)
- date (ISO date string YYYY-MM-DD or null)
- due_date (ISO date string YYYY-MM-DD or null)
- items (array of {description, quantity, unit, unit_price, total})
- subtotal (number or null)
- tax_amount (number or null)
- total_amount (number - the final total)
- notes (any extra notes or payment terms)
- type (guess if this is "expense" or "income" based on context - default "expense")
- category (one of: labor, subcontractor, materials, equipment, general_expenses, or for income: sales, investment, rental, other)
- description (brief one-line summary)

Be precise with numbers. Use null for fields not found.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            vendor_client: { type: "string" },
            date: { type: "string" },
            due_date: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  unit_price: { type: "number" },
                  total: { type: "number" }
                }
              }
            },
            subtotal: { type: "number" },
            tax_amount: { type: "number" },
            total_amount: { type: "number" },
            notes: { type: "string" },
            type: { type: "string" },
            category: { type: "string" },
            description: { type: "string" }
          }
        }
      });

      setResult({ ...extracted, image_url: file_url, status: "pending" });
    } catch (err) {
      setFileError("Failed to analyze invoice. The file may be too large or unsupported. Try a smaller or compressed file.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Invoice.create({ ...result });
    onCreated();
    setSaving(false);
    handleClose();
  };

  const handleClose = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <ScanLine className="w-5 h-5" /> Scan Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#1e3a5f]/40 transition-colors"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Invoice" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : imageFile ? (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <ScanLine className="w-10 h-10" />
                <p className="text-sm font-medium">{imageFile.name}</p>
                <p className="text-xs text-gray-400">{(imageFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon className="w-10 h-10" />
                <p className="text-sm">Click to upload invoice image</p>
                <p className="text-xs">JPG, PNG, PDF (max 10MB)</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
          {fileError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fileError}</p>
          )}

          {imageFile && !result && (
            <Button onClick={handleScan} disabled={scanning} className="w-full bg-[#1e3a5f] hover:bg-[#152a45] gap-2">
              {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI...</> : <><ScanLine className="w-4 h-4" /> Analyze Invoice</>}
            </Button>
          )}

          {/* Editable result */}
          {result && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h3 className="font-semibold text-gray-800">Extracted Data — Review & Edit</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={result.type} onValueChange={(v) => setResult(r => ({ ...r, type: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Project</Label>
                  <Select value={result.project_id || ""} onValueChange={(v) => setResult(r => ({ ...r, project_id: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Vendor / Client</Label>
                  <Input value={result.vendor_client || ""} onChange={e => setResult(r => ({ ...r, vendor_client: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Invoice #</Label>
                  <Input value={result.invoice_number || ""} onChange={e => setResult(r => ({ ...r, invoice_number: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={result.date || ""} onChange={e => setResult(r => ({ ...r, date: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" value={result.due_date || ""} onChange={e => setResult(r => ({ ...r, due_date: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Input value={result.category || ""} onChange={e => setResult(r => ({ ...r, category: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Payment Source</Label>
                  <Select value={result.payment_source || ""} onValueChange={(v) => setResult(r => ({ ...r, payment_source: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {paymentSources.map(ps => <SelectItem key={ps.id} value={ps.name}>{ps.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={result.payment_method || ""} onValueChange={(v) => setResult(r => ({ ...r, payment_method: v }))}>
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
                  <Input value={result.description || ""} onChange={e => setResult(r => ({ ...r, description: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Total Amount</Label>
                  <Input type="number" step="0.01" value={result.total_amount || ""} onChange={e => setResult(r => ({ ...r, total_amount: Number(e.target.value) }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Tax Amount</Label>
                  <Input type="number" step="0.01" value={result.tax_amount || ""} onChange={e => setResult(r => ({ ...r, tax_amount: Number(e.target.value) }))} className="h-9" />
                </div>
              </div>

              {/* Line items preview */}
              {result.items && result.items.length > 0 && (
                <div>
                  <Label className="text-xs mb-2 block">Line Items ({result.items.length})</Label>
                  <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left px-3 py-2">Description</th>
                          <th className="text-right px-3 py-2">Qty</th>
                          <th className="text-right px-3 py-2">Price</th>
                          <th className="text-right px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((item, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-1.5">{item.description}</td>
                            <td className="px-3 py-1.5 text-right">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-1.5 text-right">{item.unit_price?.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-right font-medium">{item.total?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Invoice"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}