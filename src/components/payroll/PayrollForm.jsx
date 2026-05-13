import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Calculator, Users } from "lucide-react";
import EmployeePicker from "./EmployeePicker";

const periodTypes = [
  { value: "regular", label: "Κανονικές Αποδοχές" },
  { value: "christmas_bonus", label: "Δώρο Χριστουγέννων" },
  { value: "easter_bonus", label: "Δώρο Πάσχα" },
  { value: "vacation_allowance", label: "Επίδομα Αδείας" },
  { value: "other", label: "Άλλο" },
];

const defaultForm = {
  payroll_type: "operational",
  project_id: "",
  project_name: "",
  employee_name: "",
  employee_afm: "",
  employee_amka: "",
  specialty: "",
  contract_type: "ΕΘΝΙΚΗ ΣΥΛΛΟΓΙΚΗ ΣΥΜΒΑΣΗ ΕΡΓΑΣΙΑΣ",
  period: "",
  period_type: "regular",
  payment_date: "",
  basic_salary: "",
  gross_salary: "",
  ika_etam: "",
  efka_contribution: "",
  total_insurance_deductions: "",
  income_tax: "",
  net_salary: "",
  advance_payment: 0,
  final_payment: "",
  insurance_days: "",
  apd_insurance_days: "",
  working_days: "",
  employer_insurance_amount: "",
  payment_source: "",
  bank_name: "",
  bank_account: "",
  notes: "",
};

export default function PayrollForm({ record, open, onClose, onSubmit }) {
  const [form, setForm] = useState(defaultForm);
  const [uploadingApd, setUploadingApd] = useState(false);
  const [uploadingPayslip, setUploadingPayslip] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [apdFileName, setApdFileName] = useState("");
  const [payslipFileName, setPayslipFileName] = useState("");

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["payment-sources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => base44.entities.Project.list("name"),
  });

  useEffect(() => {
    if (record) {
      setForm({ ...defaultForm, ...record });
      if (record.apd_file_url) setApdFileName("Αρχείο ΑΠΔ ανεβασμένο");
      if (record.payslip_file_url) setPayslipFileName("Απόδειξη ανεβασμένη");
    } else {
      setForm(defaultForm);
      setApdFileName("");
      setPayslipFileName("");
    }
  }, [record, open]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleProjectChange = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    setForm(prev => ({ ...prev, project_id: projectId, project_name: proj?.name || "" }));
  };

  const autoCalcDeductions = () => {
    const ika = parseFloat(form.ika_etam) || 0;
    const efka = parseFloat(form.efka_contribution) || 0;
    const total = ika + efka;
    const gross = parseFloat(form.gross_salary) || 0;
    const tax = parseFloat(form.income_tax) || 0;
    const net = gross - total - tax;
    const advance = parseFloat(form.advance_payment) || 0;
    setForm(prev => ({
      ...prev,
      total_insurance_deductions: total.toFixed(2),
      net_salary: net.toFixed(2),
      final_payment: (net - advance).toFixed(2),
    }));
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === "apd") setUploadingApd(true);
    else setUploadingPayslip(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (type === "apd") {
      setForm(prev => ({ ...prev, apd_file_url: file_url }));
      setApdFileName(file.name);
      setUploadingApd(false);
    } else {
      setForm(prev => ({ ...prev, payslip_file_url: file_url }));
      setPayslipFileName(file.name);
      setUploadingPayslip(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v === "") return;
      const numFields = ["basic_salary","gross_salary","ika_etam","efka_contribution","total_insurance_deductions","income_tax","net_salary","advance_payment","final_payment","insurance_days","apd_insurance_days","working_days","employer_insurance_amount"];
      clean[k] = numFields.includes(k) ? parseFloat(v) || 0 : v;
    });
    onSubmit(clean);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? "Επεξεργασία Μισθοδοσίας" : "Νέα Εγγραφή Μισθοδοσίας"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Τύπος Μισθοδοσίας (Έργο ή Λειτουργικό) */}
          <div>
            <h3 className="font-semibold text-[#1e3a5f] mb-3 text-sm uppercase tracking-wide">Τύπος Εγγραφής</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ value: "operational", label: "Λειτουργικό" }, { value: "project", label: "Έργο" }].map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, payroll_type: t.value, project_id: "", project_name: "" }))}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.payroll_type === t.value
                      ? t.value === "operational"
                        ? "bg-orange-100 border-orange-300 text-orange-800"
                        : "bg-blue-100 border-blue-300 text-blue-800"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            {form.payroll_type === "project" && (
              <div>
                <Label>Έργο</Label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none mt-1"
                  value={form.project_id} onChange={e => handleProjectChange(e.target.value)}>
                  <option value="">Επιλέξτε έργο...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Στοιχεία Εργαζομένου */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#1e3a5f] text-sm uppercase tracking-wide">Στοιχεία Εργαζομένου</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEmployeePicker(true)}>
                <Users className="w-3.5 h-3.5 mr-1" /> Επιλογή από λίστα
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Ονοματεπώνυμο *</Label>
                <Input value={form.employee_name} onChange={e => set("employee_name", e.target.value)} required />
              </div>
              <div>
                <Label>ΑΦΜ</Label>
                <Input value={form.employee_afm} onChange={e => set("employee_afm", e.target.value)} />
              </div>
              <div>
                <Label>ΑΜΚΑ</Label>
                <Input value={form.employee_amka} onChange={e => set("employee_amka", e.target.value)} />
              </div>
              <div>
                <Label>Ειδικότητα</Label>
                <Input value={form.specialty} onChange={e => set("specialty", e.target.value)} />
              </div>
              <div>
                <Label>Σύμβαση</Label>
                <Input value={form.contract_type} onChange={e => set("contract_type", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Στοιχεία Περιόδου */}
          <div>
            <h3 className="font-semibold text-[#1e3a5f] mb-3 text-sm uppercase tracking-wide">Στοιχεία Περιόδου</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Περίοδος *</Label>
                <Input placeholder="π.χ. Δεκέμβριος 2025" value={form.period} onChange={e => set("period", e.target.value)} required />
              </div>
              <div>
                <Label>Τύπος Μισθοδοσίας</Label>
                <Select value={form.period_type} onValueChange={v => set("period_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {periodTypes.map(pt => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ημερομηνία Πληρωμής *</Label>
                <Input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} required />
              </div>
              <div>
                <Label>Βασικός Μισθός (€)</Label>
                <Input type="number" step="0.01" value={form.basic_salary} onChange={e => set("basic_salary", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Αποδοχές & Κρατήσεις */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#1e3a5f] text-sm uppercase tracking-wide">Αποδοχές & Κρατήσεις</h3>
              <Button type="button" variant="outline" size="sm" onClick={autoCalcDeductions}>
                <Calculator className="w-3.5 h-3.5 mr-1" />
                Αυτόματος Υπολογισμός
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Σύνολο Αποδοχών Περιόδου (€)</Label>
                <Input type="number" step="0.01" value={form.gross_salary} onChange={e => set("gross_salary", e.target.value)} />
              </div>
              <div>
                <Label>101 - ΙΚΑ ΜΙΚΤΑ / ΕΤΑΜ (€)</Label>
                <Input type="number" step="0.01" value={form.ika_etam} onChange={e => set("ika_etam", e.target.value)} />
              </div>
              <div>
                <Label>2694 - Πόρος υπέρ e-ΕΦΚΑ (€)</Label>
                <Input type="number" step="0.01" value={form.efka_contribution} onChange={e => set("efka_contribution", e.target.value)} />
              </div>
              <div>
                <Label>Σύνολο Ασφαλιστικών Κρατήσεων (€)</Label>
                <Input type="number" step="0.01" value={form.total_insurance_deductions} onChange={e => set("total_insurance_deductions", e.target.value)} className="bg-gray-50" />
              </div>
              <div>
                <Label>Κρατήσεις ΦΜΥ (€)</Label>
                <Input type="number" step="0.01" value={form.income_tax} onChange={e => set("income_tax", e.target.value)} />
              </div>
              <div>
                <Label>Πληρωτέες Αποδοχές / Καθαρές (€) *</Label>
                <Input type="number" step="0.01" value={form.net_salary} onChange={e => set("net_salary", e.target.value)} className="font-semibold" required />
              </div>
              <div>
                <Label>Προκαταβολή (€)</Label>
                <Input type="number" step="0.01" value={form.advance_payment} onChange={e => set("advance_payment", e.target.value)} />
              </div>
              <div>
                <Label>Υπόλοιπο Πληρωτέων (€)</Label>
                <Input type="number" step="0.01" value={form.final_payment} onChange={e => set("final_payment", e.target.value)} className="bg-gray-50" />
              </div>
              <div>
                <Label>Εισφορές Εργοδότη (€)</Label>
                <Input type="number" step="0.01" value={form.employer_insurance_amount} onChange={e => set("employer_insurance_amount", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Ημέρες */}
          <div>
            <h3 className="font-semibold text-[#1e3a5f] mb-3 text-sm uppercase tracking-wide">Ημέρες</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Ημέρες Ασφάλισης</Label>
                <Input type="number" value={form.insurance_days} onChange={e => set("insurance_days", e.target.value)} />
              </div>
              <div>
                <Label>Ημέρες ΑΠΔ</Label>
                <Input type="number" value={form.apd_insurance_days} onChange={e => set("apd_insurance_days", e.target.value)} />
              </div>
              <div>
                <Label>Ημέρες Παρουσίας</Label>
                <Input type="number" value={form.working_days} onChange={e => set("working_days", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Πληρωμή */}
          <div>
            <h3 className="font-semibold text-[#1e3a5f] mb-3 text-sm uppercase tracking-wide">Στοιχεία Πληρωμής</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Πηγή Πληρωμής</Label>
                <Select value={form.payment_source} onValueChange={v => set("payment_source", v)}>
                  <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                  <SelectContent>
                    {paymentSources.map(ps => <SelectItem key={ps.id} value={ps.name}>{ps.name}</SelectItem>)}
                    <SelectItem value="cash">Μετρητά</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Τράπεζα</Label>
                <Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Αριθμός Λογαριασμού (IBAN)</Label>
                <Input value={form.bank_account} onChange={e => set("bank_account", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Αρχεία */}
          <div>
            <h3 className="font-semibold text-[#1e3a5f] mb-3 text-sm uppercase tracking-wide">Αρχεία</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Αρχείο ΑΠΔ (PDF)</Label>
                <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-[#1e3a5f] transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 truncate">
                    {uploadingApd ? "Ανέβασμα..." : apdFileName || "Επιλέξτε αρχείο ΑΠΔ"}
                  </span>
                  <input type="file" accept=".pdf" className="hidden" onChange={e => handleFileUpload(e, "apd")} disabled={uploadingApd} />
                </label>
              </div>
              <div>
                <Label>Απόδειξη Πληρωμής (PDF)</Label>
                <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-[#1e3a5f] transition-colors">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 truncate">
                    {uploadingPayslip ? "Ανέβασμα..." : payslipFileName || "Επιλέξτε αρχείο"}
                  </span>
                  <input type="file" accept=".pdf" className="hidden" onChange={e => handleFileUpload(e, "payslip")} disabled={uploadingPayslip} />
                </label>
              </div>
            </div>
          </div>

          <div>
            <Label>Σημειώσεις</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>

          <EmployeePicker
            open={showEmployeePicker}
            onClose={() => setShowEmployeePicker(false)}
            onSelect={(emp) => {
              setForm(prev => ({
                ...prev,
                employee_name: emp.employee_name || prev.employee_name,
                employee_afm: emp.employee_afm || prev.employee_afm,
                employee_amka: emp.employee_amka || prev.employee_amka,
                specialty: emp.specialty || prev.specialty,
                contract_type: emp.contract_type || prev.contract_type,
                bank_name: emp.bank_name || prev.bank_name,
                bank_account: emp.bank_account || prev.bank_account,
                basic_salary: emp.basic_salary != null ? emp.basic_salary : prev.basic_salary,
              }));
            }}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Ακύρωση</Button>
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
              {record ? "Αποθήκευση" : "Δημιουργία"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}