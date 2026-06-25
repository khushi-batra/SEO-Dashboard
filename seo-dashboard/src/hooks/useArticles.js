/**
 * Data hooks — fetch from Python backend.
 * useArticles accepts a date string (YYYY-MM-DD) for the selected day.
 * useRealtime fetches live active users (auto-refreshes).
 */
import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000";

export function useArticles(dateOrRange, brand = "all") {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setArticles([]); // Clear stale data instantly
    setLoading(true);
    let url = `${API_BASE}/api/articles?`;
    if (dateOrRange === "7days" || dateOrRange === "14days" || dateOrRange === "28days" || dateOrRange === "30days") {
        url += `range=${dateOrRange}`;
    } else {
        url += `date=${dateOrRange}`;
    }
    if (brand && brand !== "all") {
        url += `&brand=${encodeURIComponent(brand)}`;
    }
    
    fetch(url)
      .then((r) => r.json())
      .then((d) => setArticles(d.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [dateOrRange, brand]);

  return { articles, loading };
}

export function useRealtime(brand = "all") {
  const [realtime, setRealtime] = useState({ totalActive: 0, pages: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let url = `${API_BASE}/api/realtime`;
    if (brand && brand !== "all") {
        url += `?brand=${encodeURIComponent(brand)}`;
    }
    try {
      const r = await fetch(url);
      const data = await r.json();
      setRealtime(data);
    } catch (e) {
      // handle error silently for interval
    }
  }, [brand]);

  useEffect(() => {
    setRealtime({ totalActive: 0, pages: [] }); // Clear stale data instantly
    setLoading(true);
    refresh().finally(() => setLoading(false));
    
    const interval = setInterval(refresh, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  return { realtime, loading, refresh };
}
