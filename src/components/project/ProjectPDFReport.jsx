import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const fmt = (v) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(v || 0);

export default function ProjectPDFReport({ project, expenses = [], invoices = [], incomes = [], budgetItems = [] }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 15;
      const colW = W - margin * 2;
      let y = 20;

      const addLine = (text, x, yPos, size = 10, style = "normal", color = [30, 30, 30]) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", style);
        doc.setTextColor(...color);
        doc.text(text, x, yPos);
      };

      const checkPage = (needed = 12) => {
        if (y + needed > 280) { doc.addPage(); y = 20; }
      };

      // ---- Header ----
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, W, 32, "F");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(project.name || "Project Report", margin, 14);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Αναφορά παραγωγής: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, 22);
      if (project.address) doc.text(project.address, margin, 28);
      y = 42;

      // ---- Project Info ----
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, y, colW, 24, 3, 3, "F");
      addLine("Πληροφορίες Έργου", margin + 4, y + 7, 10, "bold", [30, 58, 95]);
      const info = [
        ["Κατάσταση", project.status?.replace("_", " ") || "—"],
        ["Τύπος", project.property_type || "—"],
        ["Προϋπολογισμός", fmt(project.budget)],
        ["Εκκίνηση", project.start_date ? format(new Date(project.start_date), "dd/MM/yyyy") : "—"],
        ["Ολοκλήρωση", project.target_completion ? format(new Date(project.target_completion), "dd/MM/yyyy") : "—"],
        ["Πρόοδος", `${project.progress || 0}%`],
      ];
      let ix = 0;
      info.forEach(([label, val]) => {
        const col = ix % 3;
        const row = Math.floor(ix / 3);
        const xOff = margin + 4 + col * (colW / 3);
        addLine(`${label}: `, xOff, y + 15 + row * 6, 8, "bold", [80, 80, 80]);
        doc.setFont("helvetica", "normal");
        doc.text(val, xOff + doc.getTextWidth(`${label}: `), y + 15 + row * 6);
        ix++;
      });
      y += 32;

      // ---- Financial Summary ----
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalInvoiceExpenses = invoices.filter(i => i.type === "expense").reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalInvoiceIncome = invoices.filter(i => i.type === "income").reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0) + totalInvoiceIncome;
      const totalCosts = totalExpenses + totalInvoiceExpenses;
      const balance = totalIncome - totalCosts;
      const totalBudget = budgetItems.reduce((s, b) => s + (b.total_cost || 0), 0) || project.budget || 0;
      const budgetRemaining = totalBudget - totalCosts;

      checkPage(50);
      addLine("Οικονομική Σύνοψη", margin, y, 12, "bold", [30, 58, 95]);
      y += 6;

      const summaryRows = [
        { label: "Σύνολο Εσόδων", value: fmt(totalIncome), color: [5, 122, 85] },
        { label: "  Εγγραφές Income", value: fmt(totalIncome - totalInvoiceIncome), color: [60, 130, 100] },
        { label: "  Τιμολόγια Εισοδήματος", value: fmt(totalInvoiceIncome), color: [60, 130, 100] },
        { label: "Σύνολο Εξόδων", value: fmt(totalCosts), color: [180, 50, 50] },
        { label: "  Εγγραφές Expenses", value: fmt(totalExpenses), color: [180, 80, 80] },
        { label: "  Τιμολόγια Εξόδων", value: fmt(totalInvoiceExpenses), color: [180, 80, 80] },
        { label: "Καθαρό Αποτέλεσμα", value: fmt(balance), color: balance >= 0 ? [5, 122, 85] : [180, 50, 50] },
        { label: "Προϋπολογισμός", value: fmt(totalBudget), color: [30, 58, 95] },
        { label: "Υπόλοιπο Προϋπολογισμού", value: fmt(budgetRemaining), color: budgetRemaining >= 0 ? [5, 122, 85] : [180, 50, 50] },
      ];

      summaryRows.forEach((row, i) => {
        checkPage(8);
        const isHeader = i === 0 || i === 3 || i === 6 || i === 7 || i === 8;
        if (isHeader) {
          doc.setFillColor(245, 247, 250);
          doc.rect(margin, y - 4, colW, 8, "F");
        }
        addLine(row.label, margin + 3, y, isHeader ? 9 : 8, isHeader ? "bold" : "normal", [60, 60, 60]);
        doc.setFont("helvetica", isHeader ? "bold" : "normal");
        doc.setTextColor(...row.color);
        doc.text(row.value, margin + colW - 3, y, { align: "right" });
        y += 8;
      });

      // ---- Expenses by Category ----
      checkPage(20);
      y += 4;
      addLine("Έξοδα ανά Κατηγορία", margin, y, 12, "bold", [30, 58, 95]);
      y += 6;

      const categoryLabels = { labor: "Εργατικά", subcontractor: "Υπεργολάβοι", materials: "Υλικά", equipment: "Εξοπλισμός", general_expenses: "Γενικά Έξοδα" };
      const allExpenses = [
        ...expenses.map(e => ({ category: e.category, amount: e.amount || 0, payee: e.payee, date: e.date, description: e.description, source: "expense" })),
        ...invoices.filter(i => i.type === "expense").map(i => ({ category: i.category, amount: i.total_amount || 0, payee: i.vendor_client, date: i.date, description: i.description || i.invoice_number, source: "invoice" })),
      ];

      const byCategory = {};
      allExpenses.forEach(e => {
        const cat = e.category || "other";
        if (!byCategory[cat]) byCategory[cat] = { total: 0, items: [] };
        byCategory[cat].total += e.amount;
        byCategory[cat].items.push(e);
      });

      // Header row
      doc.setFillColor(30, 58, 95);
      doc.rect(margin, y - 4, colW, 7, "F");
      addLine("Κατηγορία", margin + 3, y, 8, "bold", [255, 255, 255]);
      addLine("Εγγραφές", margin + 80, y, 8, "bold", [255, 255, 255]);
      addLine("Σύνολο", margin + colW - 3, y, 8, "bold", [255, 255, 255]);
      doc.setTextColor(255, 255, 255);
      doc.text("Σύνολο", margin + colW - 3, y, { align: "right" });
      y += 8;

      Object.entries(byCategory).forEach(([cat, data], ci) => {
        checkPage(10);
        if (ci % 2 === 0) { doc.setFillColor(248, 249, 252); doc.rect(margin, y - 4, colW, 8, "F"); }
        addLine(categoryLabels[cat] || cat, margin + 3, y, 9, "bold", [30, 58, 95]);
        addLine(`${data.items.length} εγγραφές`, margin + 80, y, 8, "normal", [100, 100, 100]);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 50, 50);
        doc.text(fmt(data.total), margin + colW - 3, y, { align: "right" });
        y += 9;
      });

      // ---- Expenses Detail ----
      if (allExpenses.length > 0) {
        checkPage(20);
        y += 4;
        addLine("Αναλυτικά Έξοδα", margin, y, 12, "bold", [30, 58, 95]);
        y += 6;

        doc.setFillColor(30, 58, 95);
        doc.rect(margin, y - 4, colW, 7, "F");
        addLine("Ημ/νία", margin + 3, y, 7, "bold", [255, 255, 255]);
        addLine("Κατηγορία", margin + 22, y, 7, "bold", [255, 255, 255]);
        addLine("Δικαιούχος / Vendor", margin + 60, y, 7, "bold", [255, 255, 255]);
        addLine("Περιγραφή", margin + 105, y, 7, "bold", [255, 255, 255]);
        addLine("Ποσό", margin + colW - 3, y, 7, "bold", [255, 255, 255]);
        doc.text("Ποσό", margin + colW - 3, y, { align: "right" });
        y += 8;

        allExpenses.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((e, i) => {
          checkPage(7);
          if (i % 2 === 0) { doc.setFillColor(250, 251, 253); doc.rect(margin, y - 4, colW, 7, "F"); }
          const dateStr = e.date ? format(new Date(e.date), "dd/MM/yy") : "—";
          const catLabel = categoryLabels[e.category] || e.category || "—";
          const payeeStr = (e.payee || "").slice(0, 22);
          const descStr = (e.description || "").slice(0, 28);
          addLine(dateStr, margin + 3, y, 7, "normal", [80, 80, 80]);
          addLine(catLabel, margin + 22, y, 7, "normal", [80, 80, 80]);
          addLine(payeeStr, margin + 60, y, 7, "normal", [30, 30, 30]);
          addLine(descStr, margin + 105, y, 7, "normal", [100, 100, 100]);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(180, 50, 50);
          doc.text(fmt(e.amount), margin + colW - 3, y, { align: "right" });
          y += 7;
        });

        checkPage(8);
        doc.setFillColor(240, 242, 245);
        doc.rect(margin, y - 4, colW, 8, "F");
        addLine("ΣΥΝΟΛΟ ΕΞΟΔΩΝ", margin + 3, y, 9, "bold", [30, 58, 95]);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 50, 50);
        doc.text(fmt(totalCosts), margin + colW - 3, y, { align: "right" });
        y += 10;
      }

      // ---- Income Detail ----
      const allIncomes = [
        ...incomes.map(i => ({ date: i.date, source: i.source, description: i.description, amount: i.amount || 0, category: i.category })),
        ...invoices.filter(i => i.type === "income").map(i => ({ date: i.date, source: i.vendor_client, description: i.invoice_number || i.description, amount: i.total_amount || 0, category: "Τιμολόγιο" })),
      ];

      if (allIncomes.length > 0) {
        checkPage(20);
        y += 4;
        addLine("Αναλυτικά Έσοδα", margin, y, 12, "bold", [30, 58, 95]);
        y += 6;

        doc.setFillColor(5, 122, 85);
        doc.rect(margin, y - 4, colW, 7, "F");
        addLine("Ημ/νία", margin + 3, y, 7, "bold", [255, 255, 255]);
        addLine("Πηγή / Πελάτης", margin + 22, y, 7, "bold", [255, 255, 255]);
        addLine("Περιγραφή", margin + 90, y, 7, "bold", [255, 255, 255]);
        addLine("Κατηγορία", margin + 140, y, 7, "bold", [255, 255, 255]);
        addLine("Ποσό", margin + colW - 3, y, 7, "bold", [255, 255, 255]);
        doc.text("Ποσό", margin + colW - 3, y, { align: "right" });
        y += 8;

        allIncomes.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((inc, i) => {
          checkPage(7);
          if (i % 2 === 0) { doc.setFillColor(248, 253, 250); doc.rect(margin, y - 4, colW, 7, "F"); }
          const dateStr = inc.date ? format(new Date(inc.date), "dd/MM/yy") : "—";
          addLine(dateStr, margin + 3, y, 7, "normal", [80, 80, 80]);
          addLine((inc.source || "").slice(0, 30), margin + 22, y, 7, "normal", [30, 30, 30]);
          addLine((inc.description || "").slice(0, 25), margin + 90, y, 7, "normal", [100, 100, 100]);
          addLine((inc.category || "").slice(0, 15), margin + 140, y, 7, "normal", [80, 80, 80]);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(5, 122, 85);
          doc.text(fmt(inc.amount), margin + colW - 3, y, { align: "right" });
          y += 7;
        });

        checkPage(8);
        doc.setFillColor(240, 252, 245);
        doc.rect(margin, y - 4, colW, 8, "F");
        addLine("ΣΥΝΟΛΟ ΕΣΟΔΩΝ", margin + 3, y, 9, "bold", [30, 58, 95]);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(5, 122, 85);
        doc.text(fmt(totalIncome), margin + colW - 3, y, { align: "right" });
        y += 10;
      }

      // ---- Budget Items ----
      if (budgetItems.length > 0) {
        checkPage(20);
        y += 4;
        addLine("Προϋπολογισμός", margin, y, 12, "bold", [30, 58, 95]);
        y += 6;

        doc.setFillColor(201, 169, 98);
        doc.rect(margin, y - 4, colW, 7, "F");
        addLine("Κατηγορία", margin + 3, y, 7, "bold", [255, 255, 255]);
        addLine("Περιγραφή", margin + 45, y, 7, "bold", [255, 255, 255]);
        addLine("Ποσότητα", margin + 110, y, 7, "bold", [255, 255, 255]);
        addLine("Κόστος/μον.", margin + 135, y, 7, "bold", [255, 255, 255]);
        addLine("Σύνολο", margin + colW - 3, y, 7, "bold", [255, 255, 255]);
        doc.text("Σύνολο", margin + colW - 3, y, { align: "right" });
        y += 8;

        budgetItems.forEach((b, i) => {
          checkPage(7);
          if (i % 2 === 0) { doc.setFillColor(253, 251, 245); doc.rect(margin, y - 4, colW, 7, "F"); }
          addLine((b.category || "").slice(0, 18), margin + 3, y, 7, "normal", [80, 80, 80]);
          addLine((b.description || "").slice(0, 30), margin + 45, y, 7, "normal", [30, 30, 30]);
          addLine(`${b.quantity || 1} ${b.unit || ""}`, margin + 110, y, 7, "normal", [80, 80, 80]);
          addLine(fmt(b.unit_cost), margin + 135, y, 7, "normal", [80, 80, 80]);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 58, 95);
          doc.text(fmt(b.total_cost), margin + colW - 3, y, { align: "right" });
          y += 7;
        });

        checkPage(8);
        doc.setFillColor(240, 242, 245);
        doc.rect(margin, y - 4, colW, 8, "F");
        addLine("ΣΥΝΟΛΟ ΠΡΟΫΠΟΛΟΓΙΣΜΟΥ", margin + 3, y, 9, "bold", [30, 58, 95]);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 95);
        doc.text(fmt(totalBudget), margin + colW - 3, y, { align: "right" });
        y += 10;
      }

      // ---- Final Balance Box ----
      checkPage(28);
      y += 4;
      doc.setFillColor(balance >= 0 ? 5 : 180, balance >= 0 ? 122 : 50, balance >= 0 ? 85 : 50);
      doc.roundedRect(margin, y, colW, 22, 3, 3, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("ΤΕΛΙΚΟ ΥΠΟΛΟΙΠΟ", margin + 6, y + 9);
      doc.text(`Έσοδα: ${fmt(totalIncome)}`, margin + 6, y + 17);
      doc.setFontSize(14);
      doc.text(fmt(balance), margin + colW - 6, y + 13, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Έξοδα: ${fmt(totalCosts)}  |  Υπόλοιπο Προϋπολ.: ${fmt(budgetRemaining)}`, margin + 6 + doc.getTextWidth("Έσοδα: " + fmt(totalIncome)) + 4, y + 17);
      y += 28;

      // ---- Footer on all pages ----
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 160, 160);
        doc.text(`${project.name} — Αναφορά ${format(new Date(), "dd/MM/yyyy")}`, margin, 292);
        doc.text(`Σελίδα ${p} / ${totalPages}`, W - margin, 292, { align: "right" });
      }

      const fileName = `${project.name.replace(/\s+/g, "_")}_report_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
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