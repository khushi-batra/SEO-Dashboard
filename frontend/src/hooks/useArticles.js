/**
 * Data hooks — fetch from Python backend.
 * useArticles accepts a date string (YYYY-MM-DD) for the selected day.
 * useRealtime fetches live active users (auto-refreshes).
 */
import React, { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000";

export function useArticles(dateOrRange, brand = "all") {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let url = `${API_BASE}/api/articles?`;

    if (["7days", "14days", "28days", "30days"].includes(dateOrRange)) {
      url += `range=${dateOrRange}`;
    } else if (dateOrRange?.startsWith("custom:")) {
      // custom:2025-01-01:2025-01-15
      const [, start, end] = dateOrRange.split(":");
      url += `startDate=${start}&endDate=${end}`;
    } else {
      // single YYYY-MM-DD
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

export function useRealtime(brand = "all", isActive = true) {
  const [realtime, setRealtime] = useState(null); // null = never fetched yet
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // true only during manual refresh

  // Keep a ref to the latest brand so manual refresh always uses current value
  const brandRef = React.useRef(brand);
  brandRef.current = brand;

  // Manual refresh — shows spinner, updates data, no skeleton (data already visible)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    let url = `${API_BASE}/api/realtime`;
    if (brandRef.current && brandRef.current !== "all") {
      url += `?brand=${encodeURIComponent(brandRef.current)}`;
    }
    try {
      const r = await fetch(url);
      const data = await r.json();
      setRealtime(data);
    } catch (e) {
      // silent — manual refresh failure is non-critical
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Reset to null + loading on brand change — null means "no data yet for this brand"
    // so skeleton stays visible until real data arrives
    setRealtime(null);
    setLoading(true);

    const controller = new AbortController();

    const fetchData = async (isFirst = false) => {
      let url = `${API_BASE}/api/realtime`;
      if (brand && brand !== "all") {
        url += `?brand=${encodeURIComponent(brand)}`;
      }
      try {
        const r = await fetch(url, { signal: controller.signal });
        const data = await r.json();
        setRealtime(data);         // set real data first
        setLoading(false);         // then clear loading — no 0-flash possible
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("[useRealtime]", err);
          if (isFirst) setLoading(false); // only unblock on error for initial fetch
        }
      }
    };

    fetchData(true);

    // Only poll while the realtime tab is visible — saves tokens when user is on other tabs
    if (!isActive) {
      return () => controller.abort();
    }

    // 55-second interval — one brand, one active fetch, low token cost
    const interval = setInterval(() => fetchData(false), 55000);

    return () => {
      clearInterval(interval);
      controller.abort(); // cancel any in-flight fetch for the old brand
    };
  }, [brand, isActive]);

  // Expose safe defaults — consumers must check `loading` before rendering numbers
  const safeRealtime = realtime ?? { totalActive: 0, pages: [] };
  return { realtime: safeRealtime, refresh, loading, refreshing };
}

export function useOverviewData(brand, range, isActive = true) {
  const [data, setData] = useState({ channels: [], timeline: [], queries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isActive) return; // defer until overview tab is visible

    setLoading(true);
    let q = `?brand=${encodeURIComponent(brand || 'all')}`;

    if (["7days", "14days", "28days", "30days"].includes(range)) {
      q += `&range=${encodeURIComponent(range)}`;
    } else if (range?.startsWith("custom:")) {
      const [, start, end] = range.split(":");
      q += `&startDate=${start}&endDate=${end}`;
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
  }, [brand, range, isActive]);

  return { ...data, loading };
}

export function useLowCTRData(brand, isActive = true) {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isActive) return; // defer until low-ctr tab is visible

    setLoading(true);
    let q = `?brand=${encodeURIComponent(brand || 'all')}`;

    fetch(`${API_BASE}/api/gsc/low-ctr-keywords${q}`)
      .then(r => r.json())
      .then(data => setKeywords(data))
      .catch(() => setKeywords([]))
      .finally(() => setLoading(false));
  }, [brand, isActive]);

  return { keywords, loading };
}
