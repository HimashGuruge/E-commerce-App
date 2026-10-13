import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from "@/utils/api";
import toast from 'react-hot-toast';
import { Lock, Loader2, CheckCircle, Eye, EyeOff, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  if (score <= 2) return { score, label: "Weak", color: "bg-red-500", textColor: "text-red-600" };
  if (score <= 4) return { score, label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-600" };
  return { score, label: "Strong", color: "bg-brand-500", textColor: "text-brand-600" };
}

function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length >= 3;
}

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;
  const isStrong = isStrongPassword(password);

  useEffect(() => {
    let interval;
    if (timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft]);

  useEffect(() => {
    if (!token) return;
    const expiresParam = searchParams.get("expires");
    if (expiresParam) {
      const expiresMs = parseInt(expiresParam, 10);
      const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setExpired(true);
      }
    } else {
      setTimeLeft(3600);
    }
  }, [token, searchParams]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (expired) return toast.error("This link has expired. Please request a new one.");
    if (password !== confirmPassword) return toast.error("Passwords do not match!");
    if (!password || !confirmPassword) return toast.error("Please fill in all fields.");
    if (!isStrong) return toast.error("Password must be stronger. Use 8+ chars with uppercase, lowercase, numbers, and special characters.");
    setLoading(true);

    try {
      const res = await api.put(`/api/users/reset-password/${token}`, { password });
      if (res.data.success) {
        setIsSuccess(true);
        toast.success("Password changed successfully!");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reset password";
      toast.error(msg);
      if (msg.includes("expired") || msg.includes("Invalid")) setExpired(true);
    } finally {
      setLoading(false);
    }
  }, [token, password, confirmPassword, expired, isStrong]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-8 text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Changed!</h2>
          <p className="text-gray-500 text-sm mb-6">Your password has been updated. You can now log in with your new password.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-brand-500 text-white py-3 rounded-lg font-semibold text-sm hover:bg-brand-600 transition-all"
          >
            Go to Login
          </button>
          <p className="mt-4 text-xs text-gray-400">A confirmation email has been sent to your inbox.</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
          <p className="text-gray-500 text-sm mb-6">This password reset link has expired. Please request a new one.</p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full bg-brand-500 text-white py-3 rounded-lg font-semibold text-sm hover:bg-brand-600 transition-all"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={24} className="text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Set New Password</h2>
            <p className="text-gray-500 text-sm mt-1">Create a strong password for your account.</p>
          </div>

          {timeLeft !== null && (
            <div className={`mb-4 flex items-center justify-center gap-2 text-xs font-medium ${timeLeft < 300 ? "text-red-600 animate-pulse" : "text-gray-500"}`}>
              <Clock size={14} />
              Expires in {formatTime(timeLeft)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength.textColor}`}>{strength.label}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                  <div className={`flex items-center gap-1 ${password.length >= 8 ? "text-brand-600" : ""}`}>
                    <span>{password.length >= 8 ? "✓" : "○"}</span> At least 8 chars
                  </div>
                  <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-brand-600" : ""}`}>
                    <span>{/[A-Z]/.test(password) ? "✓" : "○"}</span> Uppercase (A-Z)
                  </div>
                  <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? "text-brand-600" : ""}`}>
                    <span>{/[a-z]/.test(password) ? "✓" : "○"}</span> Lowercase (a-z)
                  </div>
                  <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-brand-600" : ""}`}>
                    <span>{/[0-9]/.test(password) ? "✓" : "○"}</span> Number (0-9)
                  </div>
                  <div className={`flex items-center gap-1 col-span-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-brand-600" : ""}`}>
                    <span>{/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "✓" : "○"}</span> Special character (!@#$%^&*...)
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">Need at least 3 of 5 checked above</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-100 ${passwordsMismatch ? "bg-red-50 border border-red-300 focus:border-red-400" : passwordsMatch ? "bg-brand-50 border border-emerald-300 focus:border-emerald-400" : "bg-gray-50 border border-gray-200 focus:border-emerald-400"}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-brand-600 flex items-center gap-1">
                  <CheckCircle size={12} /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || expired || passwordsMismatch || !password || !confirmPassword || !isStrong}
              className="w-full bg-brand-500 text-white py-3 rounded-lg font-semibold text-sm hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">Use 8+ characters with uppercase, lowercase, numbers, and symbols.</p>
        </div>
      </div>
    </div>
  );
}
