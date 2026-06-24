/**
 * Opportunities — Pages in "striking distance" (position 5-20 in GSC)
 * that already have impressions. Small ranking improvements = big traffic gains.
 */
import React, { useMemo } from "react";
import { Target } from "lucide-react";
import ArticleTable from "../components/ArticleTable";

export default function OpportunityPages({ data }) {
  const opportunities = useMemo(() => {
    return data
      .filter((a) => a.avgPosition >= 5 && a.avgPosition <= 20 && a.impressions > 500)
      .sort((a, b) => b.impressions - a.impressions);
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
      key: "avgPosition",
      label: "Position",
      render: (row) => <span className="font-mono text-xs" style={{ color: "var(--warning)" }}>{row.avgPosition.toFixed(1)}</span>,
    },
    {
      key: "impressions",
      label: "Impressions",
      render: (row) => <span style={{ color: "var(--text-primary)" }}>{row.impressions.toLocaleString()}</span>,
    },
    {
      key: "clicks",
      label: "Clicks",
      render: (row) => <span style={{ color: "var(--text-secondary)" }}>{row.clicks.toLocaleString()}</span>,
    },
    {
      key: "ctr",
      label: "CTR",
      render: (row) => {
        const ctr = row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0";
        return <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{ctr}%</span>;
      },
    },
    {
      key: "pageViews",
      label: "Page Views",
      render: (row) => <span style={{ color: "var(--text-secondary)" }}>{(row.pageViews || 0).toLocaleString()}</span>,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Target className="w-4 h-4" style={{ color: "var(--warning)" }} />
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Opportunity Pages</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Pages ranking position 5-20 in Google — push to top 5 for significant traffic increase.
          </p>
        </div>
      </div>
      {opportunities.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
          No opportunity pages found with GSC position data in this range.
        </div>
      ) : (
        <ArticleTable columns={columns} data={opportunities} defaultSort={{ key: "impressions", direction: "desc" }} />
      )}
    </div>
  );
}
