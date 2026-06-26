/**
 * DashboardLayout — Main shell
 * Tab order: Overview, Realtime, Top Pages, Opportunities, Low CTR, Monetization Gaps, Brands, Editor Queue
 * Date filter: Calendar-based date picker for historical data
 */
import React, { useState, useMemo, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Search, Sun, Moon, BarChart3, Radio, Zap, Target,
  TrendingDown, ShoppingCart, Building2, ClipboardList, Calendar,
} from "lucide-react";
import { useArticles, useRealtime, useOverviewData } from "../hooks/useArticles";
import { useTheme } from "../context/ThemeContext";
import SkeletonLoader from "./SkeletonLoader";
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
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default: today's date shown
  const [activeBlog, setActiveBlog] = useState("all");
  const { theme, toggleTheme } = useTheme();

  const [dateRange, setDateRange] = useState("28days");

  const dateStr = selectedDate.toISOString().split("T")[0];
  const fetchParam = dateRange === "custom" ? dateStr : dateRange;
  
  const activeBrandString = activeBlog === "all" ? "all" : (blogBrandMap[activeBlog]?.[0] || "all");
  
  // Always fetch 'all' articles so local filtering is instantaneous when switching blogs
  const { articles, loading: articlesLoading } = useArticles(fetchParam, "all");
  const { realtime, refresh: refreshRealtime, loading: realtimeLoading } = useRealtime(activeBrandString);
  const overviewData = useOverviewData(activeBrandString, fetchParam);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab("realtime");
  }, [activeBlog]);

  const goToRealtime = () => setActiveTab("realtime");

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
        return <OverviewCharts data={filteredData} realtime={realtime} onGoToRealtime={goToRealtime} brand={activeBrandString} range={fetchParam} overviewData={overviewData} />;
      case "realtime":
        return <RealtimeView realtime={realtime} onRefresh={refreshRealtime} todayData={filteredData} brand={activeBrandString} />;
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
                  onChange={(e) => setDateRange(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border outline-none"
                  style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="14days">Last 14 Days</option>
                  <option value="28days">Last 28 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>

              {/* Calendar Date Picker (only show if custom) */}
              {dateRange === "custom" && (
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 animate-in fade-in duration-500">
        {(activeTab === "overview" && overviewData.loading) || (activeTab === "realtime" && realtimeLoading) || articlesLoading ? (
          <SkeletonLoader />
        ) : (
          renderView()
        )}
      </main>
    </div>
  );
}
