import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

/**
 * Generic editor for meeting items.
 * kind: "topic" (title + description) | "action" (description + owner + due date + done)
 */
export default function ItemListEditor({ kind, items, onChange, addLabel, users = [] }) {
  const update = (id, patch) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id) => onChange(items.filter((i) => i.id !== id));
  const add = () => onChange([...items, { id: crypto.randomUUID(), done: false }]);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2">
          {kind === "topic" ? (
            <>
              <Input placeholder="Θέμα" value={item.title || ""} onChange={(e) => update(item.id, { title: e.target.value })} />
              <Textarea placeholder="Περιγραφή θέματος" rows={2} value={item.description || ""} onChange={(e) => update(item.id, { description: e.target.value })} />
            </>
          ) : (
            <>
              <Textarea placeholder="Περιγραφή" rows={2} value={item.description || ""} onChange={(e) => update(item.id, { description: e.target.value })} />
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Input list="meeting-owners" placeholder="Υπεύθυνος" value={item.owner || ""} onChange={(e) => update(item.id, { owner: e.target.value })} className="sm:flex-1" />
                <Input type="date" value={item.due_date || ""} onChange={(e) => update(item.id, { due_date: e.target.value })} className="sm:w-44" />
                <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                  <Checkbox checked={!!item.done} onCheckedChange={(v) => update(item.id, { done: !!v })} />
                  Ολοκληρώθηκε
                </label>
              </div>
            </>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="text-red-600 h-7" onClick={() => remove(item.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Διαγραφή
            </Button>
          </div>
        </div>
      ))}
      {kind === "action" && (
        <datalist id="meeting-owners">
          {users.map((u) => <option key={u.id} value={u.full_name || u.email} />)}
        </datalist>
      )}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" />{addLabel}
      </Button>
    </div>
  );
}