/**
 * RealtimeAreaChart — Real per-minute active users from GA4.
 *
 * Data source: GA4 Realtime API 'minutesAgo' dimension.
 * Each point = actual active users in that specific minute.
 * 30 data points (minute 29 ago → minute 0 = now).
 * Refreshes every 15 seconds.
 */
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";
const REFRESH_INTERVAL = 55000; // 55 seconds — reduces token usage under multi-user load

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

export default function RealtimeAreaChart({ brand }) {
  const [data, setData] = useState(null); // null = not yet fetched

  useEffect(() => {
    // Reset to null on brand change — keeps skeleton up until real data arrives
    setData(null);

    const controller = new AbortController();

    const fetchHistory = () => {
      let q = brand && brand !== "all" ? `?brand=${encodeURIComponent(brand)}` : "";
      fetch(`${API_BASE}/api/realtime/history${q}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          const history = (d.history || []).map((h) => ({ value: h.users || h.value || 0 }));
          setData(history);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.warn("[RealtimeChart]", err);
        });
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [brand]);

  // Show skeleton while data is null (never arrived yet) or has fewer than 2 points
  if (!data || data.length < 2) {
    return (
      <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4 animate-pulse">
          <div>
            <div className="h-2.5 w-32 rounded mb-2" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-8 w-20 rounded" style={{ background: "var(--bg-tertiary)" }} />
          </div>
          <div className="text-right">
            <div className="h-2.5 w-20 rounded mb-2" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-4 w-12 rounded" style={{ background: "var(--bg-tertiary)" }} />
          </div>
        </div>
        {/* Chart area skeleton */}
        <div className="animate-pulse rounded-xl w-full h-[160px]" style={{ background: "var(--bg-tertiary)" }} />
        {/* X-axis skeleton */}
        <div className="flex justify-between mt-2 px-1 animate-pulse">
          {["-30m", "-20m", "-10m", "now"].map((l) => (
            <div key={l} className="h-2 w-6 rounded" style={{ background: "var(--bg-tertiary)" }} />
          ))}
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const latestValue = values[values.length - 1] || 0;
  const maxValue = Math.max(...values, 1) * 1.1;
  const minValue = Math.min(...values.filter(v => v > 0)) * 0.8 || 0;
  const range = maxValue - minValue || 1;

  const W = 700;
  const W_PADDED = 710;
  const H = 160;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 5;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * W,
    y: PAD_TOP + chartH - ((d.value - minValue) / range) * chartH,
  }));

  const linePath = buildSplinePath(points);
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
  const lastPoint = points[points.length - 1];

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase font-medium tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Active Users Per Minute (Real)
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
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Peak (30 min)</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{Math.max(...values).toLocaleString()}</p>
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
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Gridlines */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line key={pct} x1="0" y1={PAD_TOP + chartH * (1 - pct)} x2={W_PADDED} y2={PAD_TOP + chartH * (1 - pct)} stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
          ))}

          {/* Area + Line */}
          <path d={areaPath} fill="url(#realtimeAreaGrad)" />
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
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round((maxValue / 1.1 + minValue / 0.8) / 2)}</span>
          <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{Math.round(minValue / 0.8)}</span>
        </div>
      </div>

      {/* X-axis */}
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>-30m</span>
        <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>-20m</span>
        <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>-10m</span>
        <span className="text-[9px] font-mono font-semibold" style={{ color: "var(--accent)" }}>now</span>
      </div>
    </div>
  );
}
