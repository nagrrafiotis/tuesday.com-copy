import React from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import ExpenseForm from "@/components/expenses/ExpenseForm";

// Στέλνει εγγραφή ενσήμων/μισθοδοσίας ως πληρωμή (Expense) στο έργο
export default function SendToExpenseDialog({ emp, projectId, onClose }) {
  const queryClient = useQueryClient();

  const prefilled = {
    project_id: projectId,
    category: "labor",
    subcategory: emp.work_phase || "",
    payee: emp.payee || emp.full_name || "",
    description: `Μισθοδοσία ${emp.full_name || ""}${emp.work_month ? ` - ${emp.work_month}` : ""}`.trim(),
    date: new Date().toISOString(),
    amount: emp.salary_amount || "",
    payment_source: "",
  };

  const handleSubmit = async (data) => {
    await base44.entities.Expense.create(data);
    await base44.entities.InsuranceContribution.update(emp.id, { sent_to_expense: true });
    queryClient.invalidateQueries({ queryKey: ["insurance-employees", projectId] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["expenses", projectId] });
    onClose();
  };

  return (
    <ExpenseForm
      open
      expense={prefilled}
      projectId={projectId}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}