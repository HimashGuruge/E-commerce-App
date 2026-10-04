import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import {
  Palette,
  Award,
  Layers,
  Code,
  Camera,
  Heart,
  Sparkles,
  Zap,
  Globe,
  Star,
  Briefcase,
  Users,
  Mail,
  Phone,
  MapPin,
  Clock,
  Pencil,
  HelpCircle,
  Loader2,
  ArrowRight,
  Moon,
  Sun,
} from "lucide-react";

const iconMap = {
  Palette: <Palette size={36} className="text-brand-500" />,
  Sparkles: <Sparkles size={36} className="text-amber-500" />,
  Brush: <Palette size={36} className="text-purple-500" />,
  Pen: <Pencil size={36} className="text-blue-500" />,
  Code: <Code size={36} className="text-indigo-500" />,
  Layers: <Layers size={36} className="text-teal-500" />,
  Zap: <Zap size={36} className="text-amber-500" />,
  Globe: <Globe size={36} className="text-sky-500" />,
  Briefcase: <Briefcase size={36} className="text-slate-600" />,
  Mail: <Mail size={36} className="text-slate-600" />,
  Moon: <Moon size={36} className="text-slate-700" />,
  Sun: <Sun size={36} className="text-amber-500" />,
};

const ServicesSection = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/services`);
      setServices(res.data?.services || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (iconName) => iconMap[iconName] || <HelpCircle size={36} className="text-slate-400" />;

  if (loading) {
    return (
      <section className="w-full bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Loader2 size={40} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-slate-500 mt-4">Loading services...</p>
        </div>
      </section>
    );
  }

  // Hide section entirely if no services (don't show empty message)
  if (error || services.length === 0) {
    return null;
  }

  if (error || services.length === 0) {
    return (
      <section className="w-full bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500">
            {error || "No services available"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            Our <span className="text-brand-500">Services</span>
          </h2>
          <p className="text-slate-500 mt-2">Comprehensive solutions for your needs</p>
        </div>

        {/* Services - Horizontal Cards with Big Icons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <div
              key={service._id || index}
              className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg transition-all duration-300 group cursor-pointer border border-transparent hover:border-brand-100"
            >
              {/* Big Icon */}
                <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt={service.title}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  renderIcon(service.iconName || service.iconType)
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
