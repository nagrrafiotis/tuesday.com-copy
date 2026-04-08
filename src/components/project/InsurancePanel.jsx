import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ShieldCheck, ScanLine, Users } from "lucide-react";
import { format } from "date-fns";
import ScanContributionsDialog from "./ScanContributionsDialog";

const fmt = (n) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

// ── Φόρμα εργαζόμενου ──────────────────────────────────────────
function EmployeeForm({ item, projectId, onClose, onSubmit }) {
  const [form, setForm] = useState({
    project_id: projectId,
    full_name: item?.full_name || "",
    work_phase: item?.work_phase || "",
    work_month: item?.work_month || "",
    num_stamps: item?.num_stamps || "",
    salary_amount: item?.salary_amount || "",
    notes: item?.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Επεξεργασία" : "Νέα Εγγραφή Εργαζόμενου"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Ονοματεπώνυμο *</label>
            <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} className="mt-1" placeholder="Όνομα Επώνυμο" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Φάση Εργασιών</label>
              <Input value={form.work_phase} onChange={e => set("work_phase", e.target.value)} className="mt-1" placeholder="π.χ. Σκελετός" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Μήνας Εργασίας *</label>
              <Input value={form.work_month} onChange={e => set("work_month", e.target.value)} className="mt-1" placeholder="π.χ. Ιαν 2025" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Αρ. Ενσήμων</label>
              <Input type="number" value={form.num_stamps} onChange={e => set("num_stamps", parseFloat(e.target.value) || "")} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ποσό Μισθοδοσίας (€)</label>
              <Input type="number" value={form.salary_amount} onChange={e => set("salary_amount", parseFloat(e.target.value) || "")} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Σημειώσεις</label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
            <Button
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
              onClick={() => onSubmit(form)}
              disabled={!form.full_name || !form.work_month}
            >
              Αποθήκευση
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Φόρμα μηνιαίων εισφορών (manual) ──────────────────────────
function ContributionForm({ item, projectId, onClose, onSubmit }) {
  const [form, setForm] = useState({
    project_id: projectId,
    month: item?.month || "",
    total_amount: item?.total_amount || "",
    num_stamps: item?.num_stamps || "",
    notes: item?.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Επεξεργασία Εισφορών" : "Νέες Εισφορές Μήνα"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Μήνας *</label>
            <Input value={form.month} onChange={e => set("month", e.target.value)} className="mt-1" placeholder="π.χ. Ιανουάριος 2025" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Σύνολο Εισφορών Εργοδότη (€)</label>
              <Input type="number" value={form.total_amount} onChange={e => set("total_amount", parseFloat(e.target.value) || "")} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Αρ. Ενσήμων</label>
              <Input type="number" value={form.num_stamps} onChange={e => set("num_stamps", parseFloat(e.target.value) || "")} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Σημειώσεις</label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => onSubmit(form)} disabled={!form.month}>
              Αποθήκευση
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Panel ──────────────────────────────────────────────────
export default function InsurancePanel({ projectId }) {
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [showContribForm, setShowContribForm] = useState(false);
  const [editingContrib, setEditingContrib] = useState(null);
  const [showScan, setShowScan] = useState(false);
  const queryClient = useQueryClient();

  // Employees query
  const { data: employees = [] } = useQuery({
    queryKey: ["insurance-employees", projectId],
    queryFn: () => base44.entities.InsuranceContribution.filter({ project_id: projectId }, "-created_date"),
    enabled: !!projectId,
  });

  // Monthly contributions query
  const { data: contributions = [] } = useQuery({
    queryKey: ["monthly-contributions", projectId],
    queryFn: () => base44.entities.MonthlyContribution.filter({ project_id: projectId }, "-created_date"),
    enabled: !!projectId,
  });

  // Employee mutations
  const createEmp = useMutation({
    mutationFn: (data) => base44.entities.InsuranceContribution.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance-employees", projectId] }); setShowEmpForm(false); setEditingEmp(null); },
  });
  const updateEmp = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InsuranceContribution.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance-employees", projectId] }); setShowEmpForm(false); setEditingEmp(null); },
  });
  const deleteEmp = useMutation({
    mutationFn: (id) => base44.entities.InsuranceContribution.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insurance-employees", projectId] }),
  });

  // Contribution mutations
  const createContrib = useMutation({
    mutationFn: (data) => base44.entities.MonthlyContribution.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["monthly-contributions", projectId] }); setShowContribForm(false); setEditingContrib(null); },
  });
  const updateContrib = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MonthlyContribution.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["monthly-contributions", projectId] }); setShowContribForm(false); setEditingContrib(null); },
  });
  const deleteContrib = useMutation({
    mutationFn: (id) => base44.entities.MonthlyContribution.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly-contributions", projectId] }),
  });

  const totalSalary = employees.reduce((s, e) => s + (e.salary_amount || 0), 0);
  const totalEmployer = contributions.reduce((s, c) => s + (c.employer_amount || 0), 0);
  const totalEmployee = contributions.reduce((s, c) => s + (c.employee_amount || 0), 0);

  return (
    <div className="space-y-8">

      {/* ── Λίστα 1: Εργαζόμενοι / Ένσημα ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1e3a5f]" />
            <h3 className="font-semibold text-gray-800">Εργαζόμενοι & Ένσημα</h3>
            {employees.length > 0 && (
              <span className="text-sm text-gray-500 ml-2">Σύνολο μισθοδοσίας: <span className="font-semibold text-[#1e3a5f]">{fmt(totalSalary)}</span></span>
            )}
          </div>
          <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => { setEditingEmp(null); setShowEmpForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Νέα Εγγραφή
          </Button>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Δεν υπάρχουν εγγραφές εργαζόμενων</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Ονοματεπώνυμο</th>
                  <th className="px-4 py-3 text-left">Φάση</th>
                  <th className="px-4 py-3 text-left">Μήνας</th>
                  <th className="px-4 py-3 text-right">Αρ. Ενσήμων</th>
                  <th className="px-4 py-3 text-right">Μισθοδοσία</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.work_phase || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.work_month}</td>
                    <td className="px-4 py-3 text-right font-mono">{emp.num_stamps ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#1e3a5f]">{emp.salary_amount ? fmt(emp.salary_amount) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingEmp(emp); setShowEmpForm(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => window.confirm("Διαγραφή;") && deleteEmp.mutate(emp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold text-sm">
                <tr>
                  <td className="px-4 py-3 text-gray-700" colSpan={3}>Σύνολο</td>
                  <td className="px-4 py-3 text-right font-mono text-[#1e3a5f]">{employees.reduce((s,e)=>s+(e.num_stamps||0),0)}</td>
                  <td className="px-4 py-3 text-right text-[#1e3a5f]">{fmt(totalSalary)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Λίστα 2: Εισφορές ανά μήνα ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1e3a5f]" />
            <h3 className="font-semibold text-gray-800">Εισφορές ανά Μήνα</h3>
            {contributions.length > 0 && (
              <span className="text-sm text-gray-500 ml-2">
                Σύνολο: <span className="font-semibold text-[#1e3a5f]">{fmt(contributions.reduce((s,c) => s+(c.total_amount||0),0))}</span>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowScan(true)}>
              <ScanLine className="w-4 h-4 mr-2" /> Σάρωση PDF
            </Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => { setEditingContrib(null); setShowContribForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Χειροκίνητη
            </Button>
          </div>
        </div>

        {contributions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Δεν υπάρχουν εισφορές — σάρωσε PDF ή πρόσθεσε χειροκίνητα</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Μήνας</th>
                  <th className="px-4 py-3 text-right">Σύνολο Εισφορών Εργοδότη (€)</th>
                  <th className="px-4 py-3 text-right">Αρ. Ενσήμων</th>
                  <th className="px-4 py-3 text-left">Σημ.</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contributions.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.month}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1e3a5f]">{c.total_amount ? fmt(c.total_amount) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{c.num_stamps ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{c.notes || ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingContrib(c); setShowContribForm(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => window.confirm("Διαγραφή;") && deleteContrib.mutate(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold text-sm">
                <tr>
                  <td className="px-4 py-3 text-gray-700">Σύνολο</td>
                  <td className="px-4 py-3 text-right text-[#1e3a5f]">{fmt(contributions.reduce((s,c)=>s+(c.total_amount||0),0))}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#1e3a5f]">{contributions.reduce((s,c)=>s+(c.num_stamps||0),0)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showEmpForm && (
        <EmployeeForm
          item={editingEmp}
          projectId={projectId}
          onClose={() => { setShowEmpForm(false); setEditingEmp(null); }}
          onSubmit={(data) => editingEmp ? updateEmp.mutate({ id: editingEmp.id, data }) : createEmp.mutate(data)}
        />
      )}

      {showContribForm && (
        <ContributionForm
          item={editingContrib}
          projectId={projectId}
          onClose={() => { setShowContribForm(false); setEditingContrib(null); }}
          onSubmit={(data) => editingContrib ? updateContrib.mutate({ id: editingContrib.id, data }) : createContrib.mutate(data)}
        />
      )}

      {showScan && <ScanContributionsDialog projectId={projectId} onClose={() => setShowScan(false)} />}
    </div>
  );
}