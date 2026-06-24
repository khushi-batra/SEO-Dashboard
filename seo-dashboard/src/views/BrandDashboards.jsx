/**
 * Brand Dashboards — Filter by property/brand to isolate one blog's data.
 */
import React, { useState, useMemo } from "react";
import { Building2, Eye, Users, MousePointerClick, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ArticleTable from "../components/ArticleTable";

export default function BrandDashboards({ data }) {
  const [selectedBrand, setSelectedBrand] = useState("All");
  const BRANDS = useMemo(() => ["All", ...new Set(data.map(a => a.brand))].filter(Boolean), [data]);

  const filtered = useMemo(() => {
    if (selectedBrand === "All") return data;
    return data.filter(a => a.brand === selectedBrand);
  }, [data, selectedBrand]);

  const totalViews = filtered.reduce((s, a) => s + (a.pageViews || 0), 0);
  const totalUsers = filtered.reduce((s, a) => s + (a.users || 0), 0);
  const totalClicks = filtered.reduce((s, a) => s + (a.clicks || 0), 0);
  const totalImpressions = filtered.reduce((s, a) => s + (a.impressions || 0), 0);

  const chartData = useMemo(() => [...filtered].sort((a,b) => (b.pageViews||0)-(a.pageViews||0)).slice(0,8).map(a => ({ name: a.title.slice(0,25)+"...", views: a.pageViews||0 })), [filtered]);

  const columns = [
    { key: "title", label: "Article", render: (row) => <span className="text-xs truncate block max-w-xs" style={{ color: "var(--text-primary)" }}>{row.title}</span> },
    { key: "pageViews", label: "Views", render: (row) => <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{(row.pageViews||0).toLocaleString()}</span> },
    { key: "users", label: "Users", render: (row) => <span style={{ color: "var(--text-secondary)" }}>{(row.users||0).toLocaleString()}</span> },
    { key: "clicks", label: "GSC Clicks", render: (row) => <span style={{ color: row.clicks ? "var(--text-primary)" : "var(--text-muted)" }}>{row.clicks ? row.clicks.toLocaleString() : "—"}</span> },
    { key: "avgPosition", label: "Position", render: (row) => <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{row.avgPosition > 0 ? row.avgPosition.toFixed(1) : "—"}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4" style={{ color: "#06b6d4" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Brand Dashboards</h2>
        </div>
        <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
          {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { icon: Eye, label: "Page Views", value: (totalViews/1000).toFixed(0)+"K", color: "#6366f1" },
          { icon: Users, label: "Users", value: (totalUsers/1000).toFixed(0)+"K", color: "#06b6d4" },
          { icon: MousePointerClick, label: "GSC Clicks", value: (totalClicks/1000).toFixed(0)+"K", color: "#10b981" },
          { icon: TrendingUp, label: "Impressions", value: (totalImpressions/1000).toFixed(0)+"K", color: "#f59e0b" },
        ].map((m,i) => (
          <div key={i} className="rounded-lg border p-3 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <m.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: m.color }} />
            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border p-4 mb-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 9 }} /><YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} /><Tooltip contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "11px" }} /><Bar dataKey="views" fill="#6366f1" radius={[3,3,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <ArticleTable columns={columns} data={filtered} defaultSort={{ key: "pageViews", direction: "desc" }} />
    </div>
  );
}
