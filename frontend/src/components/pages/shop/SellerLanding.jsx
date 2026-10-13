import { Link } from "react-router-dom";
import { FiTrendingUp, FiPackage, FiUsers, FiBarChart2, FiChevronRight, FiStar, FiShield, FiTruck } from "react-icons/fi";

const benefits = [
  { icon: FiUsers, title: "Reach Millions", desc: "Access a large customer base actively shopping online every day" },
  { icon: FiTruck, title: "Easy Logistics", desc: "Free pick-up from your location and nationwide delivery support" },
  { icon: FiBarChart2, title: "Seller Dashboard", desc: "Real-time analytics, sales reports, and performance insights" },
  { icon: FiShield, title: "Fast Payments", desc: "Receive bi-weekly payouts directly to your bank account" },
];

const steps = [
  { num: "1", title: "Register", desc: "Fill in your details and upload documents in minutes" },
  { num: "2", title: "Get Approved", desc: "Our team verifies your application within 24-72 hours" },
  { num: "3", title: "Start Selling", desc: "List your products, receive orders, and grow your business" },
];

export default function SellerLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-900 via-brand-800 to-orange-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
              Start selling on our platform
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Turn Your Products Into{" "}
              <span className="text-orange-300">Profits</span>
            </h1>
            <p className="text-lg md:text-xl text-orange-100/80 mb-8 max-w-2xl">
              Join thousands of sellers reaching millions of customers. 
              We handle the logistics, you focus on growing your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/become-seller/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-brand-900 font-bold rounded-xl hover:bg-orange-50 transition-all shadow-2xl shadow-orange-500/25 text-lg"
              >
                Start Selling Now <FiChevronRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20 text-lg"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-brand-50 border-y border-brand-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10K+", label: "Active Sellers" },
              { value: "2M+", label: "Happy Customers" },
              { value: "500K+", label: "Products Listed" },
              { value: "98%", label: "On-Time Delivery" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-brand-600">{s.value}</div>
                <div className="text-sm text-brand-700/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Sell With Us?</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Everything you need to start and grow your online business
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, i) => (
            <div key={i} className="group p-6 bg-white rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                <b.icon className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{b.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 border-t-2 border-dashed border-brand-200" />
                )}
                <div className="w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 relative z-10">
                  {s.num}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/become-seller/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg text-lg"
            >
              Start Selling Now <FiChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[
            { q: "How long does verification take?", a: "Most applications are reviewed within 24-72 hours after submitting all required documents." },
            { q: "Is there any fee to start selling?", a: "No! Registration is completely free. We charge a small commission only when you make a sale." },
            { q: "How do I get paid?", a: "Payments are processed every two weeks and directly deposited to your registered bank account." },
            { q: "Can I sell as an individual?", a: "Yes, both individuals and registered businesses can sell on our platform." },
            { q: "How does shipping work?", a: "We offer free pick-up from your location and handle nationwide delivery through our logistics partners." },
          ].map((faq, i) => (
            <details key={i} className="group bg-white rounded-xl border border-slate-100 open:border-brand-200 open:ring-1 open:ring-brand-100 transition-all">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-slate-900 font-medium hover:text-brand-600">
                {faq.q}
                <FiChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="px-5 pb-4 text-slate-500 text-sm leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-600 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-lg text-orange-100 mb-8">
            Join thousands of successful sellers today
          </p>
          <Link
            to="/become-seller/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-700 font-bold rounded-xl hover:bg-orange-50 transition-all shadow-xl text-lg"
          >
            Get Started Free <FiChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
