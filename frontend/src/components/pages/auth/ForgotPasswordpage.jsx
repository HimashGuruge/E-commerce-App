import React, { useState } from 'react';
import api from "@/utils/api";
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Send, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post(`/api/users/forgot-password`, { email });

      if (res.data.success) {
        setIsSent(true);
        toast.success("Check your email! Reset link sent.");
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || "Failed to send email";

      if (status === 429) {
        toast.error(message);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {isSent ? "Email Sent!" : "Forgot Password?"}
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              {isSent ? "Check your inbox for the reset link." : "Enter your email to receive a reset link."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="john@mail.com"
                  required
                  disabled={isSent || loading}
                  className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all ${isSent ? "opacity-50 cursor-not-allowed" : ""}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {!isSent ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 text-white py-3 rounded-lg font-semibold text-sm hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="w-full bg-brand-50 text-brand-700 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border border-brand-200">
                  <CheckCircle size={18} />
                  Email Sent Successfully
                </div>
                <p className="text-center text-xs text-gray-400">
                  Check your inbox (and spam folder). Link expires in 1 hour.
                </p>
              </div>
            )}
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
