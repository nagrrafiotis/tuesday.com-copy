import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Calendar, DollarSign, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProjectCard({ project, onEdit, onDelete, index = 0 }) {
  const statusColors = {
    planning: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    on_hold: "bg-gray-100 text-gray-700",
    completed: "bg-emerald-100 text-emerald-700",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-100 text-blue-600",
    high: "bg-orange-100 text-orange-600",
    critical: "bg-red-100 text-red-600",
  };

  const propertyIcons = {
    residential: "🏠",
    commercial: "🏢",
    mixed_use: "🏗️",
    industrial: "🏭",
    land: "🌍",
  };

  const defaultImages = {
    residential: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    commercial: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
    mixed_use: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
    industrial: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    land: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#c9a962]/30 transition-all duration-300"
    >
      <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
        <div className="relative h-44 overflow-hidden">
          <img
            src={project.cover_image || defaultImages[project.property_type] || defaultImages.residential}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={`${statusColors[project.status]} border-0 font-medium`}>
              {project.status?.replace("_", " ")}
            </Badge>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white font-semibold text-lg truncate">{project.name}</h3>
          </div>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
          <span className="text-lg">{propertyIcons[project.property_type]}</span>
          <span className="capitalize">{project.property_type?.replace("_", " ")}</span>
          {project.priority && (
            <Badge className={`${priorityColors[project.priority]} border-0 text-xs ml-auto`}>
              {project.priority}
            </Badge>
          )}
        </div>

        {project.address && (
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{project.address}</span>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="font-semibold text-[#1e3a5f]">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-2 bg-gray-100" />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {project.target_completion && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(project.target_completion), "MMM yyyy")}</span>
              </div>
            )}
            {project.budget && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>{(project.budget / 1000000).toFixed(1)}M</span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors" onClick={(e) => e.preventDefault()}>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(project)}>Edit Project</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(project)} className="text-red-600">
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}