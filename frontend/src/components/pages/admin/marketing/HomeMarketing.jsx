import React, { useState } from "react";
import FeaturesManagement from "./FeaturesManagement";
import ManageServices from "../Dashboard/ManageServices";
import AdsManagement from "./AdsManagement";
import AnnouncementManagement from "./AnnouncementManagement";
import TrendingManagement from "./TrendingManagement";

const TABS = [
  { id: "features", label: "Features" },
  { id: "services", label: "Services" },
  { id: "ads", label: "Ads" },
  { id: "announcements", label: "Announcements" },
  { id: "trending", label: "Trending" },
];

export default function HomeMarketing() {
  const [activeTab, setActiveTab] = useState("features");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-4 md:px-6 py-3">
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {activeTab === "features" && <FeaturesManagement />}
        {activeTab === "services" && <ManageServices />}
        {activeTab === "ads" && <AdsManagement />}
        {activeTab === "announcements" && <AnnouncementManagement />}
        {activeTab === "trending" && <TrendingManagement />}
      </div>
    </div>
  );
}
