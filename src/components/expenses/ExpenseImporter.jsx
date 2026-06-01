import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Loader2, CheckCircle2, XCircle, Trash2, Check,
  Sparkles, FileText, FileSpreadsheet, ChevronDown, ChevronUp,
  AlertCircle, Info,
} from "lucide-react";

const formatCurrency = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

const CATEGORY_OPTIONS = [
  "labor", "subcontractor", "materials", "equipment", "general_expenses"
];

const CATEGORY_LABELS = {
  labor: "Εργατικά",
  subcontractor: "Υπεργολάβοι",
  materials: "Υλικά",
  equipment: "Εξοπλισμός",
  general_expenses: "Γενικά Έξοδα",
};

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg";

function FileTypeIcon({ name }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  const isImage = ["png", "jpg", "jpeg"].includes(ext);
  const isSheet = ["xls", "xlsx", "csv"].includes(ext);
  return isImage
    ? <FileText className="w-5 h-5 text-blue-500" />
    : isSheet
    ? <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
    : <FileText className="w-5 h-5 text-orange-500" />;
}

function ExpenseRow({ item, index, projects, paymentSources, subcategories, onUpdate, onToggle, selected }) {
  return (
    <div className={`border rounded-xl p-4 transition-all ${
      item.imported
        ? "border-emerald-200 bg-emerald-50/30 opacity-70"
        : selected
        ? "border-[#1e3a5f] bg-blue-50/40 shadow-sm"
        : item.error
        ? "border-red-200 bg-red-50/30"
        : "border-gray-200 bg-white hover:border-gray-300"
    }`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(index)}
          className="mt-1 shrink-0"
          disabled={item.imported}
        />

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-1">Ημερομηνία</p>
            <Input
              type="date"
              value={item.date ? item.date.split("T")[0] : ""}
              onChange={(e) => onUpdate(index, "date", e.target.value)}
              className="h-8 text-xs"
              disabled={item.imported}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Έργο *</p>
            <Select value={item.project_id || ""} onValueChange={(v) => onUpdate(index, "project_id", v)} disabled={item.imported}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Επιλογή..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Κατηγορία</p>
            <Select value={item.category || "general_expenses"} onValueChange={(v) => onUpdate(index, "category", v)} disabled={item.imported}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Υποκατηγορία</p>
            <SearchableSelect
              value={item.subcategory || ""}
              onValueChange={(v) => onUpdate(index, "subcategory", v)}
              items={subcategories.map(s => ({ value: s.name, label: s.name }))}
              placeholder="—"
              triggerClassName="h-8 text-xs"
              disabled={item.imported}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Δικαιούχος *</p>
            <Input
              value={item.payee || ""}
              onChange={(e) => onUpdate(index, "payee", e.target.value)}
              placeholder="Δικαιούχος"
              className="h-8 text-xs"
              disabled={item.imported}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Ποσό (€) *</p>
            <Input
              type="number"
              step="0.01"
              value={item.amount || ""}
              onChange={(e) => onUpdate(index, "amount", parseFloat(e.target.value))}
              placeholder="0.00"
              className="h-8 text-xs"
              disabled={item.imported}
            />
          </div>

          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <p className="text-xs text-gray-400 mb-1">Περιγραφή</p>
            <Input
              value={item.description || ""}
              onChange={(e) => onUpdate(index, "description", e.target.value)}
              placeholder="Περιγραφή..."
              className="h-8 text-xs"
              disabled={item.imported}
            />
          </div>

          <div className="col-span-2 md:col-span-2">
            <p className="text-xs text-gray-400 mb-1">Πηγή Πληρωμής</p>
            <SearchableSelect
              value={item.payment_source || ""}
              onValueChange={(v) => onUpdate(index, "payment_source", v)}
              items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
              placeholder="—"
              triggerClassName="h-8 text-xs"
              disabled={item.imported}
            />
          </div>
        </div>

        <div className="shrink-0 mt-1">
          {item.imported ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : item.error ? (
            <span title={item.error}><AlertCircle className="w-5 h-5 text-red-500" /></span>
          ) : null}
        </div>
      </div>

      {item.error && (
        <p className="text-xs text-red-500 mt-2 ml-8">{item.error}</p>
      )}
    </div>
  );
}

// Extraction steps for progress display
const STEPS = [
  { label: "Ανέβασμα αρχείου", pct: 20 },
  { label: "Ανάλυση εγγράφου", pct: 55 },
  { label: "Εξαγωγή δεδομένων", pct: 80 },
  { label: "Επεξεργασία αποτελεσμάτων", pct: 95 },
];

export default function ExpenseImporter() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const [extracting, setExtracting] = useState(false);
  const [importingSelected, setImportingSelected] = useState(false);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [aiNotes, setAiNotes] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });
  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });
  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list("name"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const processFile = async (file) => {
    setFileName(file.name);
    setExtracting(true);
    setItems([]);
    setSelected([]);
    setAiNotes("");

    // Step 1: upload
    setStepIndex(0);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Step 2: analyze
    setStepIndex(1);

    const projectList = projects.map(p => `- ${p.name} (id: ${p.id})`).join("\n");
    const subcatList = subcategories.map(s => s.name).join(", ");
    const paymentSourceList = paymentSources.map(ps => ps.name).join(", ");
    const today = new Date().toISOString().split("T")[0];

    // Step 3: extract with high-quality model
    setStepIndex(2);

    const result = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Είσαι ειδικός λογιστής. Αναλύσε το συνημμένο αρχείο (τιμολόγιο, κατάσταση δαπανών, λογιστικό φύλλο ή παρόμοιο) και εξήγαγε ΟΛΑ τα επιμέρους έξοδα/πληρωμές.

ΕΡΓΑ ΣΤΟ ΣΥΣΤΗΜΑ:
${projectList || "Δεν υπάρχουν έργα ακόμα"}

ΔΙΑΘΕΣΙΜΕΣ ΥΠΟΚΑΤΗΓΟΡΙΕΣ: ${subcatList || "—"}
ΔΙΑΘΕΣΙΜΕΣ ΠΗΓΕΣ ΠΛΗΡΩΜΗΣ: ${paymentSourceList || "—"}

ΚΑΝΟΝΕΣ:
1. date: ημερομηνία YYYY-MM-DD (αν δεν βρεις: ${today})
2. payee: το όνομα του προμηθευτή/δικαιούχου όπως εμφανίζεται
3. description: σύντομη περιγραφή της εργασίας/αγοράς
4. amount: ΜΟΝΟ το καθαρό ποσό ως θετικός αριθμός (χωρίς ΦΠΑ αν αναφέρεται χωριστά, αλλιώς το συνολικό)
5. category: ΑΥΣΤΗΡΑ μια από: labor, subcontractor, materials, equipment, general_expenses
   - labor: εργατικά, ημερομίσθια, αμοιβές εργαζομένων
   - subcontractor: υπεργολάβοι, εξωτερικοί συνεργάτες (ηλεκτρολόγοι, υδραυλικοί κλπ)
   - materials: υλικά κατασκευής (τσιμέντο, σίδερα, τούβλα, ξυλεία κλπ)
   - equipment: μηχανήματα, εξοπλισμός, ενοικίαση εξοπλισμού
   - general_expenses: όλα τα υπόλοιπα (ασφάλειες, άδειες, γραφειακά κλπ)
6. subcategory: αν ταιριάζει με κάποια από τις διαθέσιμες, χρησιμοποίησέ την. Αλλιώς κενό.
7. payment_source: αν αναφέρεται τράπεζα/λογαριασμός/μέθοδος πληρωμής που ταιριάζει με τις διαθέσιμες, χρησιμοποίησέ την.
8. suggested_project_id: αν μπορείς να συσχετίσεις με κάποιο έργο από τη λίστα, βάλε το id. Αλλιώς κενό.
9. confidence: "high", "medium" ή "low" - πόσο σίγουρος είσαι για αυτή την εγγραφή

ΣΗΜΑΝΤΙΚΟ: Αγνόησε επικεφαλίδες, σύνολα σειρών, υποσύνολα, ΦΠΑ γραμμές. Μόνο επιμέρους εγγραφές δαπανών.
Στο πεδίο "notes" βάλε τυχόν παρατηρήσεις σου για το έγγραφο (γλώσσα, ποιότητα, τι βρήκες).`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          expenses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                payee: { type: "string" },
                description: { type: "string" },
                amount: { type: "number" },
                category: { type: "string" },
                subcategory: { type: "string" },
                payment_source: { type: "string" },
                suggested_project_id: { type: "string" },
                confidence: { type: "string" },
              },
            },
          },
          notes: { type: "string" },
        },
      },
    });

    // Step 4: process
    setStepIndex(3);

    const extracted = result?.expenses || [];
    if (result?.notes) setAiNotes(result.notes);

    const defaultProjectId = projects.length === 1 ? projects[0].id : "";
    const mapped = extracted.map((row) => {
      // Try to match suggested project
      const suggestedProject = projects.find(p => p.id === row.suggested_project_id);
      return {
        ...row,
        project_id: suggestedProject?.id || defaultProjectId,
        amount: Number(row.amount) || 0,
        category: CATEGORY_OPTIONS.includes(row.category) ? row.category : "general_expenses",
        confidence: row.confidence || "medium",
        imported: false,
        error: null,
      };
    });

    setItems(mapped);
    // Auto-select high/medium confidence only
    setSelected(mapped.map((_, i) => i).filter(i => mapped[i].confidence !== "low"));
    setExtracting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  }, [projects, paymentSources, subcategories]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleUpdate = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value, error: null } : item));
  };

  const handleToggle = (index) => {
    if (items[index]?.imported) return;
    setSelected((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]);
  };

  const handleToggleAll = () => {
    const pendingIndices = items.map((_, i) => i).filter(i => !items[i].imported);
    if (selected.length === pendingIndices.length) setSelected([]);
    else setSelected(pendingIndices);
  };

  const handleImportSelected = async () => {
    const toProcess = selected.filter((i) => !items[i]?.imported);
    if (!toProcess.length) return;

    setImportingSelected(true);
    const newItems = [...items];

    for (const idx of toProcess) {
      const item = newItems[idx];
      if (!item.project_id) { newItems[idx] = { ...item, error: "Επιλέξτε έργο" }; continue; }
      if (!item.payee?.trim()) { newItems[idx] = { ...item, error: "Απαιτείται δικαιούχος" }; continue; }
      if (!item.amount || item.amount <= 0) { newItems[idx] = { ...item, error: "Απαιτείται έγκυρο ποσό" }; continue; }

      await createMutation.mutateAsync({
        project_id: item.project_id,
        category: item.category || "general_expenses",
        subcategory: item.subcategory || "",
        payee: item.payee,
        description: item.description || "",
        date: item.date || today,
        amount: item.amount,
        payment_source: item.payment_source || "",
      });
      newItems[idx] = { ...item, imported: true };
    }

    setItems(newItems);
    setSelected([]);
    setImportingSelected(false);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSelected((prev) => prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  const importedCount = items.filter((i) => i.imported).length;
  const pendingCount = items.filter((i) => !i.imported).length;
  const selectedPending = selected.filter((i) => !items[i]?.imported);
  const errorCount = items.filter(i => i.error).length;
  const lowConfidenceCount = items.filter(i => i.confidence === "low" && !i.imported).length;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        ref={dropRef}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-[#1e3a5f] bg-[#1e3a5f]/5 scale-[1.01]"
            : extracting
            ? "border-[#c9a962]/50 bg-amber-50/30"
            : "border-[#1e3a5f]/30 bg-white hover:border-[#1e3a5f]/60 hover:bg-blue-50/20"
        }`}
        onClick={() => !extracting && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileUpload}
        />

        {extracting ? (
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[#1e3a5f]/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[#1e3a5f] animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#c9a962] rounded-full flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              </div>
            </div>
            <div className="w-full space-y-2">
              <p className="text-sm font-semibold text-[#1e3a5f]">{STEPS[stepIndex]?.label}...</p>
              <p className="text-xs text-gray-400">{fileName}</p>
              <Progress value={STEPS[stepIndex]?.pct || 10} className="h-1.5" />
            </div>
            <p className="text-xs text-gray-400 italic">Χρησιμοποιείται Claude AI για ακριβή ανάλυση</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a5f]/10 to-[#c9a962]/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#1e3a5f]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1e3a5f]">
                {dragOver ? "Άφησε το αρχείο εδώ" : "AI Εξαγωγή Δαπανών"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Σύρε ή επέλεξε: PDF, Word, Excel, CSV, ή εικόνα τιμολογίου
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              {["PDF", "XLSX", "CSV", "DOCX", "JPG"].map(ext => (
                <span key={ext} className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 font-mono">{ext}</span>
              ))}
            </div>
            <Button variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] mt-1">
              <Upload className="w-4 h-4 mr-2" />
              Επιλογή αρχείου
            </Button>
          </div>
        )}
      </div>

      {/* AI Notes */}
      {aiNotes && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{aiNotes}</p>
        </div>
      )}

      {/* Results */}
      {items.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.length === items.filter(i => !i.imported).length && items.filter(i => !i.imported).length > 0}
                  onCheckedChange={handleToggleAll}
                />
                <span className="text-sm text-gray-600">
                  <strong>{items.length}</strong> εγγραφές
                  {importedCount > 0 && <span className="text-emerald-600 ml-2">· {importedCount} εισήχθησαν ✓</span>}
                  {pendingCount > 0 && <span className="text-gray-500 ml-2">· {pendingCount} αναμένουν</span>}
                </span>
              </div>
              {selectedPending.length > 0 && (
                <Badge className="bg-[#1e3a5f] text-white border-0">{selectedPending.length} επιλεγμένες</Badge>
              )}
              {lowConfidenceCount > 0 && (
                <Badge variant="outline" className="border-amber-300 text-amber-600 gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {lowConfidenceCount} χαμηλής εμπιστοσύνης
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="outline" className="border-red-300 text-red-600">{errorCount} σφάλματα</Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => { setItems([]); setSelected([]); setAiNotes(""); }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Καθαρισμός
              </Button>
              <Button
                size="sm"
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
                disabled={selectedPending.length === 0 || importingSelected}
                onClick={handleImportSelected}
              >
                {importingSelected ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Εισαγωγή...</>
                ) : (
                  <><Check className="w-3.5 h-3.5 mr-1.5" />Εισαγωγή {selectedPending.length} επιλεγμένων</>
                )}
              </Button>
            </div>
          </div>

          {/* Confidence legend */}
          <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Υψηλή εμπιστοσύνη</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Μέτρια</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Χαμηλή — ελέγξτε</span>
          </div>

          {/* Items list */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="relative group">
                {/* Confidence indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                  item.imported ? "bg-emerald-400" :
                  item.confidence === "high" ? "bg-emerald-400" :
                  item.confidence === "low" ? "bg-red-400" : "bg-amber-400"
                }`} />
                <div className="pl-2">
                  <ExpenseRow
                    item={item}
                    index={index}
                    projects={projects}
                    paymentSources={paymentSources}
                    subcategories={subcategories}
                    onUpdate={handleUpdate}
                    onToggle={handleToggle}
                    selected={selected.includes(index)}
                  />
                </div>
                {!item.imported && (
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-[#1e3a5f] text-white rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-white/60">
                {selectedPending.length > 0 ? `${selectedPending.length} επιλεγμένες εγγραφές` : "Σύνολο αρχείου"}
              </p>
              <p className="text-sm text-white/80">Συνολικό ποσό</p>
            </div>
            <span className="text-2xl font-bold">
              {formatCurrency(
                (selectedPending.length > 0
                  ? selectedPending.map(i => items[i])
                  : items.filter(i => !i.imported)
                ).reduce((s, i) => s + (Number(i?.amount) || 0), 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}