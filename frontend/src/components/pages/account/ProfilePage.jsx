import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, Edit, Camera, Loader2, LogOut, PlusCircle, Trash2, X, ShieldCheck } from "lucide-react";
import Swal from "sweetalert2";
import api from "@/utils/api";
import uploadToMedia from "@/components/utils/Mediaupload";

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [uploading, setUploading] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "", lastname: "", email: "", phone: "", address: "", profileImage: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: "Home", name: "", phone: "", addressLine1: "", addressLine2: "", city: "", province: "", isDefault: false,
  });

  const DEFAULT_IMAGE = "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg";
  const isGoogleUser = user?.googleId;

  const getProfileImage = (url) => {
    if (!url || url.includes("freepik.com") || url.includes("default") || url.includes("placeholder")) {
      return DEFAULT_IMAGE;
    }
    return url;
  };

  useEffect(() => {
    const fetchData = async () => { 
      try {
        setLoading(true);
        const userRes = await api.get(`/api/users/me`);
        if (userRes.data?.user) {
          setUser(userRes.data.user);
          setEditForm({
            name: userRes.data.user.name || "",
            lastname: userRes.data.user.lastname || "",
            email: userRes.data.user.email || "",
            phone: userRes.data.user.phone || "",
            address: userRes.data.user.address || "",
            profileImage: userRes.data.user.profileImage || "",
          });
        }
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchAddresses();
  }, [navigate]);

  const fetchAddresses = async () => {
    try {
      const res = await api.get(`/api/addresses`);
      setAddresses(res.data?.addresses || res.data?.data || []);
    } catch (_err) {
      console.error(_err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadToMedia(file);
      await api.put(`/api/users/me`, { ...editForm, profileImage: url });
      setEditForm((prev) => ({ ...prev, profileImage: url }));
      setUser((prev) => ({ ...prev, profileImage: url }));
      Swal.fire({ icon: "success", title: "Photo Updated!", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Upload Failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const res = await api.put(`/api/users/me`, editForm);
      if (res.data) {
        setUser(res.data.user || res.data);
        Swal.fire({ icon: "success", title: "Profile Updated!", timer: 1500, showConfirmButton: false });
        setEditing(false);
      }
    } catch (_err) {
      Swal.fire({ icon: "error", title: "Update Failed", text: _err.response?.data?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await api.put(`/api/addresses/${editingAddress._id}`, addressForm);
      } else {
        await api.post(`/api/addresses`, addressForm);
      }
      setShowAddressModal(false);
      fetchAddresses();
      Swal.fire({ icon: "success", title: editingAddress ? "Address Updated!" : "Address Added!", timer: 1500, showConfirmButton: false });
    } catch (_err) {
      Swal.fire({ icon: "error", title: "Failed to save address" });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      Swal.fire({ icon: "error", title: "Please fill in all password fields" });
      return;
    }
    if (newPassword.length < 6) {
      Swal.fire({ icon: "error", title: "New password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      Swal.fire({ icon: "error", title: "New password and confirm password do not match" });
      return;
    }
    if (currentPassword === newPassword) {
      Swal.fire({ icon: "error", title: "New password must be different from the current password" });
      return;
    }
    try {
      setSavingPassword(true);
      await api.put(`/api/users/me/password`, passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      Swal.fire({ icon: "success", title: "Password Changed!", timer: 1500, showConfirmButton: false });
    } catch (_err) {
      Swal.fire({ icon: "error", title: "Change Failed", text: _err.response?.data?.error });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    const result = await Swal.fire({ title: "Delete Address?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#64748b", confirmButtonText: "Yes, delete!" });
    if (result.isConfirmed) {
      await api.delete(`/api/addresses/${id}`);
      fetchAddresses();
      Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
    }
  };

  const handleLogout = () => {
    Swal.fire({ title: "Logout?", icon: "question", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#64748b", confirmButtonText: "Yes, logout" }).then((r) => {
      if (r.isConfirmed) {
        localStorage.clear();
        window.dispatchEvent(new Event("authChange"));
        navigate("/login");
      }
    });
  };

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-brand-600" /></div>;
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">No user logged in</div>;

  const currentImage = getProfileImage(editForm.profileImage || user?.profileImage);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <img src={currentImage} alt={user.name} className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" referrerPolicy="no-referrer" />
                  <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700">
                    <Camera size={14} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                <h3 className="font-semibold text-gray-900">{user.name} {user.lastname}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
                {isGoogleUser && <span className="inline-block mt-2 px-2 py-1 bg-brand-50 text-brand-600 text-xs rounded-full">Google Account</span>}
              </div>

              <div className="mt-6 space-y-2">
                <button onClick={() => setActiveTab("profile")} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "profile" ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50"}`}>Profile</button>
                <button onClick={() => setActiveTab("addresses")} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "addresses" ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50"}`}>Addresses</button>
                <button onClick={() => setActiveTab("security")} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "security" ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50"}`}>Security</button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut size={16} /> Logout</button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2">
            {activeTab === "profile" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                  {!editing ? (
                    <button onClick={() => setEditing(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-2"><Edit size={16} /> Edit</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleSaveProfile} disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null} Save
                      </button>
                      <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    {editing ? (
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-blue-500 outline-none" />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{user.name || "Not set"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    {editing ? (
                      <input value={editForm.lastname} onChange={(e) => setEditForm({ ...editForm, lastname: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-blue-500 outline-none" />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{user.lastname || "Not set"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    {editing ? (
                      <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-blue-500 outline-none" />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{user.phone || "Not set"}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "addresses" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Saved Addresses</h2>
                  <button onClick={() => { setEditingAddress(null); setAddressForm({ type: "Home", name: user.name + " " + (user.lastname || ""), phone: user.phone || "", addressLine1: "", addressLine2: "", city: "", province: "", isDefault: addresses.length === 0 }); setShowAddressModal(true); }} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-2"><PlusCircle size={16} /> Add</button>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin size={40} className="mx-auto mb-2 opacity-50" />
                    <p>No addresses saved</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((addr) => (
                      <div key={addr._id} className={`p-4 border rounded-lg ${addr.isDefault ? "border-blue-300 bg-brand-50" : "border-gray-200"}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            {addr.isDefault && <span className="text-xs bg-brand-100 text-brand-600 px-2 py-1 rounded-full">Default</span>}
                            <p className="font-medium text-gray-900 mt-1">{addr.name}</p>
                            <p className="text-sm text-gray-600">{addr.addressLine1}{addr.addressLine2 && `, ${addr.addressLine2}`}</p>
                            <p className="text-sm text-gray-600">{addr.city}{addr.province && `, ${addr.province}`}</p>
                            <p className="text-sm text-gray-500 mt-1">{addr.phone}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingAddress(addr); setAddressForm({ ...addr }); setShowAddressModal(true); }} className="p-2 text-gray-500 hover:text-brand-600"><Edit size={16} /></button>
                            <button onClick={() => handleDeleteAddress(addr._id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "security" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck size={20} className="text-brand-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                </div>

                {isGoogleUser ? (
                  <p className="text-sm text-gray-500">
                    You sign in with Google, so there is no local password to change for this account.
                  </p>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input type="password" required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input type="password" required minLength={6} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input type="password" required value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-blue-500 outline-none" />
                    </div>
                    <button type="submit" disabled={savingPassword} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                      {savingPassword ? <Loader2 size={16} className="animate-spin" /> : null} Update Password
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingAddress ? "Edit Address" : "Add Address"}</h3>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="flex gap-2">
                {["Home", "Work", "Other"].map((t) => (
                  <button type="button" key={t} onClick={() => setAddressForm({ ...addressForm, type: t })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${addressForm.type === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Name" value={addressForm.name} onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })} className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                <input required placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                <input required placeholder="Address Line 1" value={addressForm.addressLine1} onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })} className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                <input placeholder="Address Line 2" value={addressForm.addressLine2} onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })} className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                <input required placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                <input placeholder="Province" value={addressForm.province} onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="rounded text-brand-600" />
                <span className="text-sm text-gray-700">Set as default</span>
              </label>
              <button type="submit" className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700">{editingAddress ? "Update" : "Save"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
