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


  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
  });



  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });



  const { data: phasesList = [] } = useQuery({
    queryKey: ["phases-list"],
    queryFn: async () => {
      const lists = await base44.entities.DropdownList.list();
      return lists.find(l => l.list_name === "project_phases");
    },
  });
  
  const phases = phasesList?.options || [];

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



  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };



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
  const phaseColors = phasesList?.colors || {};
  
  // Create a map of subcategory names to their phases
  const subcategoryToPhase = {};
  subcategories.forEach(subcat => {
    if (subcat.phase_id) {
      subcategoryToPhase[subcat.name] = subcat.phase_id;
    }
  });
  
  // Show ALL phases, even with zero data
  const phaseChartData = phases.map(phaseName => {
    // Get all subcategory names for this phase
    const subcategoryNames = Object.keys(subcategoryToPhase).filter(
      name => subcategoryToPhase[name] === phaseName
    );
    
    // Calculate budget for this phase
    const phaseBudget = (project?.budget_items || [])
      .filter(item => subcategoryNames.includes(item.subcategory))
      .reduce((sum, item) => sum + (item.total_cost || 0), 0);
    
    // Calculate actual expenses for this phase
    const phaseExpenses = expenses
      .filter(exp => subcategoryNames.includes(exp.subcategory))
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      phase: phaseName,
      budget: phaseBudget,
      actual: phaseExpenses,
      color: phaseColors[phaseName] || "bg-gray-100 text-gray-700"
    };
  });

  // Add "Unassigned" phase for items without a phase
  const assignedSubcategories = new Set(Object.keys(subcategoryToPhase));
  const allBudgetSubcategories = [...new Set((project?.budget_items || []).map(item => item.subcategory).filter(Boolean))];
  const allExpenseSubcategories = [...new Set(expenses.map(exp => exp.subcategory).filter(Boolean))];
  const unassignedSubcategories = [...new Set([...allBudgetSubcategories, ...allExpenseSubcategories])].filter(
    name => !assignedSubcategories.has(name)
  );
  
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
            {phases.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-6">Budget vs Expenses by Phase</h3>
                <div className="space-y-6">
                  {phaseChartData.map((phase, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{phase.phase}</span>
                        <div className="flex gap-6 text-xs">
                          <span className="text-[#c9a962]">Budget: €{phase.budget.toLocaleString()}</span>
                          <span className="text-[#1e3a5f]">Actual: €{phase.actual.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="h-10 bg-[#c9a962]/10 rounded-lg overflow-hidden">
                              <div 
                                className="h-full bg-[#c9a962] rounded-lg transition-all duration-500"
                                style={{ width: phase.budget > 0 ? '100%' : '0%' }}
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="h-10 bg-[#1e3a5f]/10 rounded-lg overflow-hidden">
                              <div 
                                className="h-full bg-[#1e3a5f] rounded-lg transition-all duration-500"
                                style={{ 
                                  width: phase.budget > 0 
                                    ? `${Math.min((phase.actual / phase.budget) * 100, 100)}%` 
                                    : phase.actual > 0 ? '100%' : '0%'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}


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