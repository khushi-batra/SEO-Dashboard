/**
 * Low CTR — Pages with high impressions but low click-through rate.
 * These are pages that Google SHOWS to users but people don't click.
 * Fix: improve meta title, meta description, or add rich snippets.
 *
 * This is the real "opportunity gap" from GSC data.
 */
import React, { useMemo } from "react";
import { TrendingDown, AlertTriangle } from "lucide-react";
import ArticleTable from "../components/ArticleTable";

export default function LowCTR({ keywords = [] }) {
  const columns = [
    {
      key: "query",
      label: "Keyword",
      render: (row) => (
        <div className="max-w-sm">
          <p className="font-medium truncate text-xs" style={{ color: "var(--text-primary)" }}>{row.query}</p>
        </div>
      ),
    },
    {
      key: "impressions",
      label: "Impressions",
      render: (row) => <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{row.impressions.toLocaleString()}</span>,
    },
    {
      key: "clicks",
      label: "Clicks",
      render: (row) => <span style={{ color: "var(--text-secondary)" }}>{row.clicks.toLocaleString()}</span>,
    },
    {
      key: "ctr",
      label: "CTR %",
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: row.ctr < 2 ? "var(--danger)" : "var(--warning)" }}>
          {row.ctr.toFixed(2)}%
        </span>
      ),
    },
    {
      key: "position",
      label: "Position",
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: row.position <= 10 ? "var(--success)" : "var(--warning)" }}>
          {row.position.toFixed(1)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: false,
      render: (row) => (
        <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
          {row.position <= 10 ? "Optimize Title" : "Needs Backlinks"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <TrendingDown className="w-4 h-4" style={{ color: "var(--danger)" }} />
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Low CTR Pages</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Pages with high Google impressions but users aren't clicking. Improve titles & descriptions.
          </p>
        </div>
      </div>

      {keywords.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border" style={{ background: "rgba(239,68,68,0.03)", borderColor: "rgba(239,68,68,0.15)" }}>
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            <strong>{keywords.length} keywords</strong> have high impressions but low clicks. Optimizing meta titles can boost your CTR instantly.
          </p>
        </div>
      )}

      {keywords.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
          No low-CTR keywords found.
        </div>
      ) : (
        <ArticleTable columns={columns} data={keywords} defaultSort={{ key: "impressions", direction: "desc" }} />
      )}
    </div>
  );
}
