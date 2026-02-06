import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskForm from "@/components/tasks/TaskForm";
import ProjectForm from "@/components/projects/ProjectForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Pencil,
  Plus,
  Building2,
  ClipboardList,
  BarChart3,
  Settings,
  Receipt,
  Trash2,
  Users,
  Wrench,
  Package,
  Truck,
  Search,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProjectDetails() {
  const [user, setUser] = React.useState(null);
  const [authChecking, setAuthChecking] = React.useState(true);

  React.useEffect(() => {
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
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetItems, setBudgetItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [budgetSearchQuery, setBudgetSearchQuery] = useState("");
  const [columnWidths, setColumnWidths] = useState({
    category: 150,
    subcategory: 150,
    description: 200,
    payee: 150,
    payment: 150,
    quantity: 100,
    unit: 80,
    unitCost: 120,
    total: 120,
  });
  const [resizing, setResizing] = useState(null);
  const [showNewSubcategory, setShowNewSubcategory] = useState(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [showNewContact, setShowNewContact] = useState(null);
  const [newContactName, setNewContactName] = useState("");
  const [showNewPaymentSource, setShowNewPaymentSource] = useState(null);
  const [newPaymentSourceName, setNewPaymentSourceName] = useState("");

  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
  });

  React.useEffect(() => {
    if (project && !editingBudget) {
      setBudgetItems(project.budget_items || []);
    }
  }, [project, editingBudget]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list(),
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list(),
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
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

  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setShowProjectForm(false);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setShowTaskForm(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setShowTaskForm(false);
      setEditingTask(null);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.Subcategory.create(data),
    onSuccess: (newSubcat) => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      if (showNewSubcategory) {
        updateBudgetItem(showNewSubcategory, 'subcategory', newSubcat.name);
      }
      setShowNewSubcategory(null);
      setNewSubcategoryName("");
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      if (showNewContact) {
        updateBudgetItem(showNewContact, 'payee', newContact.name);
      }
      setShowNewContact(null);
      setNewContactName("");
    },
  });

  const createPaymentSourceMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentSource.create(data),
    onSuccess: (newSource) => {
      queryClient.invalidateQueries({ queryKey: ["paymentSources"] });
      if (showNewPaymentSource) {
        updateBudgetItem(showNewPaymentSource, 'payment_source', newSource.name);
      }
      setShowNewPaymentSource(null);
      setNewPaymentSourceName("");
    },
  });

  const handleTaskSubmit = async (data) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({ id: editingTask.id, data });
    } else {
      await createTaskMutation.mutateAsync(data);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    await updateTaskMutation.mutateAsync({ id: task.id, data: { ...task, status: newStatus } });
  };

  const handleDeleteTask = async (task) => {
    if (window.confirm(`Delete task "${task.title}"?`)) {
      await deleteTaskMutation.mutateAsync(task.id);
    }
  };

  const addBudgetItem = () => {
    const newItem = {
      id: Date.now().toString(),
      category: "labor",
      subcategory: "",
      description: "",
      quantity: 1,
      unit: "piece",
      unit_cost: 0,
      total_cost: 0,
      payee: "",
      payment_source: ""
    };
    setBudgetItems([...budgetItems, newItem]);
  };

  const updateBudgetItem = (id, field, value) => {
    const updatedItems = budgetItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.total_cost = (updated.quantity || 0) * (updated.unit_cost || 0);
        }
        return updated;
      }
      return item;
    });
    setBudgetItems(updatedItems);
  };

  const removeBudgetItem = (id) => {
    setBudgetItems(budgetItems.filter(item => item.id !== id));
  };

  const saveBudget = async () => {
    const totalBudget = budgetItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    await updateProjectMutation.mutateAsync({
      budget_items: budgetItems,
      budget: totalBudget
    });
    setEditingBudget(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleMouseDown = (column, e) => {
    e.preventDefault();
    setResizing({ column, startX: e.clientX, startWidth: columnWidths[column] });
  };

  React.useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(80, resizing.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizing.column]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const categoryConfig = {
    labor: { label: "Labor", icon: Users, color: "bg-blue-100 text-blue-700" },
    subcontractor: { label: "Subcontractor", icon: Wrench, color: "bg-purple-100 text-purple-700" },
    materials: { label: "Materials", icon: Package, color: "bg-amber-100 text-amber-700" },
    equipment: { label: "Equipment", icon: Truck, color: "bg-emerald-100 text-emerald-700" },
    general_expenses: { label: "General", icon: Receipt, color: "bg-gray-100 text-gray-700" },
  };

  const statusColors = {
    planning: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    on_hold: "bg-gray-100 text-gray-700",
    completed: "bg-emerald-100 text-emerald-700",
  };

  const DEFAULT_LISTS = {
    expense_categories: ["labor", "subcontractor", "materials", "equipment", "general_expenses"],
  };

  const getExpenseCategories = () => {
    const list = dropdownLists.find(l => l.list_name === "expense_categories");
    return list?.options || DEFAULT_LISTS.expense_categories;
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
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    todo: tasks.filter((t) => t.status === "todo").length,
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const budgetRemaining = (project.budget || 0) - totalExpenses;
  const budgetUsedPercent = project.budget ? (totalExpenses / project.budget) * 100 : 0;

  // Phase chart data - comparing budget vs actual expenses by phase
  const phaseChartData = phases.map(phase => {
    // Get all subcategories for this phase
    const phaseSubcategories = subcategories.filter(s => s.phase_id === phase.id);
    const subcategoryNames = phaseSubcategories.map(s => s.name);
    
    // Calculate budget for this phase
    const phaseBudget = (project?.budget_items || [])
      .filter(item => subcategoryNames.includes(item.subcategory))
      .reduce((sum, item) => sum + (item.total_cost || 0), 0);
    
    // Calculate actual expenses for this phase
    const phaseExpenses = expenses
      .filter(exp => subcategoryNames.includes(exp.subcategory))
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      phase: phase.name,
      budget: phaseBudget,
      actual: phaseExpenses,
      color: phase.color
    };
  });

  // Add "Unassigned" phase for items without a phase
  const unassignedSubcategories = subcategories.filter(s => !s.phase_id).map(s => s.name);
  if (unassignedSubcategories.length > 0) {
    const unassignedBudget = (project?.budget_items || [])
      .filter(item => unassignedSubcategories.includes(item.subcategory))
      .reduce((sum, item) => sum + (item.total_cost || 0), 0);
    
    const unassignedExpenses = expenses
      .filter(exp => unassignedSubcategories.includes(exp.subcategory))
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    if (unassignedBudget > 0 || unassignedExpenses > 0) {
      phaseChartData.push({
        phase: "Unassigned",
        budget: unassignedBudget,
        actual: unassignedExpenses,
        color: "bg-gray-100 text-gray-700"
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Hero Section */}
      <div 
        className="relative h-64 md:h-80 overflow-hidden group cursor-move"
        onMouseDown={(e) => {
          setIsDragging(true);
          e.preventDefault();
        }}
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
          className="w-full h-full object-cover transition-all"
          style={{ objectPosition: `${imagePosition.x}% ${imagePosition.y}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        
        {/* Position indicator */}
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
        {/* Project Stats */}
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
                  {project.budget ? `$${(project.budget / 1000000).toFixed(1)}M` : "—"}
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
                  {project.target_completion
                    ? format(new Date(project.target_completion), "dd/MM/yy")
                    : "—"}
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
                <p className="text-xl font-bold text-[#1e3a5f]">
                  {taskStats.completed}/{taskStats.total}
                </p>
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

        {/* Tasks Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#1e3a5f]">Tasks</h2>
            <Button
              onClick={() => {
                setEditingTask(null);
                setShowTaskForm(true);
              }}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>

          {tasksLoading ? (
            <div className="text-center py-12 text-gray-500">Loading tasks...</div>
          ) : (
            <TaskBoard
              tasks={tasks}
              onAddTask={() => setShowTaskForm(true)}
              onEditTask={(task) => {
                setEditingTask(task);
                setShowTaskForm(true);
              }}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          )}
        </motion.div>

        {/* Budget vs Expenses Section */}
        {project.budget && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 mb-8"
          >
            <h2 className="text-xl font-semibold text-[#1e3a5f] mb-6">Budget vs Expenses</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget Overview Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Financial Overview</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Total Budget</span>
                      <span className="font-semibold text-[#1e3a5f]">€{project.budget?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Total Expenses</span>
                      <span className="font-semibold text-red-600">€{totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-gray-600">Remaining</span>
                      <span className={`font-semibold ${budgetRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        €{budgetRemaining.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className={`text-xs font-semibold inline-block ${budgetUsedPercent > 100 ? 'text-red-600' : budgetUsedPercent > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {budgetUsedPercent.toFixed(1)}% Used
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-100">
                        <div 
                          style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }} 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                            budgetUsedPercent > 100 ? 'bg-red-500' : budgetUsedPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      {budgetUsedPercent > 100 && (
                        <p className="text-xs text-red-600 mt-2">
                          ⚠️ Over budget by €{Math.abs(budgetRemaining).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Comparison */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Budget Comparison</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm text-gray-600">Budget</span>
                      <span className="text-sm font-medium">€{(project.budget / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="h-12 bg-[#1e3a5f]/10 rounded-lg relative overflow-hidden">
                      <div 
                        className="h-full bg-[#1e3a5f] rounded-lg transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm text-gray-600">Expenses</span>
                      <span className="text-sm font-medium">€{(totalExpenses / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="h-12 bg-red-50 rounded-lg relative overflow-hidden">
                      <div 
                        className={`h-full rounded-lg transition-all duration-500 ${
                          budgetUsedPercent > 100 ? 'bg-red-500' : budgetUsedPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min((totalExpenses / project.budget) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {budgetRemaining >= 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm text-emerald-800 font-medium">✓ Under Budget</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        You have €{budgetRemaining.toLocaleString()} remaining
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800 font-medium">⚠️ Over Budget</p>
                      <p className="text-xs text-red-600 mt-1">
                        Exceeded by €{Math.abs(budgetRemaining).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Phase Comparison Chart */}
            {phaseChartData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-6">Budget vs Expenses by Phase</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={phaseChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="phase" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value) => `€${value.toLocaleString()}`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="budget" fill="#c9a962" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="#1e3a5f" name="Actual Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}

        {/* Budget Breakdown Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#1e3a5f]">Budget Breakdown</h2>
            {!editingBudget ? (
              <Button
                onClick={() => {
                  setBudgetItems(project?.budget_items || []);
                  setEditingBudget(true);
                }}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Budget
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBudgetItems(project?.budget_items || []);
                    setEditingBudget(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveBudget}
                  className="bg-[#1e3a5f] hover:bg-[#152a45]"
                >
                  Save Budget
                </Button>
              </div>
            )}
          </div>

          {editingBudget ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">Budget Line Items</span>
                <Button
                  size="sm"
                  onClick={addBudgetItem}
                  className="bg-[#1e3a5f] hover:bg-[#152a45]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search budget items..."
                  value={budgetSearchQuery}
                  onChange={(e) => setBudgetSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {budgetItems.length > 0 ? (
                <div className="space-y-3">
                  {budgetItems
                    .filter(item => {
                      if (!budgetSearchQuery) return true;
                      const query = budgetSearchQuery.toLowerCase();
                      return (
                        item.description?.toLowerCase().includes(query) ||
                        item.category?.toLowerCase().includes(query) ||
                        item.subcategory?.toLowerCase().includes(query) ||
                        item.payee?.toLowerCase().includes(query) ||
                        item.payment_source?.toLowerCase().includes(query)
                      );
                    })
                    .map((item, index) => {
                    const isExpanded = expandedItems.has(item.id);
                    
                    return (
                      <div key={item.id} className="bg-gray-50 rounded-lg border">
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedItems);
                            if (isExpanded) {
                              newExpanded.delete(item.id);
                            } else {
                              newExpanded.add(item.id);
                            }
                            setExpandedItems(newExpanded);
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <span className="text-sm font-medium text-gray-900">
                              {item.description || `Budget Item ${index + 1}`}
                            </span>
                            <span className="text-xs text-gray-500">
                              {item.category} {item.subcategory && `• ${item.subcategory}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-[#1e3a5f]">
                              €{item.total_cost?.toLocaleString() || 0}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBudgetItem(item.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                                <Select
                                  value={item.category}
                                  onValueChange={(v) => updateBudgetItem(item.id, 'category', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getExpenseCategories().map((cat) => (
                                      <SelectItem key={cat} value={cat}>
                                        {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Subcategory</label>
                                {showNewSubcategory === item.id ? (
                                  <div className="flex gap-1">
                                    <Input
                                      value={newSubcategoryName}
                                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                                      placeholder="New subcategory"
                                      className="text-sm h-9"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (newSubcategoryName.trim()) {
                                            createSubcategoryMutation.mutate({ name: newSubcategoryName });
                                          }
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => {
                                        if (newSubcategoryName.trim()) {
                                          createSubcategoryMutation.mutate({ name: newSubcategoryName });
                                        }
                                      }}
                                      disabled={!newSubcategoryName.trim() || createSubcategoryMutation.isPending}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => {
                                        setShowNewSubcategory(null);
                                        setNewSubcategoryName("");
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <SearchableSelect
                                      items={subcategories.map(s => ({ value: s.name, label: s.name }))}
                                      value={item.subcategory}
                                      onValueChange={(v) => updateBudgetItem(item.id, 'subcategory', v)}
                                      placeholder="Select subcategory"
                                      searchPlaceholder="Search subcategories..."
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 p-0 shrink-0"
                                      onClick={() => setShowNewSubcategory(item.id)}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Payee</label>
                                {showNewContact === item.id ? (
                                  <div className="flex gap-1">
                                    <Input
                                      value={newContactName}
                                      onChange={(e) => setNewContactName(e.target.value)}
                                      placeholder="New contact"
                                      className="text-sm h-9"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (newContactName.trim()) {
                                            createContactMutation.mutate({ name: newContactName, category: "supplier" });
                                          }
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => {
                                        if (newContactName.trim()) {
                                          createContactMutation.mutate({ name: newContactName, category: "supplier" });
                                        }
                                      }}
                                      disabled={!newContactName.trim() || createContactMutation.isPending}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => {
                                        setShowNewContact(null);
                                        setNewContactName("");
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <SearchableSelect
                                      items={contacts.map(c => ({ value: c.name, label: c.name }))}
                                      value={item.payee}
                                      onValueChange={(v) => updateBudgetItem(item.id, 'payee', v)}
                                      placeholder="Select payee"
                                      searchPlaceholder="Search payees..."
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 p-0 shrink-0"
                                      onClick={() => setShowNewContact(item.id)}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Payment Source</label>
                                {showNewPaymentSource === item.id ? (
                                  <div className="flex gap-1">
                                    <Input
                                      value={newPaymentSourceName}
                                      onChange={(e) => setNewPaymentSourceName(e.target.value)}
                                      placeholder="e.g., Bank 01"
                                      className="text-sm h-9"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (newPaymentSourceName.trim()) {
                                            createPaymentSourceMutation.mutate({ name: newPaymentSourceName });
                                          }
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => {
                                        if (newPaymentSourceName.trim()) {
                                          createPaymentSourceMutation.mutate({ name: newPaymentSourceName });
                                        }
                                      }}
                                      disabled={!newPaymentSourceName.trim() || createPaymentSourceMutation.isPending}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => {
                                        setShowNewPaymentSource(null);
                                        setNewPaymentSourceName("");
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <SearchableSelect
                                      items={paymentSources.map(ps => ({ value: ps.name, label: ps.name }))}
                                      value={item.payment_source}
                                      onValueChange={(v) => updateBudgetItem(item.id, 'payment_source', v)}
                                      placeholder="Select source"
                                      searchPlaceholder="Search sources..."
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 p-0 shrink-0"
                                      onClick={() => setShowNewPaymentSource(item.id)}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Description</label>
                              <Input
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateBudgetItem(item.id, 'quantity', Number(e.target.value))}
                                  min="0"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                                <Select
                                  value={item.unit}
                                  onValueChange={(v) => updateBudgetItem(item.id, 'unit', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="m">m</SelectItem>
                                    <SelectItem value="m²">m²</SelectItem>
                                    <SelectItem value="m³">m³</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="piece">piece</SelectItem>
                                    <SelectItem value="day">day</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Unit Cost (€)</label>
                                <Input
                                  type="number"
                                  value={item.unit_cost}
                                  onChange={(e) => updateBudgetItem(item.id, 'unit_cost', Number(e.target.value))}
                                  min="0"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Total</label>
                                <div className="text-lg font-semibold text-[#1e3a5f] py-2">
                                  €{item.total_cost?.toLocaleString() || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No budget items yet. Click "Add Item" to start building your budget.
                </p>
              )}

              <div className="border-t pt-4 mt-4 flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Budget:</span>
                <span className="text-2xl font-bold text-[#1e3a5f]">
                  €{budgetItems.reduce((sum, item) => sum + (item.total_cost || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <>
              {project?.budget_items && project.budget_items.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search budget items..."
                        value={budgetSearchQuery}
                        onChange={(e) => setBudgetSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead style={{ width: columnWidths.category }} className="relative group">
                          Category
                          <div
                            onMouseDown={(e) => handleMouseDown('category', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.subcategory }} className="relative group">
                          Subcategory
                          <div
                            onMouseDown={(e) => handleMouseDown('subcategory', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.description }} className="relative group">
                          Description
                          <div
                            onMouseDown={(e) => handleMouseDown('description', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.payee }} className="relative group">
                          Payee
                          <div
                            onMouseDown={(e) => handleMouseDown('payee', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.payment }} className="relative group">
                          Payment Source
                          <div
                            onMouseDown={(e) => handleMouseDown('payment', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.quantity }} className="text-right relative group">
                          Quantity
                          <div
                            onMouseDown={(e) => handleMouseDown('quantity', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.unit }} className="relative group">
                          Unit
                          <div
                            onMouseDown={(e) => handleMouseDown('unit', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.unitCost }} className="text-right relative group">
                          Unit Cost
                          <div
                            onMouseDown={(e) => handleMouseDown('unitCost', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.total }} className="text-right relative group">
                          Total
                          <div
                            onMouseDown={(e) => handleMouseDown('total', e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1e3a5f] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.budget_items
                        .filter(item => {
                          if (!budgetSearchQuery) return true;
                          const query = budgetSearchQuery.toLowerCase();
                          return (
                            item.description?.toLowerCase().includes(query) ||
                            item.category?.toLowerCase().includes(query) ||
                            item.subcategory?.toLowerCase().includes(query) ||
                            item.payee?.toLowerCase().includes(query) ||
                            item.payment_source?.toLowerCase().includes(query)
                          );
                        })
                        .map((item, index) => {
                        const config = categoryConfig[item.category] || categoryConfig.general_expenses;
                        const Icon = config.icon;
                        
                        return (
                          <motion.tr
                            key={item.id || index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="hover:bg-gray-50/50 transition-colors group"
                          >
                            <TableCell>
                              <Badge className={`${config.color} border-0 gap-1.5`}>
                                <Icon className="w-3 h-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {item.subcategory || "—"}
                            </TableCell>
                            <TableCell className="text-gray-500 max-w-xs truncate">
                              {item.description || "—"}
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">
                              {item.payee || "—"}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {item.payment_source || "—"}
                            </TableCell>
                            <TableCell className="text-right text-gray-900">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {item.unit}
                            </TableCell>
                            <TableCell className="text-right text-gray-900">
                              {formatCurrency(item.unit_cost || 0)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-[#1e3a5f]">
                              {formatCurrency(item.total_cost || 0)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingBudget(true);
                                    setBudgetItems(project?.budget_items || []);
                                    setTimeout(() => {
                                      setExpandedItems(new Set([item.id]));
                                    }, 100);
                                  }}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      if (window.confirm('Delete this budget item?')) {
                                        const updatedItems = project.budget_items.filter(i => i.id !== item.id);
                                        const totalBudget = updatedItems.reduce((sum, i) => sum + (i.total_cost || 0), 0);
                                        await updateProjectMutation.mutateAsync({
                                          budget_items: updatedItems,
                                          budget: totalBudget
                                        });
                                      }
                                    }}
                                    className="text-red-600"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                      <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                        <TableCell colSpan={9} className="text-right font-bold text-gray-900">
                          Total Project Budget
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#1e3a5f] text-lg">
                          {formatCurrency(project.budget || 0)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </motion.div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No budget breakdown yet</p>
                  <Button
                    onClick={() => setEditingBudget(true)}
                    variant="outline"
                    className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Budget
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Forms */}
      <TaskForm
        task={editingTask}
        projectId={projectId}
        open={showTaskForm}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        users={users}
      />

      <ProjectForm
        project={project}
        open={showProjectForm}
        onClose={() => setShowProjectForm(false)}
        onSubmit={(data) => updateProjectMutation.mutateAsync(data)}
      />
    </div>
  );
}