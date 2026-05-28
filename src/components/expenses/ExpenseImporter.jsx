import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

const CATEGORY_OPTIONS = [
  "labor", "subcontractor", "materials", "equipment", "general_expenses"
];

function ExpenseRow({ item, index, projects, paymentSources, subcategories, onUpdate, onToggle, selected }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={`border rounded-xl p-4 transition-all ${selected ? "border-[#1e3a5f] bg-blue-50/40" : item.error ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-white"}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(index)}
          className="mt-1 shrink-0"
        />

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          {/* Date */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Ημερομηνία</p>
            <Input
              type="date"
              value={item.date ? item.date.split("T")[0] : ""}
              onChange={(e) => onUpdate(index, "date", e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Project */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Έργο *</p>
            <Select value={item.project_id || ""} onValueChange={(v) => onUpdate(index, "project_id", v)}>
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

          {/* Category */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Κατηγορία</p>
            <Select value={item.category || "general_expenses"} onValueChange={(v) => onUpdate(index, "category", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Υποκατηγορία</p>
            <SearchableSelect
              value={item.subcategory || ""}
              onValueChange={(v) => onUpdate(index, "subcategory", v)}
              items={subcategories.map(s => ({ value: s.name, label: s.name }))}
              placeholder="—"
              triggerClassName="h-8 text-xs"
            />
          </div>

          {/* Payee */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Δικαιούχος *</p>
            <Input
              value={item.payee || ""}
              onChange={(e) => onUpdate(index, "payee", e.target.value)}
              placeholder="Δικαιούχος"
              className="h-8 text-xs"
            />
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Ποσό (€) *</p>
            <Input
              type="number"
              step="0.01"
              value={item.amount || ""}
              onChange={(e) => onUpdate(index, "amount", parseFloat(e.target.value))}
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </div>

          {/* Description */}
          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <p className="text-xs text-gray-400 mb-1">Περιγραφή</p>
            <Input
              value={item.description || ""}
              onChange={(e) => onUpdate(index, "description", e.target.value)}
              placeholder="Περιγραφή..."
              className="h-8 text-xs"
            />
          </div>

          {/* Payment Source */}
          <div className="col-span-2 md:col-span-2">
            <p className="text-xs text-gray-400 mb-1">Πηγή Πληρωμής</p>
            <SearchableSelect
              value={item.payment_source || ""}
              onValueChange={(v) => onUpdate(index, "payment_source", v)}
              items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
              placeholder="—"
              triggerClassName="h-8 text-xs"
            />
          </div>
        </div>

        {item.imported ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
        ) : item.error ? (
          <span title={item.error}><XCircle className="w-5 h-5 text-red-500 shrink-0 mt-1" /></span>
        ) : null}
      </div>
    </div>
  );
}

export default function ExpenseImporter() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);
  const [importingSelected, setImportingSelected] = useState(false);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [fileName, setFileName] = useState("");

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setExtracting(true);
    setItems([]);
    setSelected([]);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Από το παρακάτω αρχείο (PDF, Word ή Excel), εξήγαγε όλες τις πληρωμές/δαπάνες ως λίστα.
Για κάθε εγγραφή επέστρεψε:
- date: ημερομηνία σε μορφή YYYY-MM-DD (αν δεν υπάρχει, βάλε σημερινή: ${new Date().toISOString().split("T")[0]})
- payee: δικαιούχος/προμηθευτής
- description: σύντομη περιγραφή
- amount: ποσό ως αριθμός (θετικό)
- category: μια από: labor, subcontractor, materials, equipment, general_expenses (επίλεξε ανάλογα)
- subcategory: υποκατηγορία αν υπάρχει (αλλιώς κενό)
- payment_source: τράπεζα/μέθοδος πληρωμής αν υπάρχει (αλλιώς κενό)
Αγνόησε τυχόν επικεφαλίδες, σύνολα, κλπ. Επέστρεψε μόνο τις επιμέρους εγγραφές.`,
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
              },
            },
          },
        },
      },
    });

    const extracted = result?.expenses || [];
    // Auto-match project if only one
    const defaultProjectId = projects.length === 1 ? projects[0].id : "";
    const mapped = extracted.map((row) => ({
      ...row,
      project_id: defaultProjectId,
      amount: Number(row.amount) || 0,
      category: CATEGORY_OPTIONS.includes(row.category) ? row.category : "general_expenses",
      imported: false,
      error: null,
    }));
    setItems(mapped);
    setSelected(mapped.map((_, i) => i));
    setExtracting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpdate = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value, error: null } : item));
  };

  const handleToggle = (index) => {
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleToggleAll = () => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((_, i) => i));
  };

  const handleImportSelected = async () => {
    const toImport = items.filter((_, i) => selected.includes(i) && !items[i].imported);
    if (!toImport.length) return;

    setImportingSelected(true);
    const newItems = [...items];

    for (const idx of selected) {
      const item = newItems[idx];
      if (item.imported) continue;
      if (!item.project_id) {
        newItems[idx] = { ...item, error: "Επιλέξτε έργο" };
        continue;
      }
      if (!item.payee) {
        newItems[idx] = { ...item, error: "Απαιτείται δικαιούχος" };
        continue;
      }
      if (!item.amount || item.amount <= 0) {
        newItems[idx] = { ...item, error: "Απαιτείται έγκυρο ποσό" };
        continue;
      }
      await createMutation.mutateAsync({
        project_id: item.project_id,
        category: item.category || "general_expenses",
        subcategory: item.subcategory || "",
        payee: item.payee,
        description: item.description || "",
        date: item.date || new Date().toISOString(),
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

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className="border-2 border-dashed border-[#1e3a5f]/30 rounded-2xl p-10 text-center bg-white hover:border-[#1e3a5f]/60 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
          className="hidden"
          onChange={handleFileUpload}
        />
        {extracting ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#1e3a5f] animate-spin" />
            <p className="text-gray-600 font-medium">Ανάλυση αρχείου με AI...</p>
            <p className="text-sm text-gray-400">{fileName}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#1e3a5f]/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#1e3a5f]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1e3a5f]">Ανέβασε αρχείο για AI εξαγωγή</p>
              <p className="text-sm text-gray-500 mt-1">PDF, Word (.doc/.docx), Excel (.xls/.xlsx), CSV</p>
            </div>
            <Button variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] mt-2">
              <Upload className="w-4 h-4 mr-2" />
              Επιλογή αρχείου
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {items.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.length === items.filter(i => !i.imported).length && items.filter(i => !i.imported).length > 0}
                  onCheckedChange={handleToggleAll}
                />
                <span className="text-sm text-gray-600">
                  <strong>{items.length}</strong> εγγραφές εντοπίστηκαν
                  {importedCount > 0 && <span className="text-emerald-600 ml-2">· {importedCount} εισήχθησαν ✓</span>}
                  {pendingCount > 0 && <span className="text-gray-500 ml-2">· {pendingCount} αναμένουν</span>}
                </span>
              </div>
              {selectedPending.length > 0 && (
                <Badge className="bg-[#1e3a5f] text-white border-0">{selectedPending.length} επιλεγμένες</Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => { setItems([]); setSelected([]); }}
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

          {/* Items list */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="relative group">
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
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-[#1e3a5f] text-white rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm">Σύνολο {selectedPending.length > 0 ? "επιλεγμένων" : "αρχείου"}</span>
            <span className="text-xl font-bold">
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