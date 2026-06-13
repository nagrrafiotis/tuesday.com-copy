import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle, CheckCircle2, Loader2, Check, ChevronDown, ChevronUp,
  Plus, Trash2, Save, ArrowLeft, XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CATEGORY_OPTIONS = ["labor", "subcontractor", "materials", "equipment", "general_expenses"];
const CATEGORY_LABELS = {
  labor: "Εργατικά",
  subcontractor: "Υπεργολάβοι",
  materials: "Υλικά",
  equipment: "Εξοπλισμός",
  general_expenses: "Γενικά Έξοδα",
};

const STORAGE_KEY = "failedImports_v1";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function validate(item) {
  if (!item.project_id) return "Επιλέξτε έργο";
  if (!item.payee?.trim()) return "Απαιτείται δικαιούχος";
  if (!item.amount || item.amount <= 0) return "Απαιτείται έγκυρο ποσό";
  return null;
}

function emptyRow() {
  return {
    _id: Math.random().toString(36).slice(2),
    date: new Date().toISOString().split("T")[0],
    project_id: "",
    category: "general_expenses",
    subcategory: "",
    payee: "",
    description: "",
    amount: "",
    payment_source: "",
    error: null,
    done: false,
    expanded: true,
  };
}

function EditRow({ item, index, projects, paymentSources, subcategories, onUpdate, onToggle, selected, onRemove }) {
  return (
    <div className={`border rounded-xl transition-all ${
      item.done ? "border-emerald-200 bg-emerald-50/40" :
      item.error ? "border-red-300 bg-red-50/20" :
      selected ? "border-[#1e3a5f] bg-blue-50/30 shadow-sm" :
      "border-gray-200 bg-white"
    }`}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(index)}
          disabled={item.done}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-800 truncate">
              {item.payee || <span className="text-red-400 italic text-xs">Χωρίς δικαιούχο</span>}
            </span>
            {item.amount > 0 && (
              <span className="text-sm font-semibold text-[#1e3a5f]">
                {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(item.amount)}
              </span>
            )}
            {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
            <Badge className="text-xs border-0" style={{ background: item.done ? "#d1fae5" : "#fee2e2", color: item.done ? "#065f46" : "#991b1b" }}>
              {item.done ? "Αποθηκεύτηκε ✓" : "Αποτυχία"}
            </Badge>
            {item.error && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{item.error}
              </span>
            )}
          </div>
          {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.done ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <>
              <button
                onClick={() => onRemove(index)}
                className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                title="Διαγραφή"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdate(index, "expanded", !item.expanded)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors"
              >
                {item.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit form */}
      {item.expanded && !item.done && (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm bg-gray-50/60 rounded-b-xl pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-1">Ημερομηνία</p>
            <Input type="date" value={item.date || ""} onChange={e => onUpdate(index, "date", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Έργο *</p>
            <Select value={item.project_id || ""} onValueChange={v => onUpdate(index, "project_id", v)}>
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
            <Select value={item.category || "general_expenses"} onValueChange={v => onUpdate(index, "category", v)}>
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
              onValueChange={v => onUpdate(index, "subcategory", v)}
              items={subcategories.map(s => ({ value: s.name, label: s.name }))}
              placeholder="—"
              triggerClassName="h-8 text-xs"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Δικαιούχος *</p>
            <Input
              value={item.payee || ""}
              onChange={e => onUpdate(index, "payee", e.target.value)}
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
              onChange={e => onUpdate(index, "amount", parseFloat(e.target.value))}
              placeholder="0.00"
              className={`h-8 text-xs ${!item.amount || item.amount <= 0 ? "border-red-300" : ""}`}
            />
          </div>
          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <p className="text-xs text-gray-400 mb-1">Περιγραφή</p>
            <Input
              value={item.description || ""}
              onChange={e => onUpdate(index, "description", e.target.value)}
              placeholder="Περιγραφή..."
              className="h-8 text-xs"
            />
          </div>
          <div className="col-span-2 md:col-span-2">
            <p className="text-xs text-gray-400 mb-1">Πηγή Πληρωμής</p>
            <SearchableSelect
              value={item.payment_source || ""}
              onValueChange={v => onUpdate(index, "payment_source", v)}
              items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
              placeholder="—"
              triggerClassName="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function FailedImports() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(() => loadFromStorage());
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list("-created_date") });
  const { data: paymentSources = [] } = useQuery({ queryKey: ["paymentSources"], queryFn: () => base44.entities.PaymentSource.list("name") });
  const { data: subcategories = [] } = useQuery({ queryKey: ["subcategories"], queryFn: () => base44.entities.Subcategory.list("name") });

  const update = (index, field, value) => {
    setItems(prev => {
      const next = prev.map((item, i) => i === index ? { ...item, [field]: value, error: field !== "expanded" ? null : item.error } : item);
      saveToStorage(next.filter(i => !i.done));
      return next;
    });
  };

  const remove = (index) => {
    setItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      saveToStorage(next.filter(i => !i.done));
      setSelected(s => s.filter(i => i !== index).map(i => i > index ? i - 1 : i));
      return next;
    });
  };

  const toggleSelect = (index) => {
    setSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const toggleAll = () => {
    const pending = items.map((_, i) => i).filter(i => !items[i].done);
    setSelected(selected.length === pending.length ? [] : pending);
  };

  const addRow = () => {
    const row = emptyRow();
    setItems(prev => {
      const next = [...prev, row];
      saveToStorage(next.filter(i => !i.done));
      return next;
    });
    setSelected(prev => [...prev, items.length]);
  };

  const clearDone = () => {
    setItems(prev => {
      const next = prev.filter(i => !i.done);
      saveToStorage(next);
      setSelected([]);
      return next;
    });
  };

  const handleSave = async () => {
    const toProcess = selected.filter(i => !items[i]?.done);
    if (!toProcess.length) return;

    const newItems = [...items];
    let hasErrors = false;
    for (const idx of toProcess) {
      const err = validate(newItems[idx]);
      if (err) { newItems[idx] = { ...newItems[idx], error: err }; hasErrors = true; }
    }
    if (hasErrors) { setItems([...newItems]); return; }

    setSaving(true);
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
            amount: Number(item.amount),
            payment_source: item.payment_source || "",
          });
          newItems[idx] = { ...item, done: true, error: null };
        } catch (err) {
          newItems[idx] = { ...item, error: err?.message || "Σφάλμα αποθήκευσης" };
        }
      }));
      setItems([...newItems]);
      if (b + 5 < validIndices.length) await new Promise(r => setTimeout(r, 300));
    }

    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    setSaving(false);
    setSelected([]);
    saveToStorage(newItems.filter(i => !i.done));
  };

  const pending = items.filter(i => !i.done);
  const done = items.filter(i => i.done);
  const selectedPending = selected.filter(i => !items[i]?.done);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Expenses")}>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Αποτυχημένες Εγγραφές
            </h1>
            <p className="text-sm text-gray-500">
              {pending.length} εκκρεμούν
              {done.length > 0 && <span className="text-emerald-600 ml-2">· {done.length} αποθηκεύτηκαν ✓</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {done.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearDone} className="text-gray-500">
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Καθαρισμός ολοκληρωμένων
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addRow} className="border-[#1e3a5f] text-[#1e3a5f]">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Προσθήκη εγγραφής
          </Button>
          <Button
            size="sm"
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
            disabled={selectedPending.length === 0 || saving}
            onClick={handleSave}
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Αποθήκευση...</>
            ) : (
              <><Save className="w-3.5 h-3.5 mr-1.5" />Αποθήκευση {selectedPending.length > 0 ? selectedPending.length : ""} επιλεγμένων</>
            )}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Δεν υπάρχουν αποτυχημένες εγγραφές</p>
          <p className="text-sm text-gray-400 mt-1">Οι αποτυχημένες εγγραφές από εισαγωγές αποθηκεύονται εδώ αυτόματα.</p>
          <Button variant="outline" size="sm" onClick={addRow} className="mt-4">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Προσθήκη χειροκίνητα
          </Button>
        </div>
      )}

      {/* Select all bar */}
      {pending.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedPending.length === pending.length && pending.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm text-gray-600">
              Επιλογή όλων ({pending.length} εκκρεμούν)
            </span>
            {selectedPending.length > 0 && (
              <Badge className="bg-[#1e3a5f] text-white border-0 text-xs">{selectedPending.length} επιλεγμένες</Badge>
            )}
          </div>
          {selectedPending.length >= 2 && (
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setItems(prev => prev.map((item, i) => selected.includes(i) && !item.done ? { ...item, category: cat } : item))}
                  className="text-xs px-2.5 py-1 rounded-lg border border-[#1e3a5f]/30 bg-white hover:bg-[#1e3a5f] hover:text-white transition-all"
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <EditRow
            key={item._id || index}
            item={item}
            index={index}
            projects={projects}
            paymentSources={paymentSources}
            subcategories={subcategories}
            onUpdate={update}
            onToggle={toggleSelect}
            selected={selected.includes(index)}
            onRemove={remove}
          />
        ))}
      </div>
    </div>
  );
}