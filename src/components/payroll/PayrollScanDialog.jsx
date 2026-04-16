import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

export default function PayrollScanDialog({ open, onClose, onExtracted }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Διάβασε αυτή την απόδειξη πληρωμής αποδοχών ελληνικής εταιρείας και εξήγαγε τα πεδία. 
      Επίστρεψε JSON με τα ακόλουθα πεδία:
      - employee_name: Ονοματεπώνυμο εργαζομένου
      - employee_afm: ΑΦΜ εργαζομένου
      - employee_amka: ΑΜΚΑ εργαζομένου
      - specialty: Ειδικότητα
      - period: Περίοδος (π.χ. "Δεκέμβριος 2025" ή "Δώρο Χριστουγέννων Δεκεμβρίου 2025")
      - period_type: Τύπος ("regular" για κανονικές, "christmas_bonus" για δώρο χριστουγέννων, "easter_bonus" για δώρο πάσχα, "vacation_allowance" για επίδομα αδείας, "other")
      - payment_date: Ημερομηνία πληρωμής (YYYY-MM-DD)
      - basic_salary: Βασικός μισθός (αριθμός)
      - gross_salary: Σύνολο αποδοχών (αριθμός)
      - ika_etam: ΙΚΑ ΜΙΚΤΑ ΕΤΑΜ 101 (αριθμός)
      - efka_contribution: Πόρος υπέρ e-ΕΦΚΑ 2694 (αριθμός)
      - total_insurance_deductions: Σύνολο ασφαλιστικών κρατήσεων (αριθμός)
      - income_tax: Κρατήσεις ΦΜΥ (αριθμός)
      - net_salary: Πληρωτέες αποδοχές (αριθμός)
      - advance_payment: Προκαταβολή (αριθμός, 0 αν δεν αναφέρεται)
      - final_payment: Υπόλοιπο πληρωτέων (αριθμός)
      - insurance_days: Ημέρες ασφάλισης (αριθμός)
      - apd_insurance_days: Ημέρες ασφάλισης ΑΠΔ (αριθμός)
      - working_days: Ημέρες παρουσίας (αριθμός)
      Αν κάποιο πεδίο δεν υπάρχει στο έγγραφο, άφησε null.`,
      model: "gpt_5_4",
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          employee_name: { type: "string" },
          employee_afm: { type: "string" },
          employee_amka: { type: "string" },
          specialty: { type: "string" },
          period: { type: "string" },
          period_type: { type: "string" },
          payment_date: { type: "string" },
          basic_salary: { type: "number" },
          gross_salary: { type: "number" },
          ika_etam: { type: "number" },
          efka_contribution: { type: "number" },
          total_insurance_deductions: { type: "number" },
          income_tax: { type: "number" },
          net_salary: { type: "number" },
          advance_payment: { type: "number" },
          final_payment: { type: "number" },
          insurance_days: { type: "number" },
          apd_insurance_days: { type: "number" },
          working_days: { type: "number" },
        }
      }
    });

    setResult({ ...extracted, payslip_file_url: file_url });
    setLoading(false);
  };

  const handleUse = () => {
    onExtracted(result);
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => { setFile(null); setResult(null); onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Σάρωση Απόδειξης Μισθοδοσίας</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-[#1e3a5f] transition-colors">
            <Upload className="w-8 h-8 text-gray-400" />
            <div className="text-center">
              <p className="font-medium text-gray-700">{file ? file.name : "Επιλέξτε PDF"}</p>
              <p className="text-sm text-gray-400">Απόδειξη πληρωμής αποδοχών</p>
            </div>
            <input type="file" accept=".pdf" className="hidden" onChange={e => { setFile(e.target.files?.[0]); setResult(null); }} />
          </label>

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Εξαγωγή δεδομένων επιτυχής
              </div>
              <p className="text-sm"><span className="font-medium">Εργαζόμενος:</span> {result.employee_name}</p>
              <p className="text-sm"><span className="font-medium">Περίοδος:</span> {result.period}</p>
              <p className="text-sm"><span className="font-medium">Καθαρές αποδοχές:</span> €{result.net_salary?.toFixed(2)}</p>
              <p className="text-sm"><span className="font-medium">Ασφαλιστικές κρατήσεις:</span> €{result.total_insurance_deductions?.toFixed(2)}</p>
            </div>
          )}

          <div className="flex gap-2">
            {!result ? (
              <Button
                onClick={handleScan}
                disabled={!file || loading}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ανάλυση...</> : "Ανάλυση PDF"}
              </Button>
            ) : (
              <Button onClick={handleUse} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Χρήση Δεδομένων
              </Button>
            )}
            <Button variant="outline" onClick={() => { setFile(null); setResult(null); onClose(); }}>
              Ακύρωση
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}