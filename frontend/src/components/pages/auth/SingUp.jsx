import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User as UserIcon,
  Mail,
  Lock,
  Camera,
  Phone,
  MapPin,
} from "lucide-react";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import toast from "react-hot-toast";

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    role: "user",
    profileImage: "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg",
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      setUploading(true);
      const url = await uploadToMedia(file);
      setFormData((prev) => ({ ...prev, profileImage: url }));
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!formData.email?.trim()) {
      toast.error("Email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { api } = await import("@/utils/api");
      await api.post(`/api/users/`, formData);
      toast.success("Registration successful!");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-500 text-sm mt-2">Sign up to get started</p>
          </div>

              <a
            href={`${import.meta.env.VITE_BACKEND_URL}/api/users/google`}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-lg py-3 px-4 hover:bg-gray-50 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.42z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-700">Sign up with Google</span>
          </a>

          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs font-medium">or continue with email</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="First Name" name="name" icon={<UserIcon size={16}/>} placeholder="John" value={formData.name} onChange={handleChange} />
              <InputField label="Last Name" required={false} name="lastname" icon={<UserIcon size={16}/>} placeholder="Doe" value={formData.lastname} onChange={handleChange} />
            </div>

            <InputField label="Email" type="email" name="email" icon={<Mail size={16}/>} placeholder="john@mail.com" value={formData.email} onChange={handleChange} />
            <InputField label="Phone" required={false} type="tel" name="phone" icon={<Phone size={16}/>} placeholder="077..." value={formData.phone} onChange={handleChange} />
            <InputField label="Address" required={false} name="address" icon={<MapPin size={16}/>} placeholder="123 Street, Colombo" value={formData.address} onChange={handleChange} />
            <InputField label="Password" type="password" name="password" icon={<Lock size={16}/>} placeholder="Min 6 characters" value={formData.password} onChange={handleChange} />

            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-brand-700 transition-all disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-500 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, type = "text", icon, placeholder, value, onChange, required = true }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all ${icon ? "pl-10" : ""}`}
        />
      </div>
    </div>
  );
}
