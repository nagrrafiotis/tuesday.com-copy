import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, ImageIcon, Loader2, CheckCircle2 } from "lucide-react";

const EXPENSE_CATEGORIES = [
  "Ενοίκιο", "Τηλέφωνο / Internet", "Ρεύμα / ΔΕΗ", "Ύδρευση", "Λογιστικές υπηρεσίες",
  "Νομικές υπηρεσίες", "Τεχνικές υπηρεσίες", "Γραφική ύλη / Αναλώσιμα", "Μεταφορικά",
  "Ταξιδιωτικά", "Διαφήμιση / Marketing", "Ασφάλειες", "Φόροι / Τέλη", "Τράπεζα / Προμήθειες",
  "Εξοπλισμός", "Λογισμικό / Συνδρομές", "Καύσιμα", "Συντήρηση", "Λοιπά"
];

const INCOME_CATEGORIES = [
  "Πωλήσεις", "Υπηρεσίες", "Ενοίκια", "Επενδύσεις", "Επιστροφές", "Λοιπά"
];

// mode: "expense" | "income"
export default function ScanExpenseIncomeDialog({ open, onClose, onSaved, mode = "expense" }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const isExpense = mode === "expense";
  const title = isExpense ? "Σάρωση Τιμολογίου Εξόδου" : "Σάρωση Τιμολογίου Εσόδου";

  const handleFile = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setResult(null);
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Ανάλυσε αυτό το τιμολόγιο και εξήγαγε τα εξής πεδία ως JSON:
- description: σύντομη περιγραφή (string)
- ${isExpense ? "payee" : "payer"}: ${isExpense ? "προμηθευτής/δικαιούχος" : "πελάτης/πληρωτής"} (string)
- invoice_number: αριθμός τιμολογίου (string ή null)
- date: ημερομηνία YYYY-MM-DD (string ή null)
- amount: συνολικό ποσό με ΦΠΑ (number)
- category: κατηγορία από τη λίστα [${isExpense ? EXPENSE_CATEGORIES.join(", ") : INCOME_CATEGORIES.join(", ")}]
- notes: επιπλέον σημειώσεις (string ή null)
Αν κάποιο πεδίο δεν υπάρχει, άφησε null.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          [isExpense ? "payee" : "payer"]: { type: "string" },
          invoice_number: { type: "string" },
          date: { type: "string" },
          amount: { type: "number" },
          category: { type: "string" },
          notes: { type: "string" }
        }
      }
    });
    setResult({ ...extracted, file_url });
    setScanning(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...result, amount: parseFloat(result.amount) || 0 };
    if (isExpense) {
      await base44.entities.GeneralExpense.create(data);
    } else {
      await base44.entities.GeneralIncome.create(data);
    }
    onSaved();
    handleClose();
    setSaving(false);
  };

  const handleClose = () => {
    setFile(null); setPreview(null); setResult(null); setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <ScanLine className="w-5 h-5" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Upload */}
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#1e3a5f]/40 transition-colors">
            {preview ? (
              <img src={preview} alt="Invoice" className="max-h-40 mx-auto rounded-lg object-contain" />
            ) : file ? (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <ScanLine className="w-10 h-10" />
                <p className="text-sm font-medium">{file.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon className="w-10 h-10" />
                <p className="text-sm">Κλικ για ανέβασμα τιμολογίου</p>
                <p className="text-xs">JPG, PNG, PDF</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {file && !result && (
            <Button onClick={handleScan} disabled={scanning} className="w-full bg-[#1e3a5f] hover:bg-[#152a45]">
              {scanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ανάλυση AI...</> : <><ScanLine className="w-4 h-4 mr-2" />Ανάλυση Τιμολογίου</>}
            </Button>
          )}

          {result && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" /> Εξαγωγή δεδομένων επιτυχής — Επαλήθευση
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
                <Input value={result.description || ""} onChange={e => setResult(r => ({ ...r, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{isExpense ? "Δικαιούχος" : "Πελάτης"}</label>
                  <Input value={result[isExpense ? "payee" : "payer"] || ""}
                    onChange={e => setResult(r => ({ ...r, [isExpense ? "payee" : "payer"]: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Αρ. Τιμολογίου</label>
                  <Input value={result.invoice_number || ""} onChange={e => setResult(r => ({ ...r, invoice_number: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ποσό (€)</label>
                  <Input type="number" step="0.01" value={result.amount || ""} onChange={e => setResult(r => ({ ...r, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία</label>
                  <Input type="date" value={result.date || ""} onChange={e => setResult(r => ({ ...r, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                  value={result.category || ""} onChange={e => setResult(r => ({ ...r, category: e.target.value }))}>
                  <option value="">Επιλέξτε...</option>
                  {(isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Αποθήκευση"}
                </Button>
                <Button variant="outline" onClick={handleClose}>Ακύρωση</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}