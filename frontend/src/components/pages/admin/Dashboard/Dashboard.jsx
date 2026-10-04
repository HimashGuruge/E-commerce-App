import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Navigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "@/utils/api";

import Sidebar from "@/components/pages/admin/Dashboard/Sidebar";
import DashboardTopbar from "@/components/pages/admin/Dashboard/DashboardTopbar";
import DashboardRoutes from "@/components/pages/admin/Dashboard/DashboardRoutes";

export default function Dashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  const navigate = useNavigate();

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  const handleLogout = () => {
    Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to logout?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Yes, logout!",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        window.dispatchEvent(new Event("authChange"));
        navigate("/login");
      }
    });
  };

  const authcheck = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      navigate("/login");
      setLoading(false);
      return;
    }
    api.get("/api/users/me")
      .then(({ data }) => {
        if (data.success && data.user?.role === "admin") {
          setUser(data.user);
        } else {
          Swal.fire({ icon: "error", title: "Access Denied", text: "Only administrators can access this dashboard" })
            .then(() => navigate("/"));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("token");
          setUser(null);
          navigate("/login");
        }
        setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    authcheck();
    window.addEventListener("authChange", authcheck);
    return () => window.removeEventListener("authChange", authcheck);
  }, [authcheck]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 mt-4 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar - natural flex item (Sidebar handles its own sticky) */}
      <div className="hidden lg:block">
        <Sidebar 
          user={user} 
          handleLogout={handleLogout} 
          isMobileOpen={false} 
          closeMobile={() => {}} 
        />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <Sidebar 
              user={user} 
              handleLogout={handleLogout} 
              isMobileOpen={mobileOpen} 
              closeMobile={() => setMobileOpen(false)} 
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar user={user} mobileOpen={mobileOpen} toggleMobile={toggleMobile} />
        <main className="flex-1 overflow-auto">
          <DashboardRoutes />
        </main>
      </div>
    </div>
  );
}
