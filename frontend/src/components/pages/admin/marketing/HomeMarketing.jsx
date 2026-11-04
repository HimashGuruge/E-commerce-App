import React, { useState } from "react";
import FeaturesManagement from "./FeaturesManagement";
import ManageServices from "../Dashboard/ManageServices";
import AdsManagement from "./AdsManagement";
import AnnouncementManagement from "./AnnouncementManagement";
import TrendingManagement from "./TrendingManagement";
import FlashSaleManagement from "./FlashSaleManagement";

const TABS = [
  { id: "features", label: "Features" },
  { id: "services", label: "Services" },
  { id: "ads", label: "Ads" },
  { id: "announcements", label: "Announcements" },
  { id: "flash-sale", label: "Flash Sale" },
  { id: "trending", label: "Trending" },
];

export default function HomeMarketing() {
  const [activeTab, setActiveTab] = useState("features");

  return (
    <div>
      {/* Tab strip — sticky just below the dashboard topbar (h-12 mobile / h-16 desktop) */}
      <div className="sticky top-12 lg:top-16 z-10 bg-[#f2f1ee]">
        <div className="p-4 md:p-6 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active tab content */}
      <div>
        {activeTab === "features" && <FeaturesManagement />}
        {activeTab === "services" && <ManageServices />}
        {activeTab === "ads" && <AdsManagement />}
        {activeTab === "announcements" && <AnnouncementManagement />}
        {activeTab === "flash-sale" && <FlashSaleManagement />}
        {activeTab === "trending" && <TrendingManagement />}
      </div>
    </div>
  );
}
