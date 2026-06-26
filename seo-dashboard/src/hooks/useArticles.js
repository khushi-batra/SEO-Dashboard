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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const refresh = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
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
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [brand]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(true);
    
    const interval = setInterval(() => refresh(false), 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [refresh]);

  return { realtime, refresh, loading };
}

export function useOverviewData(brand, range) {
  const [data, setData] = useState({ channels: [], timeline: [], queries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    let q = `?brand=${encodeURIComponent(brand || 'all')}`;
    if (range === "7days" || range === "14days" || range === "28days" || range === "30days") {
      q += `&range=${encodeURIComponent(range)}`;
    } else if (range) {
      q += `&date=${encodeURIComponent(range)}`;
    } else {
      q += `&range=28days`;
    }
    
    Promise.all([
      fetch(`${API_BASE}/api/channels${q}`).then(r => r.json()),
      fetch(`${API_BASE}/api/timeline${q}`).then(r => r.json()),
      fetch(`${API_BASE}/api/gsc/queries`).then(r => r.json())
    ]).then(([channels, timeline, queries]) => {
      setData({ channels, timeline, queries });
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [brand, range]);

  return { ...data, loading };
}

export function useLowCTRData(brand) {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    let q = `?brand=${encodeURIComponent(brand || 'all')}`;
    
    fetch(`${API_BASE}/api/gsc/low-ctr-keywords${q}`)
      .then(r => r.json())
      .then(data => setKeywords(data))
      .catch(() => setKeywords([]))
      .finally(() => setLoading(false));
  }, [brand]);

  return { keywords, loading };
}
