import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  CheckCircle2, AlertCircle, Link2, TrendingDown, TrendingUp,
  ChevronDown, ChevronRight, Zap, RefreshCw
} from "lucide-react";

const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));
const DAYS_TOLERANCE = 30;

function daysDiff(d1, d2) {
  if (!d1 || !d2) return Infinity;
  return Math.abs(new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24);
}

function amountMatch(a, b) {
  return Math.abs(Math.abs(a || 0) - Math.abs(b || 0)) < 0.5;
}

// Build a flat list of all financial records (non-bank)
function buildAllRecords(payroll, genExpenses, genIncomes, projExpenses, projIncomes, invoices) {
  const records = [];

  payroll.forEach(r => records.push({
    id: r.id, type: "payroll", label: "Μισθοδοσία",
    description: `${r.employee_name} — ${r.period}`,
    amount: r.net_salary || r.final_payment || 0,
    date: r.payment_date,
    direction: "debit",
    color: "purple",
  }));

  genExpenses.forEach(r => records.push({
    id: r.id, type: "general_expense", label: "Γεν. Έξοδο",
    description: r.description,
    amount: r.amount || 0,
    date: r.date,
    direction: "debit",
    color: "red",
  }));

  genIncomes.forEach(r => records.push({
    id: r.id, type: "general_income", label: "Γεν. Έσοδο",
    description: r.description,
    amount: r.total_amount || r.net_amount || 0,
    date: r.date,
    direction: "credit",
    color: "green",
  }));

  projExpenses.forEach(r => records.push({
    id: r.id, type: "project_expense", label: "Έξοδο Έργου",
    description: `${r.payee} — ${r.description || ""}`,
    amount: r.amount || 0,
    date: r.date,
    direction: "debit",
    color: "orange",
  }));

  projIncomes.forEach(r => records.push({
    id: r.id, type: "project_income", label: "Έσοδο Έργου",
    description: `${r.source} — ${r.description || ""}`,
    amount: r.amount || 0,
    date: r.date,
    direction: "credit",
    color: "teal",
  }));

  invoices.forEach(r => records.push({
    id: r.id, type: "invoice", label: "Τιμολόγιο",
    description: `${r.vendor_client}${r.invoice_number ? " #" + r.invoice_number : ""}`,
    amount: r.total_amount || 0,
    date: r.date,
    direction: r.type === "income" ? "credit" : "debit",
    color: "blue",
  }));

  return records;
}

const COLOR_MAP = {
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-100 text-red-700",
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  teal: "bg-teal-100 text-teal-700",
  blue: "bg-blue-100 text-blue-700",
};

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
            <span className={`text-xs font-semibold ${tx.transaction_type === "debit" ? "text-red-600" : "text-green-600"}`}>
              {fmt(tx.amount)}
            </span>
            {match.daysDiff > 0 && (
              <span className="text-xs text-gray-400">Διαφορά {Math.round(match.daysDiff)} ημ.</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            confidence === "high" ? "bg-green-100 text-green-700" :
            confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
          }`}>
            {confidence === "high" ? "Υψηλή" : confidence === "medium" ? "Μέτρια" : "Χαμηλή"} αντιστοιχία
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
          <Button
            size="sm"
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
            disabled={saving}
            onClick={() => onReconcile(tx, rec)}
          >
            <Link2 className="w-3.5 h-3.5 mr-1" />
            Αντιστοίχιση
          </Button>
        </div>
      )}
    </div>
  );
}

function UnmatchedRow({ item, isTransaction, color }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${isTransaction ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white"} mb-1.5`}>
      <AlertCircle className={`w-4 h-4 flex-shrink-0 ${isTransaction ? "text-amber-500" : "text-gray-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
        <p className="text-xs text-gray-500">{item.date ? format(new Date(item.date), "dd/MM/yyyy") : "—"}</p>
      </div>
      {color && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${COLOR_MAP[color] || "bg-gray-100 text-gray-600"}`}>{item.label}</span>}
      <span className={`text-sm font-semibold flex-shrink-0 ${
        isTransaction
          ? item.transaction_type === "debit" ? "text-red-600" : "text-green-600"
          : "text-gray-700"
      }`}>
        {fmt(item.amount)}
      </span>
    </div>
  );
}

export default function ReconciliationPanel() {
  const [expandedSection, setExpandedSection] = useState("suggestions");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["bank-transactions"],
    queryFn: () => base44.entities.BankTransaction.list("-date"),
  });
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

  // Auto-match: unreconciled transactions vs all records
  const { suggestions, unmatchedTx, unmatchedRecords } = useMemo(() => {
    const unreconciledTx = transactions.filter(t => !t.reconciled);

    // Track which record IDs have already been matched to a bank tx
    const reconciledRecordRefs = new Set(
      transactions
        .filter(t => t.reconciled && t.reconciled_id)
        .map(t => t.reconciled_id)
    );

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

      if (candidates.length === 0) return;

      // Score candidates
      const scored = candidates.map(r => {
        const diff = daysDiff(tx.date, r.date);
        let confidence = "low";
        if (diff <= 3) confidence = "high";
        else if (diff <= DAYS_TOLERANCE) confidence = "medium";
        else return null;
        return { record: r, diff, confidence };
      }).filter(Boolean);

      if (scored.length === 0) return;

      // Best match
      scored.sort((a, b) => a.diff - b.diff);
      const best = scored[0];

      suggestions.push({
        transaction: tx,
        record: best.record,
        daysDiff: best.diff,
        confidence: best.confidence,
      });

      matchedTxIds.add(tx.id);
      matchedRecordIds.add(best.record.id);
    });

    // Sort: high > medium > low, then by date
    suggestions.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.confidence] - order[b.confidence]) || new Date(b.transaction.date) - new Date(a.transaction.date);
    });

    const unmatchedTx = unreconciledTx.filter(t => !matchedTxIds.has(t.id));

    // Records that don't have a corresponding bank transaction
    const reconciledTypes = new Set(transactions.filter(t => t.reconciled).map(t => t.reconciled_with));
    const unmatchedRecords = allRecords.filter(r =>
      !reconciledRecordRefs.has(r.id) &&
      !matchedRecordIds.has(r.id)
    ).slice(0, 50); // cap for performance

    return { suggestions, unmatchedTx, unmatchedRecords };
  }, [transactions, allRecords]);

  const handleAutoReconcile = async (tx, rec) => {
    setSaving(true);
    await updateMutation.mutateAsync({
      id: tx.id,
      data: {
        ...tx,
        reconciled: true,
        reconciled_with: rec.type,
        reconciled_id: rec.id,
        reconciled_note: rec.label + ": " + rec.description,
      }
    });
    setSaving(false);
  };

  const handleReconcileAll = async () => {
    const high = suggestions.filter(s => s.confidence === "high");
    if (!high.length) return;
    if (!window.confirm(`Αυτόματη αντιστοίχιση ${high.length} κινήσεων υψηλής εμπιστοσύνης;`)) return;
    setSaving(true);
    for (const s of high) {
      await updateMutation.mutateAsync({
        id: s.transaction.id,
        data: {
          ...s.transaction,
          reconciled: true,
          reconciled_with: s.record.type,
          reconciled_id: s.record.id,
          reconciled_note: s.record.label + ": " + s.record.description,
        }
      });
    }
    setSaving(false);
  };

  const isLoading = loadingTx;

  const Section = ({ id, title, count, countColor, icon: Icon, children }) => {
    const open = expandedSection === id;
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          onClick={() => setExpandedSection(open ? null : id)}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-800">{title}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countColor}`}>{count}</span>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {open && <div className="px-4 pb-4 border-t border-gray-50">{children}</div>}
      </div>
    );
  };

  if (isLoading) return <div className="text-center py-16 text-gray-400">Φόρτωση...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1e3a5f]">Αυτόματη Αντιστοίχιση</h3>
          <p className="text-sm text-gray-500 mt-0.5">Σύγκριση τραπεζικών κινήσεων με καταχωρημένες εγγραφές (±{DAYS_TOLERANCE} ημέρες)</p>
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

      {/* Summary bar */}
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
          <p className="text-xs text-amber-600 mt-1">Κινήσεις χωρίς αντιστοιχία</p>
        </div>
      </div>

      {/* Sections */}
      <Section
        id="suggestions"
        title="Προτεινόμενες Αντιστοιχίσεις"
        count={suggestions.length}
        countColor={suggestions.length > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}
        icon={Link2}
      >
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p>Δεν βρέθηκαν αντιστοιχίσεις</p>
          </div>
        ) : (
          <div className="mt-3">
            {suggestions.map((match, i) => (
              <MatchRow key={i} match={match} onReconcile={handleAutoReconcile} saving={saving} />
            ))}
          </div>
        )}
      </Section>

      <Section
        id="unmatched_tx"
        title="Κινήσεις Τράπεζας Χωρίς Αντιστοιχία"
        count={unmatchedTx.length}
        countColor={unmatchedTx.length > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}
        icon={AlertCircle}
      >
        {unmatchedTx.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p>Όλες οι κινήσεις έχουν αντιστοιχία</p>
          </div>
        ) : (
          <div className="mt-3">
            {unmatchedTx.map(t => (
              <UnmatchedRow key={t.id} item={{ ...t, description: t.description || "—" }} isTransaction={true} />
            ))}
          </div>
        )}
      </Section>

      <Section
        id="unmatched_records"
        title="Εγγραφές Χωρίς Τραπεζική Κίνηση"
        count={unmatchedRecords.length}
        countColor={unmatchedRecords.length > 0 ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-500"}
        icon={TrendingDown}
      >
        <p className="text-xs text-gray-400 mt-3 mb-2">Εγγραφές που δεν έχουν συνδεθεί με κάποια τραπεζική κίνηση.</p>
        {unmatchedRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p>Όλες οι εγγραφές έχουν κίνηση</p>
          </div>
        ) : (
          <div className="mt-1">
            {unmatchedRecords.map((r, i) => (
              <UnmatchedRow key={i} item={r} isTransaction={false} color={r.color} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}