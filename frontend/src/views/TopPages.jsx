/**
 * Top Pages — Articles sorted by traffic (GA4 page views).
 * GSC columns (clicks, impressions, position) enrich the same articles.
 */
import React from "react";
import { Zap } from "lucide-react";
import ArticleTable from "../components/ArticleTable";

function TableSkeleton({ rows = 8 }) {
  return (
    <div className="rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: "var(--border)" }}>
      {/* Header */}
      <div className="grid grid-cols-6 gap-3 px-4 py-3" style={{ background: "var(--bg-tertiary)" }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-3 rounded" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-3 px-4 py-3.5 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="h-3 w-16 rounded" style={{ background: "var(--bg-tertiary)" }} />
          <div className="col-span-2 space-y-1.5">
            <div className="h-3 w-4/5 rounded" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-2 w-3/5 rounded" style={{ background: "var(--bg-tertiary)" }} />
          </div>
          <div className="h-3 w-12 rounded" style={{ background: "var(--bg-tertiary)" }} />
          <div className="h-3 w-10 rounded" style={{ background: "var(--bg-tertiary)" }} />
          <div className="h-3 w-8 rounded" style={{ background: "var(--bg-tertiary)" }} />
        </div>
      ))}
    </div>
  );
}

export default function TopPages({ data, loading = false }) {
  const columns = [
    {
      key: "pageViews",
      label: "Page Views",
      render: (row) => <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{(row.pageViews || 0).toLocaleString()}</span>,
    },
    {
      key: "title",
      label: "Article",
      render: (row) => (
        <div className="max-w-md">
          <p className="font-medium truncate text-xs" style={{ color: "var(--text-primary)" }}>{row.title}</p>
          <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{row.url}</p>
        </div>
      ),
    },
    { key: "brand", label: "Brand" },
    {
      key: "users",
      label: "Users",
      render: (row) => <span style={{ color: "var(--text-secondary)" }}>{(row.users || 0).toLocaleString()}</span>,
    },
    {
      key: "clicks",
      label: "GSC Clicks",
      render: (row) => (
        <span style={{ color: row.clicks > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
          {row.clicks > 0 ? row.clicks.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "avgPosition",
      label: "Position",
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: row.avgPosition > 0 ? (row.avgPosition <= 10 ? "var(--success)" : "var(--warning)") : "var(--text-muted)" }}>
          {row.avgPosition > 0 ? row.avgPosition.toFixed(1) : "—"}
        </span>
      ),
    },
    {
      key: "avgDuration",
      label: "Avg Time",
      render: (row) => {
        const d = row.avgDuration || 0;
        return <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{Math.floor(d/60)}m {Math.round(d%60)}s</span>;
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-4 h-4" style={{ color: "var(--success)" }} />
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Top Pages</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sorted by GA4 page views. GSC data shows search performance for the same pages.</p>
        </div>
      </div>
      {loading ? (
        <TableSkeleton rows={10} />
      ) : (
        <ArticleTable columns={columns} data={data} defaultSort={{ key: "pageViews", direction: "desc" }} />
      )}
    </div>
  );
}
