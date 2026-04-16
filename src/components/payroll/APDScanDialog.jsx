import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, ChevronDown, ChevronUp, Users } from "lucide-react";

const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

export default function APDScanDialog({ open, onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { period, employer, employees: [...] }
  const [expandedIndex, setExpandedIndex] = useState(null);

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Αυτό είναι PDF Αναλυτικής Περιοδικής Δήλωσης (ΑΠΔ) του e-ΕΦΚΑ. Το έγγραφο έχει πολλές σελίδες.
      
Σελίδα 1: Γενικά στοιχεία εργοδότη και σύνολα.
Επόμενες σελίδες: Μία ή περισσότερες εγγραφές ανά εργαζόμενο. Ο ίδιος εργαζόμενος μπορεί να εμφανίζεται σε πολλές σελίδες με διαφορετικό ΚΩΔΙΚΟ ΠΑΚΕΤΟΥ ΚΑΛΥΨΗΣ (π.χ. 101 για κύρια ασφάλιση, 2694 για εισφορά e-ΕΦΚΑ).

Διάβασε ΟΛΕΣ τις σελίδες και συγκέντρωσε τα στοιχεία ΑΝΑ ΕΡΓΑΖΟΜΕΝΟ (ομαδοποίησε κατά ΑΜΚΑ):
- Για κάθε εργαζόμενο άθροισε τις εισφορές από όλες τις εγγραφές του.
- Η εγγραφή με κωδικό 101 έχει τις κύριες εισφορές (ika_etam).
- Η εγγραφή με κωδικό 2694 έχει την εισφορά e-ΕΦΚΑ (efka_contribution).

Επίστρεψε JSON με:
- period: Περίοδος δήλωσης (π.χ. "Μάρτιος 2026")
- employer_name: Επωνυμία εργοδότη
- employer_ame: ΑΜΕ εργοδότη
- total_insurance_days: Συνολικές ημέρες ασφάλισης
- total_salary: Συνολικές αποδοχές
- total_contributions: Συνολικές εισφορές
- employees: πίνακας με στοιχεία ανά εργαζόμενο, κάθε στοιχείο περιέχει:
  - full_name: Επώνυμο + Όνομα
  - amka: ΑΜΚΑ
  - afm: ΑΦΜ εργαζόμενου
  - specialty_code: Κωδικός ειδικότητας (από εγγραφή 101)
  - insurance_days: Ημέρες ασφάλισης (από εγγραφή 101)
  - gross_salary: Αποδοχές (από εγγραφή 101)
  - employee_contributions_101: Εισφορές ασφαλισμένου εγγραφή 101
  - employer_contributions_101: Εισφορές εργοδότη εγγραφή 101
  - employee_contributions_2694: Εισφορές ασφαλισμένου εγγραφή 2694 (efka_contribution)
  - total_employee_contributions: Σύνολο εισφορών εργαζόμενου (101 + 2694)
  - total_employer_contributions: Σύνολο εισφορών εργοδότη
  - total_contributions: Συνολικές εισφορές εργαζόμενου
  - work_system: Σύστημα εργασίας (π.χ. Πενθήμερο)
  - from_date: Από ημ/νία απασχόλησης (YYYY-MM-DD)
  - to_date: Έως ημ/νία απασχόλησης (YYYY-MM-DD)`,
      model: "gemini_3_flash",
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          period: { type: "string" },
          employer_name: { type: "string" },
          employer_ame: { type: "string" },
          total_insurance_days: { type: "number" },
          total_salary: { type: "number" },
          total_contributions: { type: "number" },
          employees: {
            type: "array",
            items: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                amka: { type: "string" },
                afm: { type: "string" },
                specialty_code: { type: "string" },
                insurance_days: { type: "number" },
                gross_salary: { type: "number" },
                employee_contributions_101: { type: "number" },
                employer_contributions_101: { type: "number" },
                employee_contributions_2694: { type: "number" },
                total_employee_contributions: { type: "number" },
                total_employer_contributions: { type: "number" },
                total_contributions: { type: "number" },
                work_system: { type: "string" },
                from_date: { type: "string" },
                to_date: { type: "string" },
              }
            }
          }
        }
      }
    });

    setResult({ ...extracted, apd_file_url: file_url });
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!result?.employees?.length) return;
    
    for (const emp of result.employees) {
      await base44.entities.Payroll.create({
        employee_name: emp.full_name,
        employee_amka: emp.amka,
        employee_afm: emp.afm,
        specialty: emp.specialty_code,
        period: result.period,
        period_type: "regular",
        payment_date: emp.to_date || null,
        gross_salary: emp.gross_salary,
        ika_etam: emp.employee_contributions_101,
        efka_contribution: emp.employee_contributions_2694,
        total_insurance_deductions: emp.total_employee_contributions,
        net_salary: (emp.gross_salary || 0) - (emp.total_employee_contributions || 0),
        insurance_days: emp.insurance_days,
        apd_insurance_days: emp.insurance_days,
        employer_insurance_amount: emp.total_employer_contributions,
        apd_file_url: result.apd_file_url,
        notes: `ΑΠΔ ${result.period} | ΑΜΕ: ${result.employer_ame}`,
      });
    }

    onCreated?.();
    setFile(null);
    setResult(null);
    setExpandedIndex(null);
    onClose();
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setExpandedIndex(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Σάρωση ΑΠΔ (e-ΕΦΚΑ)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!result && (
            <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-[#1e3a5f] transition-colors">
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="font-medium text-gray-700">{file ? file.name : "Επιλέξτε PDF ΑΠΔ"}</p>
                <p className="text-sm text-gray-400">Αναλυτική Περιοδική Δήλωση e-ΕΦΚΑ</p>
              </div>
              <input type="file" accept=".pdf" className="hidden" onChange={e => { setFile(e.target.files?.[0]); setResult(null); }} />
            </label>
          )}

          {result && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  ΑΠΔ - {result.period}
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block">Εργοδότης</span>
                    <span className="font-medium text-gray-800 text-xs">{result.employer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Ημέρες Ασφάλισης</span>
                    <span className="font-medium text-gray-800">{result.total_insurance_days}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Συνολικές Εισφορές</span>
                    <span className="font-medium text-gray-800">{fmt(result.total_contributions)}</span>
                  </div>
                </div>
              </div>

              {/* Employees */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700 text-sm">{result.employees?.length} Εργαζόμενοι</span>
                </div>
                <div className="space-y-2">
                  {result.employees?.map((emp, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-xs font-bold text-[#1e3a5f]">
                            {emp.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{emp.full_name}</p>
                            <p className="text-xs text-gray-400">ΑΜΚΑ: {emp.amka} | {emp.insurance_days} ημέρες</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Αποδοχές</p>
                            <p className="font-semibold text-[#1e3a5f] text-sm">{fmt(emp.gross_salary)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Εισφορές</p>
                            <p className="font-semibold text-amber-600 text-sm">{fmt(emp.total_contributions)}</p>
                          </div>
                          {expandedIndex === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>

                      {expandedIndex === i && (
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div><span className="text-gray-400 text-xs block">ΑΦΜ</span><span>{emp.afm || "—"}</span></div>
                          <div><span className="text-gray-400 text-xs block">Κωδ. Ειδικότητας</span><span>{emp.specialty_code || "—"}</span></div>
                          <div><span className="text-gray-400 text-xs block">Σύστημα Εργασίας</span><span>{emp.work_system || "—"}</span></div>
                          <div><span className="text-gray-400 text-xs block">Από</span><span>{emp.from_date || "—"}</span></div>
                          <div><span className="text-gray-400 text-xs block">Έως</span><span>{emp.to_date || "—"}</span></div>
                          <div><span className="text-gray-400 text-xs block">Ημέρες Ασφάλισης</span><span>{emp.insurance_days}</span></div>
                          <div><span className="text-gray-400 text-xs block">Εισφ. Εργ/νου (101)</span><span className="text-amber-700">{fmt(emp.employee_contributions_101)}</span></div>
                          <div><span className="text-gray-400 text-xs block">Εισφ. e-ΕΦΚΑ (2694)</span><span className="text-amber-700">{fmt(emp.employee_contributions_2694)}</span></div>
                          <div><span className="text-gray-400 text-xs block">Εισφ. Εργοδότη</span><span className="text-purple-700">{fmt(emp.total_employer_contributions)}</span></div>
                          <div><span className="text-gray-400 text-xs block">Σύν. Εισφ. Εργ/νου</span><span className="font-semibold text-amber-700">{fmt(emp.total_employee_contributions)}</span></div>
                          <div><span className="text-gray-400 text-xs block">Συνολικές Εισφορές</span><span className="font-semibold">{fmt(emp.total_contributions)}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setResult(null); setFile(null); }}>
                Σάρωση νέου αρχείου
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            {!result ? (
              <Button onClick={handleScan} disabled={!file || loading} className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ανάλυση ΑΠΔ...</> : "Ανάλυση PDF"}
              </Button>
            ) : (
              <Button onClick={handleCreate} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Εισαγωγή {result.employees?.length} Εγγραφών
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>Ακύρωση</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}