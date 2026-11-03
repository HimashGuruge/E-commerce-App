import React, { useState, useEffect, useCallback } from "react";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import {
  FiTrash2,
  FiEdit2,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiMail,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import { TbUserShield, TbUserOff, TbSearch } from "react-icons/tb";
import { onSocketEvent } from "@/utils/socket";

const USERS_PER_PAGE = 10;

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

function countUsersByStatus(users) {
  const counts = { all: users.length, active: 0, suspended: 0 };
  users.forEach((u) => {
    if (!u) return;
    if (u.status === "active") counts.active += 1;
    else counts.suspended += 1;
  });
  return counts;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function initialsOf(user) {
  return user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";
}

const AVATAR_HUES = [5, 12, 24, 31, 42, 200];
function avatarHue(user) {
  let h = 0;
  const seed = user?._id || user?.email || "";
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

const STATUS_STYLES = {
  active: { dot: "bg-emerald-500", text: "text-emerald-700", hover: "hover:bg-emerald-50" },
  suspended: { dot: "bg-red-500", text: "text-red-700", hover: "hover:bg-red-50" },
};

/* ------------------------------------------------------------------ */
/* Slim tab filter group                                               */
/* ------------------------------------------------------------------ */

function TabGroup({ value, onChange, options }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all ${
            value === opt.value
              ? "bg-brand-500 text-white border-brand-500"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
          }`}
        >
          {opt.label}
          <span
            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
              value === opt.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {opt.count}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function ControlUsersprivilege() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded.role !== "admin") {
        navigate("/");
        return;
      }
      fetchUsers();
      fetchUserStats();
    } catch (error) {
      localStorage.removeItem("token");
      navigate("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Live update: the server sends admin:stats-changed on every user
  // signup, role change, status change, edit or delete, so the list
  // stays current with no manual refresh.
  useEffect(() => {
    return onSocketEvent("admin:stats-changed", (data) => {
      if (data?.type === "user") {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
          if (jwtDecode(token).role !== "admin") return;
        } catch {
          return;
        }
        setSyncing(true);
        Promise.all([fetchUsers(), fetchUserStats()]).finally(() => setSyncing(false));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const decoded = jwtDecode(token);
      const response = await api.get(`/api/users`);

      let usersData = response.data.success ? response.data.users : Array.isArray(response.data) ? response.data : [];
      // The logged-in admin never appears in the management list and
      // backend guard rails refuse to modify it either.
      const filtered = usersData.filter((user) => user && user._id.toString() !== decoded.id);
      setUsers(filtered);
      setSelectedUsers([]);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const response = await api.get(`/api/users/stats/summary`);
      if (response.data.success) setStats(response.data.stats);
    } catch (_error) {}
  }, []);

  const handleRoleChange = (userId, currentRole) => async (event) => {
    const select = event.target;
    const newRole = select.value;
    if (!newRole || newRole === currentRole) return;

    const result = await Swal.fire({
      title: `Change role to ${newRole}?`,
      text: `User role will be changed from ${currentRole} to ${newRole}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Yes, proceed",
    });

    if (result.isConfirmed) {
      try {
        await api.patch(
          `/api/users/${userId}/role`,
          { role: newRole }
        );
        await fetchUsers();
        Swal.fire("Success", `User is now ${newRole}`, "success");
      } catch (e) {
        select.value = currentRole;
        Swal.fire("Error", e.response?.data?.message || e.message, "error");
      }
    } else {
      select.value = currentRole;
    }
  };

  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const label = newStatus === "active" ? "Activate" : "Suspend";

    const result = await Swal.fire({
      title: `${label} User`,
      text: `${label} this user?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: newStatus === "active" ? "#10b981" : "#ef4444",
      confirmButtonText: `Yes, ${label}`,
    });

    if (result.isConfirmed) {
      try {
        await api.patch(
          `/api/users/${userId}/status`,
          { status: newStatus }
        );
        await fetchUsers();
        Swal.fire("Success", `User is now ${newStatus}`, "success");
      } catch (e) {
        Swal.fire("Error", e.response?.data?.message || e.message, "error");
      }
    }
  };

  const handleDeleteUser = async (userId, name) => {
    const result = await Swal.fire({
      title: "Delete User",
      html: `Delete <strong>${name}</strong>?<p class="text-red-500 text-sm mt-2">This cannot be undone!</p>`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/users/${userId}`);
        await fetchUsers();
        Swal.fire("Deleted!", "User removed", "success");
      } catch (e) {
        Swal.fire("Error", e.response?.data?.message || e.message, "error");
      }
    }
  };

  const roleCount = (value) =>
    users.filter((u) => {
      if (!u) return false;
      if (value === "all") return true;
      if (value === "sellers") return u.role !== "admin"; // customers + sellers
      return u.role === value;
    }).length;

  const statusCount = {
    all: users.length,
    active: users.filter((u) => u?.status === "active").length,
    suspended: users.filter((u) => u && u.status !== "active").length,
  };

  const matchesRole = (user) => {
    if (roleFilter === "all") return true;
    if (roleFilter === "sellers") return user.role !== "admin"; // customers + sellers
    return user.role === roleFilter; // "customer" | "seller" | "admin"
  };

  const filteredUsers = users.filter((user) => {
    if (!user) return false;
    const searchLower = searchTerm.toLowerCase().trim();
    if (searchTerm) {
      const nameMatch = (user.name + " " + (user.lastname || "")).toLowerCase().includes(searchLower);
      const emailMatch = user.email?.toLowerCase().includes(searchLower) || false;
      if (!nameMatch && !emailMatch) return false;
    }
    if (!matchesRole(user)) return false;
    if (statusFilter !== "all" && user.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const currentUsers = filteredUsers.slice((safePage - 1) * USERS_PER_PAGE, safePage * USERS_PER_PAGE);
  const shownStart = filteredUsers.length === 0 ? 0 : (safePage - 1) * USERS_PER_PAGE + 1;
  const shownEnd = Math.min(safePage * USERS_PER_PAGE, filteredUsers.length);

  // Reset to page 1 whenever a filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedUsers(currentUsers);
    else setSelectedUsers([]);
  };

  const handleSelectUser = (user, checked) => {
    if (checked) setSelectedUsers([...selectedUsers, user]);
    else setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
  };

  const handleBulkAction = async (action) => {
    const actionLabels = {
      activate: { text: "Activate", color: "#10b981" },
      suspend: { text: "Suspend", color: "#ef4444" },
      delete: { text: "Delete", color: "#ef4444" },
    };

    const result = await Swal.fire({
      title: `${actionLabels[action].text} Users`,
      text: `Apply to ${selectedUsers.length} selected user(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: actionLabels[action].color,
      confirmButtonText: `Yes, ${actionLabels[action].text}`,
    });

    if (result.isConfirmed) {
      try {
        const payload = action === "delete"
          ? { userIds: selectedUsers.map((u) => u._id), action: "delete" }
          : { userIds: selectedUsers.map((u) => u._id), action: "status", value: action === "activate" ? "active" : "suspended" };
        const res = await api.post(`/api/users/bulk-action`, payload);
        await fetchUsers();
        setSelectedUsers([]);
        Swal.fire("Success", res.data?.message || `Bulk ${actionLabels[action].text} completed`, "success");
      } catch (e) {
        Swal.fire("Error", e.response?.data?.message || e.message, "error");
      }
    }
  };

  const openEditModal = (user) => {
    setSelectedUser({ ...user });
    setShowEditModal(true);
  };

  const saveUserEdit = async () => {
    if (!selectedUser) return;
    try {
      await api.put(
        `/api/users/${selectedUser._id}`,
        selectedUser
      );
      setShowEditModal(false);
      await fetchUsers();
      Swal.fire("Success", "User updated", "success");
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || e.message, "error");
    }
  };

  const hasFilter = searchTerm || roleFilter !== "all" || statusFilter !== "all";

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center py-20">
        <div className="text-center">
          <TbUserShield className="w-10 h-10 text-slate-300 animate-pulse mx-auto" />
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
            Loading users…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header — compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">User Privileges</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
              {users.length} users
            </p>
            {syncing && (
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600">
                syncing
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-brand-500/15"
              />
              <TbSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <span
              className="flex items-center gap-1.5 text-xs text-emerald-600 w-fit shrink-0"
              title="This page updates live when users change — no reload needed"
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${syncing ? "bg-sky-400" : "bg-emerald-400"}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${syncing ? "bg-sky-500" : "bg-emerald-500"}`} />
              </span>
              Live
            </span>
          </div>
        </div>

        {/* Slim stat strip */}
        <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-2.5 flex flex-wrap items-center divide-x divide-slate-100">
          {[
            { label: "Total", value: stats?.totalUsers ?? users.length, dot: "bg-slate-500" },
            { label: "Active", value: statusCount.active, dot: "bg-emerald-500" },
            { label: "Admins", value: stats?.adminUsers ?? users.filter((u) => u?.role === "admin").length, dot: "bg-amber-500" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 px-4 py-1 first:pl-0 last:pr-0">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <span className="text-sm font-semibold tabular-nums text-slate-900">{s.value}</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Role filters — slim */}
        <div>
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-400 mb-1.5">Role</p>
          <TabGroup
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "all", label: "All", count: roleCount("all") },
              { value: "customer", label: "Customers", count: roleCount("customer") },
              { value: "sellers", label: "Sellers", count: roleCount("sellers") },
              { value: "admin", label: "Admins", count: roleCount("admin") },
            ]}
          />
        </div>

        {/* Status filters — slim */}
        <div>
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-400 mb-1.5">Status</p>
          <TabGroup
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All", count: statusCount.all },
              { value: "active", label: "Active", count: statusCount.active },
              { value: "suspended", label: "Suspended", count: statusCount.suspended },
            ]}
          />
        </div>

        {/* Bulk action bar */}
        {selectedUsers.length > 0 && (
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <span className="flex h-5 min-w-5 items-center justify-center rounded bg-slate-900 px-1.5 font-mono text-[11px] text-white tabular-nums">
                {selectedUsers.length}
              </span>
              {selectedUsers.length === 1 ? "user" : "users"} selected
            </span>
            <span className="hidden sm:block h-4 w-px bg-slate-200" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleBulkAction("activate")}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Activate
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("suspend")}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Suspend
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("delete")}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedUsers([])}
              className="ml-auto font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-14 text-center">
            <TbUserOff className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No users match</p>
            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-3 rounded-md px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50/70 sticky top-0 z-10">
                  <tr className="border-b border-slate-200/80">
                    <th className="w-10 pl-4 pr-2 py-2.5">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                        aria-label="Select all users on this page"
                        className="h-3.5 w-3.5 accent-brand-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">User</th>
                    <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Role</th>
                    <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Status</th>
                    <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Joined</th>
                    <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentUsers.map((user) => {
                    const isAdmin = user.role === "admin" || user.isMainAdmin;
                    const hue = avatarHue(user);
                    const s = STATUS_STYLES[user.status] || STATUS_STYLES.suspended;
                    return (
                      <tr
                        key={user._id}
                        className={`transition-colors ${
                          selectedUsers.some((u) => u._id === user._id)
                            ? "bg-orange-50/60 hover:bg-orange-50"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Select */}
                        <td className="pl-4 pr-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedUsers.some((u) => u._id === user._id)}
                            onChange={(e) => handleSelectUser(user, e.target.checked)}
                            disabled={!!user.isMainAdmin}
                            aria-label={`Select ${user.name}`}
                            title={user.isMainAdmin ? "Main Admin — protected, cannot be selected" : undefined}
                            className="h-3.5 w-3.5 accent-brand-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* User */}
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2.5">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.name}
                                className="h-7 w-7 shrink-0 rounded-full object-cover border border-slate-100"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display font-bold text-[11px] text-white ${
                                  user.isMainAdmin ? "bg-gradient-to-br from-amber-400 to-brand-500" : ""
                                }`}
                                style={!user.profileImage && !user.isMainAdmin ? { backgroundColor: `hsl(${hue} 62% 38%)` } : undefined}
                              >
                                {initialsOf(user)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-semibold text-slate-800">{user.name} {user.lastname}</p>
                                {user.isMainAdmin && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"
                                    title="Main Admin — protected account"
                                  >
                                    <FaCrown size={9} />
                                    Main
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                <FiMail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-2 py-2">
                          {user.isMainAdmin ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700" title="Main Admin role is protected">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              admin
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={handleRoleChange(user._id, user.role)}
                              aria-label={`Change role for ${user.name}`}
                              title="Change user role"
                              className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-brand-500/15"
                            >
                              <option value="customer">customer</option>
                              <option value="seller">seller</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-2 py-2">
                          {isAdmin ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"
                              title={user.isMainAdmin ? "Main Admin status is protected" : "Admin status is protected"}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {user.status}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(user._id, user.status)}
                              title={user.status === "active" ? "Click to suspend" : "Click to reactivate"}
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${s.text} transition-colors ${s.hover}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {user.status}
                            </button>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="px-2 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(user.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-2 pr-4">
                          <div className="flex items-center justify-end gap-0.5">
                            {user.role !== "admin" && (
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                title="Edit name and phone"
                                className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-md transition-colors"
                              >
                                <FiEdit2 size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user._id, user.name)}
                              disabled={!!user.isMainAdmin}
                              title={user.isMainAdmin ? "Main Admin cannot be deleted" : "Delete user"}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-slate-100 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="font-mono text-xs text-slate-400">
                  {shownStart}–{shownEnd} of {filteredUsers.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    aria-label="First page"
                    className="h-7 w-7 flex items-center justify-center rounded-md ring-1 ring-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`h-7 w-7 flex items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                        currentPage === idx + 1
                          ? "bg-slate-900 text-white"
                          : "ring-1 ring-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Last page"
                    className="h-7 w-7 flex items-center justify-center rounded-md ring-1 ring-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <FiChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer print */}
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-300">
          Live · updates automatically when users change
        </p>
      </div>

      {/* Edit modal */}
      {showEditModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white rounded-xl shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-base leading-tight text-slate-900">Edit User</h3>
                <p className="mt-0.5 text-xs text-slate-400">{selectedUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full h-10 rounded-lg px-3.5 text-sm border border-slate-200 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/15"
                  value={selectedUser.name || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Email <span className="normal-case tracking-normal text-slate-300">(fixed)</span>
                </label>
                <input
                  type="email"
                  disabled
                  className="w-full h-10 rounded-lg bg-slate-50 px-3.5 text-sm text-slate-500 border border-slate-200 cursor-not-allowed"
                  value={selectedUser.email || ""}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Phone
                </label>
                <input
                  type="text"
                  className="w-full h-10 rounded-lg px-3.5 text-sm border border-slate-200 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/15"
                  value={selectedUser.phone || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 h-10 rounded-lg ring-1 ring-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveUserEdit}
                className="flex-1 h-10 rounded-lg bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
