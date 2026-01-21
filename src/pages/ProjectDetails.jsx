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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetails() {
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

  const { data: payees = [] } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list(),
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
      category: "",
      description: "",
      quantity: 1,
      unit: "unit",
      unit_cost: 0,
      total_cost: 0,
      payee: ""
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

  if (projectLoading || !project) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">Loading project...</p>
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

        {/* Budget Breakdown Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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

              {budgetItems.length > 0 ? (
                <div className="space-y-3">
                  {budgetItems.map((item) => (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-lg border space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Category</label>
                          <Input
                            placeholder="Category"
                            value={item.category}
                            onChange={(e) => updateBudgetItem(item.id, 'category', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Description</label>
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Payee</label>
                          <Select
                            value={item.payee}
                            onValueChange={(v) => updateBudgetItem(item.id, 'payee', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payee" />
                            </SelectTrigger>
                            <SelectContent>
                              {payees.map((payee) => (
                                <SelectItem key={payee.id} value={payee.name}>
                                  {payee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-3 items-end">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBudgetItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payee</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {project.budget_items.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.category}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.payee || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              €{item.unit_cost?.toLocaleString() || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1e3a5f] text-right">
                              €{item.total_cost?.toLocaleString() || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                            Total Project Budget:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-[#1e3a5f] text-right">
                            €{project.budget?.toLocaleString() || 0}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
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