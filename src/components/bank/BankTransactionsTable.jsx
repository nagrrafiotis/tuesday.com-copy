import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Trash2, Pencil, Upload, Loader2, Link2, Link2Off,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, X
} from "lucide-react";
import { format } from "date-fns";

const RECONCILE_TYPES = [
  { value: "payroll", label: "Μισθοδοσία" },
  { value: "general_expense", label: "Γενικό Έξοδο" },
  { value: "general_income", label: "Γενικό Έσοδο" },
  { value: "project_expense", label: "Έξοδο Έργου" },
  { value: "project_income", label: "Έσοδο Έργου" },
  { value: "invoice", label: "Τιμολόγιο" },
  { value: "other", label: "Άλλο" },
];

const emptyForm = {
  date: "",
  description: "",
  amount: "",
  transaction_type: "debit",
  payment_source: "",
  reference: "",
  counterparty: "",
  notes: "",
  file_url: "",
};

export default function BankTransactionsTable({ paymentSources = [] }) {
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterReconciled, setFilterReconciled] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [reconcileDialog, setReconcileDialog] = useState(null); // transaction being reconciled
  const [reconcileForm, setReconcileForm] = useState({ reconciled_with: "", reconciled_note: "" });

  const queryClient = useQueryClient();
  const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["bank-transactions"],
    queryFn: () => base44.entities.BankTransaction.list("-date"),
  });

  // Load related records for reconcile matching
  const { data: payrollRecords = [] } = useQuery({
    queryKey: ["payroll"],
    queryFn: () => base44.entities.Payroll.list("-payment_date"),
  });
  const { data: generalExpenses = [] } = useQuery({
    queryKey: ["general-expenses"],
    queryFn: () => base44.entities.GeneralExpense.list("-date"),
  });
  const { data: generalIncomes = [] } = useQuery({
    queryKey: ["general-incomes"],
    queryFn: () => base44.entities.GeneralIncome.list("-date"),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-date"),
  });
  const { data: projectExpenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
  });
  const { data: projectIncomes = [] } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.BankTransaction.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }); closeForm(); setReconcileDialog(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.BankTransaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = r => { setEditing(r); setForm({ ...r, amount: Math.abs(r.amount)?.toString() || "" }); setShowForm(true); };
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
    const amt = parseFloat(form.amount) || 0;
    const data = { ...form, amount: form.transaction_type === "debit" ? -Math.abs(amt) : Math.abs(amt) };
    if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
  };

  const handleReconcile = async () => {
    await updateMutation.mutateAsync({
      id: reconcileDialog.id,
      data: {
        ...reconcileDialog,
        reconciled: true,
        reconciled_with: reconcileForm.reconciled_with,
        reconciled_note: reconcileForm.reconciled_note,
      }
    });
  };

  const handleUnreconcile = async (tx) => {
    await updateMutation.mutateAsync({
      id: tx.id,
      data: { ...tx, reconciled: false, reconciled_with: null, reconciled_id: null, reconciled_note: "" }
    });
  };

  // Get matching records for auto-suggest
  const getMatchingSuggestions = (tx) => {
    if (!tx) return [];
    const amt = Math.abs(tx.amount);
    const txDate = tx.date ? new Date(tx.date) : null;
    const suggestions = [];

    const isClose = (recordDate) => {
      if (!txDate || !recordDate) return false;
      const d = new Date(recordDate);
      return Math.abs(d - txDate) < 7 * 24 * 60 * 60 * 1000; // within 7 days
    };

    if (tx.transaction_type === "debit") {
      payrollRecords.filter(r => Math.abs((r.net_salary || 0) - amt) < 1 || Math.abs((r.final_payment || 0) - amt) < 1)
        .forEach(r => suggestions.push({ type: "payroll", label: `Μισθοδοσία: ${r.employee_name} - ${r.period}`, id: r.id, amount: r.net_salary, date: r.payment_date }));
      generalExpenses.filter(r => Math.abs((r.amount || 0) - amt) < 1 && isClose(r.date))
        .forEach(r => suggestions.push({ type: "general_expense", label: `Γεν. Έξοδο: ${r.description}`, id: r.id, amount: r.amount, date: r.date }));
      projectExpenses.filter(r => Math.abs((r.amount || 0) - amt) < 1 && isClose(r.date))
        .forEach(r => suggestions.push({ type: "project_expense", label: `Έξοδο Έργου: ${r.payee} - ${r.description}`, id: r.id, amount: r.amount, date: r.date }));
      invoices.filter(r => r.type === "expense" && Math.abs((r.total_amount || 0) - amt) < 1 && isClose(r.date))
        .forEach(r => suggestions.push({ type: "invoice", label: `Τιμολόγιο: ${r.vendor_client} #${r.invoice_number || ""}`, id: r.id, amount: r.total_amount, date: r.date }));
    } else {
      generalIncomes.filter(r => Math.abs((r.total_amount || r.net_amount || 0) - amt) < 1 && isClose(r.date))
        .forEach(r => suggestions.push({ type: "general_income", label: `Γεν. Έσοδο: ${r.description}`, id: r.id, amount: r.total_amount || r.net_amount, date: r.date }));
      projectIncomes.filter(r => Math.abs((r.amount || 0) - amt) < 1 && isClose(r.date))
        .forEach(r => suggestions.push({ type: "project_income", label: `Έσοδο Έργου: ${r.source} - ${r.description}`, id: r.id, amount: r.amount, date: r.date }));
      invoices.filter(r => r.type === "income" && Math.abs((r.total_amount || 0) - amt) < 1 && isClose(r.date))
        .forEach(r => suggestions.push({ type: "invoice", label: `Τιμολόγιο: ${r.vendor_client} #${r.invoice_number || ""}`, id: r.id, amount: r.total_amount, date: r.date }));
    }

    return suggestions.slice(0, 5);
  };

  const allSources = [...new Set(transactions.map(t => t.payment_source).filter(Boolean))];

  const filtered = transactions
    .filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.description?.toLowerCase().includes(q) || t.counterparty?.toLowerCase().includes(q) || t.reference?.toLowerCase().includes(q);
      const matchSource = filterSource === "all" || t.payment_source === filterSource;
      const matchReconciled = filterReconciled === "all" || (filterReconciled === "yes" ? t.reconciled : !t.reconciled);
      const matchType = filterType === "all" || t.transaction_type === filterType;
      return matchSearch && matchSource && matchReconciled && matchType;
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const totalCredit = filtered.filter(t => t.transaction_type === "credit").reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const totalDebit = filtered.filter(t => t.transaction_type === "debit").reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const unreconciledCount = filtered.filter(t => !t.reconciled).length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 text-green-700"><TrendingUp className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-500">Πιστώσεις</p><p className="font-bold text-[#1e3a5f]">{fmt(totalCredit)}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 text-red-700"><TrendingDown className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-500">Χρεώσεις</p><p className="font-bold text-[#1e3a5f]">{fmt(totalDebit)}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700"><CheckCircle2 className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-500">Συνδεδεμένες</p><p className="font-bold text-[#1e3a5f]">{filtered.filter(t => t.reconciled).length}</p></div>
        </div>
        <div className={`bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3 ${unreconciledCount > 0 ? "border-amber-200" : "border-gray-100"}`}>
          <div className={`p-2 rounded-lg ${unreconciledCount > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}><AlertCircle className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-500">Εκκρεμείς</p><p className={`font-bold ${unreconciledCount > 0 ? "text-amber-700" : "text-[#1e3a5f]"}`}>{unreconciledCount}</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Αναζήτηση..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Τράπεζα" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι τράπεζες</SelectItem>
              {allSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Τύπος" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες</SelectItem>
              <SelectItem value="credit">Πιστώσεις</SelectItem>
              <SelectItem value="debit">Χρεώσεις</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterReconciled} onValueChange={setFilterReconciled}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Κατάσταση" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες</SelectItem>
              <SelectItem value="no">Εκκρεμείς</SelectItem>
              <SelectItem value="yes">Συνδεδεμένες</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />Νέα Κίνηση
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Δεν βρέθηκαν κινήσεις</p>
            <Button className="mt-4 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" />Νέα Κίνηση
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-24">Ημ/νία</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">Περιγραφή</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-36">Αντισυμβαλλόμενος</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 w-32">Τράπεζα</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-500 w-28">Χρέωση</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-500 w-28">Πίστωση</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500 w-32">Κατάσταση</th>
                  <th className="px-3 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(t => (
                    <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!t.reconciled ? "bg-amber-50/30" : ""}`}>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {t.date ? format(new Date(t.date), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-800 truncate max-w-[220px]">{t.description || "—"}</p>
                        {t.reference && <p className="text-xs text-gray-400">Ref: {t.reference}</p>}
                        {t.reconciled && t.reconciled_note && <p className="text-xs text-blue-600 truncate">{t.reconciled_note}</p>}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs truncate max-w-[140px]">{t.counterparty || "—"}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs truncate">{t.payment_source || "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {t.transaction_type === "debit" ? <span className="font-semibold text-red-600">{fmt(t.amount)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {t.transaction_type === "credit" ? <span className="font-semibold text-green-600">{fmt(t.amount)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {t.reconciled ? (
                          <Badge className="bg-blue-100 text-blue-700 border-0 gap-1 text-xs cursor-pointer hover:bg-blue-200"
                            onClick={() => handleUnreconcile(t)} title="Κλικ για αναίρεση">
                            <CheckCircle2 className="w-3 h-3" />
                            {RECONCILE_TYPES.find(r => r.value === t.reconciled_with)?.label || "Συνδεδεμένη"}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1 text-xs cursor-pointer hover:bg-amber-200"
                            onClick={() => { setReconcileDialog(t); setReconcileForm({ reconciled_with: "", reconciled_note: "" }); }}>
                            <AlertCircle className="w-3 h-3" />Εκκρεμεί
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {!t.reconciled && (
                            <button title="Σύνδεση με εγγραφή"
                              onClick={() => { setReconcileDialog(t); setReconcileForm({ reconciled_with: "", reconciled_note: "" }); }}
                              className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (window.confirm("Διαγραφή κίνησης;")) deleteMutation.mutate(t.id); }}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-3 py-3 font-semibold text-gray-600">Σύνολο ({filtered.length} κινήσεις)</td>
                  <td className="px-3 py-3 text-right font-semibold text-red-600 tabular-nums">{fmt(totalDebit)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-green-600 tabular-nums">{fmt(totalCredit)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Επεξεργασία Κίνησης" : "Νέα Τραπεζική Κίνηση"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[{ value: "debit", label: "Χρέωση" }, { value: "credit", label: "Πίστωση" }].map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(f => ({ ...f, transaction_type: t.value }))}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.transaction_type === t.value
                      ? t.value === "debit" ? "bg-red-100 border-red-300 text-red-800" : "bg-green-100 border-green-300 text-green-800"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία *</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ποσό (€) *</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή *</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Περιγραφή κίνησης" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Αντισυμβαλλόμενος</label>
                <Input value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} placeholder="Όνομα..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τράπεζα / Λογαριασμός</label>
                <Input value={form.payment_source} onChange={e => setForm(f => ({ ...f, payment_source: e.target.value }))}
                  placeholder="π.χ. Alpha Bank..." list="bank-sources-list" />
                <datalist id="bank-sources-list">
                  {paymentSources.map(ps => <option key={ps.id} value={ps.name} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Αριθμός Αναφοράς</label>
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ref #..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Σημειώσεις</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Παραστατικό</label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploading}
                  onClick={() => document.getElementById("bt-file-upload").click()}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  {form.file_url ? "Αλλαγή" : "Ανέβασμα"}
                </Button>
                <input id="bt-file-upload" type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
                {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Προβολή</a>}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSubmit}
                disabled={!form.date || !form.amount || !form.description}>
                {editing ? "Αποθήκευση" : "Δημιουργία"}
              </Button>
              <Button variant="outline" onClick={closeForm}>Ακύρωση</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconcile Dialog */}
      {reconcileDialog && (
        <Dialog open={!!reconcileDialog} onOpenChange={() => setReconcileDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
                <Link2 className="w-5 h-5" /> Σύνδεση Κίνησης
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Transaction summary */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-800">{reconcileDialog.description}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>{reconcileDialog.date ? format(new Date(reconcileDialog.date), "dd/MM/yyyy") : "—"}</span>
                  <span className={reconcileDialog.transaction_type === "debit" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                    {reconcileDialog.transaction_type === "debit" ? "-" : "+"}{fmt(reconcileDialog.amount)}
                  </span>
                </div>
              </div>

              {/* Auto-suggestions */}
              {(() => {
                const suggestions = getMatchingSuggestions(reconcileDialog);
                if (suggestions.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Πιθανές αντιστοιχίσεις (ίδιο ποσό ± 7 ημέρες):</p>
                    <div className="space-y-1">
                      {suggestions.map((s, i) => (
                        <button key={i} type="button"
                          onClick={() => setReconcileForm(f => ({ ...f, reconciled_with: s.type, reconciled_note: s.label }))}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                            reconcileForm.reconciled_note === s.label
                              ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}>
                          <span className="font-medium">{s.label}</span>
                          {s.date && <span className="text-gray-400 ml-2">{format(new Date(s.date), "dd/MM/yyyy")}</span>}
                          <span className="float-right font-semibold">{fmt(s.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος Εγγραφής *</label>
                <Select value={reconcileForm.reconciled_with} onValueChange={v => setReconcileForm(f => ({ ...f, reconciled_with: v }))}>
                  <SelectTrigger><SelectValue placeholder="Επιλέξτε τύπο..." /></SelectTrigger>
                  <SelectContent>
                    {RECONCILE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Σημείωση αντιστοίχισης</label>
                <Input value={reconcileForm.reconciled_note}
                  onChange={e => setReconcileForm(f => ({ ...f, reconciled_note: e.target.value }))}
                  placeholder="π.χ. Μισθός Ιανουαρίου Παπαδόπουλος..." />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleReconcile}
                  disabled={!reconcileForm.reconciled_with}>
                  <Link2 className="w-4 h-4 mr-1" /> Αντιστοίχιση
                </Button>
                <Button variant="outline" onClick={() => setReconcileDialog(null)}>Ακύρωση</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}