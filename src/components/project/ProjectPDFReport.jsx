import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { htmlToPdf, esc } from "@/lib/htmlToPdf";

const fmt = (v) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(v || 0);
const fd = (d) => (d ? format(new Date(d), "dd/MM/yy") : "—");

const categoryLabels = {
  labor: "Εργατικά",
  subcontractor: "Υπεργολάβοι",
  materials: "Υλικά",
  equipment: "Εξοπλισμός",
  general_expenses: "Γενικά Έξοδα",
};

const th = (label, align = "left") =>
  `<th style="text-align:${align};padding:6px 8px;font-size:11px;font-weight:700;color:#fff;">${esc(label)}</th>`;
const td = (v, align = "left", extra = "") =>
  `<td style="text-align:${align};padding:5px 8px;font-size:11px;border-bottom:1px solid #eef0f3;${extra}">${esc(v)}</td>`;

const section = (title) =>
  `<h2 style="font-size:15px;color:#1e3a5f;margin:22px 0 8px;">${esc(title)}</h2>`;

const table = (headBg, heads, rowsHtml, footHtml = "") =>
  `<table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:${headBg};">${heads.join("")}</tr></thead>
    <tbody>${rowsHtml}</tbody>
    ${footHtml ? `<tfoot>${footHtml}</tfoot>` : ""}
  </table>`;

const footRow = (label, cols, value, color) =>
  `<tr style="background:#f0f2f5;"><td colspan="${cols}" style="padding:7px 8px;font-size:12px;font-weight:700;color:#1e3a5f;">${esc(label)}</td>
   <td style="padding:7px 8px;font-size:12px;font-weight:700;text-align:right;color:${color};">${esc(value)}</td></tr>`;

function buildHtml({ project, expenses, invoices, incomes, budgetItems }) {
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalInvoiceExpenses = invoices.filter((i) => i.type === "expense").reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalInvoiceIncome = invoices.filter((i) => i.type === "income").reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0) + totalInvoiceIncome;
  const totalCosts = totalExpenses + totalInvoiceExpenses;
  const balance = totalIncome - totalCosts;
  const totalBudget = budgetItems.reduce((s, b) => s + (b.total_cost || 0), 0) || project.budget || 0;
  const budgetRemaining = totalBudget - totalCosts;
  const green = "#057a55";
  const red = "#b43232";

  const info = [
    ["Κατάσταση", project.status?.replace("_", " ") || "—"],
    ["Τύπος", project.property_type || "—"],
    ["Προϋπολογισμός", fmt(project.budget)],
    ["Εκκίνηση", fd(project.start_date)],
    ["Ολοκλήρωση", fd(project.target_completion)],
    ["Πρόοδος", `${project.progress || 0}%`],
  ];

  const summary = [
    ["Σύνολο Εσόδων", fmt(totalIncome), green, true],
    ["   Εγγραφές Income", fmt(totalIncome - totalInvoiceIncome), "#3c8264", false],
    ["   Τιμολόγια Εισοδήματος", fmt(totalInvoiceIncome), "#3c8264", false],
    ["Σύνολο Εξόδων", fmt(totalCosts), red, true],
    ["   Εγγραφές Expenses", fmt(totalExpenses), "#b45050", false],
    ["   Τιμολόγια Εξόδων", fmt(totalInvoiceExpenses), "#b45050", false],
    ["Καθαρό Αποτέλεσμα", fmt(balance), balance >= 0 ? green : red, true],
    ["Προϋπολογισμός", fmt(totalBudget), "#1e3a5f", true],
    ["Υπόλοιπο Προϋπολογισμού", fmt(budgetRemaining), budgetRemaining >= 0 ? green : red, true],
  ];

  const allExpenses = [
    ...expenses.map((e) => ({ category: e.category, amount: e.amount || 0, payee: e.payee, date: e.date, description: e.description })),
    ...invoices.filter((i) => i.type === "expense").map((i) => ({ category: i.category, amount: i.total_amount || 0, payee: i.vendor_client, date: i.date, description: i.description || i.invoice_number })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const byCategory = {};
  allExpenses.forEach((e) => {
    const c = e.category || "other";
    if (!byCategory[c]) byCategory[c] = { total: 0, count: 0 };
    byCategory[c].total += e.amount;
    byCategory[c].count += 1;
  });

  const allIncomes = [
    ...incomes.map((i) => ({ date: i.date, source: i.source, description: i.description, amount: i.amount || 0, category: i.category })),
    ...invoices.filter((i) => i.type === "income").map((i) => ({ date: i.date, source: i.vendor_client, description: i.invoice_number || i.description, amount: i.total_amount || 0, category: "Τιμολόγιο" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Budget grouped by subcategory with subtotals
  const vatOf = (b) => (b.total_cost || 0) * ((b.vat_percent || 0) / 100);
  const sortedBudget = [...budgetItems].sort((a, b) => {
    if (!a.subcategory && !b.subcategory) return 0;
    if (!a.subcategory) return 1;
    if (!b.subcategory) return -1;
    return a.subcategory.localeCompare(b.subcategory, "el", { numeric: true });
  });
  const groups = [];
  sortedBudget.forEach((b) => {
    const name = b.subcategory || "";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(b);
    else groups.push({ name, items: [b] });
  });
  const budgetRows = groups
    .map((g) => {
      const sub = g.items.reduce((s, b) => s + (b.total_cost || 0), 0);
      const subVat = g.items.reduce((s, b) => s + vatOf(b), 0);
      const head = `<tr style="background:#e8edf4;"><td colspan="5" style="padding:6px 8px;font-size:12px;font-weight:700;color:#1e3a5f;">${esc(g.name || "Χωρίς υποκατηγορία")}</td><td colspan="2" style="padding:6px 8px;font-size:11px;font-weight:700;color:#1e3a5f;text-align:right;">${esc(fmt(sub))}</td><td style="padding:6px 8px;font-size:11px;font-weight:700;color:#1e3a5f;text-align:right;">${esc(fmt(sub + subVat))}</td></tr>`;
      const rows = g.items
        .map((b) =>
          `<tr>${td(categoryLabels[b.category] || b.category || "—")}${td(b.description || "")}${td(`${b.quantity ?? 1} ${b.unit || ""}`)}${td(fmt(b.unit_cost), "right")}${td(`${b.vat_percent ?? 0}%`, "right")}${td(fmt(b.total_cost), "right", "font-weight:700;color:#1e3a5f;")}${td(fmt(vatOf(b)), "right")}${td(fmt((b.total_cost || 0) + vatOf(b)), "right", "font-weight:700;color:#1e3a5f;")}</tr>`
        )
        .join("");
      return head + rows;
    })
    .join("");
  const budgetVat = budgetItems.reduce((s, b) => s + vatOf(b), 0);

  return `
  <div style="padding:0 0 24px;">
    <div style="background:#1e3a5f;color:#fff;padding:20px 24px;">
      <div style="font-size:22px;font-weight:700;">${esc(project.name || "Project Report")}</div>
      <div style="font-size:12px;margin-top:6px;opacity:.9;">Αναφορά παραγωγής: ${esc(format(new Date(), "dd/MM/yyyy HH:mm"))}</div>
      ${project.address ? `<div style="font-size:12px;opacity:.9;">${esc(project.address)}</div>` : ""}
    </div>
    <div style="padding:0 24px;">
      ${section("Πληροφορίες Έργου")}
      <div style="background:#f5f7fa;border-radius:8px;padding:12px 16px;display:flex;flex-wrap:wrap;">
        ${info.map(([l, v]) => `<div style="width:33%;font-size:12px;padding:3px 0;"><b style="color:#505050;">${esc(l)}:</b> ${esc(v)}</div>`).join("")}
      </div>

      ${section("Οικονομική Σύνοψη")}
      <table style="width:100%;border-collapse:collapse;">
        ${summary.map(([l, v, c, bold]) => `<tr style="${bold ? "background:#f5f7fa;" : ""}"><td style="padding:5px 10px;font-size:${bold ? 12 : 11}px;font-weight:${bold ? 700 : 400};white-space:pre;">${esc(l)}</td><td style="padding:5px 10px;font-size:12px;font-weight:${bold ? 700 : 400};text-align:right;color:${c};">${esc(v)}</td></tr>`).join("")}
      </table>

      ${section("Έξοδα ανά Κατηγορία")}
      ${table("#1e3a5f", [th("Κατηγορία"), th("Εγγραφές"), th("Σύνολο", "right")],
        Object.entries(byCategory).map(([c, d]) => `<tr>${td(categoryLabels[c] || c, "left", "font-weight:700;color:#1e3a5f;")}${td(`${d.count} εγγραφές`)}${td(fmt(d.total), "right", `font-weight:700;color:${red};`)}</tr>`).join(""))}

      ${allExpenses.length ? section("Αναλυτικά Έξοδα") + table("#1e3a5f",
        [th("Ημ/νία"), th("Κατηγορία"), th("Δικαιούχος"), th("Περιγραφή"), th("Ποσό", "right")],
        allExpenses.map((e) => `<tr>${td(fd(e.date))}${td(categoryLabels[e.category] || e.category || "—")}${td(e.payee || "")}${td(e.description || "")}${td(fmt(e.amount), "right", `font-weight:700;color:${red};`)}</tr>`).join(""),
        footRow("ΣΥΝΟΛΟ ΕΞΟΔΩΝ", 4, fmt(totalCosts), red)) : ""}

      ${allIncomes.length ? section("Αναλυτικά Έσοδα") + table(green,
        [th("Ημ/νία"), th("Πηγή / Πελάτης"), th("Περιγραφή"), th("Κατηγορία"), th("Ποσό", "right")],
        allIncomes.map((i) => `<tr>${td(fd(i.date))}${td(i.source || "")}${td(i.description || "")}${td(i.category || "")}${td(fmt(i.amount), "right", `font-weight:700;color:${green};`)}</tr>`).join(""),
        footRow("ΣΥΝΟΛΟ ΕΣΟΔΩΝ", 4, fmt(totalIncome), green)) : ""}

      ${budgetItems.length ? section("Προϋπολογισμός ανά Υποκατηγορία") + `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#c9a962;">${th("Κατηγορία")}${th("Περιγραφή")}${th("Ποσότητα")}${th("Κόστος/μον.", "right")}${th("ΦΠΑ %", "right")}${th("Σύνολο", "right")}${th("ΦΠΑ", "right")}${th("Τελικό", "right")}</tr></thead>
          <tbody>${budgetRows}</tbody>
          <tfoot><tr style="background:#f0f2f5;"><td colspan="5" style="padding:7px 8px;font-size:12px;font-weight:700;color:#1e3a5f;">ΣΥΝΟΛΟ ΠΡΟΫΠΟΛΟΓΙΣΜΟΥ</td>
            <td style="padding:7px 8px;font-size:12px;font-weight:700;text-align:right;color:#1e3a5f;">${esc(fmt(totalBudget))}</td>
            <td style="padding:7px 8px;font-size:12px;font-weight:700;text-align:right;">${esc(fmt(budgetVat))}</td>
            <td style="padding:7px 8px;font-size:12px;font-weight:700;text-align:right;color:#1e3a5f;">${esc(fmt(totalBudget + budgetVat))}</td></tr></tfoot>
        </table>` : ""}

      <div style="margin-top:24px;background:${balance >= 0 ? green : red};color:#fff;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;font-weight:700;">ΤΕΛΙΚΟ ΥΠΟΛΟΙΠΟ</div>
          <div style="font-size:11px;margin-top:4px;">Έσοδα: ${esc(fmt(totalIncome))} &nbsp;|&nbsp; Έξοδα: ${esc(fmt(totalCosts))} &nbsp;|&nbsp; Υπόλοιπο Προϋπολ.: ${esc(fmt(budgetRemaining))}</div>
        </div>
        <div style="font-size:20px;font-weight:700;">${esc(fmt(balance))}</div>
      </div>
    </div>
  </div>`;
}

export default function ProjectPDFReport({ project, expenses = [], invoices = [], incomes = [], budgetItems = [] }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      await htmlToPdf({
        html: buildHtml({ project, expenses, invoices, incomes, budgetItems }),
        filename: `${(project.name || "project").replace(/\s+/g, "_")}_report_${format(new Date(), "yyyyMMdd")}.pdf`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={loading}
      variant="outline"
      className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Δημιουργία...</>
      ) : (
        <><FileDown className="w-4 h-4 mr-2" />PDF Αναφορά</>
      )}
    </Button>
  );
}