import React from "react";

export default function StatCard({ icon, title, value, color }) {
  const colorMap = {
    "text-green-600": "bg-green-100",
    "text-indigo-600": "bg-indigo-100",
    "text-amber-600": "bg-amber-100",
    "text-teal-600": "bg-teal-100",
  };

  const bgColor = colorMap[color] || "bg-gray-100";

  // Show Rs. 0 for revenue, otherwise show regular 0
  const displayValue = (value !== undefined && value !== null && value !== "Rs. NaN")
    ? value
    : (title === "Total Revenue" ? "Rs. 0" : "0");

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 hover:border-slate-300/80">
      {/* Icon Container */}
      <div className={`p-3.5 rounded-xl ${bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        {React.cloneElement(icon, { className: `${color} w-6 h-6` })}
      </div>

      {/* Text Data */}
      <div className="text-left min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em] font-mono mb-1.5 truncate">{title}</p>
        <p className="text-[26px] leading-none font-display font-bold text-slate-900 tracking-tight">
          {displayValue}
        </p>
      </div>
    </div>
  );
}
