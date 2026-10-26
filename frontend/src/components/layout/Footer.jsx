import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  X as TwitterIcon,
  Instagram,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import api from "@/utils/api";
import { getCachedSettings } from "@/utils/siteSettings";

const ScrollToTopLink = ({ to, children, className }) => (
  <Link
    to={to}
    className={className}
    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
  >
    {children}
  </Link>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [footerCategories, setFooterCategories] = useState([]);
  // Initialize from the synchronously-available localStorage cache (hydrated
  // at module load) so the first paint already shows the saved colors and
  // the default-only state never flashes on refresh.
  const [footerSettings, setFooterSettings] = useState(() => {
    const base = {
    footerCompanyName: "BrandName Inc.",
    footerSupportEmail: "support@brand.com",
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
    socialEnabled: { facebook: true, instagram: true, twitter: true, youtube: false, tiktok: false },
    social: {},
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
    };
    const cached = getCachedSettings();
    if (!cached) return base;
    return {
      ...base,
      footerCompanyName: cached.footerCompanyName || base.footerCompanyName,
      footerSupportEmail: cached.footerSupportEmail || base.footerSupportEmail,
      footerDescription: cached.footerDescription || "",
      footerAddress: cached.footerAddress || base.footerAddress,
      footerPhone: cached.footerPhone || base.footerPhone,
      footerBg: cached.footerBg || "#0f172a",
      footerTextColor: cached.footerTextColor || "#cbd5e1",
      footerHeadingColor: cached.footerHeadingColor || "#ffffff",
      footerLinkHoverColor: cached.footerLinkHoverColor || "#ffffff",
      footerFontSize: cached.footerFontSize || "0.875rem",
      footerFontFamily: cached.footerFontFamily || "",
      footerLogo: cached.footerLogo || "",
      socialEnabled: cached.socialEnabled || base.socialEnabled,
      social: cached.social || {},
      newsletter: cached.newsletter || base.newsletter,
    };
  });

  useEffect(() => {
    const handler = (e) => {
      const s = e.detail;
      if (s) {
        setFooterSettings((prev) => ({
          footerCompanyName: s.footerCompanyName || "BrandName Inc.",
          footerSupportEmail: s.footerSupportEmail || "support@brand.com",
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
          social: s.social || {},
          newsletter: s.newsletter || prev.newsletter,
        }));
      }
    };
    window.addEventListener("settingsUpdated", handler);
    return () => window.removeEventListener("settingsUpdated", handler);
  }, []);

  useEffect(() => {
    const fetchFooterCategories = async () => {
      try {
        const res = await api.get("/api/categories");
        const cats = res.data?.categories || res.data || [];
        setFooterCategories(cats.slice(0, 6).map(c => ({
          name: c.name,
          path: `/shop/category/${c.slug || c.name.toLowerCase().replace(/\s+/g, "-")}`,
        })));
      } catch (err) {
        console.error("Footer categories error:", err);
      }
    };
    fetchFooterCategories();
  }, []);

  const customerLinks = [
    { name: "Track Order", path: "/orders" },
    { name: "Returns & Exchanges", path: "/returns" },
    { name: "Shipping Info", path: "/shippinginfopage" },
    { name: "Contact Us", path: "/contact" },
    { name: "Help Center", path: "/help" },
  ];

  const companyLinks = [
    { name: "About Us", path: "/about" },
    { name: "Sell On " + (footerSettings.brandName || "Brand"), path: "/become-seller" },
    { name: "Careers", path: "/careers" },
    { name: "Press", path: "/press" },
  ];

  return (
    <footer className="w-full border-t" style={{ backgroundColor: footerSettings.footerBg, borderColor: footerSettings.footerTextColor + "33", fontSize: footerSettings.footerFontSize, fontFamily: footerSettings.footerFontFamily || undefined }}>
      <style>{`
        .footer-link { color: ${footerSettings.footerTextColor}; }
        .footer-link:hover { color: ${footerSettings.footerLinkHoverColor}; }
        .footer-bottom-link { color: ${footerSettings.footerTextColor}; }
        .footer-bottom-link:hover { color: ${footerSettings.footerLinkHoverColor}; }
        .footer-social { color: ${footerSettings.footerTextColor}; background: ${footerSettings.footerBg}; }
        .footer-social:hover { color: ${footerSettings.footerLinkHoverColor}; }
      `}</style>

      {/* Top Section - Newsletter */}
      {footerSettings.newsletter?.enabled !== false && (
        <div className="py-8 w-full" style={{ backgroundColor: footerSettings.newsletter?.bgColor || "var(--color-brand-500, #F85606)" }}>
          <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail size={24} style={{ color: footerSettings.newsletter?.iconColor || "#ffffff" }} />
              <span className="font-bold text-lg" style={{ color: footerSettings.newsletter?.textColor || "#ffffff" }}>
                {footerSettings.newsletter?.title || "Subscribe & get 10% off your first order!"}
              </span>
            </div>
            <div className="flex w-full md:w-auto">
              <input
                type="email"
                placeholder={footerSettings.newsletter?.placeholder || "Enter your email"}
                className="flex-1 md:w-64 px-4 py-2.5 bg-white text-gray-900 border-0 rounded-l-md outline-none placeholder:text-gray-400"
              />
              <button
                className="px-6 py-2.5 font-bold rounded-r-md hover:opacity-90 transition-colors cursor-pointer"
                style={{ backgroundColor: footerSettings.newsletter?.buttonBg || "#0f172a", color: footerSettings.newsletter?.buttonText || "#ffffff" }}
              >
                {footerSettings.newsletter?.buttonLabel || "Subscribe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Grid */}
      <div className="w-full" style={{ backgroundColor: footerSettings.footerBg }}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
          {(footerSettings.footerLogo || footerSettings.logo) && (
            <div className="mb-8">
              <img src={footerSettings.footerLogo || footerSettings.logo} alt={footerSettings.footerCompanyName} className="h-8 object-contain" />
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Customer Service */}
            <div>
              <h3 className="font-black mb-5 tracking-wider" style={{ color: footerSettings.footerHeadingColor, fontSize: footerSettings.footerFontSize }}>
                CUSTOMER SERVICE
              </h3>
              <ul className="space-y-3">
                {customerLinks.map((link, i) => (
                  <li key={i}>
                    <ScrollToTopLink
                      to={link.path}
                      className="footer-link font-medium transition-colors"
                    >
                      {link.name}
                    </ScrollToTopLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-black mb-5 tracking-wider" style={{ color: footerSettings.footerHeadingColor, fontSize: footerSettings.footerFontSize }}>COMPANY</h3>
              <ul className="space-y-3">
                {companyLinks.map((link, i) => (
                  <li key={i}>
                    <ScrollToTopLink
                      to={link.path}
                      className="footer-link font-medium transition-colors"
                    >
                      {link.name}
                    </ScrollToTopLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-black mb-5 tracking-wider" style={{ color: footerSettings.footerHeadingColor, fontSize: footerSettings.footerFontSize }}>CATEGORIES</h3>
              <ul className="space-y-3">
                {footerCategories.map((link, i) => (
                  <li key={i}>
                    <ScrollToTopLink
                      to={link.path}
                      className="footer-link font-medium transition-colors"
                    >
                      {link.name}
                    </ScrollToTopLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Brand Info */}
            <div className="col-span-2 md:col-span-4 lg:col-span-2">
              <h3 className="font-black mb-5 tracking-wider" style={{ color: footerSettings.footerHeadingColor, fontSize: footerSettings.footerFontSize }}>CONTACT US</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3" style={{ color: footerSettings.footerTextColor, fontSize: footerSettings.footerFontSize }}>
                  <MapPin size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-brand-400, #f97316)" }} />
                  <span className="font-medium">{footerSettings.footerAddress}</span>
                </li>
                <li className="flex items-center gap-3" style={{ color: footerSettings.footerTextColor, fontSize: footerSettings.footerFontSize }}>
                  <Phone size={18} className="flex-shrink-0" style={{ color: "var(--color-brand-400, #f97316)" }} />
                  <span className="font-medium">{footerSettings.footerPhone}</span>
                </li>
                <li className="flex items-center gap-3" style={{ color: footerSettings.footerTextColor, fontSize: footerSettings.footerFontSize }}>
                  <Mail size={18} className="flex-shrink-0" style={{ color: "var(--color-brand-400, #f97316)" }} />
                  <span className="font-medium">{footerSettings.footerSupportEmail}</span>
                </li>
              </ul>

              <div className="flex gap-3 mt-6">
                {footerSettings.socialEnabled?.facebook && (
                  <a href={footerSettings.social.facebook || "#"} target="_blank" rel="noopener noreferrer" className="footer-social w-10 h-10 flex items-center justify-center transition-all rounded-lg hover:shadow-md">
                    <Facebook size={20} />
                  </a>
                )}
                {footerSettings.socialEnabled?.twitter && (
                  <a href={footerSettings.social.twitter || "#"} target="_blank" rel="noopener noreferrer" className="footer-social w-10 h-10 flex items-center justify-center transition-all rounded-lg hover:shadow-md">
                    <TwitterIcon size={20} />
                  </a>
                )}
                {footerSettings.socialEnabled?.instagram && (
                  <a href={footerSettings.social.instagram || "#"} target="_blank" rel="noopener noreferrer" className="footer-social w-10 h-10 flex items-center justify-center transition-all rounded-lg hover:shadow-md">
                    <Instagram size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="w-full py-5" style={{ backgroundColor: footerSettings.footerBg, borderTop: `1px solid ${footerSettings.footerTextColor}33` }}>
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-medium" style={{ color: footerSettings.footerTextColor, fontSize: footerSettings.footerFontSize }}>
            &copy; {currentYear} {footerSettings.footerCompanyName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6" style={{ fontSize: footerSettings.footerFontSize }}>
            <ScrollToTopLink to="/privacy" className="footer-bottom-link font-medium transition-colors">
              Privacy Policy
            </ScrollToTopLink>
            <ScrollToTopLink to="/terms" className="footer-bottom-link font-medium transition-colors">
              Terms of Service
            </ScrollToTopLink>
            <ScrollToTopLink to="/returns" className="footer-bottom-link font-medium transition-colors">
              Return Policy
            </ScrollToTopLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
