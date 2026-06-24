/**
 * RealtimeAreaChart — Streaming area chart for "Active Users Per Minute"
 *
 * Features:
 * - 60-minute rolling window, 1 point per minute
 * - Smooth spline interpolation (cubic bezier)
 * - Gradient fill fading to transparent
 * - Pulsing dot on the latest data point
 * - Continuous left-scrolling as new data arrives
 * - Mock data generator for immediate visual feedback
 * - "● LIVE" indicator with latest count
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

const WINDOW_SIZE = 60; // 60 minutes
const UPDATE_INTERVAL = 10000; // 10 seconds per data point

/**
 * Generate a smooth cubic bezier path through points
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

export default function RealtimeAreaChart({ baseValue = 200 }) {
  const [data, setData] = useState(() => {
    // Initialize with 60 points of historical mock data
    const initial = [];
    const now = Date.now();
    for (let i = WINDOW_SIZE - 1; i >= 0; i--) {
      const noise = Math.sin(i * 0.3) * baseValue * 0.25 + Math.cos(i * 0.7) * baseValue * 0.15;
      const trend = (WINDOW_SIZE - i) / WINDOW_SIZE * baseValue * 0.1;
      initial.push({
        time: now - i * 60000,
        value: Math.max(1, Math.round(baseValue + noise + trend + (Math.random() - 0.5) * baseValue * 0.2)),
      });
    }
    return initial;
  });

  const animationRef = useRef(null);

  // Mock data generator — pushes a new point, drops the oldest
  const addDataPoint = useCallback(() => {
    setData((prev) => {
      const last = prev[prev.length - 1];
      const momentum = (last.value - baseValue) * 0.7;
      const noise = (Math.random() - 0.5) * baseValue * 0.4;
      const newVal = Math.max(1, Math.round(baseValue + momentum + noise));
      const newPoint = { time: Date.now(), value: newVal };
      return [...prev.slice(1), newPoint]; // Drop oldest, add newest
    });
  }, [baseValue]);

  useEffect(() => {
    const interval = setInterval(addDataPoint, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [addDataPoint]);

  // Current (latest) value
  const currentValue = data[data.length - 1]?.value || 0;
  const maxValue = Math.max(...data.map((d) => d.value)) * 1.15;
  const minValue = Math.min(...data.map((d) => d.value)) * 0.85;
  const range = maxValue - minValue || 1;

  // Chart dimensions
  const W = 700;
  const H = 160;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 5;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  // Map data to SVG coordinates
  const points = data.map((d, i) => ({
    x: (i / (WINDOW_SIZE - 1)) * W,
    y: PAD_TOP + chartH - ((d.value - minValue) / range) * chartH,
  }));

  const linePath = buildSplinePath(points);
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
  const lastPoint = points[points.length - 1];

  // Time labels
  const timeLabels = ["-60m", "-45m", "-30m", "-15m", "now"];

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
      {/* Header: Live indicator + current value */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase font-medium tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Active Users Per Minute
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {currentValue.toLocaleString()}
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
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round(maxValue / 1.15).toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "160px" }}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradient fill under the line */}
            <linearGradient id="realtimeAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            {/* Glow filter for the dot */}
            <filter id="dotGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal gridlines (faint) */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={pct}
              x1="0"
              y1={PAD_TOP + chartH * (1 - pct)}
              x2={W}
              y2={PAD_TOP + chartH * (1 - pct)}
              stroke="var(--border)"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ))}

          {/* Gradient area fill */}
          <path d={areaPath} fill="url(#realtimeAreaGrad)" />

          {/* Main spline line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Latest point — pulsing dot */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="5"
            fill="var(--accent)"
            filter="url(#dotGlow)"
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="5"
            fill="var(--accent)"
          />
          {/* Outer pulse ring */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="5"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            opacity="0.4"
          >
            <animate attributeName="r" from="5" to="15" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Y-axis values (absolute positioned) */}
        <div className="absolute top-2 left-1 flex flex-col justify-between pointer-events-none" style={{ height: "140px" }}>
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round(maxValue / 1.15)}</span>
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round((maxValue / 1.15 + minValue / 0.85) / 2)}</span>
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round(minValue / 0.85)}</span>
        </div>
      </div>

      {/* X-axis time labels */}
      <div className="flex justify-between mt-2 px-1">
        {timeLabels.map((label) => (
          <span
            key={label}
            className="text-[9px] font-mono"
            style={{ color: label === "now" ? "var(--accent)" : "var(--text-muted)", fontWeight: label === "now" ? 600 : 400 }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
