import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  CheckCircle2, AlertCircle, Link2, TrendingDown,
  ChevronDown, ChevronRight, Zap, RefreshCw, Search, X, Plus
} from "lucide-react";
import CreateRecordFromTxDialog from "./CreateRecordFromTxDialog";

const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));
const DAYS_TOLERANCE = 30;

function daysDiff(d1, d2) {
  if (!d1 || !d2) return Infinity;
  return Math.abs(new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24);
}

function amountMatch(a, b) {
  return Math.abs(Math.abs(a || 0) - Math.abs(b || 0)) < 0.5;
}

// Only include records that are paid via bank (have payment_source or payment_method = bank_transfer)
function isBankPayment(r) {
  if (!r) return false;
  const src = (r.payment_source || "").toLowerCase();
  const method = (r.payment_method || "").toLowerCase();
  // Include if: has a payment_source (any bank name), OR payment_method is bank_transfer
  // Exclude only if payment_method explicitly says cash
  if (method === "cash") return false;
  if (src.includes("cash") || src.includes("μετρητ") || src.includes("ταμεί") || src.includes("ταμει")) return false;
  if (method === "bank_transfer" || method === "debit_card" || method === "credit_card") return true;
  if (src) return true; // has any non-cash payment_source = assume bank
  return false; // no info, exclude
}

function buildAllRecords(payroll, genExpenses, genIncomes, projExpenses, projIncomes, invoices) {
  const records = [];

  payroll.filter(isBankPayment).forEach(r => records.push({
    id: r.id, type: "payroll", label: "Μισθοδοσία",
    description: `${r.employee_name} — ${r.period}`,
    amount: r.net_salary || r.final_payment || 0,
    date: r.payment_date,
    direction: "debit",
    color: "purple",
  }));

  genExpenses.filter(isBankPayment).forEach(r => records.push({
    id: r.id, type: "general_expense", label: "Γεν. Έξοδο",
    description: r.description,
    amount: r.amount || 0,
    date: r.date,
    direction: "debit",
    color: "red",
  }));

  genIncomes.filter(isBankPayment).forEach(r => records.push({
    id: r.id, type: "general_income", label: "Γεν. Έσοδο",
    description: r.description,
    amount: r.total_amount || r.net_amount || 0,
    date: r.date,
    direction: "credit",
    color: "green",
  }));

  projExpenses.filter(isBankPayment).forEach(r => records.push({
    id: r.id, type: "project_expense", label: "Έξοδο Έργου",
    description: `${r.payee} — ${r.description || ""}`,
    amount: r.amount || 0,
    date: r.date,
    direction: "debit",
    color: "orange",
  }));

  projIncomes.filter(isBankPayment).forEach(r => records.push({
    id: r.id, type: "project_income", label: "Έσοδο Έργου",
    description: `${r.source} — ${r.description || ""}`,
    amount: r.amount || 0,
    date: r.date,
    direction: "credit",
    color: "teal",
  }));

  invoices.filter(r => {
    const method = (r.payment_method || "").toLowerCase();
    return method !== "cash" && (method === "bank_transfer" || method === "debit_card" || method === "credit_card" || r.payment_source);
  }).forEach(r => records.push({
    id: r.id, type: "invoice", label: "Τιμολόγιο",
    description: `${r.vendor_client}${r.invoice_number ? " #" + r.invoice_number : ""}`,
    amount: r.total_amount || 0,
    date: r.date,
    direction: r.type === "income" ? "credit" : "debit",
    color: "blue",
  }));

  return records;
}

function Section({ id, title, count, countColor, icon: SectionIcon, expandedSection, setExpandedSection, children }) {
  const open = expandedSection === id;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        onClick={() => setExpandedSection(open ? null : id)}>
        <div className="flex items-center gap-3">
          <SectionIcon className="w-5 h-5 text-gray-500" />
          <span className="font-semibold text-gray-800">{title}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countColor}`}>{count}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-50">{children}</div>}
    </div>
  );
}

const COLOR_MAP = {
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-100 text-red-700",
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  teal: "bg-teal-100 text-teal-700",
  blue: "bg-blue-100 text-blue-700",
};

const RECONCILE_TYPES = [
  { value: "payroll", label: "Μισθοδοσία" },
  { value: "general_expense", label: "Γενικό Έξοδο" },
  { value: "general_income", label: "Γενικό Έσοδο" },
  { value: "project_expense", label: "Έξοδο Έργου" },
  { value: "project_income", label: "Έσοδο Έργου" },
  { value: "invoice", label: "Τιμολόγιο" },
  { value: "other", label: "Άλλο" },
];

// Manual link dialog: pick from all records
function ManualLinkDialog({ tx, allRecords, onLink, onClose }) {
  const [search, setSearch] = useState("");
  const [manualType, setManualType] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = allRecords.filter(r => {
    const q = search.toLowerCase();
    return !q || r.description?.toLowerCase().includes(q) || r.label?.toLowerCase().includes(q);
  });

  const handleSubmit = () => {
    if (selected) {
      onLink(tx, selected);
    } else if (manualType) {
      onLink(tx, { type: manualType, label: RECONCILE_TYPES.find(t => t.value === manualType)?.label || manualType, description: manualNote, id: null });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <Link2 className="w-5 h-5" /> Χειροκίνητη Σύνδεση
          </DialogTitle>
        </DialogHeader>

        {/* Transaction summary */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm flex-shrink-0">
          <p className="font-medium text-gray-800">{tx.description || "—"}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>{tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"}</span>
            <span className={tx.transaction_type === "debit" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
              {tx.transaction_type === "debit" ? "-" : "+"}{fmt(tx.amount)}
            </span>
          </div>
        </div>

        {/* Search records */}
        <div className="space-y-2 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500">Επιλέξτε εγγραφή:</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9 h-8 text-sm" placeholder="Αναζήτηση εγγραφής..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Record list */}
        <div className="overflow-y-auto flex-1 space-y-1 min-h-0">
          {filtered.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-4">Δεν βρέθηκαν εγγραφές με τραπεζική πληρωμή</p>
          )}
          {filtered.map((r, i) => (
            <button
              key={i}
              onClick={() => setSelected(selected?.id === r.id ? null : r)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                selected?.id === r.id
                  ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${COLOR_MAP[r.color] || "bg-gray-100 text-gray-600"}`}>{r.label}</span>
                  <span className="truncate font-medium text-gray-800">{r.description}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-gray-500">
                  {r.date && <span>{format(new Date(r.date), "dd/MM/yy")}</span>}
                  <span className={`font-semibold ${r.direction === "debit" ? "text-red-600" : "text-green-600"}`}>{fmt(r.amount)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* OR: manual type only */}
        {!selected && (
          <div className="border-t pt-3 space-y-2 flex-shrink-0">
            <p className="text-xs text-gray-400">ή χωρίς συγκεκριμένη εγγραφή:</p>
            <div className="flex gap-2">
              <Select value={manualType} onValueChange={setManualType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Τύπος..." /></SelectTrigger>
                <SelectContent>
                  {RECONCILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="h-8 text-xs" placeholder="Σημείωση..." value={manualNote} onChange={e => setManualNote(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-shrink-0 pt-1">
          <Button
            className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]"
            disabled={!selected && !manualType}
            onClick={handleSubmit}
          >
            <Link2 className="w-4 h-4 mr-1" /> Σύνδεση
          </Button>
          <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MatchRow({ match, onReconcile, saving }) {
  const [expanded, setExpanded] = useState(false);
  const tx = match.transaction;
  const rec = match.record;
  const confidence = match.confidence;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mb-2">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          confidence === "high" ? "bg-green-500" :
          confidence === "medium" ? "bg-amber-400" : "bg-gray-300"
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800 truncate">{tx.description}</span>
            <span className="text-gray-300">↔</span>
            <span className="text-sm text-gray-600 truncate">{rec.description}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${COLOR_MAP[rec.color] || "bg-gray-100 text-gray-600"}`}>{rec.label}</span>
            <span className="text-xs text-gray-400">{tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"}</span>
            <span className={`text-xs font-semibold ${tx.transaction_type === "debit" ? "text-red-600" : "text-green-600"}`}>{fmt(tx.amount)}</span>
            {match.daysDiff > 0 && <span className="text-xs text-gray-400">Διαφορά {Math.round(match.daysDiff)} ημ.</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            confidence === "high" ? "bg-green-100 text-green-700" :
            confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
          }`}>
            {confidence === "high" ? "Υψηλή" : confidence === "medium" ? "Μέτρια" : "Χαμηλή"}
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-2 gap-4 text-xs mb-3">
            <div>
              <p className="font-medium text-gray-500 mb-1">Κίνηση Τράπεζας</p>
              <p className="text-gray-800">{tx.description}</p>
              <p className="text-gray-500">{tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"} · {tx.payment_source || "—"}</p>
              <p className={`font-semibold mt-1 ${tx.transaction_type === "debit" ? "text-red-600" : "text-green-600"}`}>{fmt(tx.amount)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500 mb-1">{rec.label}</p>
              <p className="text-gray-800">{rec.description}</p>
              <p className="text-gray-500">{rec.date ? format(new Date(rec.date), "dd/MM/yyyy") : "—"}</p>
              <p className="font-semibold mt-1 text-gray-700">{fmt(rec.amount)}</p>
            </div>
          </div>
          <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45]" disabled={saving} onClick={() => onReconcile(tx, rec)}>
            <Link2 className="w-3.5 h-3.5 mr-1" />Αντιστοίχιση
          </Button>
        </div>
      )}
    </div>
  );
}

function UnmatchedTxRow({ tx, allRecords, onLink, saving }) {
  const [showLink, setShowLink] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50 mb-1.5">
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{tx.description || "—"}</p>
        <p className="text-xs text-gray-500">{tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"} · {tx.payment_source || "—"}</p>
      </div>
      <span className={`text-sm font-semibold flex-shrink-0 ${tx.transaction_type === "debit" ? "text-red-600" : "text-green-600"}`}>
        {fmt(tx.amount)}
      </span>
      <Button size="sm" variant="outline" className="flex-shrink-0 text-xs h-7 px-2 bg-white" disabled={saving} onClick={() => setShowCreate(true)}>
        <Plus className="w-3 h-3 mr-1" />Νέα Εγγραφή
      </Button>
      <Button size="sm" variant="outline" className="flex-shrink-0 text-xs h-7 px-2 bg-white" disabled={saving} onClick={() => setShowLink(true)}>
        <Link2 className="w-3 h-3 mr-1" />Σύνδεση
      </Button>
      {showLink && (
        <ManualLinkDialog
          tx={tx}
          allRecords={allRecords}
          onLink={(tx, rec) => { onLink(tx, rec); setShowLink(false); }}
          onClose={() => setShowLink(false)}
        />
      )}
      {showCreate && (
        <CreateRecordFromTxDialog
          tx={tx}
          onCreated={(tx, rec) => { onLink(tx, rec); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

export default function ReconciliationPanel() {
  const [expandedSection, setExpandedSection] = useState("suggestions");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading: loadingTx } = useQuery({ queryKey: ["bank-transactions"], queryFn: () => base44.entities.BankTransaction.list("-date") });
  const { data: payroll = [] } = useQuery({ queryKey: ["payroll"], queryFn: () => base44.entities.Payroll.list("-payment_date") });
  const { data: genExpenses = [] } = useQuery({ queryKey: ["general-expenses"], queryFn: () => base44.entities.GeneralExpense.list("-date") });
  const { data: genIncomes = [] } = useQuery({ queryKey: ["general-incomes"], queryFn: () => base44.entities.GeneralIncome.list("-date") });
  const { data: projExpenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date") });
  const { data: projIncomes = [] } = useQuery({ queryKey: ["incomes"], queryFn: () => base44.entities.Income.list("-date") });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date") });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }),
  });

  const allRecords = useMemo(
    () => buildAllRecords(payroll, genExpenses, genIncomes, projExpenses, projIncomes, invoices),
    [payroll, genExpenses, genIncomes, projExpenses, projIncomes, invoices]
  );

  const { suggestions, unmatchedTx, unmatchedRecords } = useMemo(() => {
    const unreconciledTx = transactions.filter(t => !t.reconciled);
    const reconciledRecordRefs = new Set(transactions.filter(t => t.reconciled && t.reconciled_id).map(t => t.reconciled_id));
    const suggestions = [];
    const matchedTxIds = new Set();
    const matchedRecordIds = new Set();

    unreconciledTx.forEach(tx => {
      const txAmt = Math.abs(tx.amount || 0);
      const candidates = allRecords.filter(r => {
        if (reconciledRecordRefs.has(r.id)) return false;
        if (tx.transaction_type !== r.direction) return false;
        if (!amountMatch(txAmt, r.amount)) return false;
        return true;
      });
      if (!candidates.length) return;
      const scored = candidates.map(r => {
        const diff = daysDiff(tx.date, r.date);
        if (diff > DAYS_TOLERANCE) return null;
        return { record: r, diff, confidence: diff <= 3 ? "high" : "medium" };
      }).filter(Boolean);
      if (!scored.length) return;
      scored.sort((a, b) => a.diff - b.diff);
      const best = scored[0];
      suggestions.push({ transaction: tx, record: best.record, daysDiff: best.diff, confidence: best.confidence });
      matchedTxIds.add(tx.id);
      matchedRecordIds.add(best.record.id);
    });

    suggestions.sort((a, b) => {
      const order = { high: 0, medium: 1 };
      return (order[a.confidence] - order[b.confidence]) || new Date(b.transaction.date) - new Date(a.transaction.date);
    });

    const unmatchedTx = unreconciledTx.filter(t => !matchedTxIds.has(t.id));
    const unmatchedRecords = allRecords.filter(r => !reconciledRecordRefs.has(r.id) && !matchedRecordIds.has(r.id)).slice(0, 50);

    return { suggestions, unmatchedTx, unmatchedRecords };
  }, [transactions, allRecords]);

  const handleReconcile = async (tx, rec) => {
    setSaving(true);
    await updateMutation.mutateAsync({
      id: tx.id,
      data: {
        ...tx,
        reconciled: true,
        reconciled_with: rec.type,
        reconciled_id: rec.id || null,
        reconciled_note: rec.id ? (rec.label + ": " + rec.description) : (rec.label + (rec.description ? ": " + rec.description : "")),
      }
    });
    setSaving(false);
  };

  const handleReconcileAll = async () => {
    const high = suggestions.filter(s => s.confidence === "high");
    if (!high.length) return;
    if (!window.confirm(`Αυτόματη αντιστοίχιση ${high.length} κινήσεων υψηλής εμπιστοσύνης;`)) return;
    setSaving(true);
    for (const s of high) await handleReconcile(s.transaction, s.record);
    setSaving(false);
  };



  if (loadingTx) return <div className="text-center py-16 text-gray-400">Φόρτωση...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1e3a5f]">Αντιστοίχιση Τράπεζας</h3>
          <p className="text-sm text-gray-500 mt-0.5">Μόνο πληρωμές & έσοδα μέσω τράπεζας (±{DAYS_TOLERANCE} ημέρες)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="w-4 h-4 mr-1" />Ανανέωση
          </Button>
          {suggestions.filter(s => s.confidence === "high").length > 0 && (
            <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleReconcileAll} disabled={saving}>
              <Zap className="w-4 h-4 mr-1" />
              Αντιστοίχιση {suggestions.filter(s => s.confidence === "high").length} Υψηλής
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600">{suggestions.filter(s => s.confidence === "high").length}</p>
          <p className="text-xs text-gray-500 mt-1">Υψηλή αντιστοιχία</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-amber-500">{suggestions.filter(s => s.confidence === "medium").length}</p>
          <p className="text-xs text-gray-500 mt-1">Μέτρια αντιστοιχία</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 bg-amber-50 text-center">
          <p className="text-2xl font-bold text-amber-700">{unmatchedTx.length}</p>
          <p className="text-xs text-amber-600 mt-1">Χωρίς αντιστοιχία</p>
        </div>
      </div>

      <Section id="suggestions" title="Προτεινόμενες Αντιστοιχίσεις" count={suggestions.length}
        countColor={suggestions.length > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"} icon={Link2}
        expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p>Δεν βρέθηκαν αντιστοιχίσεις</p>
          </div>
        ) : (
          <div className="mt-3">
            {suggestions.map((match, i) => (
              <MatchRow key={i} match={match} onReconcile={handleReconcile} saving={saving} />
            ))}
          </div>
        )}
      </Section>

      <Section id="unmatched_tx" title="Κινήσεις Χωρίς Αντιστοιχία" count={unmatchedTx.length}
        countColor={unmatchedTx.length > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"} icon={AlertCircle}
        expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
        {unmatchedTx.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p>Όλες οι κινήσεις έχουν αντιστοιχία</p>
          </div>
        ) : (
          <div className="mt-3">
            {unmatchedTx.map(t => (
              <UnmatchedTxRow key={t.id} tx={t} allRecords={allRecords} onLink={handleReconcile} saving={saving} />
            ))}
          </div>
        )}
      </Section>

      <Section id="unmatched_records" title="Εγγραφές Τραπέζης Χωρίς Κίνηση" count={unmatchedRecords.length}
        countColor={unmatchedRecords.length > 0 ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-500"} icon={TrendingDown}
        expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
        <p className="text-xs text-gray-400 mt-3 mb-2">Εγγραφές με τραπεζική πληρωμή που δεν έχουν συνδεθεί με κάποια κίνηση.</p>
        {unmatchedRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p>Όλες οι εγγραφές έχουν κίνηση</p>
          </div>
        ) : (
          <div className="mt-1">
            {unmatchedRecords.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-100 bg-white mb-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${COLOR_MAP[r.color] || "bg-gray-100 text-gray-600"}`}>{r.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.description}</p>
                  <p className="text-xs text-gray-500">{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}</p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${r.direction === "debit" ? "text-red-600" : "text-green-600"}`}>{fmt(r.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}