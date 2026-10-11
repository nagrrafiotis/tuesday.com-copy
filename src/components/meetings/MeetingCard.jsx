import React, { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, Pencil, Trash2, Send, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";

const fmt = (d) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

function ActionList({ title, items, onToggle }) {
  if (!items?.length) return null;
  const today = new Date().toISOString().split("T")[0];
  return (
    <div>
      <h4 className="text-sm font-semibold text-[#1e3a5f] mb-2">{title}</h4>
      <div className="space-y-1.5">
        {items.map((i) => {
          const overdue = !i.done && i.due_date && i.due_date < today;
          return (
            <div key={i.id} className="flex items-start gap-2 text-sm">
              <button type="button" onClick={() => onToggle(i.id)} className="mt-0.5">
                {i.done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
              </button>
              <div className="flex-1">
                <span className={i.done ? "line-through text-gray-400" : "text-gray-800"}>{i.description}</span>
                <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-500">
                  {i.owner && <span>👤 {i.owner}</span>}
                  {i.due_date && <span className={overdue ? "text-red-600 font-medium" : ""}>⏱ {fmt(i.due_date)}{overdue ? " (εκπρόθεσμο)" : ""}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MeetingCard({ meeting, projectName, currentUserName, onEdit, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  const toggle = (field) => (id) =>
    onUpdate(meeting.id, { [field]: meeting[field].map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });

  const addComment = async () => {
    if (!comment.trim()) return;
    const c = { id: crypto.randomUUID(), author: currentUserName, text: comment.trim(), created: new Date().toISOString() };
    await onUpdate(meeting.id, { comments: [...(meeting.comments || []), c] });
    setComment("");
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-lg text-[#1e3a5f]">{meeting.title}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmt(meeting.date)}{meeting.time ? ` ${meeting.time}` : ""}</span>
              {meeting.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{meeting.location}</span>}
              {meeting.participants?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{meeting.participants.join(", ")}</span>}
            </div>
            <Badge variant="outline" className="mt-2">{projectName}</Badge>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(meeting)}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => onDelete(meeting)}><Trash2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-5 space-y-5 border-t pt-4">
            {meeting.topics?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#1e3a5f] mb-2">Θέματα</h4>
                <ul className="space-y-1.5">
                  {meeting.topics.map((t) => (
                    <li key={t.id} className="text-sm">
                      <span className="font-medium text-gray-800">{t.title}</span>
                      {t.description && <p className="text-gray-600 whitespace-pre-wrap">{t.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ActionList title="Παραδοτέα" items={meeting.deliverables} onToggle={toggle("deliverables")} />
            <ActionList title="Αποφάσεις & χρονοδιαγράμματα" items={meeting.decisions} onToggle={toggle("decisions")} />
            {meeting.notes && (
              <div>
                <h4 className="text-sm font-semibold text-[#1e3a5f] mb-1">Σημειώσεις</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-[#1e3a5f] mb-2">Σχόλια ομάδας</h4>
              <div className="space-y-2 mb-3">
                {(meeting.comments || []).map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <div className="text-xs text-gray-500">{c.author} · {format(new Date(c.created), "dd/MM/yyyy HH:mm")}</div>
                    <p className="text-gray-800 whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Γράψε σχόλιο..." value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} />
                <Button onClick={addComment} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}