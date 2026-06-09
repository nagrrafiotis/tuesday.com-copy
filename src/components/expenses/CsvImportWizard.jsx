import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applyRules } from "@/lib/categoryRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileSpreadsheet, ArrowRight, CheckCircle2, XCircle,
  AlertCircle, Trash2, Check, ChevronLeft, ChevronRight, Info, Loader2,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "labor", label: "Εργατικά" },
  { value: "subcontractor", label: "Υπεργολάβοι" },
  { value: "materials", label: "Υλικά" },
  { value: "equipment", label: "Εξοπλισμός" },
  { value: "general_expenses", label: "Γενικά Έξοδα" },
];

// DB fields we want to map to
const DB_FIELDS = [
  { key: "date",           label: "Ημερομηνία",     required: false },
  { key: "payee",          label: "Δικαιούχος",      required: true  },
  { key: "description",    label: "Περιγραφή",       required: false },
  { key: "amount",         label: "Ποσό (€)",        required: true  },
  { key: "category",       label: "Κατηγορία",       required: false },
  { key: "subcategory",    label: "Υποκατηγορία",    required: false },
  { key: "payment_source", label: "Πηγή Πληρωμής",  required: false },
];

const fmt = (v) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(v || 0);

function parseDate(raw) {
  if (!raw) return "";
  if (raw instanceof Date) return raw.toISOString().split("T")[0];
  const s = String(raw).trim();
  const parts = s.split(/[/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(p => p.trim());
    if (c.length === 4) return `${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`;
    if (a.length === 4) return `${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}`;
  }
  return s;
}

function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return Math.abs(raw);
  const s = String(raw).replace(/[€$£\s]/g, "").replace(/\./g, "").replace(",", ".");
  return Math.abs(parseFloat(s) || 0);
}

// Auto-guess which CSV column maps to which DB field
function guessMapping(headers) {
  const mapping = {};
  const lower = headers.map(h => h.toLowerCase().trim());
  const rules = [
    { key: "date",           patterns: ["ημερ", "date", "ημ/"] },
    { key: "payee",          patterns: ["δικαιούχ", "payee", "vendor", "προμηθ", "αντισυμβ", "επωνυμ", "counterpart", "όνομα"] },
    { key: "description",    patterns: ["περιγ", "descr", "αιτ", "σχόλ", "comment", "note", "λεπτ", "details"] },
    { key: "amount",         patterns: ["ποσ", "amount", "αξί", "χρε", "debit", "credit", "κόστ", "πλη"] },
    { key: "category",       patterns: ["κατηγ", "categ", "τύπ", "type"] },
    { key: "subcategory",    patterns: ["υποκ", "subcateg", "φάση", "phase"] },
    { key: "payment_source", patterns: ["πηγή", "τράπ", "bank", "payment", "λογαρ", "account"] },
  ];
  rules.forEach(({ key, patterns }) => {
    const idx = lower.findIndex(h => patterns.some(p => h.includes(p)));
    if (idx !== -1) mapping[key] = headers[idx];
  });
  return mapping;
}

// ── STEP 1: File upload ──────────────────────────────────────────────────────
function StepUpload({ onParsed }) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      setLoading(false);
      onParsed({ rows, headers, fileName: file.name });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
        dragOver ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-gray-200 hover:border-[#1e3a5f]/40 hover:bg-gray-50"
      }`}
      onClick={() => !loading && inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
          <p className="text-sm text-gray-500">Ανάγνωση αρχείου...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">Ανέβασε αρχείο CSV ή Excel</p>
            <p className="text-sm text-gray-400 mt-1">Σύρε εδώ ή κλικ για επιλογή · .csv / .xls / .xlsx</p>
          </div>
          <Button variant="outline" className="border-[#1e3a5f] text-[#1e3a5f]">
            <Upload className="w-4 h-4 mr-2" />Επιλογή αρχείου
          </Button>
        </div>
      )}
    </div>
  );
}

// ── STEP 2: Field Mapping ────────────────────────────────────────────────────
function StepMapping({ headers, rows, mapping, onChange, onConfirm, onBack }) {
  const preview = rows.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Αντιστοίχισε τις στήλες του αρχείου σου με τα πεδία της βάσης. Το σύστημα έχει κάνει αυτόματη πρόταση όπου μπόρεσε.
        </p>
      </div>

      {/* Mapping table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-1/3">Πεδίο Βάσης</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-1/3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  Στήλη Αρχείου
                </div>
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Προεπισκόπηση</th>
            </tr>
          </thead>
          <tbody>
            {DB_FIELDS.map((field) => {
              const selectedCol = mapping[field.key] || "_none";
              const previewVals = preview.map(r => String(r[selectedCol] ?? "")).filter(Boolean).slice(0, 2);
              return (
                <tr key={field.key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-800">{field.label}</span>
                      {field.required && <span className="text-red-400 text-xs">*</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={selectedCol}
                      onValueChange={(v) => onChange(field.key, v === "_none" ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full max-w-[200px]">
                        <SelectValue placeholder="— Μη αντιστοιχισμένο —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Μη αντιστοιχισμένο —</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[200px] truncate">
                    {previewVals.length > 0 ? previewVals.join(", ") + (preview.length > 2 ? "..." : "") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-1" />Πίσω</Button>
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={onConfirm}>
          Επόμενο <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── STEP 3: Review & Import ──────────────────────────────────────────────────
function StepReview({ mapped, projects, onBack, onImport, importing, importedCount }) {
  const [selected, setSelected] = useState(() => mapped.map((_, i) => i));
  const [items, setItems] = useState(mapped);
  const today = new Date().toISOString().split("T")[0];

  const toggle = (i) => setItems(prev => prev.map((row, idx) => idx === i ? { ...row, skip: !row.skip } : row));
  const updateField = (i, field, value) => setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const activeItems = items.filter(r => !r.skip && !r.imported);
  const totalAmount = activeItems.reduce((s, r) => s + (r.amount || 0), 0);

  const [bulkProject, setBulkProject] = useState("");

  const applyBulkProject = () => {
    if (!bulkProject) return;
    setItems(prev => prev.map(r => r.skip || r.imported ? r : { ...r, project_id: bulkProject }));
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-gray-700">Ανάθεση σε έργο:</span>
        <Select value={bulkProject} onValueChange={setBulkProject}>
          <SelectTrigger className="h-8 text-xs w-52">
            <SelectValue placeholder="Επιλογή έργου..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={applyBulkProject} disabled={!bulkProject} className="h-8">
          Εφαρμογή σε όλες
        </Button>
        <div className="ml-auto text-sm text-gray-500">
          <strong>{activeItems.length}</strong> εγγραφές · <strong>{fmt(totalAmount)}</strong>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {items.map((row, i) => (
          <div
            key={i}
            className={`rounded-xl border px-3 py-2.5 transition-all ${
              row.imported ? "bg-emerald-50 border-emerald-200 opacity-60" :
              row.skip ? "bg-gray-50 border-gray-100 opacity-50" :
              row.error ? "bg-red-50 border-red-200" :
              "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Checkbox checked={!row.skip && !row.imported} onCheckedChange={() => toggle(i)} disabled={row.imported} className="shrink-0" />
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                {/* Date */}
                <input
                  type="date"
                  value={row.date || today}
                  onChange={e => updateField(i, "date", e.target.value)}
                  disabled={row.skip || row.imported}
                  className="border border-gray-200 rounded px-2 py-1 text-xs bg-white disabled:opacity-40 col-span-1"
                />
                {/* Project */}
                <Select value={row.project_id || ""} onValueChange={v => updateField(i, "project_id", v)} disabled={row.skip || row.imported}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Έργο*" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Category */}
                <Select value={row.category || "general_expenses"} onValueChange={v => updateField(i, "category", v)} disabled={row.skip || row.imported}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Payee */}
                <input
                  value={row.payee || ""}
                  onChange={e => updateField(i, "payee", e.target.value)}
                  placeholder="Δικαιούχος*"
                  disabled={row.skip || row.imported}
                  className="border border-gray-200 rounded px-2 py-1 text-xs bg-white disabled:opacity-40"
                />
                {/* Description */}
                <input
                  value={row.description || ""}
                  onChange={e => updateField(i, "description", e.target.value)}
                  placeholder="Περιγραφή"
                  disabled={row.skip || row.imported}
                  className="border border-gray-200 rounded px-2 py-1 text-xs bg-white disabled:opacity-40 col-span-1 lg:col-span-2"
                />
                {/* Amount */}
                <input
                  type="number"
                  step="0.01"
                  value={row.amount || ""}
                  onChange={e => updateField(i, "amount", parseFloat(e.target.value) || 0)}
                  placeholder="Ποσό*"
                  disabled={row.skip || row.imported}
                  className="border border-gray-200 rounded px-2 py-1 text-xs bg-white disabled:opacity-40 font-mono"
                />
              </div>
              {/* Status icon */}
              <div className="shrink-0">
                {row.imported ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                 row.error ? <span title={row.error}><AlertCircle className="w-4 h-4 text-red-400" /></span> :
                 row.autoCategory ? <span title={`Αυτόματη κατηγ.: ${row.autoCategory}`}><Zap className="w-4 h-4 text-amber-400" /></span> : null}
              </div>
            </div>
            {row.error && <p className="text-xs text-red-500 mt-1 ml-6">{row.error}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ChevronLeft className="w-4 h-4 mr-1" />Πίσω
        </Button>
        <Button
          className="bg-[#1e3a5f] hover:bg-[#152a45]"
          disabled={activeItems.length === 0 || importing}
          onClick={() => onImport(items)}
        >
          {importing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Εισαγωγή... ({importedCount}/{activeItems.length})</>
          ) : (
            <><Check className="w-4 h-4 mr-2" />Εισαγωγή {activeItems.length} εγγραφών</>
          )}
        </Button>
      </div>
    </div>
  );
}

// Tiny Zap icon for auto-category indicator
function Zap(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ── Main Wizard ──────────────────────────────────────────────────────────────
export default function CsvImportWizard({ onDone }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0); // 0=upload, 1=mapping, 2=review, 3=done
  const [fileData, setFileData] = useState(null);   // { rows, headers, fileName }
  const [mapping, setMapping] = useState({});        // { dbField: csvColumn }
  const [mappedRows, setMappedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [summary, setSummary] = useState(null);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list("-created_date") });
  const { data: categoryRules = [] } = useQuery({ queryKey: ["category-rules"], queryFn: () => base44.entities.CategoryRule.list("-priority"), staleTime: 60000 });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  // Step 0 → 1
  const handleParsed = ({ rows, headers, fileName }) => {
    const guessed = guessMapping(headers);
    setFileData({ rows, headers, fileName });
    setMapping(guessed);
    setStep(1);
  };

  // Step 1 → 2
  const handleMappingConfirm = () => {
    const today = new Date().toISOString().split("T")[0];
    const defaultProject = projects.length === 1 ? projects[0].id : "";
    const mapped = fileData.rows.map(row => {
      const get = (field) => mapping[field] ? row[mapping[field]] : undefined;
      const amount = parseAmount(get("amount"));
      const description = String(get("description") || "").trim();
      const payee = String(get("payee") || "").trim();
      const rawCat = String(get("category") || "").trim().toLowerCase();
      const ruleMatch = applyRules(`${description} ${payee}`, categoryRules);
      const validCat = CATEGORY_OPTIONS.find(c => c.value === rawCat || c.label.toLowerCase() === rawCat);
      const category = ruleMatch?.category || validCat?.value || "general_expenses";
      return {
        date: parseDate(get("date")) || today,
        payee,
        description,
        amount,
        category,
        subcategory: ruleMatch?.subcategory || String(get("subcategory") || "").trim(),
        payment_source: String(get("payment_source") || "").trim(),
        project_id: defaultProject,
        autoCategory: ruleMatch ? `${ruleMatch.category}` : null,
        skip: amount === 0 && !payee, // skip empty rows
        imported: false,
        error: null,
      };
    }).filter(r => r.amount > 0 || r.payee); // filter fully empty
    setMappedRows(mapped);
    setStep(2);
  };

  // Step 2 → import
  const handleImport = async (items) => {
    const toImport = items.filter(r => !r.skip && !r.imported);
    setImporting(true);
    setImportedCount(0);
    let ok = 0, failed = 0;
    const today = new Date().toISOString().split("T")[0];
    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const row = updatedItems[i];
      if (row.skip || row.imported) continue;
      if (!row.project_id) { updatedItems[i] = { ...row, error: "Επιλέξτε έργο" }; failed++; continue; }
      if (!row.payee?.trim()) { updatedItems[i] = { ...row, error: "Απαιτείται δικαιούχος" }; failed++; continue; }
      if (!row.amount || row.amount <= 0) { updatedItems[i] = { ...row, error: "Απαιτείται ποσό" }; failed++; continue; }
      await createMutation.mutateAsync({
        project_id: row.project_id,
        category: row.category || "general_expenses",
        subcategory: row.subcategory || "",
        payee: row.payee,
        description: row.description || "",
        date: row.date || today,
        amount: row.amount,
        payment_source: row.payment_source || "",
      });
      updatedItems[i] = { ...row, imported: true };
      ok++;
      setImportedCount(ok);
    }

    setMappedRows(updatedItems);
    setImporting(false);
    setSummary({ ok, failed });
    setStep(3);
  };

  const reset = () => { setStep(0); setFileData(null); setMapping({}); setMappedRows([]); setSummary(null); setImportedCount(0); };

  const STEPS = ["Αρχείο", "Αντιστοίχιση", "Έλεγχος", "Ολοκλήρωση"];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? "bg-emerald-500 text-white" :
                i === step ? "bg-[#1e3a5f] text-white" :
                "bg-gray-100 text-gray-400"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "text-[#1e3a5f] font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 mx-1 ${i < step ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <StepUpload onParsed={handleParsed} />}

      {step === 1 && fileData && (
        <StepMapping
          headers={fileData.headers}
          rows={fileData.rows}
          mapping={mapping}
          onChange={(field, col) => setMapping(m => ({ ...m, [field]: col }))}
          onConfirm={handleMappingConfirm}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <StepReview
          mapped={mappedRows}
          projects={projects}
          onBack={() => setStep(1)}
          onImport={handleImport}
          importing={importing}
          importedCount={importedCount}
        />
      )}

      {step === 3 && summary && (
        <div className="text-center space-y-4 py-8">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${summary.failed === 0 ? "bg-emerald-100" : "bg-amber-100"}`}>
            {summary.failed === 0
              ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              : <AlertCircle className="w-8 h-8 text-amber-600" />
            }
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {summary.ok} εγγραφές εισήχθησαν επιτυχώς
            </p>
            {summary.failed > 0 && (
              <p className="text-sm text-amber-600 mt-1">{summary.failed} εγγραφές απέτυχαν</p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={reset}>Νέα Εισαγωγή</Button>
            {onDone && <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={onDone}>Κλείσιμο</Button>}
          </div>
        </div>
      )}

      {/* File info bar */}
      {fileData && step > 0 && step < 3 && (
        <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100 pt-3">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          <span>{fileData.fileName} · {fileData.rows.length} γραμμές · {fileData.headers.length} στήλες</span>
        </div>
      )}
    </div>
  );
}