import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, Check, X } from "lucide-react";

export default function ClientAccessManager() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({}); // { userId: { role, allowed_project_id } }

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-settings"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-settings"],
    queryFn: () => base44.entities.Project.list("name"),
  });

  const clientUsers = users.filter(u => u.role === "client");
  const nonClientUsers = users.filter(u => u.role !== "client");

  const getPending = (userId) => pendingChanges[userId];

  const handleChange = (userId, field, value) => {
    const user = users.find(u => u.id === userId);
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        role: user.role,
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
    setSavingId(false);
  };

  const handleCancel = (userId) => {
    setPendingChanges(prev => { const n = { ...prev }; delete n[userId]; return n; });
  };

  const getEffectiveValue = (user, field) => {
    return pendingChanges[user.id]?.[field] ?? user[field] ?? "";
  };

  return (
    <Card className="bg-white shadow-sm mb-8">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-[#1e3a5f]" />
          <div>
            <CardTitle className="text-xl text-[#1e3a5f]">Πρόσβαση Πελατών (View-Only)</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Δώστε σε χρήστες ρόλο "client" και ορίστε ποιο έργο μπορούν να παρακολουθούν
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* How it works info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Πώς λειτουργεί:</strong> Οι χρήστες με ρόλο <strong>client</strong> ανακατευθύνονται αυτόματα στη σελίδα παρακολούθησης του έργου τους (read-only). Δεν βλέπουν τίποτα άλλο από την εφαρμογή.
          <br />
          <strong>Για να προσθέσετε πελάτη:</strong> Προσκαλέστε τον από το Dashboard → Users, στη συνέχεια ορίστε εδώ τον ρόλο "client" και το αντίστοιχο έργο.
        </div>

        {/* Current clients */}
        {clientUsers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                {clientUsers.length} ενεργοί πελάτες
              </Badge>
            </h3>
            <div className="space-y-2">
              {clientUsers.map(user => {
                const project = projects.find(p => p.id === getEffectiveValue(user, "allowed_project_id"));
                const hasPending = !!pendingChanges[user.id];
                return (
                  <div key={user.id} className="flex flex-wrap items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={getEffectiveValue(user, "role")}
                        onValueChange={(v) => handleChange(user.id, "role", v)}
                      >
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="client">client</SelectItem>
                        </SelectContent>
                      </Select>
                      {getEffectiveValue(user, "role") === "client" && (
                        <Select
                          value={getEffectiveValue(user, "allowed_project_id") || "none"}
                          onValueChange={(v) => handleChange(user.id, "allowed_project_id", v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-8 w-44 text-xs">
                            <SelectValue placeholder="Επιλογή έργου..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Κανένα έργο —</SelectItem>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {hasPending && (
                        <>
                          <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleSave(user.id)} disabled={savingId === user.id}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => handleCancel(user.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    {!hasPending && project && (
                      <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] border-0 text-xs">
                        📂 {project.name}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All other users — assign client role */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Λοιποί χρήστες</h3>
          <div className="space-y-2">
            {nonClientUsers.map(user => {
              const hasPending = !!pendingChanges[user.id];
              const effectiveRole = getEffectiveValue(user, "role");
              return (
                <div key={user.id} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={effectiveRole}
                      onValueChange={(v) => handleChange(user.id, "role", v)}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="client">client</SelectItem>
                      </SelectContent>
                    </Select>
                    {effectiveRole === "client" && (
                      <Select
                        value={getEffectiveValue(user, "allowed_project_id") || "none"}
                        onValueChange={(v) => handleChange(user.id, "allowed_project_id", v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue placeholder="Επιλογή έργου..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Κανένα έργο —</SelectItem>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {hasPending && (
                      <>
                        <Button size="icon" className="h-8 w-8 bg-[#1e3a5f] hover:bg-[#152a45]"
                          onClick={() => handleSave(user.id)} disabled={savingId === user.id}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => handleCancel(user.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {nonClientUsers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Δεν υπάρχουν άλλοι χρήστες.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}