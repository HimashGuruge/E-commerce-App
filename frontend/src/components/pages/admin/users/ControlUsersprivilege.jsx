import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import {
  FiUser,
  FiShield,
  FiTrash2,
  FiEdit2,
  FiSearch,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
} from "react-icons/fi";
import { TbUserShield, TbUserOff } from "react-icons/tb";
import { AnimatePresence } from "framer-motion";

const USERS_PER_PAGE = 10;

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
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const decoded = jwtDecode(token);
      const response = await api.get(`/api/users`);

      let usersData = response.data.success ? response.data.users : Array.isArray(response.data) ? response.data : [];
      const filtered = usersData.filter((user) => user && user.email !== decoded.email);
      setUsers(filtered);
      setSelectedUsers([]);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/api/users/stats/summary`);
      if (response.data.success) setStats(response.data.stats);
    } catch (_error) {}
  };

  const handleRoleChange = async (userId, currentRole) => {
    const newRole = currentRole === "user" ? "admin" : "user";
    const result = await Swal.fire({
      title: `${newRole === "admin" ? "Make Admin" : "Remove Admin"}`,
      text: `Change user's role to ${newRole}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: newRole === "admin" ? "#10b981" : "#f59e0b",
      confirmButtonText: "Yes, proceed",
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await api.patch(
          `/api/users/${userId}/role`,
          { role: newRole }
        );
        await fetchUsers();
        Swal.fire("Success", `User is now ${newRole}`, "success");
      } catch (e) {
        Swal.fire("Error", e.response?.data?.message || e.message, "error");
      }
    }
  };

  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const action = newStatus === "active" ? "activate" : "suspend";

    const result = await Swal.fire({
      title: `${action === "activate" ? "Activate" : "Suspend"} User`,
      text: `${action === "activate" ? "Activate" : "Suspend"} this user?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: action === "activate" ? "#10b981" : "#ef4444",
      confirmButtonText: `Yes, ${action}`,
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
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
        const token = localStorage.getItem("token");
        await api.delete(`/api/users/${userId}`);
        await fetchUsers();
        Swal.fire("Deleted!", "User removed", "success");
      } catch (e) {
        Swal.fire("Error", e.response?.data?.message || e.message, "error");
      }
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!user) return false;
    const searchLower = searchTerm.toLowerCase().trim();
    if (searchTerm) {
      const nameMatch = user.name?.toLowerCase().includes(searchLower) || false;
      const emailMatch = user.email?.toLowerCase().includes(searchLower) || false;
      if (!(nameMatch || emailMatch)) return false;
    }
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    if (statusFilter !== "all" && user.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const currentUsers = filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

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
        const token = localStorage.getItem("token");
        await api.post(
          `/api/users/bulk-action`,
          { userIds: selectedUsers.map((u) => u._id), action }
        );
        await fetchUsers();
        setSelectedUsers([]);
        Swal.fire("Success", `Bulk ${actionLabels[action].text} completed`, "success");
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
      const token = localStorage.getItem("token");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <TbUserShield className="w-12 h-12 text-brand-500 animate-pulse mx-auto" />
          </div>
          <p className="text-slate-500 mt-4 font-medium">Loading Users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <TbUserShield className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              User Management
            </h1>
            <p className="text-slate-500 mt-1">Manage users, roles and permissions</p>
          </div>
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <FiRefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium text-slate-600">Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats.total, icon: FiUser, color: "from-slate-500 to-slate-600" },
              { label: "Active", value: stats.active, icon: FiCheckCircle, color: "from-brand-500 to-brand-600" },
              { label: "Admins", value: stats.admins || 0, icon: FiShield, color: "from-violet-500 to-violet-600" },
              { label: "New (7d)", value: stats.recentJoins || 0, icon: FiUser, color: "from-amber-500 to-amber-600" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "All" },
                { value: "user", label: "Users" },
                { value: "admin", label: "Admins" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setRoleFilter(filter.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    roleFilter === filter.value
                      ? "bg-brand-500 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <span className="w-px bg-slate-200 mx-1" />
              {[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    statusFilter === filter.value
                      ? "bg-slate-800 text-white shadow-lg shadow-slate-800/25"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bg-brand-50 px-5 py-3 rounded-xl border border-brand-100 flex flex-wrap items-center gap-3">
            <span className="text-brand-700 font-medium text-sm">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction("activate")}
                className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction("suspend")}
                className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
              >
                Suspend
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <TbUserOff className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-900">No users found</p>
              <p className="text-slate-500 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="p-4 w-12">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Contact</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                      <th className="p-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.some((u) => u._id === user._id)}
                            onChange={(e) => handleSelectUser(user, e.target.checked)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-brand-500 flex items-center justify-center text-white font-bold text-sm ${user.profileImage ? "hidden" : ""}`}
                            >
                              {user.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{user.name} {user.lastname}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <FiMail className="w-3 h-3" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {user.phone && user.phone !== "No phone Number" ? (
                            <div className="flex items-center gap-1.5">
                              <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                              {user.phone}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleRoleChange(user._id, user.role)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              user.role === "admin"
                                ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {user.role === "admin" ? <FiShield className="w-3.5 h-3.5" /> : <FiUser className="w-3.5 h-3.5" />}
                            {user.role}
                          </button>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleStatusChange(user._id, user.status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              user.status === "active"
                                ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {user.status === "active" ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiXCircle className="w-3.5 h-3.5" />}
                            {user.status}
                          </button>
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user._id, user.name)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-semibold">{(currentPage - 1) * USERS_PER_PAGE + 1}</span> to{" "}
                    <span className="font-semibold">{Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)}</span> of{" "}
                    <span className="font-semibold">{filteredUsers.length}</span> users
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium ${
                          currentPage === idx + 1
                            ? "bg-brand-500 text-white shadow-lg shadow-emerald-500/25"
                            : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                    value={selectedUser.name || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm bg-slate-50"
                    value={selectedUser.email || ""}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                    value={selectedUser.phone || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-slate-100">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUserEdit}
                  className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 shadow-lg shadow-emerald-500/25"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
