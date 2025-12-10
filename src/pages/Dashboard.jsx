
import React, { useState, useEffect } from "react";
import { Board } from "@/entities/Board";
import { Item } from "@/entities/Item";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Folder,
  BarChart3,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

import StatsOverview from "../components/dashboard/StatsOverview";
import RecentBoards from "../components/dashboard/RecentBoards";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import QuickActions from "../components/dashboard/QuickActions";

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [boardsData, itemsData, userData] = await Promise.all([
        Board.list("-updated_date", 10),
        Item.list("-updated_date", 20),
        User.me()
      ]);
      
      setBoards(boardsData);
      setItems(itemsData);
      setUser(userData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  const handleCreateBoard = async (boardData) => {
    try {
      const newBoard = await Board.create(boardData);
      // Prepend new board to the list to show it immediately
      setBoards(prev => [newBoard, ...prev]);
    } catch (error) {
      console.error("Error creating board:", error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const pendingTasks = items.filter(item => !item.data?.status || item.data?.status !== 'done').length;

  return (
    <div className="p-4 md:p-8 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section - Made more compact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="bg-gradient-to-br from-white via-white to-blue-50/30 rounded-2xl p-6 md:p-8 shadow-sm border border-white/60">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#323338] leading-tight">
                    {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
                  </h1>
                  <p className="text-[#676879] text-base mt-1">
                    Ready to make today productive? {pendingTasks > 0 && `You have ${pendingTasks} tasks waiting.`}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link to={createPageUrl("Boards")}>
                    <Button className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-xl h-10 px-5 font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                      <Folder className="w-4 h-4 mr-2" />
                      View All Boards
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link to={createPageUrl("Analytics")}>
                    <Button variant="outline" className="border-2 border-[#E1E5F3] hover:border-[#0073EA] hover:bg-[#0073EA]/5 rounded-xl h-10 px-5 font-medium transition-all duration-200">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
            
            {/* Subtle background decoration - made smaller */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-10 -translate-x-10"></div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <StatsOverview 
          boards={boards}
          items={items}
          isLoading={isLoading}
        />

        {/* Main Content Grid */}
        <div className="grid xl:grid-cols-4 gap-8">
          {/* Left Column - Boards and Activity */}
          <div className="xl:col-span-3 space-y-8">
            <RecentBoards 
              boards={boards}
              isLoading={isLoading}
              onCreateBoard={handleCreateBoard}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            <QuickActions onCreateBoard={handleCreateBoard} />
            <ActivityFeed 
              items={items.slice(0, 5)}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
