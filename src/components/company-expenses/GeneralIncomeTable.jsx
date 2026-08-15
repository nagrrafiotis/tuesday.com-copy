import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Pencil, FileText, Upload, Loader2, ScanLine, Copy } from "lucide-react";
import { format } from "date-fns";
import ScanExpenseIncomeDialog from "./ScanExpenseIncomeDialog";
import SortableHeader, { applySort } from "@/components/ui/sort-select";
import DuplicateWarningDialog from "@/components/shared/DuplicateWarningDialog";
import DuplicateScanPanel from "@/components/shared/DuplicateScanPanel";
import { findDuplicateMatches, duplicateConfigs } from "@/lib/duplicateDetector";
import { MobileCard } from "@/components/shared/MobileCard";

const CATEGORIES = [
  "Πωλήσεις", "Υπηρεσίες", "Ενοίκια", "Επενδύσεις", "Επιστροφές", "Λοιπά"
];

const INCOME_TYPES = [
  { value: "operational", label: "Λειτουργικό" },
  { value: "project", label: "Έσοδο Έργου" },
];

const emptyForm = { description: "", income_type: "operational", project_id: "", project_name: "", category: "", net_amount: "", vat_amount: "", total_amount: "", date: "", payment_source: "", payer: "", invoice_number: "", notes: "", file_url: "" };

export default function GeneralIncomeTable() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const [showDupScan, setShowDupScan] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const handleSort = (field, direction) => { setSortField(field); setSortDirection(direction); };

  const queryClient = useQueryClient();
  const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => base44.entities.Project.list("name"),
  });

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ["general-income"],
    queryFn: () => base44.entities.GeneralIncome.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.GeneralIncome.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["general-income"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GeneralIncome.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["general-income"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.GeneralIncome.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["general-income"] }),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = r => { setEditing(r); setForm({ ...r, amount: r.amount?.toString() || "", income_type: r.income_type || "operational" }); setShowForm(true); };

  const handleProjectChange = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    setForm(f => ({ ...f, project_id: projectId, project_name: proj?.name || "" }));
  };
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
    const data = {
      ...form,
      net_amount: parseFloat(form.net_amount) || 0,
      vat_amount: parseFloat(form.vat_amount) || 0,
      total_amount: parseFloat(form.total_amount) || 0
    };
    const action = async () => {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
      else await createMutation.mutateAsync(data);
      setDupWarning(null);
    };
    const matches = findDuplicateMatches({ ...data, id: editing?.id }, incomes, duplicateConfigs.GeneralIncome);
    if (matches.length > 0) { setDupWarning({ matches, action }); return; }
    await action();
  };

  const handleDelete = async r => {
    if (window.confirm(`Διαγραφή εσόδου "${r.description}";`)) {
      await deleteMutation.mutateAsync(r.id);
    }
  };

  const filtered = applySort(
    incomes.filter(r =>
      !search ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.payer?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase())
    ),
    sortField,
    sortDirection
  );

  const totalNet = filtered.reduce((s, r) => s + (r.net_amount || 0), 0);
  const totalVat = filtered.reduce((s, r) => s + (r.vat_amount || 0), 0);
  const totalAmount = filtered.reduce((s, r) => s + (r.total_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:flex-1 sm:min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Αναζήτηση..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowDupScan(true)} title="Έλεγχος διπλοτύπων">
            <Copy className="w-4 h-4 mr-2" />Διπλότυπα
          </Button>
          <Button variant="outline" onClick={() => setShowScan(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <ScanLine className="w-4 h-4 mr-2" />Σάρωση
          </Button>
          <Button className="bg-[#1e3a5f] hover:bg-[#152a45] flex-1 sm:flex-none" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />Νέο Έσοδο
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Δεν βρέθηκαν εγγραφές</p>
            <Button className="mt-4 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" />Νέο Έσοδο
            </Button>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                   <th className="text-left px-3 py-3 font-medium text-gray-500 w-[16%]"><SortableHeader label="Περιγραφή" field="description" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></th>
                   <th className="text-left px-3 py-3 font-medium text-gray-500 w-[11%]">Τύπος / Έργο</th>
                   <th className="text-left px-3 py-3 font-medium text-gray-500 w-[10%]"><SortableHeader label="Κατηγορία" field="category" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></th>
                   <th className="text-left px-3 py-3 font-medium text-gray-500 w-[10%]"><SortableHeader label="Πελάτης" field="payer" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></th>
                   <th className="text-left px-3 py-3 font-medium text-gray-500 w-[7%]"><SortableHeader label="Αρ. Τιμ." field="invoice_number" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></th>
                   <th className="text-right px-3 py-3 font-medium text-gray-500 w-[9%]"><SortableHeader label="Καθαρό" field="net_amount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" /></th>
                   <th className="text-right px-3 py-3 font-medium text-gray-500 w-[8%]"><SortableHeader label="ΦΠΑ" field="vat_amount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" /></th>
                   <th className="text-right px-3 py-3 font-medium text-gray-500 w-[9%]"><SortableHeader label="Σύνολο" field="total_amount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" /></th>
                   <th className="text-left px-3 py-3 font-medium text-gray-500 w-[9%]"><SortableHeader label="Πηγή" field="payment_source" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></th>
                   <th className="text-left px-3 py-3 font-medium text-gray-500 w-[7%]"><SortableHeader label="Ημ/νία" field="date" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></th>
                   <th className="text-center px-3 py-3 font-medium text-gray-500 w-[4%]">Αρχείο</th>
                   <th className="px-3 py-3 w-[5%]"></th>
                 </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(r => (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 font-medium text-[#1e3a5f] truncate">{r.description}</td>
                       <td className="px-3 py-3 text-xs truncate">
                         {r.income_type === "project" ? (
                           <span className="inline-flex items-center gap-1">
                             <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">Έργο</span>
                             <span className="text-gray-600 truncate">{r.project_name || "—"}</span>
                           </span>
                         ) : (
                           <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Λειτουργικό</span>
                         )}
                       </td>
                       <td className="px-3 py-3 text-gray-600 truncate">{r.category || "—"}</td>
                       <td className="px-3 py-3 text-gray-600 truncate">{r.payer || "—"}</td>
                       <td className="px-3 py-3 text-gray-500 text-xs truncate">{r.invoice_number || "—"}</td>
                       <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fmt(r.net_amount)}</td>
                       <td className="px-3 py-3 text-right text-amber-700 tabular-nums">{fmt(r.vat_amount)}</td>
                       <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(r.total_amount)}</td>
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
                  <td colSpan={5} className="px-3 py-3 font-semibold text-gray-600">Σύνολο ({filtered.length} εγγραφές)</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-700 tabular-nums">{fmt(totalNet)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-amber-700 tabular-nums">{fmt(totalVat)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(totalAmount)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="md:hidden grid grid-cols-1 gap-3">
          {filtered.map(r => (
            <MobileCard
              key={r.id}
              title={r.description}
              titleRight={<span className="font-semibold text-emerald-700 tabular-nums">{fmt(r.total_amount)}</span>}
              badge={r.income_type === "project"
                ? <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Έργο: {r.project_name || "—"}</span>
                : <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Λειτουργικό</span>}
              rows={[
                { label: "Κατηγορία", value: r.category || "—" },
                { label: "Πελάτης", value: r.payer || "—" },
                { label: "Αρ. Τιμ.", value: r.invoice_number || "—" },
                { label: "Πηγή", value: r.payment_source || "—" },
                { label: "Καθαρό", value: fmt(r.net_amount), align: "right" },
                { label: "ΦΠΑ", value: fmt(r.vat_amount), align: "right", className: "text-amber-700" },
                { label: "Ημ/νία", value: r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—", fullWidth: true },
              ]}
              actions={(
                <>
                  {r.file_url && (
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-blue-600"><FileText className="w-3.5 h-3.5" /></Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(r)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </>
              )}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Επεξεργασία Εσόδου" : "Νέο Γενικό Έσοδο"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Income type selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος Εσόδου *</label>
              <div className="grid grid-cols-2 gap-2">
                {INCOME_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, income_type: t.value, project_id: "", project_name: "" }))}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.income_type === t.value
                        ? t.value === "operational"
                          ? "bg-green-100 border-green-300 text-green-800"
                          : "bg-blue-100 border-blue-300 text-blue-800"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {form.income_type === "project" && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Έργο *</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                  value={form.project_id} onChange={e => handleProjectChange(e.target.value)}>
                  <option value="">Επιλέξτε έργο...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή *</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Περιγραφή εσόδου" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
              <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Επιλέξτε...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Καθαρό (€) *</label>
                <Input type="number" step="0.01" value={form.net_amount} onChange={e => setForm(f => ({ ...f, net_amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">ΦΠΑ (€)</label>
                <Input type="number" step="0.01" value={form.vat_amount} onChange={e => setForm(f => ({ ...f, vat_amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Σύνολο (€) *</label>
                <Input type="number" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Πελάτης</label>
                <Input value={form.payer} onChange={e => setForm(f => ({ ...f, payer: e.target.value }))} placeholder="Πελάτης..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία *</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Αρ. Τιμολογίου</label>
                <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="ΤΔΑ-001..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Πηγή πληρωμής</label>
                <Input value={form.payment_source} onChange={e => setForm(f => ({ ...f, payment_source: e.target.value }))} placeholder="Τράπεζα..." />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Σημειώσεις</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Προαιρετικά..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Παραστατικό</label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploading}
                  onClick={() => document.getElementById("gi-file-upload").click()}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  {form.file_url ? "Αλλαγή" : "Ανέβασμα"}
                </Button>
                <input id="gi-file-upload" type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
                {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Προβολή</a>}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSubmit}
                disabled={!form.description || !form.net_amount || !form.total_amount || !form.date}>
                {editing ? "Αποθήκευση" : "Δημιουργία"}
              </Button>
              <Button variant="outline" onClick={closeForm}>Ακύρωση</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ScanExpenseIncomeDialog
        open={showScan}
        onClose={() => setShowScan(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["general-income"] })}
        mode="income"
      />

      <DuplicateWarningDialog
        open={!!dupWarning}
        matches={dupWarning?.matches || []}
        config={duplicateConfigs.GeneralIncome}
        onConfirm={async () => { if (dupWarning?.action) await dupWarning.action(); setDupWarning(null); }}
        onCancel={() => setDupWarning(null)}
      />
      <DuplicateScanPanel
        open={showDupScan}
        onClose={() => setShowDupScan(false)}
        records={incomes}
        config={duplicateConfigs.GeneralIncome}
        onDelete={async id => { await deleteMutation.mutateAsync(id); }}
      />
    </div>
  );
}