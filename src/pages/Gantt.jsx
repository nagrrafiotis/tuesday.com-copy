import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  planning: "bg-gray-400",
  in_progress: "bg-blue-500",
  on_hold: "bg-yellow-500",
  completed: "bg-green-500",
};

export default function Gantt() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const rangeStart = startOfMonth(currentMonth);
  const rangeEnd = endOfMonth(addMonths(currentMonth, 2));
  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;

  const months = [
    { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) },
    { start: startOfMonth(addMonths(currentMonth, 1)), end: endOfMonth(addMonths(currentMonth, 1)) },
    { start: startOfMonth(addMonths(currentMonth, 2)), end: endOfMonth(addMonths(currentMonth, 2)) },
  ];

  const projectsWithDates = projects.filter((p) => p.start_date && p.target_completion);

  const getTasksForProject = (projectId) => {
    return tasks.filter((t) => t.project_id === projectId && t.due_date);
  };

  const calculatePosition = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysFromRangeStart = differenceInDays(start, rangeStart);
    const duration = differenceInDays(end, start) + 1;

    const leftPercent = (daysFromRangeStart / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    return { left: `${Math.max(0, leftPercent)}%`, width: `${Math.min(100 - leftPercent, widthPercent)}%` };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading Gantt chart...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">Gantt Chart</h1>
          <p className="text-gray-600">Project timelines and task schedules</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -3))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-[#1e3a5f] flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(currentMonth, "MMMM yyyy")} - {format(addMonths(currentMonth, 2), "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 3))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Projects Timeline</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* Timeline Header - Months and Days */}
            <div className="sticky top-0 bg-white z-10 border-b mb-4">
              <div className="flex">
                <div className="w-64 shrink-0 bg-white"></div>
                <div className="flex-1 flex">
                  {months.map((month, idx) => {
                    const daysInThisMonth = differenceInDays(month.end, month.start) + 1;
                    return (
                      <div key={idx} className="flex-1 text-center font-semibold text-sm py-2 border-l border-r bg-white">
                        {format(month.start, "MMMM yyyy")}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex border-t">
                <div className="w-64 shrink-0 font-semibold text-sm py-2 bg-white">Project</div>
                <div className="flex-1 flex">
                  {months.map((month, monthIdx) => {
                    const daysInThisMonth = differenceInDays(month.end, month.start) + 1;
                    return (
                      <div key={monthIdx} className="flex-1 flex border-l bg-white">
                        {Array.from({ length: daysInThisMonth }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 text-center text-xs py-2 border-l"
                            style={{ minWidth: "20px" }}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Project Rows */}
            <div className="space-y-4">
              {projectsWithDates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No projects with dates for this period
                </p>
              ) : (
                projectsWithDates.map((project) => {
                  const projectTasks = getTasksForProject(project.id);
                  const position = calculatePosition(project.start_date, project.target_completion);

                  return (
                    <div key={project.id} className="border-b pb-4">
                      {/* Project Bar */}
                      <div className="flex items-center mb-2">
                        <Link
                          to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                          className="w-64 shrink-0 pr-4"
                        >
                          <div className="font-semibold text-sm hover:text-[#1e3a5f]">
                            {project.name}
                          </div>
                          <Badge className={`${statusColors[project.status]} text-white mt-1`}>
                            {project.status.replace("_", " ")}
                          </Badge>
                        </Link>
                        <div className="flex-1 relative h-8">
                          <div
                            className={`absolute h-full rounded ${statusColors[project.status]} opacity-80`}
                            style={position}
                            title={`${format(new Date(project.start_date), "dd/MM/yy")} - ${format(new Date(project.target_completion), "dd/MM/yy")}`}
                          />
                        </div>
                      </div>

                      {/* Task Bars */}
                      {projectTasks.map((task) => {
                        const taskPosition = calculatePosition(task.due_date, task.due_date);
                        return (
                          <div key={task.id} className="flex items-center ml-8">
                            <div className="w-56 shrink-0 pr-4 text-xs text-gray-600 truncate">
                              {task.title}
                            </div>
                            <div className="flex-1 relative h-4">
                              <div
                                className="absolute h-full rounded-full bg-[#c9a962]"
                                style={{ ...taskPosition, width: "8px" }}
                                title={`${task.title} - ${format(new Date(task.due_date), "dd/MM/yy")}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded bg-gray-400" />
                <span className="text-sm">Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded bg-blue-500" />
                <span className="text-sm">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded bg-yellow-500" />
                <span className="text-sm">On Hold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded bg-green-500" />
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#c9a962]" />
                <span className="text-sm">Task Due Date</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}