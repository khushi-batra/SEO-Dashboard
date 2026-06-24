/**
 * MetricCard — Displays a single KPI metric with icon and color.
 */
import React from "react";

export default function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div
      className="rounded-xl p-4 border flex items-center gap-3"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
