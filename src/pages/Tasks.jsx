import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskForm from "@/components/tasks/TaskForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ClipboardList } from "lucide-react";

export default function Tasks() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setEditingTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleSubmit = async (data) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    await updateMutation.mutateAsync({ id: task.id, data: { ...task, status: newStatus } });
  };

  const handleDeleteTask = async (task) => {
    if (window.confirm(`Delete task "${task.title}"?`)) {
      await deleteMutation.mutateAsync(task.id);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title?.toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === "all" || t.project_id === projectFilter;
    const matchesPhase = phaseFilter === "all" || t.phase === phaseFilter;
    return matchesSearch && matchesProject && matchesPhase;
  });

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f]">All Tasks</h1>
            <p className="text-gray-500 mt-1">Manage tasks across all projects</p>
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setSelectedProjectId(projects[0]?.id || null);
              setShowForm(true);
            }}
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
            disabled={projects.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phases</SelectItem>
                  <SelectItem value="pre_construction">Pre-Construction</SelectItem>
                  <SelectItem value="permits">Permits</SelectItem>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="finishing">Finishing</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="handover">Handover</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Task Board or Empty State */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center"
          >
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No projects yet</h3>
            <p className="text-gray-500">Create a project first to start adding tasks</p>
          </motion.div>
        ) : filteredTasks.length === 0 && (search || projectFilter !== "all" || phaseFilter !== "all") ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center"
          >
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No tasks match your filters</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </motion.div>
        ) : (
          <TaskBoard
            tasks={filteredTasks}
            onAddTask={() => {
              setEditingTask(null);
              setSelectedProjectId(projectFilter !== "all" ? projectFilter : projects[0]?.id);
              setShowForm(true);
            }}
            onEditTask={(task) => {
              setEditingTask(task);
              setSelectedProjectId(task.project_id);
              setShowForm(true);
            }}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Form */}
      <TaskForm
        task={editingTask}
        projectId={selectedProjectId}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmit}
        users={users}
      />
    </div>
  );
}