import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiChevronLeft, FiChevronRight, FiUpload, FiFileText, FiBriefcase, FiUser, FiMapPin, FiCreditCard, FiShield } from "react-icons/fi";
import api from "@/utils/api";
import Swal from "sweetalert2";

const steps = [
  { label: "Account Type", icon: FiBriefcase },
  { label: "Shop Info", icon: FiFileText },
  { label: "Owner Details", icon: FiUser },
  { label: "Addresses", icon: FiMapPin },
  { label: "Bank Details", icon: FiCreditCard },
  { label: "Review", icon: FiShield },
];

export default function SellerRegister() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessType: "individual",
    shopName: "",
    shopDescription: "",
    shopLogo: "",
    ownerName: "",
    ownerPhone: "",
    ownerNic: "",
    ownerAddress: "",
    warehouseAddress: "",
    returnAddress: "",
    bankName: "",
    bankAccountTitle: "",
    bankAccountNo: "",
    bankBranch: "",
    bankChequeImage: "",
    registrationNumber: "",
    agreeTerms: false,
  });
  const [stepErrors, setStepErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      localStorage.setItem("redirectAfterLogin", "/become-seller/register");
      navigate("/login");
    }
  }, [navigate]);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (stepErrors[field]) {
      setStepErrors((errs) => {
        const next = { ...errs };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = () => {
    const errs = {};
    switch (currentStep) {
      case 1:
        if (!form.shopName.trim()) errs.shopName = "Shop name is required";
        break;
      case 2:
        if (!form.ownerName.trim()) errs.ownerName = "Full name is required";
        if (!form.ownerPhone.trim()) errs.ownerPhone = "Phone number is required";
        break;
      case 4:
        if (!form.bankName.trim()) errs.bankName = "Bank name is required";
        if (!form.bankAccountNo.trim()) errs.bankAccountNo = "Account number is required";
        break;
      case 5:
        if (!form.agreeTerms) errs.agreeTerms = "You must agree to the terms to submit";
        break;
      default:
        break;
    }
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/sellers/register", form);
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Application Submitted!",
          text: "We'll review your application within 24-72 hours. You'll be notified once approved.",
          confirmButtonColor: "#F85606",
        }).then(() => navigate("/become-seller"));
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: err.response?.data?.error || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Choose Your Account Type</h3>
            <p className="text-slate-500">Select the type that best describes your business</p>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => update("businessType", "individual")}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  form.businessType === "individual"
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                    : "border-slate-200 hover:border-brand-200"
                }`}
              >
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                  <FiUser className="w-6 h-6 text-brand-600" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Individual Seller</h4>
                <p className="text-sm text-slate-500">Sell as a sole proprietor using your personal ID. Perfect for small sellers and side hustles.</p>
              </button>
              <button
                onClick={() => update("businessType", "company")}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  form.businessType === "company"
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                    : "border-slate-200 hover:border-brand-200"
                }`}
              >
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                  <FiBriefcase className="w-6 h-6 text-brand-600" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Company / Business</h4>
                <p className="text-sm text-slate-500">For registered businesses and brands. Requires business registration documents.</p>
              </button>
            </div>
            {form.businessType === "company" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Registration Number</label>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(e) => update("registrationNumber", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                  placeholder="Enter your business registration number"
                />
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Shop Information</h3>
            <p className="text-slate-500">Tell customers about your shop</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => update("shopName", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                placeholder="e.g. TechZone Store"
              />
              {showErrors && stepErrors.shopName && <p className="text-[11px] text-red-600 mt-1">{stepErrors.shopName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Description</label>
              <textarea
                value={form.shopDescription}
                onChange={(e) => update("shopDescription", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all resize-none"
                placeholder="Describe what you sell..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Logo URL (optional)</label>
              <input
                type="text"
                value={form.shopLogo}
                onChange={(e) => update("shopLogo", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Owner Details</h3>
            <p className="text-slate-500">Your personal information for verification</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                  placeholder="As shown on your ID"
                />
                {showErrors && stepErrors.ownerName && <p className="text-[11px] text-red-600 mt-1">{stepErrors.ownerName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={form.ownerPhone}
                  onChange={(e) => update("ownerPhone", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                  placeholder="0712 345 678"
                />
                {showErrors && stepErrors.ownerPhone && <p className="text-[11px] text-red-600 mt-1">{stepErrors.ownerPhone}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIC Number</label>
              <input
                type="text"
                value={form.ownerNic}
                onChange={(e) => update("ownerNic", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                placeholder="Your National ID number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                value={form.ownerAddress}
                onChange={(e) => update("ownerAddress", e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all resize-none"
                placeholder="Your residential address"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Addresses</h3>
            <p className="text-slate-500">Where should we pick up and return items?</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse / Pick-up Address</label>
              <textarea
                value={form.warehouseAddress}
                onChange={(e) => update("warehouseAddress", e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all resize-none"
                placeholder="Where we pick up your products"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Return Address</label>
              <textarea
                value={form.returnAddress}
                onChange={(e) => update("returnAddress", e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all resize-none"
                placeholder="Where customers return products"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Bank Details</h3>
            <p className="text-slate-500">Where we'll send your payouts</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => update("bankName", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                  placeholder="e.g. Bank of Ceylon"
                />
                {showErrors && stepErrors.bankName && <p className="text-[11px] text-red-600 mt-1">{stepErrors.bankName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={form.bankBranch}
                  onChange={(e) => update("bankBranch", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                  placeholder="Branch name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Title *</label>
              <input
                type="text"
                value={form.bankAccountTitle}
                onChange={(e) => update("bankAccountTitle", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                placeholder="Name on bank account"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
              <input
                type="text"
                value={form.bankAccountNo}
                onChange={(e) => update("bankAccountNo", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                placeholder="Your bank account number"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Review Your Application</h3>
            <p className="text-slate-500">Please verify all information before submitting</p>
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Account Type:</span> <span className="font-medium capitalize">{form.businessType}</span></div>
                <div><span className="text-slate-500">Shop Name:</span> <span className="font-medium">{form.shopName}</span></div>
                <div><span className="text-slate-500">Owner Name:</span> <span className="font-medium">{form.ownerName}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{form.ownerPhone}</span></div>
                <div><span className="text-slate-500">Bank:</span> <span className="font-medium">{form.bankName}</span></div>
                <div><span className="text-slate-500">Account No:</span> <span className="font-medium">{form.bankAccountNo}</span></div>
              </div>
            </div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => update("agreeTerms", e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600">
                I confirm that all information provided is accurate and I agree to the{" "}
                <a href="/terms" className="text-brand-600 underline">Terms of Service</a> and{" "}
                <a href="/privacy" className="text-brand-600 underline">Privacy Policy</a>.
                I understand my application will be reviewed within 24-72 hours.
              </span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-10">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${
                  i <= currentStep ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"
                }`}>
                  {i < currentStep ? <FiCheck className="w-5 h-5" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${i < currentStep ? "bg-brand-600" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="hidden md:flex justify-between mb-8 -mt-2">
            {steps.map((s, i) => (
              <span key={i} className={`text-xs font-medium ${i <= currentStep ? "text-brand-600" : "text-slate-400"}`}>
                {s.label}
              </span>
            ))}
          </div>

          {/* Form content */}
          {renderStep()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
            <button
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
            >
              <FiChevronLeft className="w-5 h-5" /> Previous
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => {
                  if (validateStep()) {
                    setShowErrors(false);
                    setCurrentStep((s) => s + 1);
                  } else {
                    setShowErrors(true);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold"
              >
                Next <FiChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={() => {
                  if (validateStep()) {
                    setShowErrors(false);
                    handleSubmit();
                  } else {
                    setShowErrors(true);
                  }
                }}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
