import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Pencil, FileText, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  "Ενοίκιο", "Τηλέφωνο / Internet", "Ρεύμα / ΔΕΗ", "Ύδρευση", "Λογιστικές υπηρεσίες",
  "Νομικές υπηρεσίες", "Τεχνικές υπηρεσίες", "Γραφική ύλη / Αναλώσιμα", "Μεταφορικά",
  "Ταξιδιωτικά", "Διαφήμιση / Marketing", "Ασφάλειες", "Φόροι / Τέλη", "Τράπεζα / Προμήθειες",
  "Εξοπλισμός", "Λογισμικό / Συνδρομές", "Καύσιμα", "Συντήρηση", "Λοιπά"
];

const emptyForm = { description: "", category: "", amount: "", date: "", payment_source: "", payee: "", notes: "", file_url: "" };

export default function GeneralExpensesTable() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();
  const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["general-expenses"],
    queryFn: () => base44.entities.GeneralExpense.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.GeneralExpense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["general-expenses"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GeneralExpense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["general-expenses"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.GeneralExpense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["general-expenses"] }),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = r => { setEditing(r); setForm({ ...r, amount: r.amount?.toString() || "" }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url }));
    setUploading(false);
  };

  const handleSubmit = async () => {
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
  };

  const handleDelete = async r => {
    if (window.confirm(`Διαγραφή εξόδου "${r.description}";`)) {
      await deleteMutation.mutateAsync(r.id);
    }
  };

  const filtered = expenses.filter(r =>
    !search ||
    r.description?.toLowerCase().includes(search.toLowerCase()) ||
    r.payee?.toLowerCase().includes(search.toLowerCase()) ||
    r.category?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  const total = filtered.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Αναζήτηση..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />Νέο Έξοδο
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Δεν βρέθηκαν εγγραφές</p>
            <Button className="mt-4 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" />Νέο Έξοδο
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-[22%]">Περιγραφή</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-[14%]">Κατηγορία</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-[14%]">Δικαιούχος</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-500 w-[12%]">Ποσό</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-[12%]">Πηγή</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-[10%]">Ημ/νία</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500 w-[6%]">Αρχείο</th>
                  <th className="px-3 py-3 w-[10%]"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(r => (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 font-medium text-[#1e3a5f] truncate">{r.description}</td>
                      <td className="px-3 py-3 text-gray-600 truncate">{r.category || "—"}</td>
                      <td className="px-3 py-3 text-gray-600 truncate">{r.payee || "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(r.amount)}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs truncate">{r.payment_source || "—"}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.file_url && (
                          <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-blue-600">
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(r)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-3 py-3 font-semibold text-gray-600">Σύνολο ({filtered.length} εγγραφές)</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(total)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Επεξεργασία Εξόδου" : "Νέο Γενικό Έξοδο"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή *</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Περιγραφή εξόδου" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Επιλέξτε...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ποσό (€) *</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Δικαιούχος</label>
                <Input value={form.payee} onChange={e => setForm(f => ({ ...f, payee: e.target.value }))} placeholder="Προμηθευτής..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία *</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Πηγή πληρωμής</label>
              <Input value={form.payment_source} onChange={e => setForm(f => ({ ...f, payment_source: e.target.value }))} placeholder="Τράπεζα, μετρητά..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Σημειώσεις</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Προαιρετικά..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Παραστατικό</label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} asChild={false}
                    onClick={() => document.getElementById("ge-file-upload").click()}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    {form.file_url ? "Αλλαγή" : "Ανέβασμα"}
                  </Button>
                </label>
                <input id="ge-file-upload" type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
                {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Προβολή</a>}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSubmit}
                disabled={!form.description || !form.amount || !form.date}>
                {editing ? "Αποθήκευση" : "Δημιουργία"}
              </Button>
              <Button variant="outline" onClick={closeForm}>Ακύρωση</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}