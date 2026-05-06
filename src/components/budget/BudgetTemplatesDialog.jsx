import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, BookOpen } from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount || 0);

export default function BudgetTemplatesDialog({ open, onClose, onApply }) {
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["budget-templates"],
    queryFn: () => base44.entities.BudgetTemplate.list("name"),
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-templates"] }),
  });

  const categoryColors = {
    labor: "bg-blue-100 text-blue-700",
    subcontractor: "bg-purple-100 text-purple-700",
    materials: "bg-amber-100 text-amber-700",
    equipment: "bg-orange-100 text-orange-700",
    general_expenses: "bg-gray-100 text-gray-700",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1e3a5f] flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Πρότυπα Budget
          </DialogTitle>
        </DialogHeader>

        {templates.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Δεν υπάρχουν πρότυπα ακόμα.</p>
            <p className="text-sm mt-1">Αποθηκεύστε ένα budget item ως πρότυπο για να εμφανιστεί εδώ.</p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{t.name}</span>
                    <Badge className={`${categoryColors[t.category] || "bg-gray-100 text-gray-700"} border-0 text-xs`}>
                      {t.category?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Badge>
                    {t.subcategory && (
                      <Badge variant="outline" className="text-xs">{t.subcategory}</Badge>
                    )}
                  </div>
                  {t.description && <p className="text-sm text-gray-500 truncate">{t.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {t.unit && <span>Μονάδα: {t.unit}</span>}
                    {t.unit_cost > 0 && <span>Τιμή: {formatCurrency(t.unit_cost)}/μον.</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => onApply(t)}
                    className="bg-[#1e3a5f] hover:bg-[#152a45]"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Χρήση
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { if (window.confirm("Διαγραφή προτύπου;")) deleteMutation.mutate(t.id); }}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Κλείσιμο</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}