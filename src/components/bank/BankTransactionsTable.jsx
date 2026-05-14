import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Search, Trash2, Pencil, Upload, Loader2, Link2,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Download, FileSpreadsheet, X, Save
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

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

// Default column widths
const DEFAULT_COL_WIDTHS = {
  date: 100,
  description: 240,
  counterparty: 160,
  payment_source: 140,
  debit: 110,
  credit: 110,
};

// Inline editable cell
function EditableCell({ value, onSave, type = "text", options, className = "", datalistId, datalistOptions }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef(null);

  const startEdit = () => {
    setVal(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = () => {
    setEditing(false);
    if (val !== value) onSave(val);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setEditing(false); setVal(value); }
  };

  if (editing) {
    if (type === "select" && options) {
      return (
        <Select value={val} onValueChange={v => { setVal(v); setEditing(false); if (v !== value) onSave(v); }}>
          <SelectTrigger className="h-7 text-xs border-blue-300 bg-blue-50 focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          list={datalistId}
          step={type === "number" ? "0.01" : undefined}
          className="w-full h-7 px-2 text-xs border border-blue-300 rounded bg-blue-50 outline-none"
          style={{ minWidth: 60 }}
        />
        {datalistId && datalistOptions && (
          <datalist id={datalistId}>
            {datalistOptions.map((o, i) => <option key={i} value={o} />)}
          </datalist>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={startEdit}
      className={`cursor-pointer rounded px-1 py-0.5 hover:bg-blue-50 hover:outline hover:outline-1 hover:outline-blue-200 transition-all min-h-[1.5rem] ${className}`}
      title="Κλικ για επεξεργασία"
    >
      {value || <span className="text-gray-300">—</span>}
    </div>
  );
}

// Resizable column header
function ResizableHeader({ width, onResize, onAutoFit, children, className = "" }) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;

    const onMove = (ev) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      onResize(Math.max(60, startW.current + delta));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <th
      className={`relative select-none px-3 py-3 font-medium text-gray-500 ${className}`}
      style={{ width, minWidth: width }}
    >
      {children}
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center hover:bg-blue-200/40 group"
        onMouseDown={onMouseDown}
        onDoubleClick={onAutoFit}
        title="Drag για resize | Double-click για auto-fit"
      >
        <div className="w-px h-4 bg-gray-300 group-hover:bg-blue-400" />
      </div>
    </th>
  );
}

export default function BankTransactionsTable({ paymentSources = [] }) {
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterReconciled, setFilterReconciled] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [reconcileDialog, setReconcileDialog] = useState(null);
  const [reconcileForm, setReconcileForm] = useState({ reconciled_with: "", reconciled_note: "" });
  const [importing, setImporting] = useState(false);
  const importRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkEditForm, setBulkEditForm] = useState({ payment_source: "", transaction_type: "" });
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const tableRef = useRef(null);

  const queryClient = useQueryClient();
  const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["bank-transactions"],
    queryFn: () => base44.entities.BankTransaction.list("-date"),
  });

  const { data: payrollRecords = [] } = useQuery({ queryKey: ["payroll"], queryFn: () => base44.entities.Payroll.list("-payment_date") });
  const { data: generalExpenses = [] } = useQuery({ queryKey: ["general-expenses"], queryFn: () => base44.entities.GeneralExpense.list("-date") });
  const { data: generalIncomes = [] } = useQuery({ queryKey: ["general-incomes"], queryFn: () => base44.entities.GeneralIncome.list("-date") });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date") });
  const { data: projectExpenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date") });
  const { data: projectIncomes = [] } = useQuery({ queryKey: ["incomes"], queryFn: () => base44.entities.Income.list("-date") });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }); closeForm(); setReconcileDialog(null); },
  });
  const createMutation = useMutation({
    mutationFn: data => base44.entities.BankTransaction.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.BankTransaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }),
  });

  // Inline cell save
  const handleCellSave = useCallback((tx, field, newVal) => {
    let val = newVal;
    if (field === "amount") val = Math.abs(parseFloat(newVal) || 0);
    updateMutation.mutate({ id: tx.id, data: { ...tx, [field]: val } });
  }, [updateMutation]);

  // Auto-fit column width based on content
  const autoFitCol = useCallback((col) => {
    if (!tableRef.current) return;
    const cells = tableRef.current.querySelectorAll(`[data-col="${col}"]`);
    let maxW = DEFAULT_COL_WIDTHS[col] || 100;
    cells.forEach(cell => {
      const w = cell.scrollWidth + 24;
      if (w > maxW) maxW = w;
    });
    setColWidths(prev => ({ ...prev, [col]: Math.min(maxW, 400) }));
  }, []);

  // Excel Export
  const handleExport = () => {
    const rows = filtered.map(t => ({
      "Ημερομηνία": t.date || "",
      "Περιγραφή": t.description || "",
      "Αντισυμβαλλόμενος": t.counterparty || "",
      "Τράπεζα": t.payment_source || "",
      "Χρέωση (€)": t.transaction_type === "debit" ? Math.abs(t.amount || 0) : "",
      "Πίστωση (€)": t.transaction_type === "credit" ? Math.abs(t.amount || 0) : "",
      "Αναφορά": t.reference || "",
      "Κατάσταση": t.reconciled ? "Αντιστοιχισμένη" : "Εκκρεμεί",
      "Σημείωση": t.reconciled_note || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Κινήσεις");
    XLSX.writeFile(wb, `κινήσεις_τράπεζας_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const parseGreekDate = (raw) => {
    if (!raw) return "";
    const s = String(raw).trim();
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      const year = m[3].length === 2 ? "20" + m[3] : m[3];
      return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{5}$/.test(s)) {
      const d = new Date(Math.round((parseInt(s) - 25569) * 86400 * 1000));
      return d.toISOString().slice(0, 10);
    }
    return "";
  };

  const parseAmount = (raw) => {
    if (!raw && raw !== 0) return 0;
    return parseFloat(String(raw).replace(/\./g, "").replace(",", ".").replace(/[^\d\-\.]/g, "")) || 0;
  };

  const parseXlsxDirect = async (file) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array", raw: false, cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    let headerIdx = -1, cols = {};
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const row = rows[i].map(c => String(c).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      const di = row.findIndex(c => c.includes("ημερομ") || c === "date" || c === "ημ/νια" || c === "ημ/νία");
      const dbi = row.findIndex(c => c.includes("χρεωσ") || c === "debit");
      const cri = row.findIndex(c => c.includes("πιστωσ") || c === "credit");
      const ami = row.findIndex(c => c.includes("ποσο") || c === "amount");
      const desi = row.findIndex(c => c.includes("περιγρ") || c.includes("αιτιολ") || c.includes("descr"));
      const refi = row.findIndex(c => c.includes("αναφορ") || c.includes("reference"));
      if (di >= 0 && (dbi >= 0 || cri >= 0 || ami >= 0)) { headerIdx = i; cols = { di, dbi, cri, ami, desi, refi }; break; }
    }
    if (headerIdx < 0) return null;
    const results = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const rawDate = row[cols.di];
      if (!rawDate || String(rawDate).trim() === "") continue;
      const date = parseGreekDate(rawDate);
      if (!date) continue;
      const description = cols.desi >= 0 ? String(row[cols.desi] || "").trim() : "";
      let amount = 0, transaction_type = "debit";
      if (cols.dbi >= 0 && cols.cri >= 0) {
        const debit = parseAmount(row[cols.dbi]);
        const credit = parseAmount(row[cols.cri]);
        if (credit > 0) { amount = credit; transaction_type = "credit"; }
        else if (debit > 0) { amount = debit; transaction_type = "debit"; }
        else continue;
      } else if (cols.ami >= 0) {
        const raw = parseAmount(row[cols.ami]);
        if (!raw) continue;
        amount = Math.abs(raw);
        transaction_type = raw < 0 ? "debit" : "credit";
      } else continue;
      const reference = cols.refi >= 0 ? String(row[cols.refi] || "").trim() : "";
      results.push({ date, description, amount, transaction_type, reference, reconciled: false });
    }
    return results.length > 0 ? results : null;
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    e.target.value = "";
    let toCreate = null;
    if (file.name.match(/\.xlsx?$/i)) toCreate = await parseXlsxDirect(file);
    if (!toCreate) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Αυτό είναι αρχείο κινήσεων από ελληνική τράπεζα. Εξάγαγε ΟΛΕΣ τις κινήσεις.
Για κάθε κίνηση επίστρεψε: date (YYYY-MM-DD), description, counterparty, transaction_type ("debit"/"credit"), amount (θετικό), reference.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" }, description: { type: "string" }, counterparty: { type: "string" },
                  transaction_type: { type: "string", enum: ["credit", "debit"] }, amount: { type: "number" }, reference: { type: "string" },
                },
                required: ["date", "amount", "transaction_type"]
              }
            }
          }
        }
      });
      const aiTx = result?.transactions || [];
      if (!aiTx.length) { alert("Δεν εντοπίστηκαν κινήσεις."); setImporting(false); return; }
      toCreate = aiTx.filter(r => r.date && r.amount).map(r => ({
        date: r.date, description: r.description || "", counterparty: r.counterparty || "",
        payment_source: "", transaction_type: r.transaction_type, amount: Math.abs(r.amount),
        reference: r.reference || "", reconciled: false,
      }));
    }
    if (!toCreate?.length) { alert("Δεν εντοπίστηκαν έγκυρες κινήσεις."); setImporting(false); return; }
    await base44.entities.BankTransaction.bulkCreate(toCreate);
    queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
    setImporting(false);
    alert(`Εισήχθησαν ${toCreate.length} κινήσεις επιτυχώς.`);
  };

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
      data: { ...reconcileDialog, reconciled: true, reconciled_with: reconcileForm.reconciled_with, reconciled_note: reconcileForm.reconciled_note }
    });
  };

  const handleUnreconcile = async (tx) => {
    await updateMutation.mutateAsync({ id: tx.id, data: { ...tx, reconciled: false, reconciled_with: null, reconciled_id: null, reconciled_note: "" } });
  };

  const getMatchingSuggestions = (tx) => {
    if (!tx) return [];
    const amt = Math.abs(tx.amount);
    const txDate = tx.date ? new Date(tx.date) : null;
    const suggestions = [];
    const isClose = (d) => txDate && d && Math.abs(new Date(d) - txDate) < 7 * 864e5;
    if (tx.transaction_type === "debit") {
      payrollRecords.filter(r => Math.abs((r.net_salary || 0) - amt) < 1).forEach(r => suggestions.push({ type: "payroll", label: `Μισθοδοσία: ${r.employee_name} - ${r.period}`, id: r.id, amount: r.net_salary, date: r.payment_date }));
      generalExpenses.filter(r => Math.abs((r.amount || 0) - amt) < 1 && isClose(r.date)).forEach(r => suggestions.push({ type: "general_expense", label: `Γεν. Έξοδο: ${r.description}`, id: r.id, amount: r.amount, date: r.date }));
      projectExpenses.filter(r => Math.abs((r.amount || 0) - amt) < 1 && isClose(r.date)).forEach(r => suggestions.push({ type: "project_expense", label: `Έξοδο Έργου: ${r.payee} - ${r.description}`, id: r.id, amount: r.amount, date: r.date }));
    } else {
      generalIncomes.filter(r => Math.abs((r.total_amount || r.net_amount || 0) - amt) < 1 && isClose(r.date)).forEach(r => suggestions.push({ type: "general_income", label: `Γεν. Έσοδο: ${r.description}`, id: r.id, amount: r.total_amount || r.net_amount, date: r.date }));
      projectIncomes.filter(r => Math.abs((r.amount || 0) - amt) < 1 && isClose(r.date)).forEach(r => suggestions.push({ type: "project_income", label: `Έσοδο Έργου: ${r.source} - ${r.description}`, id: r.id, amount: r.amount, date: r.date }));
    }
    return suggestions.slice(0, 5);
  };

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => selectedIds.size === filtered.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(t => t.id)));

  const handleBulkDelete = async () => {
    if (!window.confirm(`Διαγραφή ${selectedIds.size} κινήσεων;`)) return;
    await Promise.all([...selectedIds].map(id => deleteMutation.mutateAsync(id)));
    setSelectedIds(new Set());
  };

  const handleBulkEdit = async () => {
    const updates = {};
    if (bulkEditForm.payment_source) updates.payment_source = bulkEditForm.payment_source;
    if (bulkEditForm.transaction_type) updates.transaction_type = bulkEditForm.transaction_type;
    if (!Object.keys(updates).length) return;
    await Promise.all(filtered.filter(t => selectedIds.has(t.id)).map(t => updateMutation.mutateAsync({ id: t.id, data: { ...t, ...updates } })));
    setSelectedIds(new Set());
    setShowBulkEdit(false);
    setBulkEditForm({ payment_source: "", transaction_type: "" });
  };

  const allSources = [...new Set(transactions.map(t => t.payment_source).filter(Boolean))];
  const allCounterparties = [...new Set(transactions.map(t => t.counterparty).filter(Boolean))];

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} title="Εξαγωγή Excel">
            <Download className="w-4 h-4 mr-1" />Excel
          </Button>
          <Button variant="outline" disabled={importing} onClick={() => importRef.current?.click()} title="Εισαγωγή από Excel">
            {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1" />}
            Εισαγωγή
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={handleImport} />
          <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />Νέα Κίνηση
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[#1e3a5f] text-white rounded-xl px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} επιλεγμένες</span>
          <div className="flex-1 flex gap-2">
            <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => { setShowBulkEdit(true); setBulkEditForm({ payment_source: "", transaction_type: "" }); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" />Επεξεργασία
            </Button>
            <Button size="sm" variant="outline" className="bg-red-500/30 border-red-400/40 text-white hover:bg-red-500/50" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Διαγραφή
            </Button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded hover:bg-white/20"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Μαζική Επεξεργασία ({selectedIds.size} κινήσεις)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Συμπληρώστε μόνο τα πεδία που θέλετε να αλλάξετε.</p>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος κίνησης</label>
              <Select value={bulkEditForm.transaction_type} onValueChange={v => setBulkEditForm(f => ({ ...f, transaction_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Χωρίς αλλαγή" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Χρέωση</SelectItem>
                  <SelectItem value="credit">Πίστωση</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Τράπεζα / Λογαριασμός</label>
              <Input value={bulkEditForm.payment_source} onChange={e => setBulkEditForm(f => ({ ...f, payment_source: e.target.value }))}
                placeholder="π.χ. Πειραιώς..." list="bulk-sources-list" />
              <datalist id="bulk-sources-list">{paymentSources.map(ps => <option key={ps.id} value={ps.name} />)}</datalist>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleBulkEdit}>Εφαρμογή</Button>
              <Button variant="outline" onClick={() => setShowBulkEdit(false)}>Ακύρωση</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Δεν βρέθηκαν κινήσεις</p>
            <Button className="mt-4 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Νέα Κίνηση</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={tableRef} className="text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} />
                  </th>
                  <ResizableHeader width={colWidths.date} onResize={w => setColWidths(p => ({ ...p, date: w }))} onAutoFit={() => autoFitCol("date")} className="text-left">Ημ/νία</ResizableHeader>
                  <ResizableHeader width={colWidths.description} onResize={w => setColWidths(p => ({ ...p, description: w }))} onAutoFit={() => autoFitCol("description")} className="text-left">Περιγραφή</ResizableHeader>
                  <ResizableHeader width={colWidths.counterparty} onResize={w => setColWidths(p => ({ ...p, counterparty: w }))} onAutoFit={() => autoFitCol("counterparty")} className="text-left">Αντισυμβαλλόμενος</ResizableHeader>
                  <ResizableHeader width={colWidths.payment_source} onResize={w => setColWidths(p => ({ ...p, payment_source: w }))} onAutoFit={() => autoFitCol("payment_source")} className="text-left">Τράπεζα</ResizableHeader>
                  <ResizableHeader width={colWidths.debit} onResize={w => setColWidths(p => ({ ...p, debit: w }))} onAutoFit={() => autoFitCol("debit")} className="text-right">Χρέωση</ResizableHeader>
                  <ResizableHeader width={colWidths.credit} onResize={w => setColWidths(p => ({ ...p, credit: w }))} onAutoFit={() => autoFitCol("credit")} className="text-right">Πίστωση</ResizableHeader>
                  <th className="px-3 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(t => (
                    <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selectedIds.has(t.id) ? "bg-blue-50/50" : !t.reconciled ? "bg-amber-50/30" : ""}`}>
                      <td className="px-3 py-2">
                        <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                      </td>
                      {/* Date */}
                      <td className="px-3 py-2" data-col="date">
                        <EditableCell
                          value={t.date || ""}
                          type="date"
                          onSave={v => handleCellSave(t, "date", v)}
                          className="text-gray-500 text-xs"
                        />
                        {t.date && <span className="text-gray-400 text-xs pointer-events-none select-none hidden" data-col="date">{format(new Date(t.date), "dd/MM/yyyy")}</span>}
                      </td>
                      {/* Description */}
                      <td className="px-2 py-2" data-col="description">
                        <EditableCell
                          value={t.description || ""}
                          onSave={v => handleCellSave(t, "description", v)}
                          className="font-medium text-gray-800 text-sm truncate"
                        />
                        {t.reference && <p className="text-xs text-gray-400 px-1">Ref: {t.reference}</p>}
                        {t.reconciled && t.reconciled_note && <p className="text-xs text-blue-600 truncate px-1">{t.reconciled_note}</p>}
                      </td>
                      {/* Counterparty */}
                      <td className="px-2 py-2" data-col="counterparty">
                        <EditableCell
                          value={t.counterparty || ""}
                          onSave={v => handleCellSave(t, "counterparty", v)}
                          className="text-gray-600 text-xs"
                          datalistId={`cp-${t.id}`}
                          datalistOptions={allCounterparties}
                        />
                      </td>
                      {/* Bank */}
                      <td className="px-2 py-2" data-col="payment_source">
                        <EditableCell
                          value={t.payment_source || ""}
                          onSave={v => handleCellSave(t, "payment_source", v)}
                          className="text-gray-500 text-xs"
                          datalistId={`ps-${t.id}`}
                          datalistOptions={[...allSources, ...paymentSources.map(p => p.name)]}
                        />
                      </td>
                      {/* Debit */}
                      <td className="px-2 py-2 text-right" data-col="debit">
                        {t.transaction_type === "debit" ? (
                          <EditableCell
                            value={Math.abs(t.amount || 0).toString()}
                            type="number"
                            onSave={v => handleCellSave(t, "amount", v)}
                            className="font-semibold text-red-600 text-right tabular-nums"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellSave(t, "transaction_type", "debit")}
                            className="text-gray-200 text-right cursor-pointer hover:text-red-300 transition-colors"
                            title="Κλικ για να γίνει Χρέωση"
                          >—</div>
                        )}
                      </td>
                      {/* Credit */}
                      <td className="px-2 py-2 text-right" data-col="credit">
                        {t.transaction_type === "credit" ? (
                          <EditableCell
                            value={Math.abs(t.amount || 0).toString()}
                            type="number"
                            onSave={v => handleCellSave(t, "amount", v)}
                            className="font-semibold text-green-600 text-right tabular-nums"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellSave(t, "transaction_type", "credit")}
                            className="text-gray-200 text-right cursor-pointer hover:text-green-300 transition-colors"
                            title="Κλικ για να γίνει Πίστωση"
                          >—</div>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          {!t.reconciled && (
                            <button title="Σύνδεση με εγγραφή"
                              onClick={() => { setReconcileDialog(t); setReconcileForm({ reconciled_with: "", reconciled_note: "" }); }}
                              className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {t.reconciled && (
                            <button title="Αναίρεση αντιστοίχισης" onClick={() => handleUnreconcile(t)}
                              className="p-1 rounded hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                  <td colSpan={5} className="px-3 py-3 font-semibold text-gray-600">Σύνολο ({filtered.length} κινήσεις)</td>
                  <td className="px-3 py-3 text-right font-semibold text-red-600 tabular-nums">{fmt(totalDebit)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-green-600 tabular-nums">{fmt(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Επεξεργασία Κίνησης" : "Νέα Τραπεζική Κίνηση"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[{ value: "debit", label: "Χρέωση" }, { value: "credit", label: "Πίστωση" }].map(t => (
                <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, transaction_type: t.value }))}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.transaction_type === t.value
                      ? t.value === "debit" ? "bg-red-100 border-red-300 text-red-800" : "bg-green-100 border-green-300 text-green-800"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>{t.label}</button>
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
                <datalist id="bank-sources-list">{paymentSources.map(ps => <option key={ps.id} value={ps.name} />)}</datalist>
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
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-800">{reconcileDialog.description}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>{reconcileDialog.date ? format(new Date(reconcileDialog.date), "dd/MM/yyyy") : "—"}</span>
                  <span className={reconcileDialog.transaction_type === "debit" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                    {reconcileDialog.transaction_type === "debit" ? "-" : "+"}{fmt(reconcileDialog.amount)}
                  </span>
                </div>
              </div>
              {(() => {
                const suggestions = getMatchingSuggestions(reconcileDialog);
                if (!suggestions.length) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Πιθανές αντιστοιχίσεις:</p>
                    <div className="space-y-1">
                      {suggestions.map((s, i) => (
                        <button key={i} type="button"
                          onClick={() => setReconcileForm(f => ({ ...f, reconciled_with: s.type, reconciled_note: s.label }))}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${reconcileForm.reconciled_note === s.label ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
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
                  <SelectContent>{RECONCILE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Σημείωση αντιστοίχισης</label>
                <Input value={reconcileForm.reconciled_note} onChange={e => setReconcileForm(f => ({ ...f, reconciled_note: e.target.value }))}
                  placeholder="π.χ. Μισθός Ιανουαρίου Παπαδόπουλος..." />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleReconcile} disabled={!reconcileForm.reconciled_with}>
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