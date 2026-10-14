import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileCode, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { buildInteractiveReport, downloadHtml } from "@/lib/buildInteractiveReport";

// Reads the per-group notes the user typed in the budget table
const readGroupNotes = (projectId, budgetItems) => {
  const notes = {};
  const names = new Set(budgetItems.map((b) => (b.subcategory || "").trim()));
  names.forEach((n) => {
    const v = localStorage.getItem(`budget-group-note:${projectId}:${n}`);
    if (v) notes[n] = v;
  });
  return notes;
};

export default function ProjectPDFReport({ project, expenses = [], invoices = [], incomes = [], budgetItems = [] }) {
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    const html = buildInteractiveReport({
      project,
      expenses,
      invoices,
      incomes,
      budgetItems,
      notes: readGroupNotes(project.id, budgetItems),
    });
    downloadHtml(html, `${(project.name || "project").replace(/\s+/g, "_")}_report_${format(new Date(), "yyyyMMdd")}.html`);
    setLoading(false);
  };

  return (
    <Button
      onClick={generate}
      disabled={loading}
      variant="outline"
      className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Δημιουργία...</>
      ) : (
        <><FileCode className="w-4 h-4 mr-2" />HTML Αναφορά</>
      )}
    </Button>
  );
}