import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Undo2, Save, Check, Loader2 } from "lucide-react";
import { subscribe, undo, peek, onAfterUndo } from "@/lib/undoHistory";
import { useToast } from "@/components/ui/use-toast";

export default function GlobalActionsBar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => subscribe(setCount), []);
  useEffect(
    () =>
      onAfterUndo(() => {
        queryClient.invalidateQueries();
      }),
    [queryClient]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries();
    } finally {
      setSaving(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
    toast({ title: "Αποθηκεύτηκαν όλες οι αλλαγές" });
  };

  const handleUndo = () => {
    undo();
  };

  const lastLabel = peek()?.label;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 print:hidden">
      <button
        onClick={handleUndo}
        disabled={count === 0}
        title={count > 0 ? `Αναίρεση${lastLabel ? ": " + lastLabel : ""}` : "Δεν υπάρχουν ενέργειες για αναίρεση"}
        className={`flex items-center gap-1.5 pl-3 pr-2.5 h-10 rounded-full shadow-lg text-sm font-medium transition border ${
          count === 0
            ? "bg-white text-gray-300 border-gray-200 cursor-not-allowed"
            : "bg-[#1e3a5f] text-white border-transparent hover:bg-[#152a45]"
        }`}
      >
        <Undo2 className="w-4 h-4" />
        <span>Αναίρεση</span>
        {count > 0 && (
          <span className="ml-0.5 min-w-[18px] text-center bg-white/20 rounded-full px-1.5 text-xs font-bold">
            {count}
          </span>
        )}
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 h-10 rounded-full shadow-lg text-sm font-medium bg-white text-[#1e3a5f] border border-gray-200 hover:bg-gray-50 disabled:opacity-60 transition"
      >
        {justSaved ? (
          <Check className="w-4 h-4 text-emerald-600" />
        ) : saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        <span>{justSaved ? "Αποθηκεύτηκε" : "Αποθήκευση"}</span>
      </button>
    </div>
  );
}