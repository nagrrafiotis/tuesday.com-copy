import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ArrowRightToLine, FileText, Eye, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import OfferFormDialog from "./OfferFormDialog";
import OfferViewDialog from "./OfferViewDialog";

const fmt = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

export default function OffersPanel({ projectId }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offers", projectId],
    queryFn: () => base44.entities.Offer.filter({ project_id: projectId }, "-date"),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Offer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["offers", projectId] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Offer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["offers", projectId] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Offer.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers", projectId] }),
  });
  const transferMutation = useMutation({
    mutationFn: async (offer) => {
      // Re-transfer: delete previous budget items created from this offer
      await base44.entities.BudgetItem.deleteMany({ project_id: projectId, source_offer_id: offer.id });
      const budgetItems = (offer.items || []).map((it) => ({
        project_id: projectId,
        source_offer_id: offer.id,
        category: it.category || "materials",
        subcategory: it.subcategory || "",
        description: it.description || "",
        quantity: Number(it.quantity) || 0,
        unit: it.unit || "",
        unit_cost: Number(it.unit_cost) || 0,
        total_cost: Number(it.total) || 0,
        notes: `Από προσφορά: ${offer.title}`,
      }));
      if (budgetItems.length) await base44.entities.BudgetItem.bulkCreate(budgetItems);
      await base44.entities.Offer.update(offer.id, { status: "transferred", transferred_date: new Date().toISOString().slice(0, 10) });
    },
    onSuccess: (_data, offer) => {
      queryClient.invalidateQueries({ queryKey: ["offers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] });
      const refresh = offer?.status === "transferred";
      toast({
        title: refresh ? "Ανανεώθηκε στο Budget" : "Μεταφέρθηκε στο Budget",
        description: refresh
          ? "Τα παλιά budget items διαγράφηκαν και δημιουργήθηκαν νέα από τα τρέχοντα στοιχεία."
          : "Τα στοιχεία της προσφοράς μπήκαν επίσημα στον προϋπολογισμό.",
      });
    },
    onError: (err) => toast({ title: "Σφάλμα", description: err?.message || "Αποτυχία μεταφοράς", variant: "destructive" }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); };
  const handleSubmit = async (data) => {
    if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
  };
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">Αρχείο προσφορών ανά έργο. Ανάλυση από αρχείο (PDF/Excel/Word) ή χειροκίνητα, και μεταφορά στον προϋπολογισμό.</p>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45]">
          <Plus className="w-4 h-4 mr-2" /> Νέα Προσφορά
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Φόρτωση...</div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Δεν υπάρχουν προσφορές</h3>
          <p className="text-gray-500 mb-4">Ανεβάστε μια προσφορά (PDF/Excel/Word) για αυτόματη ανάλυση ή καταχωρήστε χειροκίνητα.</p>
          <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]"><Plus className="w-4 h-4 mr-2" /> Νέα Προσφορά</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((o) => {
            const count = o.items?.length || 0;
            const transferred = o.status === "transferred";
            return (
              <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#1e3a5f] truncate">{o.title}</h3>
                      <Badge className={transferred ? "bg-emerald-100 text-emerald-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                        {transferred ? "Μεταφέρθηκε" : "Πρόχειρο"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{o.vendor || "—"}{o.offer_type ? ` · ${o.offer_type}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#1e3a5f] whitespace-nowrap">{fmt(o.total_amount)}</p>
                    <p className="text-xs text-gray-400">{count} γραμμές</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-400">
                  {o.date && <span>{format(new Date(o.date), "dd/MM/yyyy")}</span>}
                  {o.file_url && <a href={o.file_url} target="_blank" rel="noreferrer" className="text-[#1e3a5f] underline flex items-center gap-1"><FileText className="w-3 h-3" /> {o.file_name || "Αρχείο"}</a>}
                  {transferred && o.transferred_date && <span className="text-emerald-600">→ {format(new Date(o.transferred_date), "dd/MM/yy")}</span>}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Button size="sm" variant="outline" onClick={() => setViewing(o)}><Eye className="w-3.5 h-3.5 mr-1" /> Προβολή</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(o); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (window.confirm("Διαγραφή προσφοράς;")) deleteMutation.mutate(o.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  <div className="ml-auto">
                    {!transferred ? (
                      <Button size="sm" disabled={transferMutation.isPending} onClick={() => { if (window.confirm("Μεταφορά στο Budget; Θα δημιουργηθούν επίσημα budget items από τα στοιχεία της προσφοράς.")) transferMutation.mutate(o); }} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                        {transferMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ArrowRightToLine className="w-3.5 h-3.5 mr-1" />} Στο Budget
                      </Button>
                    ) : (
                      <Button size="sm" disabled={transferMutation.isPending} onClick={() => { if (window.confirm("Ανανέωση στο Budget; Θα διαγραφούν τα προηγούμενα budget items αυτής της προσφοράς και θα δημιουργηθούν νέα από τα τρέχοντα στοιχεία.")) transferMutation.mutate(o); }} className="bg-emerald-600 hover:bg-emerald-700">
                        {transferMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Ανανέωση
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OfferFormDialog offer={editing} projectId={projectId} open={showForm} onClose={closeForm} onSubmit={handleSubmit} saving={saving} />
      <OfferViewDialog offer={viewing} open={!!viewing} onClose={() => setViewing(null)} />
    </div>
  );
}