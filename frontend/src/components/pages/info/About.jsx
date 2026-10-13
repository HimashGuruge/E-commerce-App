import React, { memo } from 'react';
import { Target, Eye, ShieldCheck, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutPage = memo(() => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfcfc] to-slate-50 py-24 px-6 antialiased selection:bg-brand-100 selection:text-brand-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-24">
          <span className="text-brand-600 font-bold tracking-[0.3em] uppercase text-xs mb-4 block">Our Story</span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tighter mb-8">
            Defining the <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">Future</span> of Commerce.
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto leading-relaxed">
            Defining the future of digital commerce since 2024. Providing a seamless, secure, and innovative shopping experience for everyone.
          </p>
        </div>

        {/* Content Section: Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <div className="group bg-white p-12 rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:border-brand-200">
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Target size={30} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              To empower global consumers by providing a seamless, secure, and innovative shopping experience. We bridge the gap between quality products and doorstep delivery with cutting-edge technology.
            </p>
          </div>

          <div className="group bg-slate-900 p-12 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 text-white transition-all duration-500 hover:bg-slate-800">
            <div className="w-16 h-16 bg-white/10 text-white rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
              <Eye size={30} />
            </div>
            <h2 className="text-3xl font-extrabold mb-4 tracking-tight">Our Vision</h2>
            <p className="text-slate-300 leading-relaxed text-lg">
              To be the world's most customer-centric brand, where people can find and discover anything they want to buy online, backed by trust and unparalleled efficiency.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {[
            { icon: <ShieldCheck size={28}/>, title: "Integrity", desc: "Radical transparency and absolute honesty in every transaction." },
            { icon: <Users size={28}/>, title: "Community", desc: "Our customers are our family. We build relationships, not just orders." },
            { icon: <Target size={28}/>, title: "Innovation", desc: "Constantly evolving to stay ahead of digital trends and user needs." }
          ].map((item, i) => (
            <div key={i} className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="text-brand-600 mb-6">{item.icon}</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h4>
              <p className="text-slate-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-12 border-y border-slate-100 mb-20">
          <StatBox number="10K+" label="Active Users" />
          <StatBox number="50+" label="Global Partners" />
          <StatBox number="99%" label="Happy Clients" />
          <StatBox number="24/7" label="Support" />
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white border border-slate-100 p-16 rounded-[3rem] shadow-xl">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-8">Ready to join our story?</h2>
          <Link to="/" className="group inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition-all">
            Start Shopping 
            <span className="group-hover:translate-x-1 transition-transform"><ArrowRight size={18} /></span>
          </Link>
        </div>

      </div>
    </div>
  );
});

const StatBox = ({ number, label }) => (
  <div className="text-center p-4">
    <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{number}</div>
    <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{label}</div>
  </div>
);

export default AboutPage;
