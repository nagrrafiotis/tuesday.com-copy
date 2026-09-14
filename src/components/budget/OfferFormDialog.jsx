import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Loader2, FileText, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { extractOfferFromFile } from "@/lib/offerExtract";

const fmt = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
const emptyItem = () => ({ description: "", quantity: 1, unit: "", unit_cost: 0, total: 0, category: "materials", subcategory: "" });

const catLabel = (c) => c.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function OfferFormDialog({ offer, projectId, open, onClose, onSubmit, saving }) {
  const [form, setForm] = useState({ title: "", vendor: "", date: "", notes: "" });
  const [items, setItems] = useState([emptyItem()]);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const { data: dropdownLists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
    enabled: open,
  });
  const categories = dropdownLists.find((l) => l.list_name === "expense_categories")?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"];
  const units = dropdownLists.find((l) => l.list_name === "units")?.options || ["m²", "m³", "m", "kg", "ton", "pcs", "hr", "day", "ls"];

  useEffect(() => {
    if (!open) return;
    setError("");
    if (offer) {
      setForm({ title: offer.title || "", vendor: offer.vendor || "", date: offer.date?.slice(0, 10) || "", notes: offer.notes || "" });
      setItems(offer.items?.length ? offer.items.map((it) => ({ ...emptyItem(), ...it })) : [emptyItem()]);
      setFileUrl(offer.file_url || "");
      setFileName(offer.file_name || "");
    } else {
      setForm({ title: "", vendor: "", date: new Date().toISOString().slice(0, 10), notes: "" });
      setItems([emptyItem()]);
      setFileUrl("");
      setFileName("");
    }
  }, [offer, open]);

  const updateItem = (i, patch) =>
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      if ("quantity" in patch || "unit_cost" in patch) {
        next.total = (Number(next.quantity) || 0) * (Number(next.unit_cost) || 0);
      }
      return next;
    }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setFileUrl(file_url);
      setFileName(file.name);
      setUploading(false);
      setExtracting(true);
      try {
        const result = await extractOfferFromFile(file, file_url);
        if (result.items?.length) setItems(result.items.map((it) => ({ ...emptyItem(), ...it })));
        if (result.meta?.vendor && !form.vendor) setForm((f) => ({ ...f, vendor: result.meta.vendor }));
        if (result.meta?.offer_date && !form.date) setForm((f) => ({ ...f, date: result.meta.offer_date.slice(0, 10) }));
      } catch (err) {
        setError(err?.message || "Η αυτόματη ανάλυση απέτυχε. Μπορείτε να συμπληρώσετε τα στοιχεία χειροκίνητα.");
      } finally {
        setExtracting(false);
      }
    } catch (err) {
      setError("Αποτυχία ανεβάσματος αρχείου");
      setUploading(false);
    }
  };

  const total = items.reduce((s, it) => s + (Number(it.total) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Συμπληρώστε τίτλο προσφοράς"); return; }
    onSubmit({
      project_id: projectId,
      title: form.title.trim(),
      vendor: form.vendor,
      date: form.date,
      file_url: fileUrl,
      file_name: fileName,
      items: items.filter((it) => (it.description || "").trim() || it.total),
      total_amount: total,
      notes: form.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1e3a5f]">{offer ? "Επεξεργασία Προσφοράς" : "Νέα Προσφορά"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Τίτλος *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="π.χ. Προσφορά υλικών" />
            </div>
            <div>
              <Label>Προμηθευτής</Label>
              <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Ημερομηνία</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5" />
            </div>
          </div>

          <div className="border border-dashed rounded-lg p-4 bg-gray-50/50">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1e3a5f]" />
                <span className="text-sm font-medium text-gray-700">Αρχείο προσφοράς (PDF, Excel, Word, εικόνα)</span>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFile} />
              <Button type="button" variant="outline" size="sm" disabled={uploading || extracting} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ανέβασμα...</> : <><Upload className="w-4 h-4 mr-2" /> {fileUrl ? "Αντικατάσταση αρχείου" : "Ανέβασμα & ανάλυση"}</>}
              </Button>
            </div>
            {fileUrl && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[#1e3a5f] underline">{fileName || "Αρχείο"}</a>
                {extracting && <span className="flex items-center gap-1 text-amber-600"><Loader2 className="w-3 h-3 animate-spin" /> Ανάλυση σε εξέλιξη...</span>}
              </div>
            )}
            {error && (
              <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded p-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[#1e3a5f] font-semibold">Στοιχεία Προσφοράς</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}>
                <Plus className="w-4 h-4 mr-1" /> Γραμμή
              </Button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-2 min-w-[200px]">Περιγραφή</th>
                    <th className="text-right p-2 w-20">Ποσ.</th>
                    <th className="text-left p-2 w-20">Μον.</th>
                    <th className="text-left p-2 w-36">Κατηγορία</th>
                    <th className="text-right p-2 w-28">Τιμή/Μον.</th>
                    <th className="text-right p-2 w-28">Σύνολο</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50/50">
                      <td className="p-1"><input className="w-full border-0 bg-transparent rounded px-1 py-1 focus:bg-blue-50 outline-none" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Περιγραφή..." /></td>
                      <td className="p-1"><input type="number" step="0.01" className="w-full text-right border-0 bg-transparent rounded px-1 py-1 focus:bg-blue-50 outline-none" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 0 })} /></td>
                      <td className="p-1"><select className="w-full border-0 bg-transparent rounded px-1 py-1 focus:bg-blue-50 outline-none text-sm" value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })}><option value="">—</option>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></td>
                      <td className="p-1"><select className="w-full border-0 bg-transparent rounded px-1 py-1 focus:bg-blue-50 outline-none text-xs" value={it.category} onChange={(e) => updateItem(i, { category: e.target.value })}>{categories.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}</select></td>
                      <td className="p-1"><input type="number" step="0.01" className="w-full text-right border-0 bg-transparent rounded px-1 py-1 focus:bg-blue-50 outline-none" value={it.unit_cost} onChange={(e) => updateItem(i, { unit_cost: Number(e.target.value) || 0 })} /></td>
                      <td className="p-2 text-right font-medium text-[#1e3a5f] whitespace-nowrap">{fmt(it.total)}</td>
                      <td className="p-1 text-center"><button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2">
                    <td colSpan={5} className="p-2 text-right font-semibold text-gray-700">Σύνολο Προσφοράς</td>
                    <td className="p-2 text-right font-bold text-[#1e3a5f] whitespace-nowrap">{fmt(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div>
            <Label>Σημειώσεις</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Ακύρωση</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a5f] hover:bg-[#152a45]">{saving ? "Αποθήκευση..." : "Αποθήκευση Προσφοράς"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}