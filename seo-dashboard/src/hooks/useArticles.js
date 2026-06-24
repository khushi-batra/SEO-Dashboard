/**
 * Data hooks — fetch from Python backend.
 * useArticles accepts a date string (YYYY-MM-DD) for the selected day.
 * useRealtime fetches live active users (auto-refreshes).
 */
import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000";

export function useArticles(dateOrRange) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // If "28days" is passed, use the range endpoint; otherwise use specific date
    const param = dateOrRange === "28days" ? "range=28days" : `date=${dateOrRange}`;
    fetch(`${API_BASE}/api/articles?${param}`)
      .then((r) => r.json())
      .then((d) => setArticles(d.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [dateOrRange]);

  return { articles, loading };
}

export function useRealtime() {
  const [realtime, setRealtime] = useState({ totalActive: 0, pages: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch(`${API_BASE}/api/realtime`)
      .then((r) => r.json())
      .then(setRealtime)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh();
    setLoading(false);
    const interval = setInterval(refresh, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  return { realtime, loading, refresh };
}
