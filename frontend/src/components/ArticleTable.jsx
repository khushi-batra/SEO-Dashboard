/**
 * ArticleTable — Reusable sortable data table.
 * Columns with `sortable: false` won't show sort arrows.
 * All other columns are fully sortable by clicking headers.
 */
import React, { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function ArticleTable({ columns, data, defaultSort }) {
  const [sort, setSort] = useState(defaultSort || { key: null, direction: "desc" });

  const handleSort = (key, sortable) => {
    if (sortable === false) return; // Skip non-sortable columns
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const sortedData = useMemo(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sort.key];
      let bVal = b[sort.key];

      // Handle undefined/null
      if (aVal == null) aVal = 0;
      if (bVal == null) bVal = 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sort.direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sort]);

  const SortIcon = ({ colKey, sortable }) => {
    if (sortable === false) return null;
    if (sort.key !== colKey)
      return <ArrowUpDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />;
    return sort.direction === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
    ) : (
      <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm text-left">
        <thead className="border-b" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key, col.sortable)}
                className={`px-4 py-3 text-xs font-medium uppercase tracking-wider select-none transition-colors ${col.sortable !== false ? "cursor-pointer hover:opacity-80" : ""}`}
                style={{ color: "var(--text-muted)" }}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label}
                  <SortIcon colKey={col.key} sortable={col.sortable} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={row.id || idx}
              className="border-b transition-colors hover:opacity-90"
              style={{ borderColor: "var(--border)", background: idx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-primary)" }}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                No articles found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
