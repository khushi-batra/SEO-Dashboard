/**
 * Overview — 28-day summary dashboard.
 * Clean, aligned layout. All sections share consistent styling.
 * - Sessions by Channel: Horizontal bar chart
 * - Top Pages: Clean ranked list with inline bar indicators
 * - Search Queries: Clean ranked list with click counts and position badges
 */
import React, { useMemo, useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Users, Eye, MousePointerClick, TrendingUp, Search, Radio, Clock } from "lucide-react";

const API_BASE = "http://localhost:8000";

export default function OverviewCharts({ data, realtime, onGoToRealtime, brand, range }) {
  const [channels, setChannels] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [queries, setQueries] = useState([]);

  useEffect(() => {
    let q = `?brand=${encodeURIComponent(brand || 'all')}&range=${encodeURIComponent(range || '28days')}`;
    fetch(`${API_BASE}/api/channels${q}`).then(r => r.json()).then(setChannels).catch(() => {});
    fetch(`${API_BASE}/api/timeline${q}`).then(r => r.json()).then(setTimeline).catch(() => {});
    fetch(`${API_BASE}/api/gsc/queries`).then(r => r.json()).then(setQueries).catch(() => {});
  }, [brand, range]);

  const totalViews = data.reduce((s, a) => s + (a.pageViews || 0), 0);
  const totalUsers = data.reduce((s, a) => s + (a.users || 0), 0);
  const totalClicks = data.reduce((s, a) => s + (a.clicks || 0), 0);
  const totalImpressions = data.reduce((s, a) => s + (a.impressions || 0), 0);
  const avgDuration = data.length > 0 ? Math.round(data.reduce((s, a) => s + (a.avgDuration || 0), 0) / data.length) : 0;

  const topPages = useMemo(() => [...data].sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0)).slice(0, 8), [data]);
  const maxViews = topPages[0]?.pageViews || 1;
  const timelineFormatted = useMemo(() => timeline.map(d => ({ ...d, label: d.date?.slice(5) || "" })), [timeline]);
  const maxQueryClicks = queries[0]?.clicks || 1;

  const tooltipStyle = { backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "11px" };
  const fmtNum = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(0) + "K" : n.toString();

  return (
    <div className="space-y-5">
      {/* ── Header + Live Badge ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Overview — Last 28 Days</h2>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Aggregated GA4 + Google Search Console data</p>
        </div>
        <button onClick={onGoToRealtime} className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent-border)" }}>
          <div className="relative">
            <Radio className="w-4 h-4" style={{ color: "var(--danger)" }} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          </div>
          <div className="text-left">
            <p className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{realtime.totalActive.toLocaleString()}</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Users live now →</p>
          </div>
        </button>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: Eye, label: "Page Views", value: fmtNum(totalViews), color: "#6366f1", sub: "GA4" },
          { icon: Users, label: "Users", value: fmtNum(totalUsers), color: "#06b6d4", sub: "GA4" },
          { icon: MousePointerClick, label: "Clicks", value: fmtNum(totalClicks), color: "#10b981", sub: "GSC" },
          { icon: TrendingUp, label: "Impressions", value: fmtNum(totalImpressions), color: "#f59e0b", sub: "GSC" },
          { icon: Clock, label: "Avg Time", value: `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`, color: "#8b5cf6", sub: "GA4" },
        ].map((m, i) => (
          <div key={i} className="rounded-xl border p-4 relative overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-[0.04]" style={{ background: m.color }} />
            <m.icon className="w-4 h-4 mb-2" style={{ color: m.color }} />
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
              <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: `${m.color}15`, color: m.color }}>{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── User Activity Timeline ── */}
      {timelineFormatted.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>User Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timelineFormatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => v.toLocaleString()} />
              <Area type="monotone" dataKey="users" stroke="#6366f1" fill="#6366f112" strokeWidth={2} name="Users" />
              <Area type="monotone" dataKey="pageViews" stroke="#10b981" fill="#10b98108" strokeWidth={1.5} name="Views" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Sessions by Channel (Chart) + Top Pages (List) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sessions by Channel — Horizontal bar chart */}
        {channels.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Sessions by Channel</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channels.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} vertical={true} />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="channel" width={110} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => v.toLocaleString()} />
                <Bar dataKey="sessions" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Pages — Horizontal lollipop chart (readable page names on left) */}
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <h3 className="text-xs font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Top Pages by Views</h3>
          <div className="space-y-3">
            {topPages.map((p, i) => {
              const pct = ((p.pageViews || 0) / maxViews) * 100;
              return (
                <div key={p.id || i} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono w-4 text-right flex-shrink-0" style={{ color: i < 3 ? "var(--accent)" : "var(--text-muted)" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Lollipop line + dot */}
                      <div className="relative flex-1 h-3 flex items-center">
                        <div className="h-[3px] rounded-full" style={{ width: `${pct}%`, background: i < 3 ? "var(--accent)" : "var(--border)" }} />
                        <div className="absolute rounded-full" style={{ left: `${pct}%`, width: "8px", height: "8px", marginLeft: "-4px", background: i < 3 ? "var(--accent)" : "var(--text-muted)" }} />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums w-10 text-right flex-shrink-0" style={{ color: "var(--text-primary)" }}>{fmtNum(p.pageViews || 0)}</span>
                    </div>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{p.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Top Search Queries — rows with light background bars ── */}
      {queries.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Top Search Queries (GSC)</h3>
          </div>
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-2 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="col-span-1 text-[8px] uppercase font-medium" style={{ color: "var(--text-muted)" }}>#</span>
            <span className="col-span-5 text-[8px] uppercase font-medium" style={{ color: "var(--text-muted)" }}>Query</span>
            <span className="col-span-2 text-[8px] uppercase font-medium text-right" style={{ color: "var(--text-muted)" }}>Clicks</span>
            <span className="col-span-2 text-[8px] uppercase font-medium text-right" style={{ color: "var(--text-muted)" }}>Impr</span>
            <span className="col-span-2 text-[8px] uppercase font-medium text-right" style={{ color: "var(--text-muted)" }}>Pos</span>
          </div>
          {/* Rows with light bar background */}
          <div className="max-h-[280px] overflow-y-auto">
            {queries.slice(0, 12).map((q, i) => (
              <div key={i} className="relative grid grid-cols-12 gap-2 items-center py-2.5 px-2 border-b group" style={{ borderColor: "var(--border)" }}>
                {/* Background bar */}
                <div className="absolute left-0 top-0 h-full rounded-r opacity-[0.06] group-hover:opacity-[0.12] transition-opacity" style={{ width: `${(q.clicks / maxQueryClicks) * 100}%`, background: "var(--accent)" }} />
                <span className="relative col-span-1 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                <span className="relative col-span-5 text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{q.query}</span>
                <span className="relative col-span-2 text-[11px] font-semibold text-right" style={{ color: "var(--text-primary)" }}>{q.clicks.toLocaleString()}</span>
                <span className="relative col-span-2 text-[10px] text-right" style={{ color: "var(--text-muted)" }}>{fmtNum(q.impressions)}</span>
                <span className="relative col-span-2 text-[10px] font-mono text-right" style={{ color: q.position <= 5 ? "var(--success)" : q.position <= 15 ? "var(--warning)" : "var(--danger)" }}>{q.position.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
