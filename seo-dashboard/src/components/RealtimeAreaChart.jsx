/**
 * RealtimeAreaChart — Streaming area chart for "Active Users Per Minute"
 *
 * How it works:
 * - On mount, fetches per-minute history from the backend (/api/realtime/history)
 * - The backend logs the active user count every ~30 seconds
 * - So even if you close and reopen, the chart shows real historical data
 * - Every 30 seconds, the frontend fetches fresh realtime data and appends it
 * - If history has fewer than 60 points (server just started), it fills the
 *   remaining slots based on the current value with natural variance
 *
 * Features:
 * - 60-point rolling window
 * - Smooth spline curve
 * - Gradient fill
 * - Pulsing dot on latest point
 * - "● LIVE" indicator
 */
import React, { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000";
const WINDOW_SIZE = 60;
const REFRESH_INTERVAL = 15000; // 15 seconds

/**
 * Build a smooth cubic bezier path through points
 */
function buildSplinePath(points) {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return path;
}

/**
 * Fill missing history with natural-looking estimated values
 */
function padHistory(history) {
  // Only return real data. No fake padding.
  return history.slice(-WINDOW_SIZE);
}

export default function RealtimeAreaChart({ currentValue = 0 }) {
  const [data, setData] = useState([]);

  // Fetch real history from backend on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/realtime/history`)
      .then((r) => r.json())
      .then((d) => {
        const history = (d.history || []).map((h) => ({ value: h.value }));
        setData(padHistory(history));
      })
      .catch(() => setData([]));
  }, []);

  // Refresh every 30 seconds — only real data
  const refresh = useCallback(() => {
    fetch(`${API_BASE}/api/realtime/history`)
      .then((r) => r.json())
      .then((d) => {
        const history = (d.history || []).map((h) => ({ value: h.value }));
        setData(padHistory(history));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  // Use the live currentValue as the latest point
  const displayData = [...data];
  if (currentValue > 0 && displayData.length > 0) {
    displayData[displayData.length - 1] = { value: currentValue };
  } else if (currentValue > 0 && displayData.length === 0) {
    displayData.push({ value: currentValue });
  }

  // Chart calculations — only if we have data
  if (displayData.length < 2) {
    return (
      <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase font-medium tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Active Users Per Minute</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{currentValue.toLocaleString()}</span>
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--danger)" }}>Live</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-[160px]" style={{ color: "var(--text-muted)" }}>
          <p className="text-xs">Collecting data... chart will appear as data points accumulate.</p>
        </div>
      </div>
    );
  }

  const values = displayData.map((d) => d.value);
  const maxValue = Math.max(...values, 1) * 1.1;
  const minValue = Math.min(...values) * 0.9;
  const range = maxValue - minValue || 1;
  const latestValue = values[values.length - 1] || 0;

  // SVG dimensions — extra padding on right for the pulsing dot to be visible
  const W = 700;
  const W_PADDED = 710; // 10px extra for the live dot
  const H = 160;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 5;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const points = displayData.map((d, i) => ({
    x: (i / Math.max(displayData.length - 1, 1)) * W,
    y: PAD_TOP + chartH - ((d.value - minValue) / range) * chartH,
  }));

  const linePath = buildSplinePath(points);
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
  const lastPoint = points[points.length - 1];

  const timeLabels = ["-60m", "-45m", "-30m", "-15m", "now"];

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase font-medium tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Active Users Per Minute
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {latestValue.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--danger)" }}>Live</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Peak</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round(maxValue / 1.1).toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${W_PADDED} ${H}`} className="w-full" style={{ height: "160px" }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="realtimeAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <filter id="dotGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Gridlines */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line key={pct} x1="0" y1={PAD_TOP + chartH * (1 - pct)} x2={W_PADDED} y2={PAD_TOP + chartH * (1 - pct)} stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#realtimeAreaGrad)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Pulsing dot */}
          <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="var(--accent)" filter="url(#dotGlow)" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="var(--accent)" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.4">
            <animate attributeName="r" from="5" to="15" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Y-axis labels */}
        <div className="absolute top-2 left-1 flex flex-col justify-between pointer-events-none" style={{ height: "140px" }}>
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round(maxValue / 1.1)}</span>
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round((maxValue / 1.1 + minValue / 0.9) / 2)}</span>
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round(minValue / 0.9)}</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-1">
        {timeLabels.map((label) => (
          <span key={label} className="text-[9px] font-mono" style={{ color: label === "now" ? "var(--accent)" : "var(--text-muted)", fontWeight: label === "now" ? 600 : 400 }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
