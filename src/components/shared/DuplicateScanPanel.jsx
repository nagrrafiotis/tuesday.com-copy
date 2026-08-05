import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Copy, Loader2, AlertTriangle, Check, X } from "lucide-react";
import { format } from "date-fns";
import { findAllDuplicateGroups, duplicateConfigs } from "@/lib/duplicateDetector";

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

const norm = (s) => (s ?? "").toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const sameDate = (a, b) => a && b && String(a).slice(0, 10) === String(b).slice(0, 10);
const sameNum = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.005;
const sameStr = (a, b) => norm(a) === norm(b) && norm(a) !== "";

// Υπολογίζει ποια πεδία είναι κοινά σε ΟΛΕΣ τις εγγραφές της ομάδας.
function commonFieldsOf(group, config) {
  const out = [];
  const [first, ...rest] = group;
  if (rest.every((r) => sameNum(r[config.amountField], first[config.amountField]))) out.push("ποσό");
  if (rest.every((r) => sameDate(r[config.dateField], first[config.dateField]))) out.push("ημερομηνία");
  for (const f of config.keyFields) {
    if (rest.every((r) => sameStr(r[f], first[f]))) out.push(f);
  }
  return out;
}

function recordFieldsOutOfSync(group, config) {
  // Πεδία που ΔΙΑΦΕΡΟΥΝ μεταξύ των εγγραφών της ομάδας — χρήσιμα για να κρίνει ο χρήστης.
  const [first, ...rest] = group;
  const out = [];
  for (const f of [config.dateField, ...config.keyFields]) {
    if (rest.some((r) => !sameStr(r[f], first[f]))) out.push(f);
  }
  return out;
}

// Επιλέγει ποια εγγραφή να κρατηθεί σε μια ομάδα (προtringεί το reconciled, μετά το παλαιότερο).
function pickKeeper(group, config) {
  return [...group].sort((a, b) => {
    const ra = a.reconciled === true ? 0 : 1;
    const rb = b.reconciled === true ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return new Date(a.created_date || a[config.dateField] || 0) - new Date(b.created_date || b[config.dateField] || 0);
  })[0];
}

const FIELD_LABELS = {
  date: "ημερομηνία",
  payment_date: "ημερομηνία",
  amount: "ποσό",
  net_salary: "ποσό",
  total_amount: "ποσό",
  description: "περιγραφή",
  reference: "αναφορά",
  counterparty: "αντισυμβαλλόμενος",
  payee: "δικαιούχος",
  payer: "πληρωτής",
  employee_name: "employee",
  period: "περίοδος",
  invoice_number: "τιμολόγιο",
};

const fieldLabel = (f) => FIELD_LABELS[f] || f;

export default function DuplicateScanPanel({ open, onClose, records, config, onDelete }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [dismissed, setDismissed] = useState(new Set()); // group indices ο χρήστης τα έκρινε "Διαφορετικά"
  const [resolved, setResolved] = useState(new Set());   // group indices ο χρήστης τα έκρινε "Διπλότυπα"

  const allGroups = useMemo(
    () => (records && config ? findAllDuplicateGroups(records, config) : []),
    [records, config]
  );

  const visibleGroups = useMemo(
    () => allGroups.map((g, i) => ({ g, i })).filter(({ i }) => !dismissed.has(i) && !resolved.has(i)),
    [allGroups, dismissed, resolved]
  );

  const toggle = (id) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleGroup = (group) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      const allSelected = group.every((r) => n.has(r.id));
      if (allSelected) group.forEach((r) => n.delete(r.id));
      else group.forEach((r) => n.add(r.id));
      return n;
    });

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Διαγραφή ${selectedIds.size} επιλεγμένων εγγραφών;`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => onDelete(id)));
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (id) => {
    setDeleting(true);
    try {
      await onDelete(id);
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } finally {
      setDeleting(false);
    }
  };

  // Accept-group-as-duplicates: κράτα 1 (keeper), διέγραψε τα υπόλοιπα.
  const handleAcceptDuplicates = async (groupIdx, group) => {
    const keeper = pickKeeper(group, config);
    const toRemove = group.filter((r) => r.id !== keeper.id);
    if (toRemove.length === 0) return;
    if (!window.confirm(`Αυτό θεωρείται διπλότυπο. Κράτηση 1 (${(keeper[config.keyFields[0]] || keeper[config.dateField] || "").toString().slice(0, 40)}) και διαγραφή ${toRemove.length} εγγραφών;`)) return;
    setDeleting(true);
    try {
      await Promise.all(toRemove.map((r) => onDelete(r.id)));
      setResolved((prev) => new Set(prev).add(groupIdx));
    } finally {
      setDeleting(false);
    }
  };

  // Dismiss group → ο χρήστης έκρινε πως είναι ΔΙΑΦΟΡΕΤΙΚΕΣ εγγραφές.
  const handleDismiss = (groupIdx) =>
    setDismissed((prev) => new Set(prev).add(groupIdx));

  const allRecordsInGroups = visibleGroups.flatMap(({ g }) => g);
  const allSelected =
    allRecordsInGroups.length > 0 && allRecordsInGroups.every((r) => selectedIds.has(r.id));

  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(allRecordsInGroups.map((r) => r.id)));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" /> Έλεγχος Διπλοτύπων
          </DialogTitle>
        </DialogHeader>

        {!records ? (
          <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Φόρτωση...
          </div>
        ) : allGroups.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Δεν εντοπίστηκαν διπλότυπες εγγραφές 🎉</p>
        ) : (
          <>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                Επιλογή όλων
              </label>
              <span className="text-xs text-gray-400">
                {visibleGroups.length}/{allGroups.length} ομάδες{selectedIds.size > 0 && ` · ${selectedIds.size} επιλεγμένα`}
                {dismissed.size > 0 && ` · ${dismissed.size} αγνοήθηκαν`}
                {resolved.size > 0 && ` · ${resolved.size} λύθηκαν`}
              </span>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto">
              {visibleGroups.map(({ g: group, i: gi }) => {
                const allGroupSelected = group.every((r) => selectedIds.has(r.id));
                const common = commonFieldsOf(group, config);
                const differing = recordFieldsOutOfSync(group, config);
                return (
                  <div key={gi} className="border rounded-lg p-3 bg-amber-50/30">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-700">
                        <Checkbox checked={allGroupSelected} onCheckedChange={() => toggleGroup(group)} />
                        Ομάδα {gi + 1} — {group.length} εγγραφές
                      </label>
                      <div className="flex flex-wrap items-center gap-1 justify-end">
                        {common.length > 0 && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                            κοινά: {common.map(fieldLabel).join(", ")}
                          </span>
                        )}
                        {differing.length > 0 && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            διαφέρουν: {differing.map(fieldLabel).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {group.map((r) => {
                        const primary = config.keyFields
                          .map((f) => r[f])
                          .filter(Boolean)
                          .join(" / ");
                        const isKeeper = pickKeeper(group, config).id === r.id;
                        return (
                          <div
                            key={r.id}
                            className={`flex items-start gap-2 bg-white rounded p-2 text-sm border transition-colors ${
                              selectedIds.has(r.id) ? "border-red-300 bg-red-50/30" : "border-gray-100"
                            }`}
                          >
                            <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggle(r.id)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-800 break-words whitespace-normal">
                                {primary || "—"} {isKeeper && <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 ml-1">προτεινόμενο κράτημα</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 break-words whitespace-normal">
                                {r[config.dateField] ? format(new Date(r[config.dateField]), "dd/MM/yyyy") : "—"}
                                {" · "}
                                {fmt(Number(r[config.amountField]) || 0)}
                                {r.reconciled === true && <span className="ml-1 text-[10px] text-emerald-600">✓ αντικρ.</span>}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 shrink-0"
                              disabled={deleting}
                              onClick={() => handleDeleteOne(r.id)}
                            >
                              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Κρίση ομάδας */}
                    <div className="flex flex-wrap items-center justify-end gap-1.5 mt-2 pt-2 border-t border-amber-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={deleting}
                        onClick={() => handleDismiss(gi)}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Διαφορετικά (αγνόηση)
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        disabled={deleting}
                        onClick={() => handleAcceptDuplicates(gi, group)}
                      >
                        {deleting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                        Διπλότυπο — κράτα 1
                      </Button>
                    </div>
                  </div>
                );
              })}

              {visibleGroups.length === 0 && (
                <p className="text-center text-gray-400 py-6 text-sm">
                  Όλες οι ομάδες λύθηκαν ή αγνοήθηκαν 🎉
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs text-gray-500">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              «Διπλότυπο — κράτα 1» διατηρεί την προτεινόμενη εγγραφή και διαγράφει τις υπόλοιπες.
            </div>
          </>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button
            variant="destructive"
            disabled={selectedIds.size === 0 || deleting}
            onClick={handleDeleteSelected}
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Διαγραφή επιλεγμένων{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
          <Button variant="outline" onClick={onClose}>Κλείσιμο</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}