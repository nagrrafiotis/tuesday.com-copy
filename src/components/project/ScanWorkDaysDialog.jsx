import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, FileText } from "lucide-react";

export default function ScanWorkDaysDialog({ projectId, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | scanning | done | error
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkDaysReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-days-reports", projectId] });
      setStatus("done");
    },
  });

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") setFile(f);
  };

  const handleScan = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setStatus("scanning");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Εξήγαγε τα δεδομένα από αυτό το "Σημείωμα Ημερών Εργασίας Έργου" του e-ΕΦΚΑ. 
Επέστρεψε JSON με:
- date: ημερομηνία εγγράφου (YYYY-MM-DD)
- protocol_number: αριθμός πρωτοκόλλου
- project_registry_number: ΑΜ Οικοδομικού Έργου
- project_owner: Κύριος Έργου
- total_work_days: συνολικές ημέρες εργασίας (αριθμός)
- phases: πίνακας με τις φάσεις, κάθε φάση έχει: code, description, building_type, work_days, reduction, final_work_days`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          date: { type: "string" },
          protocol_number: { type: "string" },
          project_registry_number: { type: "string" },
          project_owner: { type: "string" },
          total_work_days: { type: "number" },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                description: { type: "string" },
                building_type: { type: "string" },
                work_days: { type: "number" },
                reduction: { type: "number" },
                final_work_days: { type: "number" }
              }
            }
          }
        }
      }
    });

    setExtracted({ ...result, project_id: projectId, file_url });
    setStatus("preview");
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync(extracted);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Σάρωση Σημειώματος Ημερών Εργασίας ΕΦΚΑ</DialogTitle>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[#1e3a5f] transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              <FileText className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500 text-sm text-center">
                {file ? file.name : "Κάνε κλικ ή σύρε εδώ το PDF του ΕΦΚΑ"}
              </p>
              {file && <p className="text-xs text-emerald-600 font-medium">✓ Αρχείο επιλέγηκε</p>}
            </div>
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleScan} disabled={!file}>
                <Upload className="w-4 h-4 mr-2" /> Σάρωση με AI
              </Button>
            </div>
          </div>
        )}

        {(status === "uploading" || status === "scanning") && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-10 h-10 text-[#1e3a5f] animate-spin" />
            <p className="text-gray-600">{status === "uploading" ? "Ανέβασμα αρχείου..." : "Ανάλυση με AI..."}</p>
          </div>
        )}

        {status === "preview" && extracted && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Ημερομηνία:</span> <span className="font-medium">{extracted.date}</span></div>
              <div><span className="text-gray-500">Αρ. Πρωτ.:</span> <span className="font-medium">{extracted.protocol_number}</span></div>
              <div><span className="text-gray-500">ΑΜ Έργου:</span> <span className="font-medium">{extracted.project_registry_number}</span></div>
              <div><span className="text-gray-500">Κύριος Έργου:</span> <span className="font-medium">{extracted.project_owner}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Σύνολο Ημερών:</span> <span className="font-bold text-[#1e3a5f] text-lg ml-2">{extracted.total_work_days}</span></div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Κωδ.</th>
                    <th className="px-3 py-2 text-left">Περιγραφή</th>
                    <th className="px-3 py-2 text-right">Ημέρες</th>
                    <th className="px-3 py-2 text-right">Μείωση</th>
                    <th className="px-3 py-2 text-right">Τελικές</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(extracted.phases || []).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{p.code}</td>
                      <td className="px-3 py-2 text-gray-700">{p.description}</td>
                      <td className="px-3 py-2 text-right">{p.work_days}</td>
                      <td className="px-3 py-2 text-right text-red-500">{p.reduction || 0}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#1e3a5f]">{p.final_work_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={handleSave}>
                Αποθήκευση
              </Button>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="text-gray-700 font-medium">Τα δεδομένα αποθηκεύτηκαν!</p>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={onClose}>Κλείσιμο</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}