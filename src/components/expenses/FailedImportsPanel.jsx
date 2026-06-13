import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Loader2, Check, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_OPTIONS = ["labor", "subcontractor", "materials", "equipment", "general_expenses"];
const CATEGORY_LABELS = {
  labor: "Εργατικά",
  subcontractor: "Υπεργολάβοι",
  materials: "Υλικά",
  equipment: "Εξοπλισμός",
  general_expenses: "Γενικά Έξοδα",
};

function validate(item) {
  if (!item.project_id) return "Επιλέξτε έργο";
  if (!item.payee?.trim()) return "Απαιτείται δικαιούχος";
  if (!item.amount || item.amount <= 0) return "Απαιτείται έγκυρο ποσό";
  return null;
}

export default function FailedImportsPanel({ failedItems, onUpdateItems, projects, paymentSources, subcategories }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(failedItems.map(item => ({ ...item, error: null, fixed: false, importing: false, done: false })));
  const [selected, setSelected] = useState(failedItems.map((_, i) => i));
  const [expanded, setExpanded] = useState(failedItems.map((_, i) => i)); // all expanded by default
  const [importing, setImporting] = useState(false);

  const update = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value, error: null } : item));
  };

  const toggleExpand = (index) => {
    setExpanded(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const toggleSelect = (index) => {
    setSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const toggleAll = () => {
    const pending = items.map((_, i) => i).filter(i => !items[i].done);
    setSelected(selected.length === pending.length ? [] : pending);
  };

  const handleImport = async () => {
    const toProcess = selected.filter(i => !items[i].done);
    if (!toProcess.length) return;

    // Validate
    const newItems = [...items];
    let hasErrors = false;
    for (const idx of toProcess) {
      const err = validate(newItems[idx]);
      if (err) { newItems[idx] = { ...newItems[idx], error: err }; hasErrors = true; }
    }
    if (hasErrors) { setItems(newItems); return; }

    setImporting(true);
    const validIndices = toProcess.filter(idx => !newItems[idx].error);

    for (let b = 0; b < validIndices.length; b += 5) {
      const batch = validIndices.slice(b, b + 5);
      await Promise.all(batch.map(async (idx) => {
        const item = newItems[idx];
        try {
          await base44.entities.Expense.create({
            project_id: item.project_id,
            category: item.category || "general_expenses",
            subcategory: item.subcategory || "",
            payee: item.payee,
            description: item.description || "",
            date: item.date || new Date().toISOString().split("T")[0],
            amount: item.amount,
            payment_source: item.payment_source || "",
          });
          newItems[idx] = { ...item, done: true, error: null };
        } catch (err) {
          newItems[idx] = { ...item, error: err?.message || "Σφάλμα κατά την αποθήκευση" };
        }
      }));
      setItems([...newItems]);
      if (b + 5 < validIndices.length) await new Promise(r => setTimeout(r, 300));
    }

    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    setImporting(false);
    setSelected([]);

    // Notify parent to remove successfully imported items
    if (onUpdateItems) onUpdateItems(newItems);
  };

  const doneCount = items.filter(i => i.done).length;
  const pendingCount = items.filter(i => !i.done).length;
  const selectedPending = selected.filter(i => !items[i]?.done);

  if (items.length === 0) return null;

  return (
    <div className="border border-red-200 rounded-2xl overflow-hidden bg-red-50/30">
      {/* Header */}
      <div className="bg-red-50 border-b border-red-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">
              Αποτυχημένες εγγραφές ({pendingCount} εκκρεμούν{doneCount > 0 ? `, ${doneCount} εισήχθησαν ✓` : ""})
            </p>
            <p className="text-xs text-red-600 mt-0.5">Διορθώστε τα πεδία και εισάγετε ξανά.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-100"
            onClick={toggleAll}
            disabled={importing}
          >
            {selectedPending.length === pendingCount && pendingCount > 0 ? "Αποεπιλογή όλων" : "Επιλογή όλων"}
          </Button>
          <Button
            size="sm"
            className="bg-red-700 hover:bg-red-800 text-white"
            disabled={selectedPending.length === 0 || importing}
            onClick={handleImport}
          >
            {importing ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Εισαγωγή...</>
            ) : (
              <><Check className="w-3.5 h-3.5 mr-1.5" />Εισαγωγή {selectedPending.length} επιλεγμένων</>
            )}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-red-100">
        {items.map((item, index) => (
          <div key={index} className={`transition-colors ${item.done ? "bg-emerald-50/40" : "bg-white"}`}>
            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <Checkbox
                checked={selected.includes(index)}
                onCheckedChange={() => toggleSelect(index)}
                disabled={item.done || importing}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-800 truncate">{item.payee || <span className="text-red-400 italic">Χωρίς δικαιούχο</span>}</span>
                  {item.amount > 0 && (
                    <span className="text-sm font-semibold text-[#1e3a5f]">
                      {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(item.amount)}
                    </span>
                  )}
                  {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
                  {item.done && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Εισήχθη ✓</Badge>}
                  {item.error && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{item.error}</span>}
                </div>
                {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
              </div>
              {!item.done && (
                <button onClick={() => toggleExpand(index)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 shrink-0">
                  {expanded.includes(index) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
              {item.done && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            </div>

            {/* Expanded edit form */}
            {expanded.includes(index) && !item.done && (
              <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm bg-gray-50/50">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Ημερομηνία</p>
                  <Input type="date" value={item.date || ""} onChange={e => update(index, "date", e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Έργο *</p>
                  <Select value={item.project_id || ""} onValueChange={v => update(index, "project_id", v)}>
                    <SelectTrigger className={`h-8 text-xs ${!item.project_id ? "border-red-300" : ""}`}>
                      <SelectValue placeholder="Επιλογή..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Κατηγορία</p>
                  <Select value={item.category || "general_expenses"} onValueChange={v => update(index, "category", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Υποκατηγορία</p>
                  <SearchableSelect
                    value={item.subcategory || ""}
                    onValueChange={v => update(index, "subcategory", v)}
                    items={subcategories.map(s => ({ value: s.name, label: s.name }))}
                    placeholder="—"
                    triggerClassName="h-8 text-xs"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Δικαιούχος *</p>
                  <Input
                    value={item.payee || ""}
                    onChange={e => update(index, "payee", e.target.value)}
                    placeholder="Δικαιούχος"
                    className={`h-8 text-xs ${!item.payee?.trim() ? "border-red-300" : ""}`}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Ποσό (€) *</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.amount || ""}
                    onChange={e => update(index, "amount", parseFloat(e.target.value))}
                    placeholder="0.00"
                    className={`h-8 text-xs ${!item.amount || item.amount <= 0 ? "border-red-300" : ""}`}
                  />
                </div>
                <div className="col-span-2 md:col-span-3 lg:col-span-4">
                  <p className="text-xs text-gray-400 mb-1">Περιγραφή</p>
                  <Input value={item.description || ""} onChange={e => update(index, "description", e.target.value)} placeholder="Περιγραφή..." className="h-8 text-xs" />
                </div>
                <div className="col-span-2 md:col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Πηγή Πληρωμής</p>
                  <SearchableSelect
                    value={item.payment_source || ""}
                    onValueChange={v => update(index, "payment_source", v)}
                    items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
                    placeholder="—"
                    triggerClassName="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}