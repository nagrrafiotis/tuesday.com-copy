import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle, FileText } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

export default function ScanContributionsDialog({ projectId, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [extracted, setExtracted] = useState(null);
  const inputRef = useRef();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.MonthlyContribution.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-contributions", projectId] });
      setStatus("done");
    },
  });

  const handleFile = (f) => {
    if (f) setFile(f);
  };

  const handleScan = async () => {
    if (!file) return;
    setStatus("uploading");

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStatus("scanning");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Διάβασε αυτό το PDF αρχείο ασφαλιστικών εισφορών (ΕΦΚΑ/ΙΚΑ) και εξήγαγε τα εξής δεδομένα:
- month: ο μήνας αναφοράς (π.χ. "Ιανουάριος 2025")
- employer_amount: συνολικές εργοδοτικές εισφορές σε ευρώ (αριθμός)
- employee_amount: συνολικές ασφαλιστικές εισφορές εργαζομένου σε ευρώ (αριθμός)
- total_amount: συνολικό ποσό εισφορών (αριθμός)
- num_stamps: αριθμός ενσήμων (ημερομισθίων) — συνήθως εμφανίζεται ως "Ημέρες Ασφάλισης" ή "Ένσημα" ή παρόμοιο πεδίο (αριθμός)
- notes: οποιαδήποτε χρήσιμη πληροφορία (π.χ. ΑΜΕ, αριθμός εργαζομένων κλπ)`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          month: { type: "string" },
          employer_amount: { type: "number" },
          employee_amount: { type: "number" },
          total_amount: { type: "number" },
          num_stamps: { type: "number" },
          notes: { type: "string" }
        }
      }
    });

    setExtracted({ ...result, project_id: projectId, file_url });
    setStatus("preview");
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync(extracted);
  };

  const update = (field, val) => setExtracted(e => ({ ...e, [field]: val }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Σάρωση PDF Εισφορών ΕΦΚΑ</DialogTitle>
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
                {file ? file.name : "Κάνε κλικ ή σύρε εδώ το PDF εισφορών"}
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
            <p className="text-gray-600">{status === "uploading" ? "Ανέβασμα αρχείου..." : "Ανάλυση εισφορών..."}</p>
          </div>
        )}

        {status === "preview" && extracted && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Μήνας</label>
                <Input value={extracted.month || ""} onChange={e => update("month", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Εργοδοτικές εισφορές (€)</label>
                  <Input type="number" value={extracted.employer_amount || ""} onChange={e => update("employer_amount", parseFloat(e.target.value) || 0)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Εισφορές εργαζόμενου (€)</label>
                  <Input type="number" value={extracted.employee_amount || ""} onChange={e => update("employee_amount", parseFloat(e.target.value) || 0)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Αρ. Ενσήμων</label>
                <Input type="number" value={extracted.num_stamps || ""} onChange={e => update("num_stamps", parseFloat(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Σύνολο (€)</label>
                <Input type="number" value={extracted.total_amount || ""} onChange={e => update("total_amount", parseFloat(e.target.value) || 0)} className="mt-1" />
              </div>
              {extracted.notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{extracted.notes}</div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSave}>Αποθήκευση</Button>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="text-gray-700 font-medium">Αποθηκεύτηκε!</p>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={onClose}>Κλείσιμο</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}