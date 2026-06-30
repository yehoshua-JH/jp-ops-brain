import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Plus, Key, Shield, Trash2, Lock } from "lucide-react";

type Role = "user" | "admin" | "superadmin";

const ROLE_COLORS: Record<Role, string> = {
  superadmin: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data: users = [], isLoading } = trpc.users.getAll.useQuery();

  // Create user dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("admin");

  // Reset password dialog
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetUserName, setResetUserName] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");

  // Change own password dialog
  const [showChangeOwn, setShowChangeOwn] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [ownNewPassword, setOwnNewPassword] = useState("");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      utils.users.getAll.invalidate();
      setShowCreate(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("admin");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetUserId(null);
      setNewResetPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const roleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.users.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted");
      utils.users.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const changeOwnMutation = trpc.users.changeOwnPassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowChangeOwn(false);
      setCurrentPassword(""); setOwnNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const isSuperadmin = currentUser?.role === "superadmin";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Manage access to JivePilot Ops Brain</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowChangeOwn(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Change My Password
          </Button>
          {isSuperadmin && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Sign In</TableHead>
              <TableHead>Created</TableHead>
              {isSuperadmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading users...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">No users found</TableCell>
              </TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id} className={u.id === currentUser?.id ? "bg-blue-50/50" : ""}>
                <TableCell className="font-medium">
                  {u.name ?? "—"}
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-blue-500 font-normal">(you)</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-600">{u.email ?? "—"}</TableCell>
                <TableCell>
                  {isSuperadmin && u.id !== currentUser?.id ? (
                    <Select
                      value={u.role}
                      onValueChange={(val) => roleMutation.mutate({ userId: u.id, role: val as Role })}
                    >
                      <SelectTrigger className="w-36 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROLE_COLORS[u.role as Role]}`}>
                      {u.role === "superadmin" && <Shield className="h-3 w-3 mr-1" />}
                      {u.role}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
                {isSuperadmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-500 hover:text-blue-600"
                        onClick={() => { setResetUserId(u.id); setResetUserName(u.name ?? u.email ?? "User"); }}
                      >
                        <Key className="h-3.5 w-3.5 mr-1" />
                        Reset PW
                      </Button>
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-gray-500 hover:text-red-600"
                          onClick={() => {
                            if (confirm(`Delete ${u.name ?? u.email}? This cannot be undone.`)) {
                              deleteMutation.mutate({ userId: u.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Role legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded border ${ROLE_COLORS.superadmin}`}>
            <Shield className="h-3 w-3 mr-1" />superadmin
          </span>
          <span>Full access + user management</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded border ${ROLE_COLORS.admin}`}>admin</span>
          <span>Full app access</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded border ${ROLE_COLORS.user}`}>user</span>
          <span>Read-only access</span>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="e.g. Reef Cohen" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" placeholder="e.g. reef@jivepilot.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (read-only)</SelectItem>
                  <SelectItem value="admin">Admin (full access)</SelectItem>
                  <SelectItem value="superadmin">Superadmin (full + user management)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: newName, email: newEmail, password: newPassword, role: newRole })}
              disabled={!newName || !newEmail || !newPassword || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetUserId !== null} onOpenChange={(o) => { if (!o) { setResetUserId(null); setNewResetPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password — {resetUserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" placeholder="Min. 6 characters" value={newResetPassword} onChange={(e) => setNewResetPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetUserId(null); setNewResetPassword(""); }}>Cancel</Button>
            <Button
              onClick={() => resetUserId && resetMutation.mutate({ userId: resetUserId, newPassword: newResetPassword })}
              disabled={!newResetPassword || newResetPassword.length < 6 || resetMutation.isPending}
            >
              {resetMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Own Password Dialog */}
      <Dialog open={showChangeOwn} onOpenChange={setShowChangeOwn}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change My Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" placeholder="Min. 6 characters" value={ownNewPassword} onChange={(e) => setOwnNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeOwn(false)}>Cancel</Button>
            <Button
              onClick={() => changeOwnMutation.mutate({ currentPassword, newPassword: ownNewPassword })}
              disabled={!currentPassword || !ownNewPassword || ownNewPassword.length < 6 || changeOwnMutation.isPending}
            >
              {changeOwnMutation.isPending ? "Saving..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
