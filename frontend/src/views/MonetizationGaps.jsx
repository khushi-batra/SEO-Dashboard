/**
 * Monetization Gaps — Pages with high traffic but low engagement.
 * High page views + short session duration = users landing but bouncing.
 * These pages have revenue potential if optimized with:
 * - Product recommendations
 * - Course/book links
 * - Lead capture forms
 * - Better content depth to retain users
 */
import React, { useMemo } from "react";
import { ShoppingCart, AlertTriangle } from "lucide-react";
import ArticleTable from "../components/ArticleTable";

export default function MonetizationGaps({ data }) {
  // High traffic pages with low engagement (likely bouncing without converting)
  const gaps = useMemo(() => {
    return data
      .filter((a) => (a.pageViews || 0) > 5000 && (a.avgDuration || 0) < 90) // >5K views, <1.5 min engagement
      .sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0));
  }, [data]);

  const columns = [
    {
      key: "title",
      label: "Article",
      render: (row) => (
        <div className="max-w-sm">
          <p className="font-medium truncate text-xs" style={{ color: "var(--text-primary)" }}>{row.title}</p>
          <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{row.url}</p>
        </div>
      ),
    },
    { key: "brand", label: "Brand" },
    {
      key: "pageViews",
      label: "Page Views",
      render: (row) => <span className="font-semibold" style={{ color: "var(--success)" }}>{(row.pageViews || 0).toLocaleString()}</span>,
    },
    {
      key: "users",
      label: "Users",
      render: (row) => <span style={{ color: "var(--text-secondary)" }}>{(row.users || 0).toLocaleString()}</span>,
    },
    {
      key: "avgDuration",
      label: "Avg Time",
      render: (row) => {
        const d = row.avgDuration || 0;
        return (
          <span className="font-mono text-xs" style={{ color: d < 30 ? "var(--danger)" : "var(--warning)" }}>
            {Math.floor(d / 60)}m {Math.round(d % 60)}s
          </span>
        );
      },
    },
    {
      key: "signal",
      label: "Signal",
      sortable: false,
      render: (row) => {
        const d = row.avgDuration || 0;
        if (d < 30) return <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>Very high bounce</span>;
        if (d < 60) return <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "var(--warning)" }}>Quick exit</span>;
        return <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>Low retention</span>;
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ShoppingCart className="w-4 h-4" style={{ color: "#f59e0b" }} />
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Monetization Gaps</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            High-traffic pages where users leave quickly — add product links, CTAs, or deepen content to capture revenue.
          </p>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border" style={{ background: "rgba(245,158,11,0.03)", borderColor: "rgba(245,158,11,0.15)" }}>
          <p className="text-xs" style={{ color: "var(--warning)" }}>
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            <strong>{gaps.length} pages</strong> are getting significant traffic but users spend less than 90 seconds — potential revenue being lost.
          </p>
        </div>
      )}

      {gaps.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
          No monetization gap pages found for this date.
        </div>
      ) : (
        <ArticleTable columns={columns} data={gaps} defaultSort={{ key: "pageViews", direction: "desc" }} />
      )}
    </div>
  );
}
