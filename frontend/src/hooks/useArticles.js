/**
 * Data hooks — fetch from Python backend.
 * Module-level caches let every request run to completion in the background.
 * Switching blogs/ranges fires a new request immediately; completed background
 * results are cached silently and only applied when that key is active again.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Module-level caches — persist for the lifetime of the page
const _articlesCache = new Map();
const _overviewCache = new Map();
const _lowCtrCache = new Map();

export function useArticles(dateOrRange, brand = "all") {
  const cacheKey = `${dateOrRange}_${brand}`;
  const [articles, setArticles] = useState(() => _articlesCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!_articlesCache.has(cacheKey));

  // Tracks which key is currently displayed — background completions check this
  // before updating state so stale results never overwrite the active view
  const activeKeyRef = useRef(cacheKey);
  activeKeyRef.current = cacheKey;

  useEffect(() => {
    const key = `${dateOrRange}_${brand}`;

    if (_articlesCache.has(key)) {
      setArticles(_articlesCache.get(key));
      setLoading(false);
      return;
    }

    setLoading(true);
    let url = `${API_BASE}/api/articles?`;

    if (["7days", "14days", "28days", "30days"].includes(dateOrRange)) {
      url += `range=${dateOrRange}`;
    } else if (dateOrRange?.startsWith("custom:")) {
      const [, start, end] = dateOrRange.split(":");
      url += `startDate=${start}&endDate=${end}`;
    } else {
      url += `date=${dateOrRange}`;
    }

    if (brand && brand !== "all") {
      url += `&brand=${encodeURIComponent(brand)}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const data = d.articles || [];
        _articlesCache.set(key, data);
        if (activeKeyRef.current === key) {
          setArticles(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (activeKeyRef.current === key) {
          setArticles([]);
          setLoading(false);
        }
      });
  }, [dateOrRange, brand]);

  return { articles, loading };
}

export function useRealtime(brand = "all", isActive = true) {
  const [realtime, setRealtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const brandRef = useRef(brand);
  brandRef.current = brand;

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
        setRealtime(data);
        setLoading(false);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("[useRealtime]", err);
          if (isFirst) setLoading(false);
        }
      }
    };

    fetchData(true);

    if (!isActive) {
      return () => controller.abort();
    }

    const interval = setInterval(() => fetchData(false), 55000);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [brand, isActive]);

  const safeRealtime = realtime ?? { totalActive: 0, pages: [] };
  return { realtime: safeRealtime, refresh, loading, refreshing };
}

export function useOverviewData(brand, range, isActive = true) {
  const cacheKey = `${brand}_${range}`;
  const [data, setData] = useState(
    () => _overviewCache.get(cacheKey) || { channels: [], timeline: [], queries: [] }
  );
  const [loading, setLoading] = useState(!_overviewCache.has(cacheKey));

  const activeKeyRef = useRef(cacheKey);
  activeKeyRef.current = cacheKey;

  useEffect(() => {
    if (!isActive) return;

    const key = `${brand}_${range}`;

    if (_overviewCache.has(key)) {
      setData(_overviewCache.get(key));
      setLoading(false);
      return;
    }

    setLoading(true);
    let q = `?brand=${encodeURIComponent(brand || "all")}`;

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
      fetch(`${API_BASE}/api/channels${q}`).then((r) => r.json()),
      fetch(`${API_BASE}/api/timeline${q}`).then((r) => r.json()),
      fetch(`${API_BASE}/api/gsc/queries${q}`).then((r) => r.json()),
    ])
      .then(([channels, timeline, queries]) => {
        const result = { channels, timeline, queries };
        _overviewCache.set(key, result);
        if (activeKeyRef.current === key) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (activeKeyRef.current === key) setLoading(false);
      });
  }, [brand, range, isActive]);

  return { ...data, loading };
}

export function useLowCTRData(brand, range, isActive = true) {
  const cacheKey = `${brand}_${range}`;
  const [keywords, setKeywords] = useState(() => _lowCtrCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!_lowCtrCache.has(cacheKey));

  const activeKeyRef = useRef(cacheKey);
  activeKeyRef.current = cacheKey;

  useEffect(() => {
    if (!isActive) return;

    const key = `${brand}_${range}`;

    if (_lowCtrCache.has(key)) {
      setKeywords(_lowCtrCache.get(key));
      setLoading(false);
      return;
    }

    setLoading(true);
    let q = `?brand=${encodeURIComponent(brand || "all")}`;

    if (["7days", "14days", "28days", "30days"].includes(range)) {
      q += `&range=${encodeURIComponent(range)}`;
    } else if (range?.startsWith("custom:")) {
      const [, start, end] = range.split(":");
      q += `&startDate=${start}&endDate=${end}`;
    }

    fetch(`${API_BASE}/api/gsc/low-ctr-keywords${q}`)
      .then((r) => r.json())
      .then((data) => {
        _lowCtrCache.set(key, data);
        if (activeKeyRef.current === key) {
          setKeywords(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (activeKeyRef.current === key) {
          setKeywords([]);
          setLoading(false);
        }
      });
  }, [brand, range, isActive]);

  return { keywords, loading };
}
