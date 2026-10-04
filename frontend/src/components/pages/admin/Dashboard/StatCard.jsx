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
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all duration-300">
      {/* Icon Container */}
      <div className={`p-4 rounded-xl ${bgColor} flex items-center justify-center`}>
        {React.cloneElement(icon, { className: `${color} w-7 h-7` })}
      </div>
      
      {/* Text Data */}
      <div className="text-left">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {displayValue}
        </p>
      </div>
    </div>
  );
}
