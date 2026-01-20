import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskCard from "./TaskCard";
import { Plus, Circle, ArrowRight, Eye, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const columns = [
  { id: "todo", title: "To Do", icon: Circle, color: "bg-gray-100 text-gray-600" },
  { id: "in_progress", title: "In Progress", icon: ArrowRight, color: "bg-blue-100 text-blue-600" },
  { id: "review", title: "Review", icon: Eye, color: "bg-amber-100 text-amber-600" },
  { id: "completed", title: "Completed", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
];

export default function TaskBoard({ tasks, onAddTask, onEditTask, onDeleteTask, onStatusChange }) {
  const getTasksByStatus = (status) => tasks.filter((t) => t.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        const Icon = column.icon;

        return (
          <div key={column.id} className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${column.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              {column.id === "todo" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddTask?.(column.id)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 bg-gray-50/50 rounded-xl p-3 min-h-[400px] space-y-3">
              <AnimatePresence>
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </AnimatePresence>

              {columnTasks.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-32 text-gray-400"
                >
                  <p className="text-sm">No tasks</p>
                </motion.div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}