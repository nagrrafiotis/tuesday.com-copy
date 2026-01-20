import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusColors = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
};

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const tasksWithDates = tasks.filter((task) => task.due_date);

  const selectedDayTasks = tasksWithDates.filter((task) =>
    isSameDay(new Date(task.due_date), selectedDate)
  );

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const dayHasTasks = (date) => {
    return tasksWithDates.some((task) => isSameDay(new Date(task.due_date), date));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">Task Calendar</h1>
          <p className="text-gray-600">View and manage tasks by due date</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                {format(selectedDate, "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border w-full"
                modifiers={{
                  hasTasks: (date) => dayHasTasks(date),
                }}
                modifiersStyles={{
                  hasTasks: {
                    fontWeight: "bold",
                    backgroundColor: "#1e3a5f",
                    color: "white",
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Tasks for Selected Day */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {format(selectedDate, "dd MMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDayTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">No tasks scheduled for this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayTasks.map((task) => (
                    <Link
                      key={task.id}
                      to={createPageUrl("ProjectDetails") + "?id=" + task.project_id}
                      className="block"
                    >
                      <div className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-sm line-clamp-2">{task.title}</h4>
                          <Badge className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                        </div>
                        <Badge className={statusColors[task.status]} variant="outline">
                          {task.status.replace("_", " ")}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-2">
                          {getProjectName(task.project_id)}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tasks */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasksWithDates
                .filter((task) => new Date(task.due_date) >= new Date())
                .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                .map((task) => (
                  <Link
                    key={task.id}
                    to={createPageUrl("ProjectDetails") + "?id=" + task.project_id}
                    className="block"
                  >
                    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold">{task.title}</h4>
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={statusColors[task.status]} variant="outline">
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline">
                          {format(new Date(task.due_date), "dd/MM/yy")}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{getProjectName(task.project_id)}</p>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}