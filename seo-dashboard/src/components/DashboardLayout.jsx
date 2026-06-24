/**
 * DashboardLayout — Main shell
 * Tab order: Overview, Realtime, Top Pages, Opportunities, Low CTR, Monetization Gaps, Brands, Editor Queue
 * Date filter: Calendar-based date picker for historical data
 */
import React, { useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Search, Sun, Moon, BarChart3, Radio, Zap, Target,
  TrendingDown, ShoppingCart, Building2, ClipboardList, Calendar,
} from "lucide-react";
import { useArticles, useRealtime } from "../hooks/useArticles";
import { useTheme } from "../context/ThemeContext";
import OverviewCharts from "../views/OverviewCharts";
import RealtimeView from "../views/RealtimeView";
import TopPages from "../views/TopPages";
import OpportunityPages from "../views/OpportunityPages";
import LowCTR from "../views/LowCTR";
import MonetizationGaps from "../views/MonetizationGaps";
import BrandDashboards from "../views/BrandDashboards";
import EditorQueues from "../views/EditorQueues";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "realtime", label: "Realtime", icon: Radio },
  { id: "top-pages", label: "Top Pages", icon: Zap },
  { id: "opportunities", label: "Opportunities", icon: Target },
  { id: "low-ctr", label: "Low CTR", icon: TrendingDown },
  { id: "monetization", label: "Monetization Gaps", icon: ShoppingCart },
  { id: "brands", label: "Brands", icon: Building2 },
  { id: "editor", label: "Editor Queue", icon: ClipboardList },
];

// Blog list — Adda Store first (main site), then rest
const BLOGS = [
  { id: "all", label: "All Blogs" },
  { id: "adda-store", label: "Adda Store (Main Site)" },
  { id: "adda-exams", label: "Adda Exams" },
  { id: "adda-jobs", label: "Adda247 Jobs" },
  { id: "bankersadda", label: "BankersAdda" },
  { id: "hindi-bankersadda", label: "Hindi BankersAdda" },
  { id: "career-power-html", label: "Career Power HTML" },
  { id: "career-power-blog", label: "Career Power Blog" },
  { id: "current-affairs", label: "Current Affairs" },
  { id: "engineering-adda", label: "Engineering Adda" },
  { id: "studyiq-main", label: "StudyIQ Main Site" },
  { id: "studyiq-articles", label: "StudyIQ Articles" },
  { id: "teaching-adda", label: "Teaching Adda" },
];

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState("realtime");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default: today's date shown
  const [activeBlog, setActiveBlog] = useState("all");
  const { theme, toggleTheme } = useTheme();

  // Always shows a date. Default is today but overview still fetches 28 days range.
  const dateStr = selectedDate.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = dateStr === todayStr;

  // If today is selected, overview uses 28-day range; if a past date is picked, use that specific day
  const fetchParam = isToday ? "28days" : dateStr;
  const { articles, loading } = useArticles(fetchParam);
  const { realtime, refresh: refreshRealtime } = useRealtime();

  const goToRealtime = () => setActiveTab("realtime");

  // Blog filter — applies to data views (not Realtime/Overview which show all)
  const blogBrandMap = {
    "adda-store": ["Adda Store", "adda247.com"],
    "adda-exams": ["Adda247 Exams", "adda exams"],
    "adda-jobs": ["Adda247 Jobs", "adda247jobs"],
    "bankersadda": ["BankersAdda", "bankersadda"],
    "hindi-bankersadda": ["Hindi BankersAdda", "hindi.bankersadda"],
    "career-power-html": ["Career Power HTML", "careerpower.in"],
    "career-power-blog": ["Career Power Blog", "careerpower.in/blog"],
    "current-affairs": ["Current Affairs"],
    "engineering-adda": ["Engineering Adda", "engineering"],
    "studyiq-main": ["StudyIQ Main", "studyiq.com"],
    "studyiq-articles": ["StudyIQ Articles", "studyiq.com/articles"],
    "teaching-adda": ["Teaching Adda", "teachersadda"],
  };

  const blogFilteredData = useMemo(() => {
    if (activeBlog === "all") return articles;
    const keywords = blogBrandMap[activeBlog] || [];
    return articles.filter((a) =>
      keywords.some((kw) =>
        (a.brand || "").toLowerCase().includes(kw.toLowerCase()) ||
        (a.url || "").toLowerCase().includes(kw.toLowerCase())
      )
    );
  }, [articles, activeBlog]);

  // Global search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return blogFilteredData;
    const q = searchQuery.toLowerCase();
    return blogFilteredData.filter(
      (a) => a.title.toLowerCase().includes(q) || a.url.toLowerCase().includes(q)
    );
  }, [searchQuery, blogFilteredData]);

  const renderView = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewCharts data={articles} realtime={realtime} onGoToRealtime={goToRealtime} />;
      case "realtime":
        return <RealtimeView realtime={realtime} onRefresh={refreshRealtime} todayData={articles} />;
      case "top-pages":
        return <TopPages data={filteredData} />;
      case "opportunities":
        return <OpportunityPages data={filteredData} />;
      case "low-ctr":
        return <LowCTR data={filteredData} />;
      case "monetization":
        return <MonetizationGaps data={filteredData} />;
      case "brands":
        return <BrandDashboards data={filteredData} />;
      case "editor":
        return <EditorQueues data={filteredData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Adda247 SEO Matrix</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>GA4 + Search Console Dashboard</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Calendar Date Picker */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date || new Date())}
                  maxDate={new Date()}
                  dateFormat="dd MMM yyyy"
                  className="text-xs px-2.5 py-1.5 rounded-lg border w-[130px] cursor-pointer"
                  style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                {isToday && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
                    Today
                  </span>
                )}
              </div>

              {/* Search */}
              <div className="relative w-52">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border"
                  style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg border transition hover:scale-105"
                style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" style={{ color: "var(--warning)" }} /> : <Moon className="w-4 h-4" style={{ color: "var(--accent)" }} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Blog Selector — horizontal pill buttons */}
      <div className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {BLOGS.map((blog) => {
              const isActive = activeBlog === blog.id;
              return (
                <button
                  key={blog.id}
                  onClick={() => setActiveBlog(blog.id)}
                  className="px-3 py-1.5 text-[11px] font-medium rounded-full whitespace-nowrap transition-all"
                  style={{
                    background: isActive ? "var(--accent)" : "var(--bg-tertiary)",
                    color: isActive ? "white" : "var(--text-secondary)",
                    border: isActive ? "none" : "1px solid var(--border)",
                  }}
                >
                  {blog.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
        <nav className="flex gap-1 overflow-x-auto border-b pb-px" style={{ borderColor: "var(--border)" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all"
                style={{
                  background: isActive ? "var(--bg-secondary)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-3 border-t-transparent rounded-full" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}></div>
            <span className="ml-3 text-sm" style={{ color: "var(--text-secondary)" }}>Loading...</span>
          </div>
        ) : (
          renderView()
        )}
      </main>
    </div>
  );
}
