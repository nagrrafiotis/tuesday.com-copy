import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { BarChart3, TrendingUp, Target, Clock, Folder, Activity, CheckCircle2, Calendar as CalendarIcon, ClipboardList } from "lucide-react";
import { subDays, isAfter, isBefore, format, isSameDay, startOfDay } from 'date-fns';
import { motion } from "framer-motion";
import ExpenseCharts from "@/components/analytics/ExpenseCharts";
import BudgetVsExpensesChart from "@/components/analytics/BudgetVsExpensesChart";
import PaymentSourceSummary from "@/components/bank/PaymentSourceSummary";

export default function AnalyticsPage() {
  const [boards, setBoards] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-due_date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });



  const { data: boardsData = [], isLoading: boardsLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => base44.entities.Board.list("-updated_date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: itemsData = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.Item.list("-updated_date"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setBoards(boardsData);
    setItems(itemsData);
    setIsLoading(boardsLoading || itemsLoading);
  }, [boardsData, itemsData, boardsLoading, itemsLoading]);

  // Filter data based on selections
  const filteredItems = items.filter(item => {
    // Filter by board
    if (selectedBoard !== 'all' && item.board_id !== selectedBoard) {
      return false;
    }
    
    // Filter by time range
    const daysAgo = parseInt(selectedTimeRange);
    const cutoffDate = subDays(new Date(), daysAgo);
    return isAfter(new Date(item.updated_date), cutoffDate);
  });

  const filteredBoards = selectedBoard === 'all' ? boards : boards.filter(b => b.id === selectedBoard);

  // Calculate analytics
  const totalTasks = filteredItems.length;
  const completedTasks = filteredItems.filter(item => {
    const statusColumn = boards.find(b => b.id === item.board_id)?.columns?.find(col => col.type === 'status');
    return item.data?.[statusColumn?.id] === 'Done';
  }).length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Overdue tasks
  const overdueTasks = filteredItems.filter(item => {
    const board = boards.find(b => b.id === item.board_id);
    const dueDateColumn = board?.columns?.find(col => col.type === 'date');
    const statusColumn = board?.columns?.find(col => col.type === 'status');
    
    const dueDate = item.data?.[dueDateColumn?.id];
    const status = item.data?.[statusColumn?.id];
    
    if (!dueDate || status === 'Done') return false;
    return isBefore(new Date(dueDate), new Date());
  }).length;

  // Board performance
  const boardStats = filteredBoards.map(board => {
    const boardItems = filteredItems.filter(item => item.board_id === board.id);
    const statusColumn = board.columns?.find(col => col.type === 'status');
    const completed = boardItems.filter(item => item.data?.[statusColumn?.id] === 'Done').length;
    const total = boardItems.length;
    
    return {
      ...board,
      totalTasks: total,
      completedTasks: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  // Status distribution
  const statusDistribution = {};
  filteredItems.forEach(item => {
    const board = boards.find(b => b.id === item.board_id);
    const statusColumn = board?.columns?.find(col => col.type === 'status');
    const status = item.data?.[statusColumn?.id] || 'Not Started';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });

  // Priority distribution
  const priorityDistribution = {};
  filteredItems.forEach(item => {
    const board = boards.find(b => b.id === item.board_id);
    const priorityColumn = board?.columns?.find(col => col.type === 'priority');
    const priority = item.data?.[priorityColumn?.id] || 'Medium';
    priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;
  });

  // Task analytics
  const totalTasksFromEntity = tasks.length;
  const completedTasksFromEntity = tasks.filter(t => t.status === 'completed').length;
  const pendingTasksFromEntity = tasks.filter(t => t.status !== 'completed').length;
  const overdueTasksFromEntity = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return isBefore(new Date(t.due_date), new Date());
  }).length;

  // Tasks by status
  const taskStatusDistribution = {
    'To Do': tasks.filter(t => t.status === 'todo').length,
    'In Progress': tasks.filter(t => t.status === 'in_progress').length,
    'Review': tasks.filter(t => t.status === 'review').length,
    'Completed': tasks.filter(t => t.status === 'completed').length,
  };

  // Calendar data
  const tasksWithDates = tasks.filter(t => t.due_date);
  const selectedDayTasks = tasksWithDates.filter(task =>
    isSameDay(new Date(task.due_date), selectedDate)
  );

  const dayHasTasks = (date) => {
    return tasksWithDates.some(task => isSameDay(new Date(task.due_date), date));
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

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

  if (isLoading) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-[1600px] mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#323338]">Analytics Dashboard</h1>
            <p className="text-[#676879] mt-2">Insights and metrics across your boards and tasks</p>
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedBoard} onValueChange={setSelectedBoard}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
                <SelectItem value="999999">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Total Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalTasksFromEntity}</div>
                <p className="text-blue-100 text-sm">{pendingTasksFromEntity} pending</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{completedTasksFromEntity}</div>
                <p className="text-green-100 text-sm">
                  {totalTasksFromEntity > 0 ? Math.round((completedTasksFromEntity / totalTasksFromEntity) * 100) : 0}% completion rate
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overdueTasksFromEntity}</div>
                <p className="text-red-100 text-sm">Need attention</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Active Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{projects.filter(p => p.status === 'in_progress').length}</div>
                <p className="text-purple-100 text-sm">{projects.length} total</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Boards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filteredBoards.length}</div>
                <p className="text-indigo-100 text-sm">Boards in use</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Task Status and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Task Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Task Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(taskStatusDistribution).map(([status, count]) => {
                  const percentage = totalTasksFromEntity > 0 ? Math.round((count / totalTasksFromEntity) * 100) : 0;
                  const colorMap = {
                    'To Do': '#9CA3AF',
                    'In Progress': '#3B82F6',
                    'Review': '#8B5CF6',
                    'Completed': '#10B981'
                  };
                  const color = colorMap[status];
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: color 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-500" />
                Task Calendar - {format(selectedDate, "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
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
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 text-sm">
                  Tasks for {format(selectedDate, "dd MMM yyyy")}
                </h3>
                {selectedDayTasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tasks scheduled for this day</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedDayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 border rounded-lg hover:shadow-md transition-shadow"
                      >
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Source Summary */}
        <div className="mb-8">
          <PaymentSourceSummary />
        </div>

        {/* Budget vs Expenses Chart */}
        <div className="mb-8">
          <BudgetVsExpensesChart />
        </div>

        {/* Expense Charts */}
        {expenses.length > 0 && (
          <div className="mb-8">
            <ExpenseCharts expenses={expenses} />
          </div>
        )}

        {/* Board Performance */}
        {selectedBoard === 'all' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Board Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {boardStats.map((board, index) => (
                  <motion.div
                    key={board.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-lg"
                        style={{ backgroundColor: board.color || '#0073EA' }}
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{board.title}</h4>
                        <p className="text-sm text-gray-500">
                          {board.completedTasks} of {board.totalTasks} tasks completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${board.completionRate}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="min-w-[3rem] justify-center">
                        {board.completionRate}%
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed':
      return '#00C875';
    case 'working on it':
    case 'working':
    case 'in progress':
      return '#FFCB00';
    case 'stuck':
      return '#E2445C';
    default:
      return '#C4C4C4';
  }
}

function getPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'critical':
      return '#E2445C';
    case 'high':
      return '#FDAB3D';
    case 'medium':
      return '#FFCB00';
    case 'low':
      return '#787D80';
    default:
      return '#C4C4C4';
  }
}