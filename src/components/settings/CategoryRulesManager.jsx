import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Zap, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORY_OPTIONS = [
  { value: "labor", label: "Εργατικά", color: "bg-blue-100 text-blue-700" },
  { value: "subcontractor", label: "Υπεργολάβοι", color: "bg-purple-100 text-purple-700" },
  { value: "materials", label: "Υλικά", color: "bg-amber-100 text-amber-700" },
  { value: "equipment", label: "Εξοπλισμός", color: "bg-orange-100 text-orange-700" },
  { value: "general_expenses", label: "Γενικά Έξοδα", color: "bg-gray-100 text-gray-700" },
];

const DEFAULT_RULES = [
  { keyword: "ημερομίσθιο", category: "labor" },
  { keyword: "εργατικά", category: "labor" },
  { keyword: "μισθός", category: "labor" },
  { keyword: "αμοιβή", category: "labor" },
  { keyword: "τσιμέντο", category: "materials" },
  { keyword: "σίδερο", category: "materials" },
  { keyword: "τούβλο", category: "materials" },
  { keyword: "ξυλεία", category: "materials" },
  { keyword: "χρώμα", category: "materials" },
  { keyword: "ηλεκτρολόγος", category: "subcontractor" },
  { keyword: "υδραυλικός", category: "subcontractor" },
  { keyword: "αλουμίνιο", category: "subcontractor" },
  { keyword: "σοβάς", category: "subcontractor" },
  { keyword: "μηχάνημα", category: "equipment" },
  { keyword: "εκσκαφέας", category: "equipment" },
  { keyword: "γερανός", category: "equipment" },
  { keyword: "ενοικίαση", category: "equipment" },
  { keyword: "ασφάλεια", category: "general_expenses" },
  { keyword: "άδεια", category: "general_expenses" },
  { keyword: "λογιστής", category: "general_expenses" },
];

export default function CategoryRulesManager() {
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState({ keyword: "", category: "general_expenses", subcategory: "" });
  const [filter, setFilter] = useState("");

  const { data: rules = [] } = useQuery({
    queryKey: ["category-rules"],
    queryFn: () => base44.entities.CategoryRule.list("-priority"),
    staleTime: 60000,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list("name"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CategoryRule.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["category-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoryRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["category-rules"] }),
  });

  const handleAdd = async () => {
    if (!newRule.keyword.trim()) return;
    await createMutation.mutateAsync({
      keyword: newRule.keyword.trim(),
      category: newRule.category,
      subcategory: newRule.subcategory || "",
      priority: 0,
    });
    setNewRule({ keyword: "", category: "general_expenses", subcategory: "" });
  };

  const handleLoadDefaults = async () => {
    if (!window.confirm(`Θα προστεθούν ${DEFAULT_RULES.length} προεπιλεγμένοι κανόνες. Συνέχεια;`)) return;
    await Promise.all(DEFAULT_RULES.map(r => createMutation.mutateAsync({ ...r, priority: 0 })));
  };

  const filteredRules = rules.filter(r =>
    !filter || r.keyword?.toLowerCase().includes(filter.toLowerCase()) || r.category?.includes(filter.toLowerCase())
  );

  const getCategoryStyle = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat) || CATEGORY_OPTIONS[4];

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#c9a962]" />
            <div>
              <CardTitle className="text-lg text-[#1e3a5f]">Κανόνες Αυτόματης Κατηγοριοποίησης</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Αν η περιγραφή/δικαιούχος περιέχει τη λέξη-κλειδί, η κατηγορία συμπληρώνεται αυτόματα
              </p>
            </div>
          </div>
          {rules.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleLoadDefaults} className="border-[#c9a962] text-[#c9a962]">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Φόρτωση Προεπιλογών
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Add new rule */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
          <Input
            placeholder="Λέξη-κλειδί (π.χ. τσιμέντο, ηλεκτρολόγος...)"
            value={newRule.keyword}
            onChange={e => setNewRule(r => ({ ...r, keyword: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="flex-1 min-w-40 h-9 text-sm"
          />
          <Select value={newRule.category} onValueChange={v => setNewRule(r => ({ ...r, category: v }))}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newRule.subcategory || "_none"} onValueChange={v => setNewRule(r => ({ ...r, subcategory: v === "_none" ? "" : v }))}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="Υποκατηγορία" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Χωρίς υποκατ.</SelectItem>
              {subcategories.map(s => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!newRule.keyword.trim()} size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45] h-9">
            <Plus className="w-4 h-4 mr-1" />
            Προσθήκη
          </Button>
        </div>

        {/* Search */}
        {rules.length > 5 && (
          <Input
            placeholder="Αναζήτηση κανόνων..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="h-8 text-sm"
          />
        )}

        {/* Rules list */}
        {filteredRules.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Zap className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Δεν υπάρχουν κανόνες ακόμα.</p>
            <p className="text-xs mt-1">Προσθέστε κανόνες ή φορτώστε τις προεπιλογές.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {filteredRules.map(rule => {
              const catStyle = getCategoryStyle(rule.category);
              return (
                <div key={rule.id} className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-100 rounded-lg group hover:border-gray-200 transition-colors">
                  <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <span className="text-sm font-mono font-medium text-gray-800 flex-1 truncate">{rule.keyword}</span>
                  <span className="text-gray-300">→</span>
                  <Badge className={`${catStyle.color} border-0 text-xs shrink-0`}>{catStyle.label}</Badge>
                  {rule.subcategory && (
                    <span className="text-xs text-gray-400 shrink-0 max-w-[180px] truncate">{rule.subcategory}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(rule.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {rules.length > 0 && (
          <p className="text-xs text-gray-400">{rules.length} κανόνες · Εφαρμόζονται με σειρά προτεραιότητας</p>
        )}
      </CardContent>
    </Card>
  );
}