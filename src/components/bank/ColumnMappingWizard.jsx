import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileSpreadsheet, Wand2, Check, AlertCircle } from "lucide-react";
import { guessMappings, applyMapping, TARGET_FIELDS } from "@/lib/excelBankImport";
import { format } from "date-fns";

const NONE_VALUE = "__none__";
const eur = (n) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

export default function ColumnMappingWizard({ open, parsed, fileName, onClose, onConfirm }) {
  const headers = parsed?.headers || [];
  const [mapping, setMapping] = useState(() => guessMappings(headers));

  useEffect(() => {
    setMapping(guessMappings(headers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  const totalValid = useMemo(() => (parsed ? applyMapping(parsed, mapping).length : 0), [parsed, mapping]);
  const previewRows = useMemo(() => (parsed ? applyMapping(parsed, mapping).slice(0, 5) : []), [parsed, mapping]);

  const setField = (key, value) =>
    setMapping((prev) => ({ ...prev, [key]: value === NONE_VALUE ? -1 : Number(value) }));

  // Mutually exclusive: amount OR (debit + credit)
  useEffect(() => {
    setMapping((prev) => {
      const next = { ...prev };
      if (next.amount >= 0 && (next.debit >= 0 || next.credit >= 0)) {
        // amount just set → clear debit/credit (handled below by user choice)
      }
      return next;
    });
  }, []);

  const onPick = (key, value) => {
    setMapping((prev) => {
      const next = { ...prev, [key]: value === NONE_VALUE ? -1 : Number(value) };
      if (key === "amount" && next.amount >= 0) { next.debit = -1; next.credit = -1; }
      if ((key === "debit" || key === "credit") && next[key] >= 0) next.amount = -1;
      return next;
    });
  };

  const amountMode = mapping.amount >= 0;
  const splitMode = mapping.debit >= 0 || mapping.credit >= 0;
  const canContinue =
    mapping.date >= 0 && totalValid > 0 && (amountMode || splitMode);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Έξυπνος Οδηγός Αντιστοίχισης Στηλών
          </DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="text-center py-10 text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Φόρτωση αρχείου...
          </div>
        ) : headers.length === 0 ? (
          <div className="text-center py-10 text-gray-500 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> Το αρχείο δεν περιέχει δεδομένα.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{fileName}</span>
              <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">Φύλλο: {parsed.sheetName}</span>
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{headers.length} στήλες / {parsed.allRows.length} γραμμές</span>
              <Button size="sm" variant="outline" onClick={() => setMapping(guessMappings(headers))}>
                <Wand2 className="w-3.5 h-3.5 mr-1" /> Αυτόματη αναγνώριση
              </Button>
            </div>

            {/* Mapping selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[38vh] overflow-y-auto pr-1">
              {TARGET_FIELDS.map((f) => {
                let disabled = false;
                let hint = null;
                if (f.key === "amount" && splitMode) { disabled = true; hint = "Χρησιμοποιούνται Χρέωση/Πίστωση"; }
                if ((f.key === "debit" || f.key === "credit") && amountMode) { disabled = true; hint = "Χρησιμοποιείται μονή στήλη Ποσού"; }
                return (
                  <div key={f.key} className={`border rounded p-2 ${disabled ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">{f.label}{f.required ? <span className="text-red-500 ml-1">*</span> : null}</label>
                      {hint && <span className="text-[10px] text-amber-600 truncate max-w-[55%]">{hint}</span>}
                    </div>
                    <Select
                      value={mapping[f.key] === undefined || mapping[f.key] < 0 ? NONE_VALUE : String(mapping[f.key])}
                      onValueChange={(v) => onPick(f.key, v)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full"><SelectValue placeholder="(παράλειψη)" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value={NONE_VALUE}>(παράλειψη)</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>{h || `Στήλη ${i + 1}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* Raw sample preview */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Δείγμα πρώτων γραμμών (ως όπως στο αρχείο):</div>
              <div className="border rounded overflow-auto max-h-40">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 border text-gray-400">#</th>
                      {headers.map((h, i) => (
                        <th key={i} className="px-2 py-1 border text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.sampleRows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 border text-gray-400 text-center">{i + 1}</td>
                        {headers.map((_, j) => (
                          <td key={j} className="px-2 py-1 border truncate max-w-[160px]" title={String(row[j] ?? "")}>
                            {String(row[j] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live preview of mapped transactions */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Προεπισκόπηση μορφοποιημένων κινήσεων (πρώτες 5):</div>
              <div className="border rounded overflow-x-auto">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 border text-left">Ημ/νία</th>
                      <th className="px-2 py-1 border text-left">Περιγραφή</th>
                      <th className="px-2 py-1 border text-left">Αντισ.</th>
                      <th className="px-2 py-1 border text-right">Ποσό</th>
                      <th className="px-2 py-1 border text-center">Τύπος</th>
                      <th className="px-2 py-1 border text-left">Αναφ.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-gray-400 py-2">Καμία έγκυρη κίνηση — έλεγξε τις αντιστοιχίσεις</td></tr>
                    ) : previewRows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 border whitespace-nowrap">{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}</td>
                        <td className="px-2 py-1 border truncate max-w-[220px]" title={r.description}>{r.description || "—"}</td>
                        <td className="px-2 py-1 border truncate max-w-[150px]" title={r.counterparty}>{r.counterparty || "—"}</td>
                        <td className={`px-2 py-1 border text-right font-semibold ${r.transaction_type === "debit" ? "text-red-600" : "text-green-600"}`}>{eur(r.amount)}</td>
                        <td className="px-2 py-1 border text-center">{r.transaction_type === "debit" ? "Χρέωση" : "Πίστωση"}</td>
                        <td className="px-2 py-1 border truncate max-w-[100px]">{r.reference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalValid > 0 && (
                <div className="text-xs text-gray-500 mt-1">Συνολικά <strong>{totalValid}</strong> έγκυρες κινήσεις με την τρέχουσα αντιστοίχιση.</div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                onClick={() => onConfirm(applyMapping(parsed, mapping))}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
                disabled={!canContinue}
              >
                <Check className="w-4 h-4 mr-1" /> Συνέχεια ({totalValid})
              </Button>
              <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}