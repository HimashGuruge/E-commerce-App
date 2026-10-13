import React, { useState, useEffect } from 'react';
import { Package, Truck, Clock, CheckCircle2, ArrowRight, Shield, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPublicSettings } from '@/utils/siteSettings';
import SkeletonLoader from '@/components/shared/SkeletonLoader';

const ShippingInfo = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getPublicSettings();
        if (settings) {
          setSettings(settings);
        }
      } catch (err) {
        console.error('Failed to load shipping settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <SkeletonLoader className="w-48 h-8 mx-auto mb-4" />
            <SkeletonLoader className="w-96 h-4 mx-auto" />
          </div>
          <div className="max-w-md mx-auto">
            <SkeletonLoader className="h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const s = settings?.shipping || {};
  const courier = s.courierName || "Domex";

  return (
    <div className="w-full bg-white py-16 px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Truck className="w-8 h-8 text-brand-500" />
            <h2 className="text-3xl font-bold text-gray-900">Shipping Information</h2>
          </div>
          <p className="text-gray-600">
            We deliver exclusively through <strong>{courier}</strong>. Orders are processed within 24 hours.
          </p>
        </div>

        {/* Standard Delivery Card */}
        <div className="max-w-md mx-auto mb-12">
          <div className="group p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300 text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Truck className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{s.standardName || "Domex Standard"}</h3>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-600 bg-brand-50 px-3 py-1 rounded">
                {s.standardDaysMin || 5}–{s.standardDaysMax || 11} Business Days
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Door-to-door delivery via {courier}. Fully trackable.
            </p>
            <div className="pt-4 border-t border-gray-200">
              <span className="text-lg font-bold text-gray-900">
                {s.standardCost ? `Rs. ${s.standardCost.toLocaleString()}` : "Free"}
              </span>
              {s.freeThreshold > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Free for orders over Rs. {s.freeThreshold.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-slate-50 rounded-3xl p-8 md:p-12 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: <Package className="w-5 h-5 text-gray-400" />, title: `${courier} Tracking`, desc: "Real-time tracking from dispatch to delivery." },
              { icon: <CheckCircle2 className="w-5 h-5 text-gray-400" />, title: "Free Shipping", desc: s.freeThreshold ? `Free on orders over Rs. ${s.freeThreshold.toLocaleString()}.` : "Free delivery on qualifying orders." },
              { icon: <Shield className="w-5 h-5 text-gray-400" />, title: "Cash on Delivery", desc: `Pay when your ${courier} courier arrives.` },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-2">{f.icon}</div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link to="/contact" className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors text-sm">
            Contact Support <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ShippingInfo;
