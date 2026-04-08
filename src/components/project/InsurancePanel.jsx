import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

const TYPES = ["ΙΚΑ", "ΤΣΜΕΔΕ", "ΕΦΚΑ", "Άλλο"];

const typeColors = {
  "ΙΚΑ": "bg-blue-100 text-blue-700",
  "ΤΣΜΕΔΕ": "bg-purple-100 text-purple-700",
  "ΕΦΚΑ": "bg-emerald-100 text-emerald-700",
  "Άλλο": "bg-gray-100 text-gray-700",
};

function InsuranceForm({ item, projectId, onClose, onSubmit }) {
  const [form, setForm] = useState({
    project_id: projectId,
    date: item?.date || new Date().toISOString().slice(0, 10),
    period: item?.period || "",
    type: item?.type || "ΙΚΑ",
    payee: item?.payee || "",
    amount: item?.amount || "",
    notes: item?.notes || "",
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Επεξεργασία Εισφοράς" : "Νέα Ασφαλιστική Εισφορά"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Ημερομηνία *</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Τύπος</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Περίοδος</label>
              <Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="π.χ. Ιαν 2025" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ποσό (€) *</label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || "" }))} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Δικαιούχος</label>
            <Input value={form.payee} onChange={e => setForm(f => ({ ...f, payee: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Σημειώσεις</label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => onSubmit(form)} disabled={!form.date || !form.amount}>
              Αποθήκευση
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const fmt = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

export default function InsurancePanel({ projectId }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["insurance", projectId],
    queryFn: () => base44.entities.InsuranceContribution.filter({ project_id: projectId }, "-date"),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InsuranceContribution.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance", projectId] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InsuranceContribution.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance", projectId] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InsuranceContribution.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insurance", projectId] }),
  });

  const handleSubmit = async (data) => {
    if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
  };

  const total = items.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {items.length > 0 && (
          <div className="text-sm text-gray-500">
            Σύνολο: <span className="font-semibold text-[#1e3a5f]">{fmt(total)}</span>
          </div>
        )}
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45] ml-auto" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Νέα Εισφορά
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν ασφαλιστικές εισφορές ακόμα</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Ημ/νία</th>
                <th className="px-4 py-3 text-left">Τύπος</th>
                <th className="px-4 py-3 text-left">Περίοδος</th>
                <th className="px-4 py-3 text-left">Δικαιούχος</th>
                <th className="px-4 py-3 text-right">Ποσό</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{item.date ? format(new Date(item.date), "dd/MM/yyyy") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${typeColors[item.type] || typeColors["Άλλο"]} border-0`}>{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.period || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{item.payee || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#1e3a5f]">{fmt(item.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(item); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => window.confirm("Διαγραφή;") && deleteMutation.mutate(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <InsuranceForm
          item={editing}
          projectId={projectId}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}