import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle, FileText, Trash2 } from "lucide-react";

export default function ScanEmployeesDialog({ projectId, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [employees, setEmployees] = useState([]);
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-scan-emp"],
    queryFn: () => base44.entities.Contact.list(),
  });
  const inputRef = useRef();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.InsuranceContribution.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-employees", projectId] });
      setStatus("done");
    },
  });

  const handleFile = (f) => { if (f) setFile(f); };

  const handleScan = async () => {
    if (!file) return;
    setStatus("uploading");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStatus("scanning");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Διάβασε αυτό το PDF αρχείο εισφορών / ενσήμων (ΕΦΚΑ/ΙΚΑ) και εξήγαγε τη λίστα εργαζομένων.
Για κάθε εργαζόμενο εξήγαγε:
- full_name: ονοματεπώνυμο
- work_phase: φάση εργασιών (αν αναφέρεται, αλλιώς κενό)
- work_month: μήνας εργασίας (π.χ. "Ιανουάριος 2025")
- num_stamps: αριθμός ενσήμων / ημερών ασφάλισης (αριθμός)
- salary_amount: ποσό μισθοδοσίας σε ευρώ (αριθμός)
- notes: οποιαδήποτε άλλη χρήσιμη πληροφορία`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          employees: {
            type: "array",
            items: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                work_phase: { type: "string" },
                work_month: { type: "string" },
                num_stamps: { type: "number" },
                salary_amount: { type: "number" },
                notes: { type: "string" }
              }
            }
          }
        }
      }
    });

    const list = (result?.employees || []).map(e => ({ ...e, project_id: projectId }));
    setEmployees(list);
    setStatus("preview");
  };

  const updateField = (idx, field, val) => {
    setEmployees(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  };

  const removeRow = (idx) => setEmployees(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    await saveMutation.mutateAsync(employees);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Σάρωση PDF Εργαζομένων / Ενσήμων</DialogTitle>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[#1e3a5f] transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              <FileText className="w-10 h-10 text-gray-300" />
              <p className="text-gray-500 text-sm text-center">
                {file ? file.name : "Κάνε κλικ ή σύρε εδώ το PDF εργαζομένων"}
              </p>
              {file && <p className="text-xs text-emerald-600 font-medium">✓ Αρχείο επιλέγηκε</p>}
            </div>
            <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleScan} disabled={!file}>
                <Upload className="w-4 h-4 mr-2" /> Ανάλυση με AI
              </Button>
            </div>
          </div>
        )}

        {(status === "uploading" || status === "scanning") && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-10 h-10 text-[#1e3a5f] animate-spin" />
            <p className="text-gray-600">{status === "uploading" ? "Ανέβασμα αρχείου..." : "Ανάλυση εργαζομένων..."}</p>
          </div>
        )}

        {status === "preview" && (
          <div className="space-y-4">
            {employees.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Δεν βρέθηκαν εγγραφές. Δοκίμασε διαφορετικό αρχείο.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-2 py-2 text-left">Ονοματεπώνυμο</th>
                      <th className="px-2 py-2 text-left">Δικαιούχος</th>
                      <th className="px-2 py-2 text-left">Μήνας</th>
                      <th className="px-2 py-2 text-right">Ένσημα</th>
                      <th className="px-2 py-2 text-right">Μισθός (€)</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-2">
                          <Input value={emp.full_name || ""} onChange={e => updateField(idx, "full_name", e.target.value)} className="h-7 text-xs" />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={emp.payee || ""}
                            onChange={e => updateField(idx, "payee", e.target.value)}
                            className="h-7 text-xs w-full rounded-md border border-input bg-transparent px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">—</option>
                            {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <Input value={emp.work_month || ""} onChange={e => updateField(idx, "work_month", e.target.value)} className="h-7 text-xs" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" value={emp.num_stamps || ""} onChange={e => updateField(idx, "num_stamps", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-right" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" value={emp.salary_amount || ""} onChange={e => updateField(idx, "salary_amount", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-right" />
                        </td>
                        <td className="px-2 py-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeRow(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSave} disabled={employees.length === 0}>
                Αποθήκευση {employees.length > 0 && `(${employees.length})`}
              </Button>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="text-gray-700 font-medium">Αποθηκεύτηκαν {employees.length} εγγραφές!</p>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={onClose}>Κλείσιμο</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}