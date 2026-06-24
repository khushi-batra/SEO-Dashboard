/**
 * Realtime View — Landing page of the dashboard.
 * Hero: animated live counter with glowing orb
 * Stepped area chart for per-minute activity
 * Live pages table
 * Today's traffic section
 */
import React, { useState, useMemo } from "react";
import { Radio, RefreshCw, Users, Eye, Search, TrendingUp, Zap, Activity } from "lucide-react";
import RealtimeAreaChart from "../components/RealtimeAreaChart";

export default function RealtimeView({ realtime, onRefresh, todayData = [] }) {
  const [pageSearch, setPageSearch] = useState("");

  const totalActive = realtime?.totalActive || 0;
  const pages = realtime?.pages || [];

  const filteredPages = useMemo(() => {
    if (!pageSearch.trim()) return pages;
    const q = pageSearch.toLowerCase();
    return pages.filter((p) => p.title.toLowerCase().includes(q));
  }, [pages, pageSearch]);

  const todayViews = todayData.reduce((s, a) => s + (a.pageViews || 0), 0);
  const todayUsers = todayData.reduce((s, a) => s + (a.users || 0), 0);
  const todaySessions = todayData.reduce((s, a) => s + (a.sessions || 0), 0);
  const todayTopPages = useMemo(() => [...todayData].sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0)).slice(0, 10), [todayData]);

  return (
    <div className="space-y-6">

      {/* ═══════════════ HERO: LIVE PULSE ═══════════════ */}
      <div className="relative overflow-hidden rounded-2xl border p-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <Radio className="w-4 h-4" style={{ color: "var(--danger)" }} />
                </div>
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75"></span>
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Live Activity</h2>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Across all properties • Auto-refreshes</p>
              </div>
            </div>
            <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg border transition hover:scale-105 active:scale-95" style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{totalActive.toLocaleString()}</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Active users in last 30 minutes</p>
            </div>
            <div className="text-center border-x" style={{ borderColor: "var(--border)" }}>
              <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{pages.length}</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Pages being viewed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>~{Math.max(1, Math.round(totalActive / 30))}</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Users per minute</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ STREAMING AREA CHART ═══════════════ */}
      <RealtimeAreaChart baseValue={Math.max(5, Math.round(totalActive / 30))} />

      {/* ═══════════════ LIVE PAGES TABLE ═══════════════ */}
      <div className="rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" style={{ color: "var(--success)" }} />
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Pages Active Right Now</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
              {filteredPages.length} pages
            </span>
          </div>
          <div className="relative w-44">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="Search pages..." value={pageSearch} onChange={(e) => setPageSearch(e.target.value)} className="w-full pl-6 pr-2 py-1.5 text-[11px] rounded-lg border" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg mb-1" style={{ background: "var(--bg-tertiary)" }}>
          <span className="col-span-1 text-[9px] uppercase font-medium" style={{ color: "var(--text-muted)" }}>#</span>
          <span className="col-span-7 text-[9px] uppercase font-medium" style={{ color: "var(--text-muted)" }}>Page Title</span>
          <span className="col-span-2 text-[9px] uppercase font-medium text-right" style={{ color: "var(--text-muted)" }}>Active</span>
          <span className="col-span-2 text-[9px] uppercase font-medium text-right" style={{ color: "var(--text-muted)" }}>Brand</span>
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          {filteredPages.length > 0 ? filteredPages.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 border-b transition-colors hover:rounded-lg" style={{ borderColor: "var(--border)" }}>
              <span className="col-span-1 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
              <span className="col-span-7 text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{p.title}</span>
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{p.activeUsers}</span>
              </div>
              <span className="col-span-2 text-[10px] text-right" style={{ color: "var(--text-muted)" }}>{p.brand}</span>
            </div>
          )) : (
            <div className="py-10 text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>No active pages at this moment</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ TODAY'S DATA ═══════════════ */}
      {todayData.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
              <Zap className="w-4 h-4" style={{ color: "var(--success)" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Today's Traffic</h2>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Today's Metric Cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: Eye, label: "Page Views", value: todayViews, color: "#6366f1" },
              { icon: Users, label: "Users", value: todayUsers, color: "#06b6d4" },
              { icon: TrendingUp, label: "Sessions", value: todaySessions, color: "#10b981" },
            ].map((m, i) => (
              <div key={i} className="rounded-xl border p-4 text-center relative overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl" style={{ background: m.color, opacity: 0.6 }} />
                <m.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: m.color }} />
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {m.value > 1e6 ? (m.value / 1e6).toFixed(1) + "M" : m.value > 1000 ? (m.value / 1000).toFixed(1) + "K" : m.value}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Today's Top Pages */}
          <div className="rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Top Pages Today</p>
            <div className="space-y-1">
              {todayTopPages.map((p, i) => {
                const maxV = todayTopPages[0]?.pageViews || 1;
                const pct = ((p.pageViews || 0) / maxV) * 100;
                return (
                  <div key={p.id || i} className="relative flex items-center justify-between py-2.5 px-3 rounded-lg group transition-colors">
                    <div className="absolute left-0 top-0 h-full rounded-lg transition-opacity opacity-[0.06] group-hover:opacity-[0.12]" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                    <div className="relative flex items-center gap-2.5 min-w-0 max-w-[70%]">
                      <span className="text-[10px] font-mono w-4 text-right flex-shrink-0 font-bold" style={{ color: i < 3 ? "var(--accent)" : "var(--text-muted)" }}>{i + 1}</span>
                      <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{p.title}</span>
                    </div>
                    <div className="relative flex items-center gap-4">
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{(p.pageViews || 0).toLocaleString()}</span>
                      <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>{(p.users || 0).toLocaleString()} users</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
