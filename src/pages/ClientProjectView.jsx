import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseSummaryBySubcategory from "@/components/expenses/ExpenseSummaryBySubcategory";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MapPin, Calendar, DollarSign, BarChart3, ClipboardList, CheckCircle2, Clock, Circle, ArrowUpCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

const statusColors = {
  planning: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  on_hold: "bg-gray-100 text-gray-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const defaultImages = {
  residential: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
  commercial: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80",
  mixed_use: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
  industrial: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80",
  land: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
};

const taskStatusIcon = {
  todo: <Circle className="w-4 h-4 text-gray-400" />,
  in_progress: <ArrowUpCircle className="w-4 h-4 text-amber-500" />,
  review: <Clock className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

const taskStatusLabel = {
  todo: "Εκκρεμεί",
  in_progress: "Σε εξέλιξη",
  review: "Έλεγχος",
  completed: "Ολοκληρώθηκε",
};

export default function ClientProjectView() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(window.location.href))
      .finally(() => setAuthChecking(false));
  }, []);

  const projectId = user?.allowed_project_id;

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["client-tasks", projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["client-expenses", projectId],
    queryFn: () => base44.entities.Expense.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: projectInvoices = [] } = useQuery({
    queryKey: ["client-invoices", projectId],
    queryFn: () => base44.entities.Invoice.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });

  const { data: projectPhases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
  });

  const { data: budgetItems = [] } = useQuery({
    queryKey: ["client-budget-items", projectId],
    queryFn: () => base44.entities.BudgetItem.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["client-incomes", projectId],
    queryFn: () => base44.entities.Income.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    const addText = (text, x, size = 10, style = "normal", color = [30, 58, 95]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      doc.setTextColor(...color);
      doc.text(text, x, y);
    };

    const line = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, pageW - 14, y);
      y += 6;
    };

    // Header
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 40, "F");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(project.name, 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Συνοπτική Αναφορά Έργου  |  ${format(new Date(), "dd/MM/yyyy")}`, 14, 30);
    y = 52;

    // Project info
    addText("ΣΤΟΙΧΕΙΑ ΕΡΓΟΥ", 14, 11, "bold");
    y += 7;
    line();
    const info = [
      ["Κατάσταση:", project.status?.replace("_", " ") || "—"],
      ["Τοποθεσία:", project.address || "—"],
      ["Έναρξη:", project.start_date ? format(new Date(project.start_date), "dd/MM/yyyy") : "—"],
      ["Στόχος ολοκλήρωσης:", project.target_completion ? format(new Date(project.target_completion), "dd/MM/yyyy") : "—"],
      ["Πρόοδος:", `${project.progress || 0}%`],
    ];
    info.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(label, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value, 70, y);
      y += 7;
    });
    y += 4;

    // Financials
    addText("ΟΙΚΟΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ", 14, 11, "bold");
    y += 7;
    line();

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
      + projectInvoices.filter(i => i.type === "expense").reduce((s, i) => s + (i.total_amount || 0), 0);
    const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0)
      + projectInvoices.filter(i => i.type === "income").reduce((s, i) => s + (i.total_amount || 0), 0);
    const balance = totalIncome - totalExpenses;

    const financials = [
      ["Συνολικός Προϋπολογισμός:", project.budget ? `€${project.budget.toLocaleString("el-GR")}` : "—"],
      ["Συνολικά Έσοδα:", `€${totalIncome.toLocaleString("el-GR")}`],
      ["Συνολικά Έξοδα:", `€${totalExpenses.toLocaleString("el-GR")}`],
      ["Υπόλοιπο:", `€${balance.toLocaleString("el-GR")}`],
    ];
    financials.forEach(([label, value], i) => {
      const isBalance = i === 3;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(label, 14, y);
      doc.setFont("helvetica", isBalance ? "bold" : "normal");
      doc.setTextColor(isBalance ? (balance >= 0 ? 22 : 220) : 30, isBalance ? (balance >= 0 ? 160 : 38) : 30, isBalance ? (balance >= 0 ? 90 : 38) : 30);
      doc.text(value, 100, y);
      y += 8;
    });
    y += 4;

    // Expenses by phase
    if (phaseChartData.length > 0) {
      addText("ΕΞΟΔΑ ΑΝΑ ΦΑΣΗ", 14, 11, "bold");
      y += 7;
      line();
      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y - 4, pageW - 28, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("Φάση", 16, y);
      doc.text("Προϋπολογισμός", 100, y);
      doc.text("Δαπάνες", 155, y);
      y += 8;
      phaseChartData.forEach(row => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(row.name, 16, y);
        doc.text(`€${row["Προϋπολογισμός"].toLocaleString("el-GR")}`, 100, y);
        doc.text(`€${row["Δαπάνες"].toLocaleString("el-GR")}`, 155, y);
        y += 7;
      });
      y += 4;
    }

    // Tasks summary
    addText("TASKS", 14, 11, "bold");
    y += 7;
    line();
    const taskSummary = [
      ["Συνολικά:", String(tasks.length)],
      ["Ολοκληρωμένα:", String(tasks.filter(t => t.status === "completed").length)],
      ["Σε εξέλιξη:", String(tasks.filter(t => t.status === "in_progress").length)],
      ["Εκκρεμή:", String(tasks.filter(t => t.status === "todo").length)],
    ];
    taskSummary.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(label, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value, 70, y);
      y += 7;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`Σελίδα ${i} / ${pageCount}`, pageW / 2, 290, { align: "center" });
    }

    doc.save(`${project.name}_αναφορα_${format(new Date(), "dd-MM-yyyy")}.pdf`);
  };

  if (authChecking || projectLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">Φόρτωση έργου...</p>
        </div>
      </div>
    );
  }

  if (!projectId || !project) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Δεν έχει ανατεθεί έργο στον λογαριασμό σας.</p>
          <p className="text-gray-400 text-sm mt-1">Επικοινωνήστε με τον διαχειριστή.</p>
        </div>
      </div>
    );
  }

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
  };

  const subcategoryToPhase = {};
  subcategories.forEach(s => { if (s.phase_id) subcategoryToPhase[s.name] = s.phase_id; });

  const phaseChartData = projectPhases.map(phase => {
    const subcatNames = Object.keys(subcategoryToPhase).filter(n => subcategoryToPhase[n] === phase.id);
    const phaseExpenses = expenses
      .filter(exp => subcatNames.includes(exp.subcategory))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const phaseInvoiceExpenses = projectInvoices
      .filter(inv => inv.type === "expense" && subcatNames.includes(inv.subcategory))
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const phaseBudget = budgetItems
      .filter(b => subcatNames.includes(b.subcategory))
      .reduce((sum, b) => sum + (b.total_cost || 0), 0);
    return { name: phase.name, Προϋπολογισμός: phaseBudget, Δαπάνες: phaseExpenses + phaseInvoiceExpenses };
  }).filter(d => d.Δαπάνες > 0 || d.Προϋπολογισμός > 0);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Hero */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={project.cover_image || defaultImages[project.property_type] || defaultImages.residential}
          alt={project.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-6 left-4 right-4">
          <Badge className={`${statusColors[project.status]} border-0 mb-2`}>
            {project.status?.replace("_", " ")}
          </Badge>
          <h1 className="text-3xl font-bold text-white mb-1">{project.name}</h1>
          {project.address && (
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{project.address}</span>
            </div>
          )}
        </div>
        {/* Top right actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            onClick={exportPDF}
            size="sm"
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 gap-1.5"
            variant="ghost"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Εξαγωγή PDF</span>
          </Button>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-white text-sm font-medium">Προβολή Πελάτη</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 -mt-16 relative z-10"
        >
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#1e3a5f]/10">
                <BarChart3 className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Πρόοδος</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{project.progress || 0}%</p>
              </div>
            </div>
            <Progress value={project.progress || 0} className="h-1.5" />
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#c9a962]/10">
                <DollarSign className="w-5 h-5 text-[#c9a962]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Προϋπολογισμός</p>
                <p className="text-xl font-bold text-[#1e3a5f]">
                  {project.budget ? `€${(project.budget / 1000).toFixed(0)}k` : "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ολοκλήρωση</p>
                <p className="text-xl font-bold text-[#1e3a5f]">
                  {project.target_completion ? format(new Date(project.target_completion), "dd/MM/yy") : "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tasks</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{taskStats.completed}/{taskStats.total}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Description */}
        {project.description && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
          >
            <h2 className="font-semibold text-[#1e3a5f] mb-2">Περιγραφή Έργου</h2>
            <p className="text-gray-600 leading-relaxed">{project.description}</p>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="tasks">
            <TabsList className="mb-6">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="expenses">Οικονομικά</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks">
              {/* Phase chart */}
              {phaseChartData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Δαπάνες ανά Φάση</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={phaseChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="Προϋπολογισμός" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Δαπάνες" fill="#c9a962" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tasks list */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-[#1e3a5f]">Λίστα Tasks</h2>
                  <span className="text-sm text-gray-500">{taskStats.completed} / {taskStats.total} ολοκληρωμένα</span>
                </div>
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">Δεν υπάρχουν tasks.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                        {taskStatusIcon[task.status] || taskStatusIcon.todo}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {task.title}
                          </p>
                          {task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.due_date && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.due_date), "dd/MM/yy")}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                            task.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                            task.status === "review" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {taskStatusLabel[task.status] || task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="expenses">
              <ExpenseSummaryBySubcategory expenses={expenses} invoices={projectInvoices} budgetItems={budgetItems} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}