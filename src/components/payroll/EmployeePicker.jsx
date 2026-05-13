import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Pencil, Trash2, UserCheck } from "lucide-react";

const defaultEmployee = {
  employee_name: "",
  employee_afm: "",
  employee_amka: "",
  specialty: "",
  contract_type: "ΕΘΝΙΚΗ ΣΥΛΛΟΓΙΚΗ ΣΥΜΒΑΣΗ ΕΡΓΑΣΙΑΣ",
  bank_name: "",
  bank_account: "",
  basic_salary: "",
  notes: "",
};

function EmployeeForm({ employee, onSubmit, onCancel }) {
  const [form, setForm] = useState(employee || defaultEmployee);
  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = { ...form };
    if (clean.basic_salary !== "") clean.basic_salary = parseFloat(clean.basic_salary) || 0;
    else delete clean.basic_salary;
    onSubmit(clean);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Ονοματεπώνυμο *</Label>
          <Input value={form.employee_name} onChange={e => set("employee_name", e.target.value)} required />
        </div>
        <div>
          <Label>ΑΦΜ</Label>
          <Input value={form.employee_afm} onChange={e => set("employee_afm", e.target.value)} />
        </div>
        <div>
          <Label>ΑΜΚΑ</Label>
          <Input value={form.employee_amka} onChange={e => set("employee_amka", e.target.value)} />
        </div>
        <div>
          <Label>Ειδικότητα</Label>
          <Input value={form.specialty} onChange={e => set("specialty", e.target.value)} />
        </div>
        <div>
          <Label>Σύμβαση</Label>
          <Input value={form.contract_type} onChange={e => set("contract_type", e.target.value)} />
        </div>
        <div>
          <Label>Τράπεζα</Label>
          <Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} />
        </div>
        <div>
          <Label>IBAN</Label>
          <Input value={form.bank_account} onChange={e => set("bank_account", e.target.value)} />
        </div>
        <div>
          <Label>Βασικός Μισθός (€)</Label>
          <Input type="number" step="0.01" value={form.basic_salary} onChange={e => set("basic_salary", e.target.value)} />
        </div>
        <div>
          <Label>Σημειώσεις</Label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Ακύρωση</Button>
        <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">Αποθήκευση</Button>
      </div>
    </form>
  );
}

export default function EmployeePicker({ open, onClose, onSelect }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("employee_name"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setEditingEmployee(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const filtered = employees.filter(e =>
    e.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_afm?.includes(search) ||
    e.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1e3a5f]">
            {editingEmployee ? "Επεξεργασία Μισθωτού" : showForm ? "Νέος Μισθωτός" : "Λίστα Μισθωτών"}
          </DialogTitle>
        </DialogHeader>

        {editingEmployee ? (
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={(data) => updateMutation.mutate({ id: editingEmployee.id, data })}
            onCancel={() => setEditingEmployee(null)}
          />
        ) : showForm ? (
          <EmployeeForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Αναζήτηση με όνομα, ΑΦΜ, ειδικότητα..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Νέος
              </Button>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>Δεν βρέθηκαν μισθωτοί.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {filtered.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{emp.employee_name}</p>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        {emp.employee_afm && <span className="text-xs text-gray-400">ΑΦΜ: {emp.employee_afm}</span>}
                        {emp.employee_amka && <span className="text-xs text-gray-400">ΑΜΚΑ: {emp.employee_amka}</span>}
                        {emp.specialty && <span className="text-xs text-gray-500">{emp.specialty}</span>}
                        {emp.basic_salary && <span className="text-xs text-[#1e3a5f] font-medium">{emp.basic_salary}€</span>}
                      </div>
                      {(emp.bank_name || emp.bank_account) && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {emp.bank_name}{emp.bank_name && emp.bank_account ? " · " : ""}{emp.bank_account}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onSelect && (
                        <Button size="sm" onClick={() => { onSelect(emp); onClose(); }}
                          className="bg-[#c9a962] hover:bg-[#b8954f] text-white h-8 text-xs gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Επιλογή
                        </Button>
                      )}
                      <button onClick={() => setEditingEmployee(emp)}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (window.confirm(`Διαγραφή ${emp.employee_name};`)) deleteMutation.mutate(emp.id); }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}