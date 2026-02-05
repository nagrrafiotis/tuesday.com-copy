import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import StatsCard from "@/components/dashboard/StatsCard";
import ProjectCard from "@/components/projects/ProjectCard";
import TaskCard from "@/components/tasks/TaskCard";
import { 
  Building2, 
  ClipboardList, 
  TrendingUp, 
  Clock,
  Plus,
  ArrowRight,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date"),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "in_progress").length,
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status !== "completed").length,
    avgProgress: projects.length
      ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
      : 0,
  };

  const recentProjects = projects;
  const upcomingTasks = tasks
    .filter((t) => t.status !== "completed" && t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  if (projectsLoading || tasksLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">Loading dashboard...</p>
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
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back to your project overview</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatsCard
            title="Total Projects"
            value={stats.totalProjects}
            subtitle={`${stats.activeProjects} active`}
            icon={Building2}
            color="navy"
          />
          <StatsCard
            title="Active Tasks"
            value={stats.pendingTasks}
            subtitle={`${stats.totalTasks} total`}
            icon={ClipboardList}
            color="gold"
          />
          <StatsCard
            title="Avg. Progress"
            value={`${stats.avgProgress}%`}
            subtitle="across all projects"
            icon={TrendingUp}
            color="white"
          />
          <StatsCard
            title="This Week"
            value={upcomingTasks.length}
            subtitle="upcoming deadlines"
            icon={Clock}
            color="white"
          />
        </div>

        {/* All Projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-[#1e3a5f]">All Projects</h2>
            <Link to={createPageUrl("Projects")}>
              <Button className="bg-[#1e3a5f] hover:bg-[#152a45]">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {recentProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center"
            >
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Start by creating your first development project</p>
              <Link to={createPageUrl("Projects")}>
                <Button className="bg-[#1e3a5f] hover:bg-[#152a45]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-[#1e3a5f]">Upcoming Tasks</h2>
              <Link to={createPageUrl("Tasks")}>
                <Button variant="ghost" className="text-[#c9a962] hover:text-[#b89952]">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {upcomingTasks.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(task.due_date), "d MMM yyyy")}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.priority === "urgent" ? "bg-red-100 text-red-600" :
                          task.priority === "high" ? "bg-orange-100 text-orange-600" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No upcoming tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}