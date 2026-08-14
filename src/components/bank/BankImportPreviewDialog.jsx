import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, AlertCircle, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

export default function BankImportPreviewDialog({
  open,
  onClose,
  preview,
  paymentSources = [],
  existingSources = [],
  onConfirm,
  importing,
}) {
  const rows = preview?.rows || [];
  const [selected, setSelected] = useState(new Set());
  const [sources, setSources] = useState({});
  const [applyAll, setApplyAll] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const s = new Set();
    rows.forEach((r, i) => { if (!r._isDuplicate) s.add(i); });
    setSelected(s);
    setSources({});
    setApplyAll("");
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preview]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = rows.map((r, i) => ({ r, i }));
    if (!q) return all;
    return all.filter(({ r }) =>
      (r.description || "").toLowerCase().includes(q) ||
      (r.counterparty || "").toLowerCase().includes(q) ||
      (r.reference || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const freshRows = useMemo(() => rows.map((r, i) => ({ r, i })).filter(({ r }) => !r._isDuplicate), [rows]);
  const dupCount = rows.length - freshRows.length;

  const allFreshSelected =
    freshRows.length > 0 && freshRows.every(({ i }) => selected.has(i));

  const toggleAllFresh = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      const idxs = freshRows.map(({ i }) => i);
      if (idxs.every((i) => n.has(i))) idxs.forEach((i) => n.delete(i));
      else idxs.forEach((i) => n.add(i));
      return n;
    });
  };

  const toggle = (i) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  const applySourceToSelected = () => {
    if (!applyAll) return;
    setSources((prev) => {
      const n = { ...prev };
      selected.forEach((i) => { n[i] = applyAll; });
      return n;
    });
  };

  const setSourceForRow = (i, val) =>
    setSources((prev) => ({ ...prev, [i]: val }));

  const selectedFinal = useMemo(
    () => [...selected]
      .map((i) => ({ ...rows[i], payment_source: sources[i] || rows[i].payment_source || "" }))
      .filter(Boolean),
    [selected, sources, rows]
  );

  const sourceOptions = useMemo(
    () => [...new Set([...existingSources, ...paymentSources.map((p) => p.name)].filter(Boolean))],
    [existingSources, paymentSources]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Προεπισκόπηση Εισαγωγής
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Φόρτωση...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{preview.fileName}</span>
              <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">{rows.length} σύνολο</span>
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">{freshRows.length} νέες</span>
              {dupCount > 0 && <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">{dupCount} υπάρχουν ήδη</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Αναζήτηση περιγραφής / αντισυμβαλλομένου..."
                className="flex-1 min-w-[180px] h-8"
              />
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <Checkbox checked={allFreshSelected} onCheckedChange={toggleAllFresh} />
                Όλες οι νέες ({freshRows.length})
              </label>
              <div className="flex items-center gap-1">
                <Input
                  value={applyAll}
                  onChange={(e) => setApplyAll(e.target.value)}
                  placeholder="Πηγή για επιλεγμένες"
                  list="import-ps"
                  className="w-44 h-8"
                />
                <Button size="sm" variant="outline" onClick={applySourceToSelected} disabled={selected.size === 0 || !applyAll}>
                  Εφαρμογή
                </Button>
              </div>
            </div>

            <datalist id="import-ps">
              {sourceOptions.map((s) => <option key={s} value={s} />)}
            </datalist>

            <div className="border rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 w-8"></th>
                    <th className="px-2 py-2 text-left">Ημ/νία</th>
                    <th className="px-2 py-2 text-left">Περιγραφή</th>
                    <th className="px-2 py-2 text-left">Αντισυμβαλλόμενος</th>
                    <th className="px-2 py-2 text-right">Ποσό</th>
                    <th className="px-2 py-2 text-center">Τύπος</th>
                    <th className="px-2 py-2 text-left">Πηγή πληρωμής</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ r, i }) => (
                    <tr key={i} className={`border-t ${r._isDuplicate ? "bg-amber-50/60" : "hover:bg-gray-50/50"}`}>
                      <td className="px-2 py-1.5">
                        <Checkbox
                          checked={selected.has(i)}
                          onCheckedChange={() => toggle(i)}
                          disabled={r._isDuplicate}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                        {r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-gray-800">
                        <div className="truncate max-w-[280px]">{r.description || "—"}</div>
                        {r.reference && <div className="text-[10px] text-gray-400">ref: {r.reference}</div>}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 truncate max-w-[150px]">{r.counterparty || "—"}</td>
                      <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${r.transaction_type === "debit" ? "text-red-600" : "text-green-600"}`}>
                        {fmt(r.amount)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded ${r.transaction_type === "debit" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                          {r.transaction_type === "debit" ? "Χρέωση" : "Πίστωση"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={sources[i] || ""}
                          onChange={(e) => setSourceForRow(i, e.target.value)}
                          placeholder="—"
                          list="import-ps"
                          className="h-7 text-xs"
                          disabled={r._isDuplicate}
                        />
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-400 py-6">Καμία εγγραφή</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Οι πορτοκαλί σειρές υπάρχουν ήδη και παραλείπονται αυτόματα.
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                onClick={() => onConfirm(selectedFinal)}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
                disabled={selectedFinal.length === 0 || importing}
              >
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Εισαγωγή {selectedFinal.length} κινήσεων
              </Button>
              <Button variant="outline" onClick={onClose} disabled={importing}>Ακύρωση</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}