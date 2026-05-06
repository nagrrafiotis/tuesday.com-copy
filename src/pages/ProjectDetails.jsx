import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskForm from "@/components/tasks/TaskForm";
import ProjectForm from "@/components/projects/ProjectForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseSummaryBySubcategory from "@/components/expenses/ExpenseSummaryBySubcategory";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import BudgetTable from "@/components/budget/BudgetTable";
import BudgetForm from "@/components/budget/BudgetForm";
import InsurancePanel from "@/components/project/InsurancePanel";
import WorkDaysPanel from "@/components/project/WorkDaysPanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  ArrowLeft, MapPin, Calendar, DollarSign, Pencil, Plus,
  Building2, ClipboardList, BarChart3, Receipt, Trash2,
  Users, Wrench, Package, Truck,
} from "lucide-react";
import { format } from "date-fns";
import SaveIndicator from "@/components/ui/SaveIndicator";

export default function ProjectDetails() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(window.location.href))
      .finally(() => setAuthChecking(false));
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [activeTab, setActiveTab] = useState("board");
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] = useState(null);
  const [selectedBudgetItems, setSelectedBudgetItems] = useState([]);

  const [budgetItems, setBudgetItems] = useState([]);
  const budgetItemsRef = useRef([]);
  const budgetLoadedRef = useRef(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const saveTimerRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
    staleTime: 0, // always fresh from server on mount
    refetchOnWindowFocus: false,
  });

  // Load budget items from server ONCE on first load, then we manage locally
  useEffect(() => {
    if (project && !budgetLoadedRef.current) {
      budgetLoadedRef.current = true;
      const items = project.budget_items || [];
      setBudgetItems(items);
      budgetItemsRef.current = items;
    }
  }, [project]);

  // Reset when projectId changes
  useEffect(() => {
    budgetLoadedRef.current = false;
    setBudgetItems([]);
    budgetItemsRef.current = [];
    setSelectedBudgetItems([]);
  }, [projectId]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: dropdownLists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", projectId],
    queryFn: () => base44.entities.Expense.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: projectInvoices = [] } = useQuery({
    queryKey: ["invoices", projectId],
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

  // ─── Budget persistence ─────────────────────────────────────────────────────
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const saveBudgetToServer = useCallback(async (items) => {
    const totalBudget = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);
    setBudgetSaving(true);
    try {
      await base44.entities.Project.update(projectId, {
        budget_items: items,
        budget: totalBudget,
      });
    } catch (err) {
      console.error("Budget save error:", err);
    }
    setBudgetSaving(false);
  }, [projectId]);

  const applyBudgetUpdate = useCallback((newItems) => {
    budgetItemsRef.current = [...newItems];
    setBudgetItems([...newItems]);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBudgetToServer(budgetItemsRef.current);
    }, 600);
  }, [saveBudgetToServer]);

  // ─── Budget CRUD ─────────────────────────────────────────────────────────────
  const handleBudgetItemSubmit = async (data) => {
    const current = budgetItemsRef.current;
    let newItems;
    if (editingBudgetItem) {
      newItems = current.map(i =>
        i.id === editingBudgetItem.id ? { ...i, ...data, id: editingBudgetItem.id } : i
      );
    } else {
      const newItem = { ...data, id: Date.now().toString() };
      newItems = [...current, newItem];
    }
    setShowBudgetForm(false);
    setEditingBudgetItem(null);
    // Save immediately (no debounce) for explicit user actions
    budgetItemsRef.current = [...newItems];
    setBudgetItems([...newItems]);
    await saveBudgetToServer(newItems);
  };

  const handleBudgetInlineUpdate = useCallback((item, changes) => {
    const current = budgetItemsRef.current;
    const newItems = current.map(i => {
      if (i.id !== item.id) return i;
      const merged = { ...i, ...changes };
      if (!('total_cost' in changes) && ('quantity' in changes || 'unit_cost' in changes)) {
        merged.total_cost = (merged.quantity || 0) * (merged.unit_cost || 0);
      }
      return merged;
    });
    applyBudgetUpdate(newItems);
  }, [applyBudgetUpdate]);

  const handleDeleteBudgetItem = async (item) => {
    if (!window.confirm(`Διαγραφή budget item;`)) return;
    const newItems = budgetItemsRef.current.filter(i => i.id !== item.id);
    budgetItemsRef.current = [...newItems];
    setBudgetItems([...newItems]);
    await saveBudgetToServer(newItems);
  };

  const handleBulkDeleteBudgetItems = async () => {
    if (!window.confirm(`Διαγραφή ${selectedBudgetItems.length} items;`)) return;
    const newItems = budgetItemsRef.current.filter(i => !selectedBudgetItems.includes(i.id));
    setSelectedBudgetItems([]);
    budgetItemsRef.current = [...newItems];
    setBudgetItems([...newItems]);
    await saveBudgetToServer(newItems);
  };

  const toggleSelectAllBudgetItems = () => {
    const all = budgetItemsRef.current;
    if (selectedBudgetItems.length === all.length) {
      setSelectedBudgetItems([]);
    } else {
      setSelectedBudgetItems(all.map(i => i.id));
    }
  };

  const toggleSelectBudgetItem = (id) => {
    setSelectedBudgetItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ─── Tasks ────────────────────────────────────────────────────────────────────
  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }); setShowTaskForm(false); },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }); setShowTaskForm(false); setEditingTask(null); },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses", projectId] }); setShowExpenseForm(false); },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses", projectId] }); setShowExpenseForm(false); setEditingExpense(null); },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", projectId] }),
  });

  const handleTaskSubmit = async (data) => {
    if (editingTask) await updateTaskMutation.mutateAsync({ id: editingTask.id, data });
    else await createTaskMutation.mutateAsync(data);
  };

  const handleStatusChange = async (task, newStatus) => {
    await updateTaskMutation.mutateAsync({ id: task.id, data: { ...task, status: newStatus } });
  };

  const handleDeleteTask = async (task) => {
    if (window.confirm(`Delete task "${task.title}"?`)) await deleteTaskMutation.mutateAsync(task.id);
  };

  const handleExpenseSubmit = async (data) => {
    if (editingExpense) await updateExpenseMutation.mutateAsync({ id: editingExpense.id, data });
    else await createExpenseMutation.mutateAsync(data);
  };

  const isSaving =
    budgetSaving ||
    updateProjectMutation.isPending ||
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending ||
    deleteExpenseMutation.isPending;

  // ─── Derived data ─────────────────────────────────────────────────────────────
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

  if (authChecking || projectLoading || !project) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">{authChecking ? "Authenticating..." : "Loading project..."}</p>
        </div>
      </div>
    );
  }

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  const totalInvoiceExpenses = projectInvoices
    .filter(inv => inv.type === "expense")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0) + totalInvoiceExpenses;

  const subcategoryToPhase = {};
  subcategories.forEach(s => { if (s.phase_id) subcategoryToPhase[s.name] = s.phase_id; });

  const phaseChartData = projectPhases.map(phase => {
    const subcatNames = Object.keys(subcategoryToPhase).filter(n => subcategoryToPhase[n] === phase.id);
    const phaseBudget = budgetItems
      .filter(item => subcatNames.includes(item.subcategory))
      .reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const phaseExpenses = expenses
      .filter(exp => subcatNames.includes(exp.subcategory))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const phaseInvoiceExpenses = projectInvoices
      .filter(inv => inv.type === "expense" && subcatNames.includes(inv.subcategory))
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    return { name: phase.name, Budget: phaseBudget, Expenses: phaseExpenses + phaseInvoiceExpenses };
  });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Hero Section */}
      <div
        className="relative h-64 md:h-80 overflow-hidden group cursor-move"
        onMouseDown={(e) => { setIsDragging(true); e.preventDefault(); }}
        onMouseMove={(e) => {
          if (isDragging) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setImagePosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <img
          src={project.cover_image || defaultImages[project.property_type] || defaultImages.residential}
          alt={project.name}
          className="w-full h-full object-cover"
          style={{ objectPosition: `${imagePosition.x}% ${imagePosition.y}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute top-20 right-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs">
            Drag to adjust image position
          </div>
        </div>
        <div className="absolute top-6 left-3 pointer-events-auto">
          <Link to={createPageUrl("Projects")}>
            <Button variant="ghost" className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-6 left-3 right-3 pointer-events-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="pointer-events-none">
                <Badge className={`${statusColors[project.status]} border-0 mb-3`}>
                  {project.status?.replace("_", " ")}
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{project.name}</h1>
                {project.address && (
                  <div className="flex items-center gap-2 text-white/80">
                    <MapPin className="w-4 h-4" />
                    <span>{project.address}</span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowProjectForm(true)}
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 -mt-16 relative z-10"
        >
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#1e3a5f]/10">
                <BarChart3 className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{project.progress || 0}%</p>
              </div>
            </div>
            <Progress value={project.progress || 0} className="mt-3 h-1.5" />
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#c9a962]/10">
                <DollarSign className="w-5 h-5 text-[#c9a962]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget</p>
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
                <p className="text-sm text-gray-500">Target Date</p>
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
                <p className="text-sm text-gray-500">Tasks</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{taskStats.completed}/{taskStats.total}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Description */}
        {project.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
          >
            <h2 className="font-semibold text-[#1e3a5f] mb-3">About this Project</h2>
            <p className="text-gray-600 leading-relaxed">{project.description}</p>
          </motion.div>
        )}

        {/* Phase Chart */}
        {projectPhases.length > 0 && phaseChartData.some(d => d.Budget > 0 || d.Expenses > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8"
          >
            <h2 className="text-xl font-semibold text-[#1e3a5f] mb-6">Budget vs Expenses by Phase</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={phaseChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={80} />
                <YAxis stroke="#666" />
                <Tooltip formatter={(value) => `€${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Bar dataKey="Budget" fill="#c9a962" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="board">Tasks</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="insurance">Ασφαλιστικές</TabsTrigger>
                <TabsTrigger value="workdays">Ένσημα ΕΦΚΑ</TabsTrigger>
              </TabsList>

              {activeTab === "board" && (
                <Button onClick={() => { setEditingTask(null); setShowTaskForm(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                  <Plus className="w-4 h-4 mr-2" /> Add Task
                </Button>
              )}
              {activeTab === "expenses" && (
                <Button onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                  <Plus className="w-4 h-4 mr-2" /> Add Expense
                </Button>
              )}
              {activeTab === "budget" && (
                <Button onClick={() => { setEditingBudgetItem(null); setShowBudgetForm(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                  <Plus className="w-4 h-4 mr-2" /> Add Budget Item
                </Button>
              )}
            </div>

            <TabsContent value="board">
              {tasksLoading ? (
                <div className="text-center py-12 text-gray-500">Loading tasks...</div>
              ) : (
                <TaskBoard
                  tasks={tasks}
                  onAddTask={() => setShowTaskForm(true)}
                  onEditTask={(task) => { setEditingTask(task); setShowTaskForm(true); }}
                  onDeleteTask={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                />
              )}
            </TabsContent>

            <TabsContent value="expenses">
              <ExpenseSummaryBySubcategory expenses={expenses} invoices={projectInvoices} budgetItems={budgetItems} />
            </TabsContent>

            <TabsContent value="budget">
              {selectedBudgetItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1e3a5f] text-white rounded-xl p-4 flex items-center justify-between mb-4"
                >
                  <span className="font-medium">{selectedBudgetItems.length} selected</span>
                  <Button onClick={handleBulkDeleteBudgetItems} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                  </Button>
                </motion.div>
              )}

              <BudgetTable
                budgetItems={budgetItems}
                selectedItems={selectedBudgetItems}
                onSelectAll={toggleSelectAllBudgetItems}
                onSelectItem={toggleSelectBudgetItem}
                onEdit={(item) => { setEditingBudgetItem(item); setShowBudgetForm(true); }}
                onDelete={handleDeleteBudgetItem}
                onUpdate={handleBudgetInlineUpdate}
              />
            </TabsContent>

            <TabsContent value="insurance">
              <InsurancePanel projectId={projectId} />
            </TabsContent>

            <TabsContent value="workdays">
              <WorkDaysPanel projectId={projectId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Forms */}
      <TaskForm
        task={editingTask}
        projectId={projectId}
        open={showTaskForm}
        onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
        onSubmit={handleTaskSubmit}
        users={users}
      />

      <ProjectForm
        project={project}
        open={showProjectForm}
        onClose={() => setShowProjectForm(false)}
        onSubmit={async (data) => { await updateProjectMutation.mutateAsync(data); setShowProjectForm(false); }}
      />

      <ExpenseForm
        expense={editingExpense}
        projects={[project]}
        projectId={projectId}
        open={showExpenseForm}
        onClose={() => { setShowExpenseForm(false); setEditingExpense(null); }}
        onSubmit={handleExpenseSubmit}
      />

      <BudgetForm
        item={editingBudgetItem}
        open={showBudgetForm}
        onClose={() => { setShowBudgetForm(false); setEditingBudgetItem(null); }}
        onSubmit={handleBudgetItemSubmit}
      />

      <SaveIndicator isSaving={isSaving} />
    </div>
  );
}