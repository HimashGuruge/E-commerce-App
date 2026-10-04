import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Package,
  CreditCard,
  User,
  RotateCcw,
  Truck,
  MessageSquare,
  Shield,
  FileText,
  X,
} from "lucide-react";

const faqs = [
  {
    q: "How do I place an order?",
    a: "Browse our shop, add items to your cart, and proceed to checkout. You can pay with cash on delivery or credit/debit card via Stripe.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept cash on delivery (COD) and online payments via Stripe (credit/debit cards). All transactions are secure and encrypted.",
  },
  {
    q: "How can I track my order?",
    a: "Go to My Orders in your account dashboard. You'll see real-time updates on your order status from processing to delivery.",
  },
  {
    q: "What is your return policy?",
    a: "We offer free returns within 7 days of delivery. Items must be unused and in original packaging. Visit our Returns page for details.",
  },
  {
    q: "How do I contact customer support?",
    a: 'You can start a live chat by clicking the chat icon, visit our Contact page, or use the AI assistant available 24/7 on every page.',
  },
  {
    q: "Can I cancel or change my order?",
    a: "Orders can be cancelled within 1 hour of placement. Once processing starts, changes may not be possible. Contact support as soon as possible.",
  },
  {
    q: "How long does shipping take?",
    a: "Standard delivery takes 5-11 business days. Express shipping options may be available at checkout for faster delivery.",
  },
  {
    q: "Is my personal information secure?",
    a: "Yes. We use industry-standard encryption and never share your data with third parties. See our Privacy Policy for details.",
  },
];

const topics = [
  { icon: Package, title: "Orders", desc: "Placing, tracking, and managing orders", link: "/orders" },
  { icon: CreditCard, title: "Payments", desc: "Payment methods, billing, and refunds", link: "/orders" },
  { icon: Truck, title: "Shipping", desc: "Delivery times, costs, and coverage", link: "/shippinginfopage" },
  { icon: RotateCcw, title: "Returns", desc: "Return policy, process, and conditions", link: "/returns" },
  { icon: User, title: "Account", desc: "Profile, passwords, and preferences", link: "/profile" },
  { icon: Shield, title: "Privacy & Security", desc: "Data protection and safe shopping", link: "/privacy" },
  { icon: MessageSquare, title: "Contact Us", desc: "Get in touch with our support team", link: "/contact" },
  { icon: FileText, title: "Terms of Service", desc: "Our policies and terms of use", link: "/terms" },
];

function matchQuery(text, query) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const inputRef = useRef(null);

  const hasQuery = searchQuery.trim().length > 0;

  const filteredTopics = hasQuery
    ? topics.filter((t) => matchQuery(t.title, searchQuery) || matchQuery(t.desc, searchQuery))
    : topics;

  const filteredFaqs = hasQuery
    ? faqs.filter((faq) => matchQuery(faq.q, searchQuery) || matchQuery(faq.a, searchQuery))
    : faqs;

  const hasAnyResults = filteredTopics.length > 0 || filteredFaqs.length > 0;

  // Auto-expand first matching FAQ when search changes; close if no longer relevant
  useEffect(() => {
    if (!hasQuery) {
      setOpenFaq(null);
      return;
    }
    if (filteredFaqs.length > 0) {
      setOpenFaq(0);
    } else {
      setOpenFaq(null);
    }
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <HelpCircle size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">
            HELP CENTER
          </h1>
          <p className="text-slate-500 font-medium max-w-lg mx-auto mb-10 leading-relaxed">
            Find answers to common questions or get in touch with our support team.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for help..."
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
            />
            {hasQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {hasQuery && (
            <p className="text-xs text-slate-400 mt-3">
              {filteredTopics.length + filteredFaqs.length} result{(filteredTopics.length + filteredFaqs.length) !== 1 ? "s" : ""} found
            </p>
          )}
        </div>

        {hasAnyResults ? (
          <>
            {/* Topic Grid */}
            {filteredTopics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                {filteredTopics.map((topic) => (
                  <Link
                    key={topic.title}
                    to={topic.link}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all text-center group"
                  >
                    <topic.icon className="text-brand-500 mx-auto mb-3 group-hover:scale-110 transition-transform" size={28} />
                    <h4 className="font-bold text-sm text-slate-900 mb-1">{topic.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{topic.desc}</p>
                  </Link>
                ))}
              </div>
            )}

            {/* FAQ Section */}
            {filteredFaqs.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-2">
                  {filteredFaqs.map((faq, idx) => (
                    <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition"
                      >
                        <span className="text-sm font-medium text-slate-900 pr-4">{faq.q}</span>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                            openFaq === idx ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {openFaq === idx && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Unified Empty State */
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-base font-medium text-slate-600 mb-2">
              No results found for "{searchQuery}"
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Try a different keyword or browse our help topics above.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition"
            >
              <MessageSquare size={16} />
              Contact Support
            </Link>
          </div>
        )}

        {/* Still Need Help */}
        <div className="text-center mt-12">
          <div className="bg-brand-50 rounded-3xl p-8 border border-brand-100">
            <h3 className="text-lg font-bold text-brand-900 mb-2">Still Need Help?</h3>
            <p className="text-sm text-brand-700 mb-6">
              Our support team is here for you
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl font-medium text-sm hover:bg-brand-600 transition"
            >
              <MessageSquare size={18} />
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
