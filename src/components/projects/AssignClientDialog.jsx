import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserCheck, Eye } from "lucide-react";

export default function AssignClientDialog({ project, open, onClose }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-settings"],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const clientUsers = users.filter(u => u.role === "client" || u.role === "user" || u.role === "admin");
  const assignedClients = users.filter(u => u.allowed_project_id === project?.id);

  const handleAssign = async (userId, assign) => {
    setSaving(true);
    const user = users.find(u => u.id === userId);
    await base44.entities.User.update(userId, {
      role: assign ? "client" : (user.role === "client" ? "user" : user.role),
      allowed_project_id: assign ? project.id : null,
    });
    queryClient.invalidateQueries({ queryKey: ["all-users-settings"] });
    setSaving(false);
  };

  const [selectedUser, setSelectedUser] = useState("");

  const unassignedUsers = users.filter(u => u.allowed_project_id !== project?.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1e3a5f]" />
            Ανάθεση Client — {project?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently assigned */}
          {assignedClients.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ανατεθειμένοι Clients</p>
              <div className="space-y-2">
                {assignedClients.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.full_name || "—"}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7"
                      disabled={saving}
                      onClick={() => handleAssign(u.id, false)}
                    >
                      Αφαίρεση
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new client */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Προσθήκη Client</p>
            <div className="flex gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Επιλογή χρήστη..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex flex-col">
                        <span>{u.full_name || u.email}</span>
                        <span className="text-xs text-gray-400">{u.email}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
                disabled={!selectedUser || saving}
                onClick={async () => {
                  await handleAssign(selectedUser, true);
                  setSelectedUser("");
                }}
              >
                Ανάθεση
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Ο χρήστης θα αποκτήσει ρόλο Client και θα βλέπει μόνο αυτό το έργο.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}