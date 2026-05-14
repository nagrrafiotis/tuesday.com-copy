import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Zap, Info } from "lucide-react";

// Default rules stored in localStorage
const STORAGE_KEY = "bank_category_rules";

export const CATEGORY_OPTIONS = [
  { value: "payroll", label: "Μισθοδοσία", color: "bg-purple-100 text-purple-700" },
  { value: "general_expense", label: "Γενικό Έξοδο", color: "bg-red-100 text-red-700" },
  { value: "general_income", label: "Γενικό Έσοδο", color: "bg-green-100 text-green-700" },
  { value: "project_expense", label: "Έξοδο Έργου", color: "bg-orange-100 text-orange-700" },
  { value: "project_income", label: "Έσοδο Έργου", color: "bg-teal-100 text-teal-700" },
  { value: "invoice", label: "Τιμολόγιο", color: "bg-blue-100 text-blue-700" },
  { value: "other", label: "Άλλο", color: "bg-gray-100 text-gray-700" },
];

const DEFAULT_RULES = [
  { id: "1", keyword: "μισθ", category: "payroll", field: "description" },
  { id: "2", keyword: "ika", category: "payroll", field: "description" },
  { id: "3", keyword: "εφκα", category: "payroll", field: "description" },
  { id: "4", keyword: "dey", category: "general_expense", field: "description" },
  { id: "5", keyword: "δεη", category: "general_expense", field: "description" },
  { id: "6", keyword: "ΔΕΗ", category: "general_expense", field: "counterparty" },
  { id: "7", keyword: "τιμολ", category: "invoice", field: "description" },
];

export function loadRules() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function matchCategory(transaction, rules) {
  const desc = (transaction.description || "").toLowerCase();
  const counterparty = (transaction.counterparty || "").toLowerCase();
  const reference = (transaction.reference || "").toLowerCase();

  for (const rule of rules) {
    const kw = rule.keyword.toLowerCase();
    const target = rule.field === "counterparty" ? counterparty : rule.field === "reference" ? reference : desc;
    if (target.includes(kw)) return rule.category;
  }
  return null;
}

export default function CategoryRulesManager({ open, onClose }) {
  const [rules, setRules] = useState(loadRules);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("general_expense");
  const [newField, setNewField] = useState("description");
  const [saved, setSaved] = useState(false);

  const addRule = () => {
    if (!newKeyword.trim()) return;
    const updated = [...rules, { id: Date.now().toString(), keyword: newKeyword.trim(), category: newCategory, field: newField }];
    setRules(updated);
    setNewKeyword("");
  };

  const deleteRule = (id) => setRules(r => r.filter(x => x.id !== id));

  const handleSave = () => {
    saveRules(rules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getCategoryLabel = (val) => CATEGORY_OPTIONS.find(c => c.value === val)?.label || val;
  const getCategoryColor = (val) => CATEGORY_OPTIONS.find(c => c.value === val)?.color || "bg-gray-100 text-gray-700";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Κανόνες Αυτόματης Κατηγοριοποίησης
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Οι κανόνες ελέγχουν αν η λέξη-κλειδί υπάρχει στο επιλεγμένο πεδίο της κίνησης (case-insensitive). Χρησιμοποιούνται κατά την αντιστοίχιση κινήσεων.</span>
        </div>

        {/* Add new rule */}
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-32">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Λέξη-κλειδί</label>
            <Input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
              placeholder="π.χ. μισθός, ΔΕΗ..." onKeyDown={e => e.key === "Enter" && addRule()} />
          </div>
          <div className="w-36">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Πεδίο</label>
            <Select value={newField} onValueChange={setNewField}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Περιγραφή</SelectItem>
                <SelectItem value="counterparty">Αντισυμβαλλόμενος</SelectItem>
                <SelectItem value="reference">Αναφορά</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addRule} className="bg-[#1e3a5f] hover:bg-[#152a45]">
            <Plus className="w-4 h-4 mr-1" />Προσθήκη
          </Button>
        </div>

        {/* Rules list */}
        <div className="flex-1 overflow-y-auto space-y-1 border rounded-lg p-2 min-h-32">
          {rules.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Δεν υπάρχουν κανόνες</p>}
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 group">
              <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 flex-1">{rule.keyword}</code>
              <span className="text-xs text-gray-400">
                {rule.field === "counterparty" ? "Αντισυμβαλλόμενος" : rule.field === "reference" ? "Αναφορά" : "Περιγραφή"}
              </span>
              <Badge className={`text-xs ${getCategoryColor(rule.category)}`}>{getCategoryLabel(rule.category)}</Badge>
              <button onClick={() => deleteRule(rule.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSave}>
            {saved ? "✓ Αποθηκεύτηκε!" : "Αποθήκευση Κανόνων"}
          </Button>
          <Button variant="outline" onClick={onClose}>Κλείσιμο</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}