import React, { useState, useEffect, useRef } from "react";
import api from "@/utils/api";
import { FiSave, FiRefreshCw, FiGlobe, FiMail, FiType, FiHash, FiUpload, FiX, FiDroplet, FiSend, FiEye, FiEyeOff, FiTruck, FiMessageCircle, FiSmartphone, FiUser } from "react-icons/fi";
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok } from "react-icons/fa";

import Swal from "sweetalert2";
import uploadToMedia from "@/components/utils/Mediaupload";
import { injectTheme, injectFont, injectNavbar } from "@/utils/color";
import { invalidatePublicSettings } from "@/utils/siteSettings";

const SOCIAL_ICONS = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  twitter: FaTwitter,
  youtube: FaYoutube,
  tiktok: FaTiktok,
};

const SOCIAL_COLORS = {
  facebook: "text-blue-600",
  instagram: "text-pink-600",
  twitter: "text-sky-500",
  youtube: "text-red-600",
  tiktok: "text-black",
};

const FONT_PRESETS = [
  { key: "inter", label: "Inter", family: "Inter, system-ui, -apple-system, sans-serif", url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" },
  { key: "system", label: "System", family: "system-ui, -apple-system, sans-serif", url: "" },
  { key: "roboto", label: "Roboto", family: "Roboto, system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" },
  { key: "poppins", label: "Poppins", family: "Poppins, system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" },
  { key: "opensans", label: "Open Sans", family: "'Open Sans', system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap" },
  { key: "lato", label: "Lato", family: "Lato, system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" },
  { key: "montserrat", label: "Montserrat", family: "Montserrat, system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" },
  { key: "nunito", label: "Nunito", family: "Nunito, system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap" },
  { key: "raleway", label: "Raleway", family: "Raleway, system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800;900&display=swap" },
  { key: "playfair", label: "Playfair", family: "'Playfair Display', Georgia, serif", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap" },
  { key: "merriweather", label: "Merriweather", family: "Merriweather, Georgia, serif", url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap" },
];

export default function SettingsManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSection, setSavingSection] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [form, setForm] = useState({
    brandName: "",
    iconLetter: "",
    logo: "",
    primaryColor: "#F85606",
    chatWidgetColor: "#F85606",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontUrl: "",
    tagline: "",
    footerCompanyName: "",
    footerSupportEmail: "",
    footerDescription: "",
    footerAddress: "123 Commerce Street, Business District, Colombo 01, Sri Lanka",
    footerPhone: "+94 11 234 5678",
    footerBg: "#0f172a",
    footerTextColor: "#cbd5e1",
    footerHeadingColor: "#ffffff",
    footerLinkHoverColor: "#ffffff",
    footerFontSize: "0.875rem",
    footerFontFamily: "",
    footerLogo: "",
    socialEnabled: {
      facebook: true,
      instagram: true,
      twitter: true,
      youtube: false,
      tiktok: false,
    },
    metaTitle: "",
    metaDescription: "",
    emailFromName: "",
    emailFromAddress: "",
    emailProvider: "smtp",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    gmailEmail: "",
    gmailClientId: "",
    gmailClientSecret: "",
    gmailRefreshToken: "",
    social: {
      facebook: "",
      instagram: "",
      twitter: "",
      youtube: "",
      tiktok: "",
    },
    navbarBg: "#ffffff",
    navbarText: "#475569",
    navbarBorder: "#f1f5f9",
    topbarBg: "#f5f5f5",
    topbarText: "#737373",
    shipping: {
      courierName: "Domex",
      standardName: "Domex Standard",
      standardCost: 330,
      standardDaysMin: 5,
      standardDaysMax: 11,
      freeThreshold: 10000,
    },
    returnPolicy: {
      enabled: true,
      windowDays: 7,
      policyText: "Items can be returned within 7 days of delivery if they are unused and in original packaging.",
      conditions: "- Item must be unused\n- Original packaging required\n- Proof of purchase needed\n- Custom/personalized items not eligible",
      refundDays: 5,
      refundDaysText: "Refunds are processed within 5 business days after we receive and inspect the returned item.",
      restockingFee: 0,
      restockingFeeText: "No restocking fee applies.",
      shippingCostPaidBy: "customer",
      shippingCostText: "Return shipping cost is borne by the customer.",
      exchangesAllowed: false,
      processDescription: "Contact our support team through the chat. An agent will guide you through the return process.",
    },
    announcement: {
      speed: 12,
      bgColor: "#F85606",
      textColor: "#ffffff",
    },
    newsletter: {
      enabled: true,
      bgColor: "#F85606",
      textColor: "#ffffff",
      buttonBg: "#0f172a",
      buttonText: "#ffffff",
      iconColor: "#ffffff",
      title: "Subscribe & get 10% off your first order!",
      placeholder: "Enter your email",
      buttonLabel: "Subscribe",
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/settings");
      if (res.data?.success && res.data?.settings) {
        const s = res.data.settings;
        setForm({
          brandName: s.brandName || "",
          iconLetter: s.iconLetter || "",
          logo: s.logo || "",
          primaryColor: s.primaryColor || "#F85606",
          chatWidgetColor: s.chatWidgetColor || "#F85606",
          fontFamily: s.fontFamily || "Inter, system-ui, -apple-system, sans-serif",
          fontUrl: s.fontUrl || "",
          tagline: s.tagline || "",
          footerCompanyName: s.footerCompanyName || "",
          footerSupportEmail: s.footerSupportEmail || "",
          footerDescription: s.footerDescription || "",
          footerAddress: s.footerAddress || "123 Commerce Street, Business District, Colombo 01, Sri Lanka",
          footerPhone: s.footerPhone || "+94 11 234 5678",
          footerBg: s.footerBg || "#0f172a",
          footerTextColor: s.footerTextColor || "#cbd5e1",
          footerHeadingColor: s.footerHeadingColor || "#ffffff",
          footerLinkHoverColor: s.footerLinkHoverColor || "#ffffff",
          footerFontSize: s.footerFontSize || "0.875rem",
          footerFontFamily: s.footerFontFamily || "",
          footerLogo: s.footerLogo || "",
          socialEnabled: s.socialEnabled || { facebook: true, instagram: true, twitter: true, youtube: false, tiktok: false },
          metaTitle: s.metaTitle || "",
          metaDescription: s.metaDescription || "",
          emailFromName: s.emailFromName || "",
          emailFromAddress: s.emailFromAddress || "",
          smtpHost: s.smtpHost || "smtp.gmail.com",
          smtpPort: s.smtpPort || 587,
          smtpUser: s.smtpUser || "",
          smtpPass: s.smtpPass || "",
          emailProvider: s.emailProvider || "smtp",
          gmailEmail: s.gmailEmail || "",
          gmailClientId: s.gmailClientId || "",
          gmailClientSecret: s.gmailClientSecret || "",
          gmailRefreshToken: s.gmailRefreshToken || "",
          navbarBg: s.navbarBg || "#ffffff",
          navbarText: s.navbarText || "#475569",
          navbarBorder: s.navbarBorder || "#f1f5f9",
          topbarBg: s.topbarBg || "#f5f5f5",
          topbarText: s.topbarText || "#737373",
          shipping: {
            courierName: s.shipping?.courierName || "Domex",
            standardName: s.shipping?.standardName || "Domex Standard",
            standardCost: s.shipping?.standardCost ?? 330,
            standardDaysMin: s.shipping?.standardDaysMin ?? 5,
            standardDaysMax: s.shipping?.standardDaysMax ?? 11,
            freeThreshold: s.shipping?.freeThreshold ?? 10000,
          },
          returnPolicy: {
            enabled: s.returnPolicy?.enabled ?? true,
            windowDays: s.returnPolicy?.windowDays ?? 7,
            policyText: s.returnPolicy?.policyText || "",
            conditions: s.returnPolicy?.conditions || "",
            refundDays: s.returnPolicy?.refundDays ?? 5,
            refundDaysText: s.returnPolicy?.refundDaysText || "",
            restockingFee: s.returnPolicy?.restockingFee ?? 0,
            restockingFeeText: s.returnPolicy?.restockingFeeText || "",
            shippingCostPaidBy: s.returnPolicy?.shippingCostPaidBy || "customer",
            shippingCostText: s.returnPolicy?.shippingCostText || "",
            exchangesAllowed: s.returnPolicy?.exchangesAllowed ?? false,
            processDescription: s.returnPolicy?.processDescription || "",
          },
          social: {
            facebook: s.social?.facebook || "",
            instagram: s.social?.instagram || "",
            twitter: s.social?.twitter || "",
            youtube: s.social?.youtube || "",
            tiktok: s.social?.tiktok || "",
          },
          announcement: {
            speed: s.announcement?.speed ?? 12,
            bgColor: s.announcement?.bgColor || "#F85606",
            textColor: s.announcement?.textColor || "#ffffff",
          },
          newsletter: {
            enabled: s.newsletter?.enabled ?? true,
            bgColor: s.newsletter?.bgColor || "#F85606",
            textColor: s.newsletter?.textColor || "#ffffff",
            buttonBg: s.newsletter?.buttonBg || "#0f172a",
            buttonText: s.newsletter?.buttonText || "#ffffff",
            iconColor: s.newsletter?.iconColor || "#ffffff",
            title: s.newsletter?.title || "Subscribe & get 10% off your first order!",
            placeholder: s.newsletter?.placeholder || "Enter your email",
            buttonLabel: s.newsletter?.buttonLabel || "Subscribe",
          },
          appPromo: {
            enabled: s.appPromo?.enabled ?? true,
            title: s.appPromo?.title || "Scan with mobile",
            description: s.appPromo?.description || "Download app to enjoy discounts",
            badgeText: s.appPromo?.badgeText || "App Exclusive",
          },
          sellerDefaults: {
            rating: s.sellerDefaults?.rating ?? 90,
            shipOnTime: s.sellerDefaults?.shipOnTime ?? 96,
            chatResponseLabel: s.sellerDefaults?.chatResponseLabel || "not enough data",
          },
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      Swal.fire("Error", "Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("social.")) {
      const key = name.split(".")[1];
      setForm((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const fileInputRef = useRef(null);
  const footerLogoInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { default: uploadToMedia } = await import("@/components/utils/Mediaupload");
      const url = await uploadToMedia(file, "logo");
      if (url) setForm(prev => ({ ...prev, logo: url }));
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFooterLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { default: uploadToMedia } = await import("@/components/utils/Mediaupload");
      const url = await uploadToMedia(file, "logo");
      if (url) setForm(prev => ({ ...prev, footerLogo: url }));
    } catch (err) {
      console.error("Footer logo upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logo: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        brandName: form.brandName,
        iconLetter: form.iconLetter,
        logo: form.logo,
        primaryColor: form.primaryColor,
        chatWidgetColor: form.chatWidgetColor,
        fontFamily: form.fontFamily,
        fontUrl: form.fontUrl,
        tagline: form.tagline,
        footerCompanyName: form.footerCompanyName,
        footerSupportEmail: form.footerSupportEmail,
        footerDescription: form.footerDescription,
        footerAddress: form.footerAddress,
        footerPhone: form.footerPhone,
        footerBg: form.footerBg,
        footerTextColor: form.footerTextColor,
        footerHeadingColor: form.footerHeadingColor,
        footerLinkHoverColor: form.footerLinkHoverColor,
        footerFontSize: form.footerFontSize,
        footerFontFamily: form.footerFontFamily,
        footerLogo: form.footerLogo,
        socialEnabled: form.socialEnabled,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        emailFromName: form.emailFromName,
        emailFromAddress: form.emailFromAddress,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpUser: form.smtpUser,
        smtpPass: form.smtpPass,
        emailProvider: form.emailProvider,
        gmailEmail: form.gmailEmail,
        gmailClientId: form.gmailClientId,
        gmailClientSecret: form.gmailClientSecret,
        gmailRefreshToken: form.gmailRefreshToken,
        navbarBg: form.navbarBg,
        navbarText: form.navbarText,
        navbarBorder: form.navbarBorder,
        topbarBg: form.topbarBg,
        topbarText: form.topbarText,
        social: form.social,
        shipping: form.shipping,
        returnPolicy: form.returnPolicy,
        announcement: form.announcement,
        newsletter: form.newsletter,
      };
      const res = await api.put("/api/settings", payload);
      if (res.data?.success) {
        injectTheme(form.primaryColor);
        injectFont(form.fontFamily, form.fontUrl);
        injectNavbar(form);
        const color = form.chatWidgetColor || form.primaryColor || "#F85606";
        document.cookie = `opencodeChatColor=${encodeURIComponent(color)}; max-age=31536000; path=/`;
        Swal.fire("Saved!", "Settings updated successfully.", "success");
        invalidatePublicSettings();
        window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: res.data.settings }));
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSectionSave = async (section, payload) => {
    setSavingSection(section);
    try {
      const res = await api.put("/api/settings", payload);
      if (res.data?.success) {
        if (payload.primaryColor) injectTheme(payload.primaryColor);
        if (payload.fontFamily) injectFont(payload.fontFamily, payload.fontUrl || form.fontUrl);
        if (payload.navbarBg || payload.navbarText || payload.navbarBorder || payload.topbarBg || payload.topbarText) {
          injectNavbar({ ...form, ...payload });
        }
        const color = payload.chatWidgetColor || payload.primaryColor || form.chatWidgetColor || form.primaryColor || "#F85606";
        if (payload.chatWidgetColor || payload.primaryColor) {
          document.cookie = `opencodeChatColor=${encodeURIComponent(color)}; max-age=31536000; path=/`;
        }
        Swal.fire({ icon: "success", title: "Saved!", text: `${section} updated successfully.`, timer: 1500, showConfirmButton: false });
        invalidatePublicSettings();
        window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: res.data.settings }));
      }
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || `Failed to save ${section.toLowerCase()}`, "error");
    } finally {
      setSavingSection(null);
    }
  };

  const handleReset = () => {
    fetchSettings();
    Swal.fire("Reset", "Form has been reset to saved values.", "info");
  };

  const handleTestEmail = async () => {
    if (!form.emailFromAddress && !form.smtpUser) {
      return Swal.fire("Missing", "Set SMTP user or from email first", "warning");
    }
    setTestLoading(true);
    try {
      const to = form.emailFromAddress || form.smtpUser;
      await api.post("/api/settings/test-email", { to });
      Swal.fire("Sent!", `Test email sent to ${to}. Check your inbox.`, "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to send test email. Check your SMTP settings.", "error");
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Site Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your brand identity and site-wide configuration</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <FiRefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Brand Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiHash className="w-5 h-5 text-brand-500" />
              Brand Identity
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Brand Identity", { brandName: form.brandName, iconLetter: form.iconLetter, logo: form.logo, tagline: form.tagline })}
              disabled={savingSection === "Brand Identity"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Brand Identity" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name</label>
              <input
                type="text"
                name="brandName"
                value={form.brandName}
                onChange={handleChange}
                placeholder="MYBRAND"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Displayed in the logo and site title</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Icon Letter</label>
              <input
                type="text"
                name="iconLetter"
                value={form.iconLetter}
                onChange={handleChange}
                maxLength={2}
                placeholder="M"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Shown in the logo badge icon (1-2 chars)</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Logo Image</label>
              <div className="flex items-center gap-4">
                {form.logo ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={form.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                    <FiUpload className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition disabled:opacity-50"
                  >
                    {uploadingLogo ? "Uploading..." : form.logo ? "Change Logo" : "Upload Logo"}
                  </button>
                  <p className="text-xs text-slate-400 mt-1">Recommended: 200x200px, PNG or WebP</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                name="tagline"
                value={form.tagline}
                onChange={handleChange}
                placeholder="Your brand tagline here"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ backgroundColor: form.primaryColor }}>
                {form.logo ? (
                  <img src={form.logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  form.iconLetter || "M"
                )}
              </div>
              <div>
                <span className="text-xl font-black tracking-[-0.5px] text-slate-700">
                  {form.brandName || "YOUR"}
                  <span style={{ color: form.primaryColor }}>
                    {form.brandName ? "" : "BRAND"}
                  </span>
                </span>
                {form.tagline && (
                  <p className="text-xs text-slate-500 mt-0.5">{form.tagline}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navbar Colors */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiHash className="w-5 h-5 text-brand-500" />
              Navbar Colors
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Navbar Colors", { navbarBg: form.navbarBg, navbarText: form.navbarText, navbarBorder: form.navbarBorder, topbarBg: form.topbarBg, topbarText: form.topbarText })}
              disabled={savingSection === "Navbar Colors"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Navbar Colors" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Customize the main navigation bar and top promo bar colors.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Navbar Background</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.navbarBg}
                  onChange={(e) => setForm((prev) => ({ ...prev, navbarBg: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.navbarBg}
                  onChange={(e) => setForm((prev) => ({ ...prev, navbarBg: e.target.value }))}
                  placeholder="#ffffff"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Navbar Text</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.navbarText}
                  onChange={(e) => setForm((prev) => ({ ...prev, navbarText: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.navbarText}
                  onChange={(e) => setForm((prev) => ({ ...prev, navbarText: e.target.value }))}
                  placeholder="#475569"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Navbar Border</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.navbarBorder}
                  onChange={(e) => setForm((prev) => ({ ...prev, navbarBorder: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.navbarBorder}
                  onChange={(e) => setForm((prev) => ({ ...prev, navbarBorder: e.target.value }))}
                  placeholder="#f1f5f9"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Top Bar Background</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.topbarBg}
                  onChange={(e) => setForm((prev) => ({ ...prev, topbarBg: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.topbarBg}
                  onChange={(e) => setForm((prev) => ({ ...prev, topbarBg: e.target.value }))}
                  placeholder="#f5f5f5"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Top Bar Text</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.topbarText}
                  onChange={(e) => setForm((prev) => ({ ...prev, topbarText: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.topbarText}
                  onChange={(e) => setForm((prev) => ({ ...prev, topbarText: e.target.value }))}
                  placeholder="#737373"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Navbar Live Preview */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Live Preview</p>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: form.navbarBorder }}>
              <div className="px-4 py-2 text-xs font-medium flex items-center gap-4" style={{ backgroundColor: form.topbarBg, color: form.topbarText }}>
                <span>📢 Free shipping over Rs. 10,000</span>
                <span className="ml-auto">Help  |  Track Order</span>
              </div>
              <div className="px-4 py-3 flex items-center gap-4" style={{ backgroundColor: form.navbarBg, color: form.navbarText }}>
                <span className="font-bold text-base" style={{ color: form.primaryColor }}>BRAND</span>
                <span className="text-xs opacity-70">Home</span>
                <span className="text-xs opacity-70">Shop</span>
                <span className="text-xs opacity-70">Categories</span>
                <div className="ml-auto flex items-center gap-3 text-xs">
                  <span>🔍</span>
                  <span>🛒</span>
                  <span>👤</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiDroplet className="w-5 h-5 text-brand-500" />
              Theme Color
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Theme Color", { primaryColor: form.primaryColor })}
              disabled={savingSection === "Theme Color"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Theme Color" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="primaryColor"
                  value={form.primaryColor}
                  onChange={handleChange}
                  className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="primaryColor"
                  value={form.primaryColor}
                  onChange={handleChange}
                  placeholder="#F85606"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Changes the entire website brand color</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-2 shadow-md flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  A
                </div>
                <p className="text-xs text-slate-500">Preview accent</p>
              </div>
            </div>
          </div>
          {/* Color shades preview */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Generated Shades</p>
            <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <div
                  key={shade}
                  className="flex-1"
                  style={{ backgroundColor: `color-mix(in srgb, ${form.primaryColor} ${shade <= 500 ? 100 - (500 - shade) * 0.7 : 100}%, ${shade < 500 ? "white" : "black"})` }}
                  title={`brand-${shade}`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">All Tailwind brand-* utilities (bg-brand-500, text-brand-600, etc.) use this color</p>
          </div>
        </div>

        {/* Chat Widget Color */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiMessageCircle className="w-5 h-5 text-brand-500" />
              Chat Widget Color
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Chat Widget Color", { chatWidgetColor: form.chatWidgetColor })}
              disabled={savingSection === "Chat Widget Color"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Chat Widget Color" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Widget Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="chatWidgetColor"
                  value={form.chatWidgetColor}
                  onChange={handleChange}
                  className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="chatWidgetColor"
                  value={form.chatWidgetColor}
                  onChange={handleChange}
                  placeholder="#F85606"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Color for the chat widget button, header, and send button</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-2 shadow-md flex items-center justify-center text-white"
                  style={{ backgroundColor: form.chatWidgetColor }}
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">Widget preview</p>
              </div>
            </div>
          </div>
        </div>

        {/* Font Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiType className="w-5 h-5 text-brand-500" />
              Typography & Fonts
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Typography", { fontFamily: form.fontFamily, fontUrl: form.fontUrl })}
              disabled={savingSection === "Typography"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Typography" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {FONT_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, fontFamily: preset.family, fontUrl: preset.url }))}
                  className={`p-3 rounded-xl border text-left transition ${form.fontFamily === preset.family ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                >
                  <p className="text-sm font-medium text-slate-900 truncate" style={{ fontFamily: preset.family }}>
                    {preset.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{preset.family.split(",")[0]}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Font Family</label>
                <input
                  type="text"
                  name="fontFamily"
                  value={form.fontFamily}
                  onChange={handleChange}
                  placeholder="Inter, system-ui, sans-serif"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">CSS font-family value</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Google Fonts URL</label>
                <input
                  type="url"
                  name="fontUrl"
                  value={form.fontUrl}
                  onChange={handleChange}
                  placeholder="https://fonts.googleapis.com/css2?family=Inter:wght@..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty for system fonts</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
              <p className="text-base" style={{ fontFamily: form.fontFamily }}>
                The quick brown fox jumps over the lazy dog. 1234567890
              </p>
              <p className="text-sm mt-1 text-slate-500" style={{ fontFamily: form.fontFamily }}>
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
              </p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiGlobe className="w-5 h-5 text-brand-500" />
              Footer Settings
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Footer Settings", {
                footerCompanyName: form.footerCompanyName, footerSupportEmail: form.footerSupportEmail,
                footerDescription: form.footerDescription, footerAddress: form.footerAddress,
                footerPhone: form.footerPhone, footerBg: form.footerBg, footerTextColor: form.footerTextColor,
                footerHeadingColor: form.footerHeadingColor, footerLinkHoverColor: form.footerLinkHoverColor,
                footerFontSize: form.footerFontSize, footerFontFamily: form.footerFontFamily,
                footerLogo: form.footerLogo, social: form.social, socialEnabled: form.socialEnabled,
              })}
              disabled={savingSection === "Footer Settings"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Footer Settings" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Content Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input type="text" name="footerCompanyName" value={form.footerCompanyName} onChange={handleChange} placeholder="BrandName Inc." className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
                  <input type="email" name="footerSupportEmail" value={form.footerSupportEmail} onChange={handleChange} placeholder="support@brand.com" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="text" name="footerPhone" value={form.footerPhone} onChange={handleChange} placeholder="+94 11 234 5678" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Footer Logo</label>
                  <div className="flex items-center gap-2">
                    <input type="text" name="footerLogo" value={form.footerLogo} onChange={handleChange} placeholder="https://example.com/logo.png" className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
                    <input
                      type="file"
                      accept="image/*"
                      ref={footerLogoInputRef}
                      onChange={handleFooterLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => footerLogoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-gray-100 text-slate-700 font-medium rounded-lg transition text-xs whitespace-nowrap border border-slate-200"
                    >
                      {uploadingLogo ? (
                        <span className="flex items-center gap-1"><div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-400 border-t-transparent" />Uploading</span>
                      ) : (
                        <><FiUpload className="w-3.5 h-3.5" /> Select</>
                      )}
                    </button>
                    {form.footerLogo && (
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, footerLogo: "" }))} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {form.footerLogo && (
                    <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <img src={form.footerLogo} alt="footer logo preview" className="h-8 w-auto rounded object-contain bg-white" />
                      <span className="text-xs text-slate-400 truncate">{form.footerLogo}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input type="text" name="footerAddress" value={form.footerAddress} onChange={handleChange} placeholder="123 Commerce Street, Business District, Colombo 01, Sri Lanka" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea name="footerDescription" value={form.footerDescription} onChange={handleChange} rows={2} placeholder="Brief description about your company..." className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm resize-none" />
              </div>
            </div>

            {/* Style Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="footerBg" value={form.footerBg} onChange={handleChange} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 shrink-0" />
                  <input type="text" name="footerBg" value={form.footerBg} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="footerTextColor" value={form.footerTextColor} onChange={handleChange} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 shrink-0" />
                  <input type="text" name="footerTextColor" value={form.footerTextColor} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Heading Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="footerHeadingColor" value={form.footerHeadingColor} onChange={handleChange} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 shrink-0" />
                  <input type="text" name="footerHeadingColor" value={form.footerHeadingColor} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link Hover Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="footerLinkHoverColor" value={form.footerLinkHoverColor} onChange={handleChange} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 shrink-0" />
                  <input type="text" name="footerLinkHoverColor" value={form.footerLinkHoverColor} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Font Size</label>
                <select name="footerFontSize" value={form.footerFontSize} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm bg-white">
                  <option value="0.75rem">Small (12px)</option>
                  <option value="0.875rem">Normal (14px)</option>
                  <option value="1rem">Medium (16px)</option>
                  <option value="1.125rem">Large (18px)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Font Family</label>
                <select name="footerFontFamily" value={form.footerFontFamily} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm bg-white">
                  <option value="">System Default</option>
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="'Segoe UI', system-ui, sans-serif">Segoe UI</option>
                  <option value="'Helvetica Neue', Arial, sans-serif">Helvetica Neue</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FaFacebook className="w-4 h-4 text-brand-500" />
              Social Media
            </h3>
            <p className="text-xs text-slate-500 mb-3">Toggle which icons appear in the footer and set their links.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(form.social).map((platform) => {
                const Icon = SOCIAL_ICONS[platform];
                const colorClass = SOCIAL_COLORS[platform];
                return (
                  <div key={platform} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={form.socialEnabled?.[platform] ?? true}
                        onChange={(e) => setForm(prev => ({ ...prev, socialEnabled: { ...prev.socialEnabled, [platform]: e.target.checked } }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                    </label>
                    <Icon className={`w-4 h-4 shrink-0 ${colorClass}`} />
                    <input
                      type="url"
                      name={`social.${platform}`}
                      value={form.social[platform] || ""}
                      onChange={handleChange}
                      placeholder={`https://${platform}.com/yourpage`}
                      className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Preview */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preview</p>
            <div className="rounded-xl overflow-hidden border border-slate-200" style={{ backgroundColor: form.footerBg, fontFamily: form.footerFontFamily || form.fontFamily || undefined }}>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-black mb-2 tracking-wider text-xs" style={{ color: form.footerHeadingColor }}>CUSTOMER SERVICE</p>
                    <ul className="space-y-1" style={{ color: form.footerTextColor, fontSize: form.footerFontSize }}>
                      <li className="text-xs">Track Order</li>
                      <li className="text-xs">Returns</li>
                      <li className="text-xs">Help Center</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-black mb-2 tracking-wider text-xs" style={{ color: form.footerHeadingColor }}>CONTACT</p>
                    <ul className="space-y-1" style={{ color: form.footerTextColor, fontSize: form.footerFontSize }}>
                      <li className="text-xs">{form.footerAddress || "Address"}</li>
                      <li className="text-xs">{form.footerPhone || "Phone"}</li>
                      <li className="text-xs">{form.footerSupportEmail || "Email"}</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: form.footerTextColor + "33" }}>
                  <p className="text-xs" style={{ color: form.footerTextColor, fontSize: form.footerFontSize }}>&copy; {new Date().getFullYear()} {form.footerCompanyName || "BrandName Inc."}. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiType className="w-5 h-5 text-brand-500" />
              SEO & Meta
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("SEO & Meta", { metaTitle: form.metaTitle, metaDescription: form.metaDescription })}
              disabled={savingSection === "SEO & Meta"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "SEO & Meta" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meta Title</label>
              <input
                type="text"
                name="metaTitle"
                value={form.metaTitle}
                onChange={handleChange}
                placeholder="Your Site Name - Best Online Store"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meta Description</label>
              <textarea
                name="metaDescription"
                value={form.metaDescription}
                onChange={handleChange}
                rows={3}
                placeholder="A brief description of your site for search engines..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">
                Recommended: 150-160 characters. Currently: {form.metaDescription.length} chars
              </p>
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiMail className="w-5 h-5 text-brand-500" />
              Email Configuration
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Email Configuration", {
                emailFromName: form.emailFromName, emailFromAddress: form.emailFromAddress,
                emailProvider: form.emailProvider, smtpHost: form.smtpHost, smtpPort: form.smtpPort,
                smtpUser: form.smtpUser, smtpPass: form.smtpPass, gmailEmail: form.gmailEmail,
                gmailClientId: form.gmailClientId, gmailClientSecret: form.gmailClientSecret,
                gmailRefreshToken: form.gmailRefreshToken,
              })}
              disabled={savingSection === "Email Configuration"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Email Configuration" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Configure how your site sends emails (order confirmations, login alerts, etc.).
          </p>

          {/* Provider Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
            {["smtp", "gmail"].map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, emailProvider: provider }))}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  form.emailProvider === provider
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {provider === "smtp" ? "SMTP" : "Gmail OAuth2"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
              <input
                type="text"
                value={form.emailFromName}
                onChange={(e) => setForm((prev) => ({ ...prev, emailFromName: e.target.value }))}
                placeholder={form.brandName || "MYBRAND"}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
              <input
                type="email"
                value={form.emailFromAddress}
                onChange={(e) => setForm((prev) => ({ ...prev, emailFromAddress: e.target.value }))}
                placeholder="hello@mybrand.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {form.emailProvider === "smtp" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={form.smtpHost}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={form.smtpPort}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                    placeholder="587"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SMTP User</label>
                  <input
                    type="text"
                    value={form.smtpUser}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpUser: e.target.value }))}
                    placeholder="hello@mybrand.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.smtpPass}
                      onChange={(e) => setForm((prev) => ({ ...prev, smtpPass: e.target.value }))}
                      placeholder="App password or SMTP password"
                      className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Use any SMTP provider — SendGrid, Mailgun, Brevo, or Gmail App Password.</p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gmail Email</label>
                  <input
                    type="email"
                    value={form.gmailEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, gmailEmail: e.target.value }))}
                    placeholder="your@gmail.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={form.gmailClientId}
                    onChange={(e) => setForm((prev) => ({ ...prev, gmailClientId: e.target.value }))}
                    placeholder="From Google Cloud Console"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client Secret</label>
                  <input
                    type="text"
                    value={form.gmailClientSecret}
                    onChange={(e) => setForm((prev) => ({ ...prev, gmailClientSecret: e.target.value }))}
                    placeholder="From Google Cloud Console"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Refresh Token</label>
                  <input
                    type="text"
                    value={form.gmailRefreshToken}
                    onChange={(e) => setForm((prev) => ({ ...prev, gmailRefreshToken: e.target.value }))}
                    placeholder="From Google OAuth Playground"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Client ID & Secret from{" "}
                <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">Google Cloud Console</a>,{" "}
                Refresh Token from{" "}
                <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">OAuth Playground</a>
                . These steps must be done manually.
              </p>
              <details className="mt-3 group">
                <summary className="text-sm font-medium text-brand-600 cursor-pointer hover:text-brand-700 list-none flex items-center gap-1">
                  <span className="text-xs">▼</span> Step-by-step guide
                </summary>
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-3">
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Step 1: Google Cloud Console</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">Google Cloud Console</a></li>
                      <li>Create a new project or select an existing one</li>
                      <li>Go to <strong>APIs &amp; Services</strong> → <strong>Library</strong></li>
                      <li>Search for and enable <strong>Gmail API</strong></li>
                      <li>Go to <strong>Credentials</strong> → <strong>Create Credentials</strong> → <strong>OAuth client ID</strong></li>
                      <li>Application type: <strong>Web application</strong></li>
                      <li>Add redirect URI: <code className="bg-slate-200 px-1 rounded">https://developers.google.com/oauthplayground</code></li>
                      <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> → paste them above</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Step 2: OAuth Playground</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Go to <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">OAuth Playground</a></li>
                      <li>Click the gear icon (⚙️) in the top right</li>
                      <li>Check <strong>Use your own OAuth credentials</strong></li>
                      <li>Paste your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                      <li>In the scopes box, enter: <code className="bg-slate-200 px-1 rounded">https://mail.google.com/</code></li>
                      <li>Click <strong>Authorize APIs</strong> → log in with your Gmail → grant access</li>
                      <li>Click <strong>Exchange authorization code for tokens</strong></li>
                      <li>Copy the <strong>Refresh Token</strong> → paste it above</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Step 3: Test</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Fill in <strong>Gmail Email</strong> (your@gmail.com)</li>
                      <li>Fill <strong>From Name</strong> and <strong>From Email</strong></li>
                      <li>Click <strong>Send Test Email</strong> to verify everything works</li>
                      <li>Click <strong>Save Settings</strong> to store the configuration</li>
                    </ol>
                  </div>
                </div>
              </details>
            </>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 transition"
            >
              <FiSend className={`w-4 h-4 ${testLoading ? "animate-ping" : ""}`} />
              {testLoading ? "Sending..." : "Send Test Email"}
            </button>
            <p className="text-xs text-slate-400">Sent to your from-email address</p>
          </div>
        </div>

        {/* Shipping Configuration */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiTruck className="w-5 h-5 text-brand-500" />
              Shipping Configuration
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Shipping", { shipping: form.shipping })}
              disabled={savingSection === "Shipping"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Shipping" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Configure shipping methods, costs, and delivery estimates shown on the Shipping Info page.
          </p>

          <div className="mb-6 max-w-xs">
            <label className="block text-xs font-medium text-slate-600 mb-1">Courier Name</label>
            <input
              value={form.shipping?.courierName || "Domex"}
              onChange={(e) => setForm(prev => ({ ...prev, shipping: { ...prev.shipping, courierName: e.target.value } }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="max-w-md">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">{form.shipping?.standardName || "Standard Delivery"}</h3>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input
                  value={form.shipping?.standardName || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, shipping: { ...prev.shipping, standardName: e.target.value } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cost (Rs.)</label>
                  <input
                    type="number"
                    value={form.shipping?.standardCost ?? ""}
                    onChange={(e) => setForm(prev => ({ ...prev, shipping: { ...prev.shipping, standardCost: Number(e.target.value) } }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Min Days</label>
                  <input
                    type="number"
                    value={form.shipping?.standardDaysMin ?? ""}
                    onChange={(e) => setForm(prev => ({ ...prev, shipping: { ...prev.shipping, standardDaysMin: Number(e.target.value) } }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Days</label>
                  <input
                    type="number"
                    value={form.shipping?.standardDaysMax ?? ""}
                    onChange={(e) => setForm(prev => ({ ...prev, shipping: { ...prev.shipping, standardDaysMax: Number(e.target.value) } }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Free Shipping Threshold (Rs.)</label>
                <input
                  type="number"
                  value={form.shipping?.freeThreshold ?? ""}
                  onChange={(e) => setForm(prev => ({ ...prev, shipping: { ...prev.shipping, freeThreshold: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiHash className="w-5 h-5 text-brand-500" />
              Announcement Bar
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Announcement Bar", { announcement: form.announcement })}
              disabled={savingSection === "Announcement Bar"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Announcement Bar" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Customize the scrolling announcement bar shown on the home page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scroll Speed (seconds)</label>
              <input
                type="number"
                min={5}
                max={60}
                value={form.announcement?.speed ?? 12}
                onChange={(e) => setForm(prev => ({ ...prev, announcement: { ...prev.announcement, speed: Number(e.target.value) } }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Lower = faster (5-60s)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.announcement?.bgColor || "#F85606"}
                  onChange={(e) => setForm(prev => ({ ...prev, announcement: { ...prev.announcement, bgColor: e.target.value } }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.announcement?.bgColor || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, announcement: { ...prev.announcement, bgColor: e.target.value } }))}
                  placeholder="#F85606"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Text Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.announcement?.textColor || "#ffffff"}
                  onChange={(e) => setForm(prev => ({ ...prev, announcement: { ...prev.announcement, textColor: e.target.value } }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.announcement?.textColor || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, announcement: { ...prev.announcement, textColor: e.target.value } }))}
                  placeholder="#ffffff"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl overflow-hidden" style={{ backgroundColor: form.announcement?.bgColor || "#F85606" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: form.announcement?.textColor || "#ffffff", opacity: 0.6 }}>Preview</p>
            <div className="flex items-center gap-6 whitespace-nowrap" style={{ color: form.announcement?.textColor || "#ffffff" }}>
              <span className="flex items-center gap-2 text-sm font-medium opacity-90">★ New collection out now!</span>
              <span className="flex items-center gap-2 text-sm font-medium opacity-90">⚡ Free shipping over $50</span>
              <span className="flex items-center gap-2 text-sm font-medium opacity-90">🎉 50% off select items</span>
            </div>
          </div>
        </div>

        {/* Newsletter Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiMail className="w-5 h-5 text-brand-500" />
              Newsletter Banner
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Newsletter Banner", { newsletter: form.newsletter })}
              disabled={savingSection === "Newsletter Banner"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Newsletter Banner" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Customize the subscribe newsletter banner shown above the footer.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.newsletter?.enabled ?? true}
                onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, enabled: e.target.checked } }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
            <span className="text-sm font-medium text-slate-700">Show Newsletter Banner</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.newsletter?.bgColor || "#F85606"}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, bgColor: e.target.value } }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.newsletter?.bgColor || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, bgColor: e.target.value } }))}
                  placeholder="#F85606"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Text Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.newsletter?.textColor || "#ffffff"}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, textColor: e.target.value } }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.newsletter?.textColor || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, textColor: e.target.value } }))}
                  placeholder="#ffffff"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Icon Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.newsletter?.iconColor || "#ffffff"}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, iconColor: e.target.value } }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.newsletter?.iconColor || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, iconColor: e.target.value } }))}
                  placeholder="#ffffff"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Button Background</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.newsletter?.buttonBg || "#0f172a"}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, buttonBg: e.target.value } }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.newsletter?.buttonBg || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, buttonBg: e.target.value } }))}
                  placeholder="#0f172a"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Button Text Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.newsletter?.buttonText || "#ffffff"}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, buttonText: e.target.value } }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.newsletter?.buttonText || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, buttonText: e.target.value } }))}
                  placeholder="#ffffff"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title Text</label>
              <input
                type="text"
                value={form.newsletter?.title || ""}
                onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, title: e.target.value } }))}
                placeholder="Subscribe & get 10% off your first order!"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Input Placeholder</label>
                <input
                  type="text"
                  value={form.newsletter?.placeholder || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, placeholder: e.target.value } }))}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Button Label</label>
                <input
                  type="text"
                  value={form.newsletter?.buttonLabel || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, newsletter: { ...prev.newsletter, buttonLabel: e.target.value } }))}
                  placeholder="Subscribe"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {form.newsletter?.enabled && (
            <div className="p-4 rounded-xl overflow-hidden border border-slate-200" style={{ backgroundColor: form.newsletter?.bgColor || "#F85606" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: form.newsletter?.textColor || "#ffffff", opacity: 0.6 }}>Preview</p>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: form.newsletter?.iconColor || "#ffffff" }}>
                    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                  </svg>
                  <span className="font-bold text-lg" style={{ color: "rgb(0, 0, 0)" }}>
                    {form.newsletter?.title || "Subscribe & get 10% off your first order!"}
                  </span>
                </div>
                <div className="flex w-full md:w-auto">
                  <input
                    placeholder={form.newsletter?.placeholder || "Enter your email"}
                    className="flex-1 md:w-64 px-4 py-2.5 bg-white text-gray-900 border-0 rounded-l-md outline-none placeholder:text-gray-400"
                    readOnly
                  />
                  <button className="px-6 py-2.5 font-bold rounded-r-md hover:opacity-90 transition-colors" style={{ backgroundColor: form.newsletter?.buttonBg || "#0f172a", color: form.newsletter?.buttonText || "#ffffff" }}>
                    {form.newsletter?.buttonLabel || "Subscribe"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* App Promo (PDP) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiSmartphone className="w-5 h-5 text-brand-500" />
              App Promo (PDP)
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("App Promo", { appPromo: form.appPromo })}
              disabled={savingSection === "App Promo"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "App Promo" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Configure the QR code / app download promo card on the product detail page.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.appPromo?.enabled ?? true}
                  onChange={(e) => setForm(prev => ({ ...prev, appPromo: { ...prev.appPromo, enabled: e.target.checked } }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
              <span className="text-sm font-medium text-slate-700">Show App Promo Card</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={form.appPromo?.title || ""}
                onChange={(e) => setForm(prev => ({ ...prev, appPromo: { ...prev.appPromo, title: e.target.value } }))}
                placeholder="Scan with mobile"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={form.appPromo?.description || ""}
                onChange={(e) => setForm(prev => ({ ...prev, appPromo: { ...prev.appPromo, description: e.target.value } }))}
                placeholder="Download app to enjoy discounts"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Badge Text</label>
              <input
                type="text"
                value={form.appPromo?.badgeText || ""}
                onChange={(e) => setForm(prev => ({ ...prev, appPromo: { ...prev.appPromo, badgeText: e.target.value } }))}
                placeholder="App Exclusive"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Seller Defaults (PDP) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiUser className="w-5 h-5 text-brand-500" />
              Seller Defaults (PDP)
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Seller Defaults", { sellerDefaults: form.sellerDefaults })}
              disabled={savingSection === "Seller Defaults"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Seller Defaults" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Default seller stats shown on the product detail page (per-seller data will override these when available).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Seller Rating (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.sellerDefaults?.rating ?? 90}
                onChange={(e) => setForm(prev => ({ ...prev, sellerDefaults: { ...prev.sellerDefaults, rating: Number(e.target.value) } }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ship on Time (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.sellerDefaults?.shipOnTime ?? 96}
                onChange={(e) => setForm(prev => ({ ...prev, sellerDefaults: { ...prev.sellerDefaults, shipOnTime: Number(e.target.value) } }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chat Response Label</label>
              <input
                type="text"
                value={form.sellerDefaults?.chatResponseLabel || ""}
                onChange={(e) => setForm(prev => ({ ...prev, sellerDefaults: { ...prev.sellerDefaults, chatResponseLabel: e.target.value } }))}
                placeholder="not enough data"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Return Policy Configuration */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiRefreshCw className="w-5 h-5 text-brand-500" />
              Return Policy
            </h2>
            <button
              type="button"
              onClick={() => handleSectionSave("Return Policy", { returnPolicy: form.returnPolicy })}
              disabled={savingSection === "Return Policy"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 rounded-lg transition"
            >
              {savingSection === "Return Policy" ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
              ) : (
                <><FiSave className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Configure the return policy shown on the Returns & Exchanges page.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.returnPolicy?.enabled ?? true}
                  onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, enabled: e.target.checked } }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
              <span className="text-sm font-medium text-slate-700">Enable Returns</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Return Window (days)</label>
                <input
                  type="number"
                  value={form.returnPolicy?.windowDays ?? 7}
                  onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, windowDays: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Refund Processing (days)</label>
                <input
                  type="number"
                  value={form.returnPolicy?.refundDays ?? 5}
                  onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, refundDays: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Restocking Fee (LKR)</label>
                <input
                  type="number"
                  value={form.returnPolicy?.restockingFee ?? 0}
                  onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, restockingFee: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shipping Cost Paid By</label>
                <select
                  value={form.returnPolicy?.shippingCostPaidBy || "customer"}
                  onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, shippingCostPaidBy: e.target.value } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                >
                  <option value="customer">Customer</option>
                  <option value="store">Store</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Exchanges Allowed</label>
                <div className="flex items-center gap-3 h-[42px]">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.returnPolicy?.exchangesAllowed ?? false}
                      onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, exchangesAllowed: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                  <span className="text-sm text-slate-600">{form.returnPolicy?.exchangesAllowed ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Policy Summary</label>
              <textarea
                rows={2}
                value={form.returnPolicy?.policyText || ""}
                onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, policyText: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                placeholder="Brief policy description shown at the top of the Returns page."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Conditions (one per line, start with -)</label>
              <textarea
                rows={3}
                value={form.returnPolicy?.conditions || ""}
                onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, conditions: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                placeholder="- Item must be unused&#10;- Original packaging required"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Process Description</label>
              <textarea
                rows={2}
                value={form.returnPolicy?.processDescription || ""}
                onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, processDescription: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                placeholder="Describe how the return process works."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Refund Days Text</label>
              <input
                value={form.returnPolicy?.refundDaysText || ""}
                onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, refundDaysText: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Refunds are processed within 5 business days..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Restocking Fee Text</label>
              <input
                value={form.returnPolicy?.restockingFeeText || ""}
                onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, restockingFeeText: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="No restocking fee applies."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Shipping Cost Text</label>
              <input
                value={form.returnPolicy?.shippingCostText || ""}
                onChange={(e) => setForm(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, shippingCostText: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Return shipping cost is borne by the customer."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition text-sm"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
