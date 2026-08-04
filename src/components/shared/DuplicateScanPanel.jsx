import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Copy, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { findAllDuplicateGroups } from "@/lib/duplicateDetector";

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

export default function DuplicateScanPanel({ open, onClose, records, config, onDelete }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const groups = useMemo(
    () => (records && config ? findAllDuplicateGroups(records, config) : []),
    [records, config]
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

  const allRecordsInGroups = groups.flat();
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
        ) : groups.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Δεν εντοπίστηκαν διπλότυπες εγγραφές 🎉</p>
        ) : (
          <>
            {/* Select all row */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                Επιλογή όλων
              </label>
              <span className="text-xs text-gray-400">
                {selectedIds.size > 0 && `${selectedIds.size} επιλεγμένα`}
              </span>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto">
              {groups.map((group, gi) => {
                const allGroupSelected = group.every((r) => selectedIds.has(r.id));
                return (
                  <div key={gi} className="border rounded-lg p-3 bg-amber-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-700">
                        <Checkbox
                          checked={allGroupSelected}
                          onCheckedChange={() => toggleGroup(group)}
                        />
                        Ομάδα {gi + 1} — {group.length} εγγραφές
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      {group.map((r) => {
                        const primary = config.keyFields
                          .map((f) => r[f])
                          .filter(Boolean)
                          .join(" / ");
                        return (
                          <div
                            key={r.id}
                            className={`flex items-start gap-2 bg-white rounded p-2 text-sm border transition-colors ${
                              selectedIds.has(r.id)
                                ? "border-red-300 bg-red-50/30"
                                : "border-gray-100"
                            }`}
                          >
                            <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggle(r.id)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-800 break-words whitespace-normal">
                                {primary || "—"}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 break-words whitespace-normal">
                                {r[config.dateField]
                                  ? format(new Date(r[config.dateField]), "dd/MM/yyyy")
                                  : "—"}
                                {" · "}
                                {fmt(Number(r[config.amountField]) || 0)}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 shrink-0"
                              disabled={deleting}
                              onClick={() => handleDeleteOne(r.id)}
                            >
                              {deleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs text-gray-500">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Μην διαγράψεις όλες τις εγγραφής μιας ομάδας — κράτα τουλάχιστον μία.
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