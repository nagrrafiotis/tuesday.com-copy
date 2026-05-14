import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Check, X, Shield, User, Eye } from "lucide-react";

const ROLE_CONFIG = {
  admin: { label: "Admin", icon: Shield, color: "bg-red-100 text-red-700" },
  user:  { label: "User",  icon: User,   color: "bg-blue-100 text-blue-700" },
  client:{ label: "Client",icon: Eye,    color: "bg-emerald-100 text-emerald-700" },
};

export default function ClientAccessManager() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-settings"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-settings"],
    queryFn: () => base44.entities.Project.list("name"),
  });

  const handleChange = (userId, field, value) => {
    const user = users.find(u => u.id === userId);
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        role: user.role || "user",
        allowed_project_id: user.allowed_project_id || "",
        ...prev[userId],
        [field]: value,
      }
    }));
  };

  const handleSave = async (userId) => {
    const changes = pendingChanges[userId];
    if (!changes) return;
    setSavingId(userId);
    await base44.entities.User.update(userId, {
      role: changes.role,
      allowed_project_id: changes.role === "client" ? (changes.allowed_project_id || null) : null,
    });
    setPendingChanges(prev => { const n = { ...prev }; delete n[userId]; return n; });
    queryClient.invalidateQueries({ queryKey: ["all-users-settings"] });
    setSavingId(null);
  };

  const handleCancel = (userId) => {
    setPendingChanges(prev => { const n = { ...prev }; delete n[userId]; return n; });
  };

  const getEffective = (user, field) =>
    pendingChanges[user.id]?.[field] ?? user[field] ?? "";

  return (
    <Card className="bg-white shadow-sm mb-8">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#1e3a5f]" />
          <div>
            <CardTitle className="text-xl text-[#1e3a5f]">Διαχείριση Χρηστών</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Ορίστε ρόλο και πρόσβαση για κάθε χρήστη. Οι <strong>clients</strong> βλέπουν μόνο το έργο τους.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Για να προσθέσετε χρήστη:</strong> Προσκαλέστε τον από το Dashboard → Users, κι έπειτα ορίστε εδώ τον ρόλο του.
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-4">Χρήστης</div>
          <div className="col-span-3">Ρόλος</div>
          <div className="col-span-4">Έργο (μόνο για clients)</div>
          <div className="col-span-1"></div>
        </div>

        {users.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Δεν βρέθηκαν χρήστες.</p>
        )}

        {users.map(user => {
          const hasPending = !!pendingChanges[user.id];
          const effectiveRole = getEffective(user, "role") || "user";
          const effectiveProjectId = getEffective(user, "allowed_project_id");
          const assignedProject = projects.find(p => p.id === (hasPending ? effectiveProjectId : user.allowed_project_id));
          const roleCfg = ROLE_CONFIG[effectiveRole] || ROLE_CONFIG.user;

          return (
            <div
              key={user.id}
              className={`grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 rounded-lg border transition-colors ${
                hasPending ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100 hover:border-gray-200"
              }`}
            >
              {/* User info */}
              <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${roleCfg.color}`}>
                  {user.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{user.full_name || "—"}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* Role selector */}
              <div className="sm:col-span-3">
                <Select value={effectiveRole} onValueChange={(v) => handleChange(user.id, "role", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-red-500" />Admin</span>
                    </SelectItem>
                    <SelectItem value="user">
                      <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-blue-500" />User</span>
                    </SelectItem>
                    <SelectItem value="client">
                      <span className="flex items-center gap-1.5"><Eye className="w-3 h-3 text-emerald-500" />Client</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project selector (only for client role) */}
              <div className="sm:col-span-4">
                {effectiveRole === "client" ? (
                  <Select
                    value={effectiveProjectId || "none"}
                    onValueChange={(v) => handleChange(user.id, "allowed_project_id", v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Επιλογή έργου..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Κανένα έργο —</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-gray-300 italic">—</span>
                )}
              </div>

              {/* Save / Cancel or status badge */}
              <div className="sm:col-span-1 flex items-center gap-1 justify-end">
                {hasPending ? (
                  <>
                    <Button
                      size="icon"
                      className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleSave(user.id)}
                      disabled={savingId === user.id}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleCancel(user.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <Badge className={`text-xs border-0 ${roleCfg.color}`}>
                    {roleCfg.label}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}