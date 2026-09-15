import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Trash2, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { format } from "date-fns";
import ScanWorkDaysDialog from "./ScanWorkDaysDialog";
import { useColumnWidths } from "@/hooks/useColumnWidths";
import ResizableHeader from "@/components/shared/ResizableHeader";

export default function WorkDaysPanel({ projectId }) {
  const [showScan, setShowScan] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();
  const { widths: wdW, setColumnWidth: setWdW, autoFitByHeader: wdFit } = useColumnWidths("workdays", { code: 100, description: 220, building: 150, days: 100, reduction: 100, final: 100 });

  const { data: reports = [] } = useQuery({
    queryKey: ["work-days-reports", projectId],
    queryFn: () => base44.entities.WorkDaysReport.filter({ project_id: projectId }, "-date"),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkDaysReport.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-days-reports", projectId] }),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => setShowScan(true)}>
          <ScanLine className="w-4 h-4 mr-2" /> Σάρωση PDF ΕΦΚΑ
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν σημειώματα ημερών εργασίας</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}
                    </span>
                    {r.protocol_number && (
                      <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Αρ. {r.protocol_number}</Badge>
                    )}
                    <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] border-0">
                      {r.total_work_days} ημέρες
                    </Badge>
                  </div>
                  {r.project_owner && <p className="text-xs text-gray-400 mt-0.5">{r.project_owner}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); window.confirm("Διαγραφή;") && deleteMutation.mutate(r.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {expanded === r.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expanded === r.id && r.phases?.length > 0 && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <ResizableHeader width={wdW.code} onResize={w => setWdW("code", w)} onAutoFit={() => wdFit("code")} dataColumn="code">Κωδ.</ResizableHeader>
                        <ResizableHeader width={wdW.description} onResize={w => setWdW("description", w)} onAutoFit={() => wdFit("description")} dataColumn="description">Περιγραφή</ResizableHeader>
                        <ResizableHeader width={wdW.building} onResize={w => setWdW("building", w)} onAutoFit={() => wdFit("building")} dataColumn="building">Είδος Κτιρίου</ResizableHeader>
                        <ResizableHeader width={wdW.days} onResize={w => setWdW("days", w)} onAutoFit={() => wdFit("days")} align="right" dataColumn="days">Ημέρες</ResizableHeader>
                        <ResizableHeader width={wdW.reduction} onResize={w => setWdW("reduction", w)} onAutoFit={() => wdFit("reduction")} align="right" dataColumn="reduction">Μείωση</ResizableHeader>
                        <ResizableHeader width={wdW.final} onResize={w => setWdW("final", w)} onAutoFit={() => wdFit("final")} align="right" dataColumn="final">Τελικές</ResizableHeader>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {r.phases.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500 font-mono">{p.code}</td>
                          <td className="px-4 py-2 text-gray-700">{p.description}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{p.building_type}</td>
                          <td className="px-4 py-2 text-right">{p.work_days}</td>
                          <td className="px-4 py-2 text-right text-red-400">{p.reduction || 0}</td>
                          <td className="px-4 py-2 text-right font-semibold text-[#1e3a5f]">{p.final_work_days}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={5} className="px-4 py-2 text-right text-gray-600">Σύνολο</td>
                        <td className="px-4 py-2 text-right text-[#1e3a5f]">{r.total_work_days}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showScan && (
        <ScanWorkDaysDialog projectId={projectId} onClose={() => setShowScan(false)} />
      )}
    </div>
  );
}