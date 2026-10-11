import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ItemListEditor from "@/components/meetings/ItemListEditor";

const empty = (projectId) => ({
  project_id: projectId || "",
  title: "",
  date: new Date().toISOString().split("T")[0],
  time: "",
  location: "",
  participants: [],
  topics: [],
  deliverables: [],
  decisions: [],
  notes: "",
});

export default function MeetingForm({ meeting, projects, defaultProjectId, users, open, onClose, onSubmit }) {
  const [data, setData] = useState(empty(defaultProjectId));
  const [participantsText, setParticipantsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = meeting ? { ...empty(), ...meeting } : empty(defaultProjectId || projects[0]?.id);
    setData(initial);
    setParticipantsText((initial.participants || []).join(", "));
  }, [open, meeting]);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const participants = participantsText.split(",").map((s) => s.trim()).filter(Boolean);
    await onSubmit({ ...data, participants });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting ? "Επεξεργασία πρωτοκόλλου" : "Νέο πρωτόκολλο συνάντησης"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Τίτλος *</Label>
              <Input required value={data.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div>
              <Label>Έργο *</Label>
              <Select value={data.project_id} onValueChange={(v) => set({ project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Έργο" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ημερομηνία *</Label>
                <Input type="date" required value={data.date || ""} onChange={(e) => set({ date: e.target.value })} />
              </div>
              <div>
                <Label>Ώρα</Label>
                <Input type="time" value={data.time || ""} onChange={(e) => set({ time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Τοποθεσία / Σύνδεσμος</Label>
              <Input value={data.location || ""} onChange={(e) => set({ location: e.target.value })} />
            </div>
            <div>
              <Label>Συμμετέχοντες (χωρισμένοι με κόμμα)</Label>
              <Input value={participantsText} onChange={(e) => setParticipantsText(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-base">Θέματα</Label>
            <ItemListEditor kind="topic" items={data.topics || []} onChange={(topics) => set({ topics })} addLabel="Προσθήκη θέματος" />
          </div>
          <div>
            <Label className="text-base">Παραδοτέα</Label>
            <ItemListEditor kind="action" users={users} items={data.deliverables || []} onChange={(deliverables) => set({ deliverables })} addLabel="Προσθήκη παραδοτέου" />
          </div>
          <div>
            <Label className="text-base">Αποφάσεις & χρονοδιαγράμματα</Label>
            <ItemListEditor kind="action" users={users} items={data.decisions || []} onChange={(decisions) => set({ decisions })} addLabel="Προσθήκη απόφασης" />
          </div>
          <div>
            <Label>Γενικές σημειώσεις</Label>
            <Textarea rows={3} value={data.notes || ""} onChange={(e) => set({ notes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Ακύρωση</Button>
            <Button type="submit" disabled={saving || !data.project_id} className="bg-[#1e3a5f] hover:bg-[#152a45]">
              {saving ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}