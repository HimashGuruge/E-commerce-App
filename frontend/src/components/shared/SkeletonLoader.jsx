import React from "react";

export default function SkeletonLoader({ count = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-lg mb-2" />
          <div className="bg-gray-200 h-4 rounded w-3/4 mb-1" />
          <div className="bg-gray-200 h-4 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
