import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  Receipt,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  Mail,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Analytics" },
  { name: "Projects", icon: Building2, page: "Projects" },
  { name: "Tasks", icon: ClipboardList, page: "Tasks" },
  { name: "Gantt", icon: BarChart3, page: "Gantt" },
  { name: "Notebook", icon: Calendar, page: "ConstructionNotebook" },
  { name: "Expenses", icon: Receipt, page: "Expenses" },
  { name: "Income", icon: TrendingUp, page: "Income" },
  { name: "Financial Overview", icon: DollarSign, page: "FinancialOverview" },
  { name: "Contacts", icon: Users, page: "Contacts" },
  { name: "Settings", icon: Settings, page: "Settings" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setLogoUrl(userData.logo_url);
    }).catch(() => {});
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ logo_url: file_url });
      setLogoUrl(file_url);
      setShowLogoDialog(false);
    } catch (error) {
      console.error("Error uploading logo:", error);
    }
    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    try {
      await base44.auth.updateMe({ logo_url: null });
      setLogoUrl(null);
      setShowLogoDialog(false);
    } catch (error) {
      console.error("Error removing logo:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Hide layout for project details hero
  const isProjectDetails = currentPageName === "ProjectDetails";

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowLogoDialog(true)}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 className="w-4 h-4 text-[#1e3a5f]" />
              )}
            </div>
            <span className="font-semibold text-[#1e3a5f]">PRVK</span>
          </button>
          <div className="w-10" />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-52 flex-col bg-white border-r border-gray-100 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <button
            onClick={() => setShowLogoDialog(true)}
            className="w-full h-32 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity group relative overflow-hidden"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-12 h-12 text-[#1e3a5f]" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/20"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#1e3a5f]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-[#c9a962] text-white">
                    {getInitials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-xl"
            >
              <div className="p-4 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLogoDialog(true)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Building2 className="w-5 h-5 text-[#1e3a5f]" />
                    )}
                  </button>
                  <span className="font-bold text-lg text-[#1e3a5f]">PRVK</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? "bg-[#1e3a5f] text-white"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`lg:ml-52 ${isProjectDetails ? "" : "pt-16 lg:pt-0"}`}>
        {children}
      </main>

      {/* Logo Upload Dialog */}
      <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Company Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="logo-upload">
                <Button
                  type="button"
                  className="w-full bg-[#1e3a5f] hover:bg-[#152a45]"
                  disabled={uploading}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              
              {logoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveLogo}
                  className="w-full"
                >
                  Remove Logo
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}