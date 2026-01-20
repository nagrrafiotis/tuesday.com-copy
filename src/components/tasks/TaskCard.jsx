import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, MoreHorizontal, GripVertical } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, dragHandleProps }) {
  const priorityColors = {
    low: "bg-gray-100 text-gray-600 border-gray-200",
    medium: "bg-blue-50 text-blue-600 border-blue-200",
    high: "bg-orange-50 text-orange-600 border-orange-200",
    urgent: "bg-red-50 text-red-600 border-red-200",
  };

  const phaseLabels = {
    pre_construction: "Pre-Construction",
    permits: "Permits",
    foundation: "Foundation",
    construction: "Construction",
    finishing: "Finishing",
    inspection: "Inspection",
    handover: "Handover",
  };

  const getInitials = (email) => {
    if (!email) return "?";
    return email.split("@")[0].slice(0, 2).toUpperCase();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#c9a962]/30 transition-all group"
    >
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            <GripVertical className="w-4 h-4 text-gray-300" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(task)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange?.(task, "todo")}>Move to Todo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange?.(task, "in_progress")}>Move to In Progress</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange?.(task, "review")}>Move to Review</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange?.(task, "completed")}>Move to Completed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(task)} className="text-red-600">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
            {task.phase && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                {phaseLabels[task.phase]}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(task.due_date), "MMM d")}</span>
                </div>
              )}
              {task.estimated_hours && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimated_hours}h</span>
                </div>
              )}
            </div>

            {task.assignee && (
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-[#1e3a5f] text-white">
                  {getInitials(task.assignee)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}