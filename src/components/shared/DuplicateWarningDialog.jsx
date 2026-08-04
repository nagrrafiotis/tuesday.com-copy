import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

export default function DuplicateWarningDialog({ open, matches, config, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" /> Πιθανό Διπλότυπο
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Βρέθηκαν <b>{matches.length}</b> υπάρχουσες εγγραφές με ίδιο ποσό και ημερομηνία ή ίδιο ποσό και κωδικό περιγραφής. Θέλεις να συνεχίσεις;
          </p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {matches.map((m) => (
              <div key={m.id} className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-gray-800 truncate">
                    {config.keyFields.map((f) => m[f]).filter(Boolean).join(" / ") || "—"}
                  </span>
                  <span className="font-semibold text-gray-700 tabular-nums shrink-0">
                    {fmt(Number(m[config.amountField]) || 0)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {m[config.dateField] ? format(new Date(m[config.dateField]), "dd/MM/yyyy") : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={onConfirm}>
            Αποθήκευση ούτως ή άλλως
          </Button>
          <Button variant="outline" onClick={onCancel}>Ακύρωση</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}