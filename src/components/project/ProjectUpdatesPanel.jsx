import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Flag, AlertCircle, Star, Bell } from "lucide-react";
import { format } from "date-fns";

const typeConfig = {
  general: { label: "Γενικό", color: "bg-blue-100 text-blue-700", icon: Flag },
  milestone: { label: "Ορόσημο", color: "bg-emerald-100 text-emerald-700", icon: Star },
  issue: { label: "Ζήτημα", color: "bg-red-100 text-red-700", icon: AlertCircle },
  reminder: { label: "Υπενθύμιση", color: "bg-amber-100 text-amber-700", icon: Bell },
};

function UpdateForm({ item, projectId, onClose, onSubmit }) {
  const [form, setForm] = useState({
    project_id: projectId,
    date: item?.date || new Date().toISOString().slice(0, 10),
    title: item?.title || "",
    description: item?.description || "",
    type: item?.type || "general",
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Επεξεργασία Ενημέρωσης" : "Νέα Ενημέρωση"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Τίτλος *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Ημερομηνία</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Τύπος</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                {Object.entries(typeConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Περιγραφή</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => onSubmit(form)} disabled={!form.title}>
              Αποθήκευση
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectUpdatesPanel({ projectId }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: updates = [] } = useQuery({
    queryKey: ["project-updates", projectId],
    queryFn: () => base44.entities.ProjectUpdate.filter({ project_id: projectId }, "-date"),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectUpdate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-updates", projectId] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectUpdate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-updates", projectId] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectUpdate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-updates", projectId] }),
  });

  const handleSubmit = async (data) => {
    if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Νέα Ενημέρωση
        </Button>
      </div>

      {updates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν ενημερώσεις ακόμα</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(u => {
            const cfg = typeConfig[u.type] || typeConfig.general;
            const Icon = cfg.icon;
            return (
              <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-4">
                <div className={`p-2 rounded-lg ${cfg.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{u.title}</span>
                    <Badge className={`${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
                    <span className="text-xs text-gray-400">{u.date ? format(new Date(u.date), "dd/MM/yyyy") : ""}</span>
                  </div>
                  {u.description && <p className="text-sm text-gray-500 mt-1">{u.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(u); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => window.confirm("Διαγραφή;") && deleteMutation.mutate(u.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <UpdateForm
          item={editing}
          projectId={projectId}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}