/**
 * Editor Queue — Action items for content optimization.
 * Based on real signals: low engagement (GA4) + low CTR (GSC).
 */
import React, { useState, useMemo } from "react";
import { ClipboardList, AlertCircle, Clock, TrendingDown, MousePointerClick } from "lucide-react";

export default function EditorQueues({ data }) {
  const brands = useMemo(() => ["All", ...new Set(data.map(a => a.brand))].filter(Boolean), [data]);
  const [selectedBrand, setSelectedBrand] = useState("All");

  const tasks = useMemo(() => {
    const filtered = selectedBrand === "All" ? data : data.filter(a => a.brand === selectedBrand);
    return filtered
      .map(article => {
        const actions = [];
        // Low engagement = short time on page
        if (article.avgDuration > 0 && article.avgDuration < 60 && article.pageViews > 1000) {
          actions.push({ icon: Clock, text: "Low engagement — add FAQs, improve content depth", type: "warning" });
        }
        // Low CTR from GSC (has impressions but poor click rate)
        if (article.impressions > 2000 && article.clicks > 0) {
          const ctr = (article.clicks / article.impressions) * 100;
          if (ctr < 3) {
            actions.push({ icon: TrendingDown, text: `CTR only ${ctr.toFixed(1)}% — rewrite meta title & description`, type: "danger" });
          }
        }
        // High impressions, low clicks (ranking but not attracting)
        if (article.impressions > 5000 && article.clicks < 500) {
          actions.push({ icon: MousePointerClick, text: "High visibility, low clicks — needs compelling meta description", type: "accent" });
        }
        return actions.length > 0 ? { article, actions } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b.article.impressions || 0) - (a.article.impressions || 0));
  }, [data, selectedBrand]);

  const typeStyles = {
    warning: { background: "rgba(245,158,11,0.08)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.2)" },
    danger: { background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" },
    accent: { background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-border)" },
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-4 h-4" style={{ color: "#8b5cf6" }} />
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Editor Queue</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Action items based on GA4 engagement + GSC performance signals</p>
          </div>
        </div>
        <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="mb-4 p-3 rounded-lg border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" style={{ color: "#8b5cf6" }} />
          <strong style={{ color: "var(--text-primary)" }}>{tasks.length}</strong> articles need optimization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.slice(0, 20).map(({ article, actions }, idx) => (
          <div key={article.id || idx} className="rounded-xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <p className="text-xs font-medium line-clamp-2 mb-1" style={{ color: "var(--text-primary)" }}>{article.title}</p>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{article.brand}</span>
              {article.avgPosition > 0 && <>
                <span style={{ color: "var(--border)" }}>•</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Pos {article.avgPosition.toFixed(1)}</span>
              </>}
              <span style={{ color: "var(--border)" }}>•</span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{(article.pageViews||0).toLocaleString()} views</span>
            </div>
            <div className="space-y-1.5">
              {actions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-[11px]" style={typeStyles[action.type]}>
                    <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{action.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>No action items found.</div>
        )}
      </div>
    </div>
  );
}
