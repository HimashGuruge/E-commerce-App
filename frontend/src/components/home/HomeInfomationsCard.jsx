import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import {
  normalizeServiceStyle,
  serviceCardStyle,
  serviceTitleStyle,
  serviceDescStyle,
  serviceIconContainerStyle,
  serviceIconColor,
  serviceIconSize,
  serviceImageStyle,
} from "@/utils/serviceStyle";
import {
  Palette,
  Layers,
  Code,
  Sparkles,
  Zap,
  Globe,
  Briefcase,
  Mail,
  Pencil,
  HelpCircle,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";

const iconComponents = {
  Palette,
  Sparkles,
  Brush: Palette,
  Pen: Pencil,
  Code,
  Layers,
  Zap,
  Globe,
  Briefcase,
  Mail,
  Moon,
  Sun,
};

const renderIcon = (iconName, size = 36, color) => {
  const Comp = iconComponents[iconName];
  const style = color ? { color } : undefined;
  if (!Comp) return <HelpCircle size={size} style={style} />;
  return <Comp size={size} style={style} />;
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
          {services.map((service, index) => {
            const style = normalizeServiceStyle(service.style, service);
            return (
              <div
                key={service._id || index}
                className="flex items-start transition-all duration-300 group cursor-pointer"
                style={serviceCardStyle(style)}
              >
                {/* Big Icon */}
                <div
                  className="group-hover:scale-105 transition-transform duration-300 flex items-center justify-center"
                  style={serviceIconContainerStyle(style)}
                >
                  {service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt={service.title}
                      style={serviceImageStyle(style)}
                    />
                  ) : (
                    renderIcon(
                      service.iconName || service.iconType,
                      serviceIconSize(style),
                      serviceIconColor(style),
                    )
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold" style={serviceTitleStyle(style)}>
                    {service.title}
                  </h3>
                  <p className="mt-1" style={serviceDescStyle(style)}>
                    {service.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
