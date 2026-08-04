import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { findAllDuplicateGroups } from "@/lib/duplicateDetector";

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

export default function DuplicateScanPanel({ open, onClose, records, config, onDelete }) {
  const [deletingId, setDeletingId] = useState(null);
  const groups = useMemo(
    () => (records && config ? findAllDuplicateGroups(records, config) : []),
    [records, config]
  );

  const handleDelete = async (id) => {
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" /> Έλεγχος Διπλοτύπων
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {!records ? (
            <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Φόρτωση...
            </div>
          ) : groups.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Δεν εντοπίστηκαν διπλότυπες εγγραφές 🎉</p>
          ) : (
            groups.map((group, gi) => (
              <div key={gi} className="border rounded-lg p-3 bg-amber-50/30">
                <p className="text-xs font-medium text-amber-700 mb-2">
                  Ομάδα {gi + 1} — {group.length} εγγραφές
                </p>
                <div className="space-y-1.5">
                  {group.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-white rounded p-2 text-sm border border-gray-100">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 truncate">
                          {config.keyFields.map((f) => r[f]).filter(Boolean).join(" / ") || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r[config.dateField] ? format(new Date(r[config.dateField]), "dd/MM/yyyy") : "—"}
                          {" · "}
                          {fmt(Number(r[config.amountField]) || 0)}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 shrink-0"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                      >
                        {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-gray-400">{groups.length > 0 ? `${groups.length} ομάδες` : ""}</p>
          <Button variant="outline" onClick={onClose}>Κλείσιμο</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}