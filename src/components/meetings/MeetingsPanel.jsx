import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import MeetingCard from "@/components/meetings/MeetingCard";
import MeetingForm from "@/components/meetings/MeetingForm";

export default function MeetingsPanel({ projects, users, projectFilter, search }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => base44.entities.Meeting.list("-date"),
    staleTime: 30000,
  });

  const { data: me } = useQuery({
    queryKey: ["current-user-meetings"],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["meetings"] });

  const saveMutation = useMutation({
    mutationFn: (data) => (editing ? base44.entities.Meeting.update(editing.id, data) : base44.entities.Meeting.create(data)),
    onSuccess: () => { refresh(); setShowForm(false); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Meeting.delete(id),
    onSuccess: refresh,
  });

  const projectName = (id) => projects.find((p) => p.id === id)?.name || "Άγνωστο έργο";

  const visible = meetings.filter((m) => {
    const okProject = projectFilter === "all" || m.project_id === projectFilter;
    const okSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
    return okProject && okSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
          disabled={projects.length === 0}
          className="bg-[#1e3a5f] hover:bg-[#152a45]"
        >
          <Plus className="w-4 h-4 mr-2" />Νέα συνάντηση
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-center py-10">Φόρτωση...</p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">Δεν υπάρχουν πρωτόκολλα συναντήσεων</h3>
          <p className="text-gray-500">Πάτα "Νέα συνάντηση" για να καταγράψεις θέματα, παραδοτέα και αποφάσεις</p>
        </div>
      ) : (
        visible.map((m) => (
          <MeetingCard
            key={m.id}
            meeting={m}
            projectName={projectName(m.project_id)}
            currentUserName={me?.full_name || me?.email || "Χρήστης"}
            onEdit={(meeting) => { setEditing(meeting); setShowForm(true); }}
            onDelete={(meeting) => window.confirm(`Διαγραφή συνάντησης "${meeting.title}";`) && deleteMutation.mutate(meeting.id)}
            onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
          />
        ))
      )}

      <MeetingForm
        meeting={editing}
        projects={projects}
        defaultProjectId={projectFilter !== "all" ? projectFilter : undefined}
        users={users}
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={(data) => saveMutation.mutateAsync(data)}
      />
    </div>
  );
}