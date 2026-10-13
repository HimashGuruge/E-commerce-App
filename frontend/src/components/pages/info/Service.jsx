import React, { memo } from 'react';
import { Truck, ShieldCheck, Headphones, Zap, CreditCard, RefreshCw } from 'lucide-react';

// Move static data outside the component to prevent re-creation on every render
const SERVICES = [
  {
    icon: <Truck size={32} />,
    title: "Express Delivery",
    desc: "Safe and ultra-fast doorstep delivery across the entire island for all your orders."
  },
  {
    icon: <ShieldCheck size={32} />,
    title: "Secure Shopping",
    desc: "We provide 100% guarantee and maximum security for every transaction you make."
  },
  {
    icon: <Headphones size={32} />,
    title: "24/7 Support",
    desc: "Our dedicated support team is available around the clock to assist with any inquiries."
  },
  {
    icon: <Zap size={32} />,
    title: "Instant Payments",
    desc: "Experience seamless and secure online payments with our integrated lightning-fast gateway."
  },
  {
    icon: <RefreshCw size={32} />,
    title: "Easy Returns",
    desc: "Not satisfied? Exchange your items easily within 7 days with our hassle-free return policy."
  },
  {
    icon: <CreditCard size={32} />,
    title: "Member Discounts",
    desc: "Enjoy exclusive year-round discounts and special offers for our registered members."
  }
];

const Service = memo(() => {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-6 antialiased">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-20 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase">
            Our <span className="text-brand-600">Services</span>
          </h1>
          <div className="w-24 h-1.5 bg-brand-600 mx-auto rounded-full"></div>
          <p className="text-slate-500 font-bold text-xs md:text-sm uppercase tracking-[0.3em] max-w-2xl mx-auto pt-2">
            Committed to providing premium solutions for our valued customers.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {SERVICES.map((service, index) => (
            <div 
              key={index}
              className="group bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 hover:-translate-y-2 cursor-default"
            >
              {/* Icon Container */}
              <div className="w-16 h-16 bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-500 shadow-inner">
                {service.icon}
              </div>

              <h3 className="text-xl font-black text-slate-800 mb-4 tracking-tight uppercase">
                {service.title}
              </h3>

              <p className="text-slate-500 leading-relaxed font-medium text-sm md:text-base">
                {service.desc}
              </p>
              
              {/* Learn More Action */}
              <div className="mt-8 flex items-center text-brand-600 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500">
                Explore More 
                <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Call to Action (CTA) */}
        <div className="mt-24 bg-slate-900 rounded-[3.5rem] p-12 md:p-20 text-center shadow-2xl overflow-hidden relative border border-white/5">
          {/* Decorative Blur Background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600/20 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-400/10 rounded-full -ml-40 -mb-40 blur-[100px]"></div>

          <div className="relative z-10 space-y-8">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">
              Need a Custom <span className="text-brand-500">Solution?</span>
            </h2>
            <p className="text-slate-400 font-medium max-w-xl mx-auto">
              Our team is ready to provide specialized services tailored to your unique requirements. Let's build something great together.
            </p>
            <button className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-600 hover:text-white transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95">
              Contact Us Now
            </button>
          </div>
        </div>

      </div>
    </div>
  );
});

export default Service;
