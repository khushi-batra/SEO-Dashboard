import React from "react";

export default function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse px-2">
      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <div className="p-5 flex flex-col gap-3 h-full">
              <div className="w-10 h-10 rounded-lg" style={{ background: "var(--bg-tertiary)" }}></div>
              <div className="space-y-2">
                <div className="h-5 w-1/2 rounded" style={{ background: "var(--bg-tertiary)" }}></div>
                <div className="h-3 w-3/4 rounded" style={{ background: "var(--bg-tertiary)" }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="h-[300px] rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="h-6 w-1/4 rounded mb-6" style={{ background: "var(--bg-tertiary)" }}></div>
        <div className="h-[200px] w-full rounded" style={{ background: "var(--bg-tertiary)" }}></div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="h-6 w-1/5 rounded mb-5" style={{ background: "var(--bg-tertiary)" }}></div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-12 rounded" style={{ background: "var(--bg-tertiary)" }}></div>
              <div className="h-4 w-full rounded" style={{ background: "var(--bg-tertiary)" }}></div>
              <div className="h-4 w-24 rounded" style={{ background: "var(--bg-tertiary)" }}></div>
              <div className="h-4 w-16 rounded" style={{ background: "var(--bg-tertiary)" }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
