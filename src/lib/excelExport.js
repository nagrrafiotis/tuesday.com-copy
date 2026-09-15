import * as XLSX from "xlsx";
import { format } from "date-fns";

/**
 * Map an array of records to row objects using a column spec.
 * columns: [{ key: "field.path", label: "Header", format?: (val, record) => any }]
 */
export function buildRows(records, columns) {
  return (records || []).map(rec => {
    const row = {};
    columns.forEach(col => {
      const val = col.key.split(".").reduce((o, k) => (o == null ? o : o[k]), rec);
      row[col.label] = col.format ? col.format(val, rec) : (val ?? "");
    });
    return row;
  });
}

/** Export a single sheet to .xlsx */
export function exportSheet(records, columns, sheetName, fileName) {
  const rows = buildRows(records, columns);
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
}

/** Export multiple sheets to one .xlsx workbook.
 * sheets: [{ name, records, columns }]
 */
export function exportWorkbook(sheets, fileName) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const rows = buildRows(s.records, s.columns);
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, (s.name || "Sheet").slice(0, 31));
  });
  XLSX.writeFile(wb, fileName);
}

const fmtDate = v => (v ? format(new Date(v), "dd/MM/yyyy") : "");
const fmtMoney = v => (typeof v === "number" ? v : "");

// ── Column specs per entity ──
export const exportColumns = {
  payroll: [
    { key: "employee_name", label: "Εργαζόμενος" },
    { key: "period", label: "Περίοδος" },
    { key: "period_type", label: "Τύπος" },
    { key: "gross_salary", label: "Σύν. Αποδοχές", format: fmtMoney },
    { key: "total_insurance_deductions", label: "Κρατήσεις Εργαζομένου", format: fmtMoney },
    { key: "income_tax", label: "ΦΜΥ", format: fmtMoney },
    { key: "net_salary", label: "Καθαρές", format: fmtMoney },
    { key: "employer_insurance_amount", label: "Εισφορές Εργοδότη", format: fmtMoney },
    { key: "advance_payment", label: "Προκαταβολή", format: fmtMoney },
    { key: "final_payment", label: "Υπόλοιπο", format: fmtMoney },
    { key: "payment_source", label: "Πηγή Πληρωμής" },
    { key: "payment_date", label: "Ημ/νία Πληρωμής", format: fmtDate },
  ],
  generalExpenses: [
    { key: "description", label: "Περιγραφή" },
    { key: "expense_type", label: "Τύπος" },
    { key: "project_name", label: "Έργο" },
    { key: "category", label: "Κατηγορία" },
    { key: "payee", label: "Δικαιούχος" },
    { key: "partner", label: "Εταίρος (Cash)" },
    { key: "amount", label: "Ποσό (€)", format: fmtMoney },
    { key: "payment_source", label: "Πηγή Πληρωμής" },
    { key: "date", label: "Ημ/νία", format: fmtDate },
    { key: "notes", label: "Σημειώσεις" },
  ],
  generalIncome: [
    { key: "description", label: "Περιγραφή" },
    { key: "income_type", label: "Τύπος" },
    { key: "project_name", label: "Έργο" },
    { key: "category", label: "Κατηγορία" },
    { key: "payer", label: "Πελάτης/Πληρωτής" },
    { key: "invoice_number", label: "Αρ. Τιμολογίου" },
    { key: "net_amount", label: "Καθαρό (€)", format: fmtMoney },
    { key: "vat_amount", label: "ΦΠΑ (€)", format: fmtMoney },
    { key: "total_amount", label: "Σύνολο (€)", format: fmtMoney },
    { key: "payment_source", label: "Πηγή Πληρωμής" },
    { key: "date", label: "Ημ/νία", format: fmtDate },
  ],
  bankTransactions: [
    { key: "date", label: "Ημερομηνία", format: fmtDate },
    { key: "description", label: "Περιγραφή" },
    { key: "counterparty", label: "Αντισυμβαλλόμενος" },
    { key: "payment_source", label: "Τράπεζα/Λογαριασμός" },
    { key: "transaction_type", label: "Τύπος" },
    { key: "amount", label: "Ποσό (€)", format: fmtMoney },
    { key: "reference", label: "Αναφορά" },
    { key: "reconciled", label: "Αντιστοιχισμένο", format: v => (v ? "Ναι" : "Όχι") },
    { key: "reconciled_with", label: "Αντιστοιχίστηκε με" },
    { key: "reconciled_note", label: "Σημείωση Αντιστοίχισης" },
  ],
};