import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Plus } from "lucide-react";

const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Math.abs(n || 0));

const RECORD_TYPES = [
  { value: "general_expense", label: "Γενικό Έξοδο", direction: "debit" },
  { value: "general_income", label: "Γενικό Έσοδο", direction: "credit" },
  { value: "payroll", label: "Μισθοδοσία", direction: "debit" },
  { value: "project_expense", label: "Έξοδο Έργου", direction: "debit" },
  { value: "project_income", label: "Έσοδο Έργου", direction: "credit" },
];

export default function CreateRecordFromTxDialog({ tx, onCreated, onClose }) {
  // Pre-select type based on direction
  const defaultType = tx.transaction_type === "debit" ? "general_expense" : "general_income";
  const [recordType, setRecordType] = useState(defaultType);

  // Generic fields
  const [description, setDescription] = useState(tx.description || "");
  const [date, setDate] = useState(tx.date || "");
  const [amount, setAmount] = useState(Math.abs(tx.amount || 0).toString());
  const [paymentSource, setPaymentSource] = useState(tx.payment_source || "");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  // Expense/income specific
  const [payee, setPayee] = useState(tx.counterparty || "");
  const [payer, setPayer] = useState(tx.counterparty || "");

  // Payroll specific
  const [employeeName, setEmployeeName] = useState(tx.counterparty || "");
  const [period, setPeriod] = useState("");
  const [netSalary, setNetSalary] = useState(Math.abs(tx.amount || 0).toString());

  // Project
  const [projectId, setProjectId] = useState("");

  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["payment-sources"],
    queryFn: () => base44.entities.PaymentSource.list(),
  });

  const handleCreate = async () => {
    setSaving(true);
    let newRecord = null;
    let reconcileType = recordType;

    if (recordType === "general_expense") {
      newRecord = await base44.entities.GeneralExpense.create({
        description,
        date,
        amount: parseFloat(amount) || 0,
        payment_source: paymentSource,
        payee,
        category,
        notes,
        expense_type: "operational",
      });
    } else if (recordType === "general_income") {
      newRecord = await base44.entities.GeneralIncome.create({
        description,
        date,
        net_amount: parseFloat(amount) || 0,
        total_amount: parseFloat(amount) || 0,
        payment_source: paymentSource,
        payer,
        category,
        notes,
        income_type: "operational",
      });
    } else if (recordType === "payroll") {
      newRecord = await base44.entities.Payroll.create({
        employee_name: employeeName,
        period,
        payment_date: date,
        net_salary: parseFloat(netSalary) || 0,
        final_payment: parseFloat(netSalary) || 0,
        payment_source: paymentSource,
        notes,
        payroll_type: "operational",
      });
    } else if (recordType === "project_expense") {
      newRecord = await base44.entities.Expense.create({
        description,
        date,
        amount: parseFloat(amount) || 0,
        payment_source: paymentSource,
        payee,
        category: category || "general_expenses",
        project_id: projectId,
      });
      reconcileType = "project_expense";
    } else if (recordType === "project_income") {
      newRecord = await base44.entities.Income.create({
        description,
        date,
        amount: parseFloat(amount) || 0,
        payment_source: paymentSource,
        source: payer || description,
        category: "other",
        project_id: projectId,
      });
      reconcileType = "project_income";
    }

    if (newRecord) {
      onCreated(tx, {
        id: newRecord.id,
        type: reconcileType,
        label: RECORD_TYPES.find(t => t.value === reconcileType)?.label || reconcileType,
        description: description || employeeName,
      });
    }
    setSaving(false);
  };

  const needsProject = recordType === "project_expense" || recordType === "project_income";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <Plus className="w-5 h-5" /> Δημιουργία Εγγραφής από Κίνηση
          </DialogTitle>
        </DialogHeader>

        {/* Transaction summary */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium text-gray-800">{tx.description || "—"}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>{tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"}</span>
            <span className={tx.transaction_type === "debit" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
              {tx.transaction_type === "debit" ? "-" : "+"}{fmt(tx.amount)}
            </span>
            {tx.payment_source && <span>{tx.payment_source}</span>}
          </div>
        </div>

        <div className="space-y-3">
          {/* Record type */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος Εγγραφής *</label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECORD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Payroll fields */}
          {recordType === "payroll" ? (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Εργαζόμενος *</label>
                <Input value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="Ονοματεπώνυμο..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Περίοδος *</label>
                <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="π.χ. Μάιος 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ημ. Πληρωμής *</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Καθαρές Αποδοχές (€) *</label>
                  <Input type="number" step="0.01" value={netSalary} onChange={e => setNetSalary(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή *</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία *</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ποσό (€) *</label>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
              </div>
              {(recordType === "general_expense" || recordType === "project_expense") && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Δικαιούχος / Προμηθευτής</label>
                  <Input value={payee} onChange={e => setPayee(e.target.value)} placeholder="Όνομα..." />
                </div>
              )}
              {(recordType === "general_income" || recordType === "project_income") && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Πληρωτής / Πελάτης</label>
                  <Input value={payer} onChange={e => setPayer(e.target.value)} placeholder="Όνομα..." />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="π.χ. Ενοίκιο, Υλικά..." />
              </div>
            </>
          )}

          {/* Project selector for project types */}
          {needsProject && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Έργο *</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε έργο..." /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment source */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Τράπεζα / Λογαριασμός</label>
            <Input value={paymentSource} onChange={e => setPaymentSource(e.target.value)}
              placeholder="π.χ. Alpha Bank..." list="create-ps-list" />
            <datalist id="create-ps-list">
              {paymentSources.map(ps => <option key={ps.id} value={ps.name} />)}
            </datalist>
          </div>

          {recordType !== "payroll" && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Σημειώσεις</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]"
            disabled={saving || (recordType === "payroll" ? (!employeeName || !period || !date) : (!description || !date)) || (needsProject && !projectId)}
            onClick={handleCreate}
          >
            {saving ? "Δημιουργία..." : "Δημιουργία & Αντιστοίχιση"}
          </Button>
          <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}