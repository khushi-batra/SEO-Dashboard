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
  TrendingDown, ShoppingCart, ClipboardList, Calendar,
} from "lucide-react";
import { useArticles, useRealtime, useOverviewData, useLowCTRData } from "../hooks/useArticles";
import { useTheme } from "../context/ThemeContext";
import SkeletonLoader from "./SkeletonLoader";
import OverviewCharts from "../views/OverviewCharts";
import RealtimeView from "../views/RealtimeView";
import TopPages from "../views/TopPages";
import OpportunityPages from "../views/OpportunityPages";
import LowCTR from "../views/LowCTR";
import MonetizationGaps from "../views/MonetizationGaps";
import EditorQueues from "../views/EditorQueues";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "realtime", label: "Realtime", icon: Radio },
  { id: "top-pages", label: "Top Pages", icon: Zap },
  { id: "opportunities", label: "Opportunities", icon: Target },
  { id: "low-ctr", label: "Low CTR", icon: TrendingDown },
  { id: "monetization", label: "Monetization Gaps", icon: ShoppingCart },
  { id: "editor", label: "Editor Queue", icon: ClipboardList },
];

const BLOGS = [
  { id: "all", label: "All Blogs" },
  { id: "adda-exams", label: "Adda Exams" },
  { id: "adda-jobs", label: "Adda247 Jobs" },
  { id: "bankersadda", label: "BankersAdda" },
  { id: "hindi-bankersadda", label: "Hindi BankersAdda" },
  { id: "career-power-html", label: "Career Power HTML" },
  { id: "career-power-blog", label: "Career Power Blog" },
  { id: "current-affairs", label: "Current Affairs" },
  { id: "engineering-adda", label: "Engineering Adda" },
  { id: "studyiq-articles", label: "StudyIQ Articles" },
  { id: "teaching-adda", label: "Teaching Adda" },
  { id: "adda-store", label: "Adda Store (Main Site)" },
  { id: "studyiq-main", label: "StudyIQ Main Site" },
];

// Blog filter — applies to data views (not Realtime/Overview which show all)
const blogBrandMap = {
  "adda-store": ["Adda Store"],
  "adda-exams": ["Adda Exams"],
  "adda-jobs": ["Adda Jobs"],
  "bankersadda": ["BankersAdda"],
  "hindi-bankersadda": ["Hindi Bankers Adda"],
  "career-power-html": ["Career Power HTML"],
  "career-power-blog": ["Career Power Blog"],
  "current-affairs": ["Current Affairs"],
  "engineering-adda": ["Engineering Adda"],
  "studyiq-main": ["StudyIQ Mains Site"],
  "studyiq-articles": ["StudyIQ Articles"],
  "teaching-adda": ["Teaching Adda"],
};

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState("realtime");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBlog, setActiveBlog] = useState("all");
  const { theme, toggleTheme } = useTheme();

  const [dateRange, setDateRange] = useState("28days");
  // For custom range: [startDate, endDate] both as Date objects
  const [customRange, setCustomRange] = useState([null, null]);
  const [customStart, customEnd] = customRange;

  // fetchParam encoding:
  //   preset  → "28days" | "7days" | etc.
  //   custom  → "custom:2025-01-01:2025-01-15"  (only when both dates selected)
  const fetchParam = React.useMemo(() => {
    if (dateRange !== "custom") return dateRange;
    if (customStart && customEnd) {
      const fmt = (d) => d.toISOString().split("T")[0];
      return `custom:${fmt(customStart)}:${fmt(customEnd)}`;
    }
    // Only start selected — don't fetch yet, keep previous data
    return "28days";
  }, [dateRange, customStart, customEnd]);
  
  const activeBrandString = activeBlog === "all" ? "all" : (blogBrandMap[activeBlog]?.[0] || "all");

  // Fetch articles for the active brand — brand-specific call ensures accurate GA4 + GSC data
  // per blog (incl. brands excluded from the "all" aggregate, e.g. StudyIQ Mains).
  // Module-level cache in useArticles makes repeat visits instant with no extra API call.
  const { articles, loading: articlesLoading } = useArticles(fetchParam, activeBrandString);
  const { realtime, refresh: refreshRealtime, loading: realtimeLoading, refreshing: realtimeRefreshing } = useRealtime(activeBrandString, activeTab === "realtime");
  const overviewData = useOverviewData(activeBrandString, fetchParam, activeTab === "overview");
  const lowCtrData = useLowCTRData(activeBrandString, fetchParam, activeTab === "low-ctr");

  const [chartRefreshKey, setChartRefreshKey] = useState(0);

  const handleRealtimeRefresh = React.useCallback(async () => {
    await refreshRealtime();
    setChartRefreshKey(k => k + 1);
  }, [refreshRealtime]);

  const goToRealtime = () => setActiveTab("realtime");

  // Global search — articles are already brand-filtered by the API
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.url.toLowerCase().includes(q)
    );
  }, [searchQuery, articles]);

  const renderView = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewCharts data={filteredData} realtime={realtime} onGoToRealtime={goToRealtime} brand={activeBrandString} range={fetchParam} overviewData={overviewData} />;
      case "realtime":
        return <RealtimeView realtime={realtime} onRefresh={handleRealtimeRefresh} refreshing={realtimeRefreshing} todayData={filteredData} brand={activeBrandString} loading={realtimeLoading} chartRefreshKey={chartRefreshKey} />;
      case "top-pages":
        return <TopPages data={filteredData} loading={articlesLoading} />;
      case "opportunities":
        return <OpportunityPages data={filteredData} loading={articlesLoading} />;
      case "low-ctr":
        return <LowCTR keywords={lowCtrData.keywords} />;
      case "monetization":
        return <MonetizationGaps data={filteredData} />;
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
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>SEO Growth Dashboard</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>GA4 + Search Console Dashboard</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Range Filter */}
              <div className="flex items-center gap-1.5">
                {articlesLoading && (
                  <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mr-1"></div>
                )}
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    if (e.target.value !== "custom") setCustomRange([null, null]);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border outline-none"
                  style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="14days">Last 14 Days</option>
                  <option value="28days">Last 28 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom date range picker — shows two calendars inline */}
              {dateRange === "custom" && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  <DatePicker
                    selectsRange
                    startDate={customStart}
                    endDate={customEnd}
                    onChange={(range) => setCustomRange(range)}
                    maxDate={new Date()}
                    dateFormat="dd MMM yyyy"
                    placeholderText="Select date range..."
                    isClearable
                    monthsShown={2}
                    className="text-xs px-2.5 py-1.5 rounded-lg border w-[210px] cursor-pointer"
                    style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                  {customStart && !customEnd && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Pick end date</span>
                  )}
                </div>
              )}

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
                  onClick={() => { setActiveBlog(blog.id); setActiveTab("realtime"); }}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 animate-in fade-in duration-500">
        {/* Realtime tab has its own inline skeletons — never block it with the global loader */}
        {activeTab === "realtime" ? (
          renderView()
        ) : articlesLoading || (activeTab === "overview" && overviewData.loading) || (activeTab === "low-ctr" && lowCtrData.loading) ? (
          <SkeletonLoader />
        ) : (
          renderView()
        )}
      </main>
    </div>
  );
}
