"""
Adda247 SEO Matrix — Backend API
==================================
Serves unified GA4 + GSC data.

GA4 = article inventory + traffic metrics (what happens on site)
GSC = search enrichment (how Google sees those same pages)

To run:
    uvicorn main:app --reload --port 8000
"""

import time
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from ga4_service import (
    fetch_all_data,
    fetch_realtime_data,
    fetch_realtime_per_minute,
    fetch_sessions_by_channel,
    fetch_user_activity_timeline,
    fetch_gsc_queries,
)

app = FastAPI(title="Adda247 SEO Matrix API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Cache (2 min TTL) ────────────────────────────────────────────────────────
_cache = {}
CACHE_TTL = 120


def _cached_fetch(key: str, fetcher, *args):
    now = time.time()
    if key in _cache and (now - _cache[key]["ts"]) < CACHE_TTL:
        return _cache[key]["data"]
    data = fetcher(*args)
    _cache[key] = {"data": data, "ts": now}
    return data


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "Adda247 SEO Matrix API", "version": "3.0"}


@app.get("/api/realtime")
def get_realtime():
    """
    Live data — active users RIGHT NOW.
    Also stores per-minute history so the chart works even after page reload.
    """
    # Use a shorter cache TTL (e.g., 25s) specifically for realtime since clients poll every 30s.
    # This prevents multiple dashboard users from spamming the GA4 API.
    now = time.time()
    cache_key = "realtime_data"
    if cache_key in _cache and (now - _cache[cache_key]["ts"]) < 25:
        data = _cache[cache_key]["data"]
    else:
        data = fetch_realtime_data()
        _cache[cache_key] = {"data": data, "ts": now}
        
    # Log this value to the per-minute history
    _log_realtime_value(data.get("totalActive", 0))
    return data


@app.get("/api/realtime/history")
def get_realtime_history():
    """
    Returns real per-minute active user data from GA4 (last 30 minutes).
    Each entry = actual users active during that specific minute.
    """
    data = fetch_realtime_per_minute()
    return {"history": data}


# ─── Per-minute realtime history (in-memory log) ──────────────────────────────
_realtime_history = []  # List of {"time": iso_string, "value": int}
_last_log_time = 0


def _log_realtime_value(value: int):
    """Log a realtime value. Only logs once per ~30 seconds to avoid duplicates."""
    global _last_log_time
    now = time.time()
    if now - _last_log_time < 10:  # Don't log more than once per 10 seconds
        return
    _last_log_time = now
    from datetime import datetime
    _realtime_history.append({
        "time": datetime.now().isoformat(),
        "value": value,
    })
    # Keep only the last 60 entries
    if len(_realtime_history) > 60:
        _realtime_history.pop(0)


def _get_realtime_history() -> list:
    """Return the stored history, padding with zeros if less than 60 entries."""
    return _realtime_history[-60:]


@app.get("/api/articles")
def get_articles(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    range: Optional[str] = Query(None, description="Range like 28days, 7days"),
    brand: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Main endpoint: returns the article list from GA4, enriched with GSC.
    - If `range` is provided (e.g., 28days), fetches that range.
    - If `date` is provided, fetches that specific day.
    - Default: last 28 days.
    """
    from datetime import date as dt_date

    if range:
        range_map = {"7days": "7daysAgo", "14days": "14daysAgo", "28days": "28daysAgo", "30days": "30daysAgo"}
        start = range_map.get(range, "28daysAgo")
        end = "today"
    elif date:
        today_str = dt_date.today().isoformat()
        if date == today_str:
            start, end = "today", "today"
        else:
            start, end = date, date
    else:
        start, end = "28daysAgo", "today"

    cache_key = f"articles_{start}_{end}"
    articles = _cached_fetch(cache_key, fetch_all_data, start, end)

    # Apply filters
    if brand:
        articles = [a for a in articles if a["brand"].lower() == brand.lower()]
    if search:
        q = search.lower()
        articles = [a for a in articles if q in a["title"].lower() or q in a["url"].lower()]

    return {"count": len(articles), "articles": articles}


@app.get("/api/metrics/summary")
def get_summary(date: Optional[str] = Query(None)):
    """Aggregate metrics."""
    from datetime import date as dt_date
    if date:
        today_str = dt_date.today().isoformat()
        start, end = ("today", "today") if date == today_str else (date, date)
    else:
        start, end = "today", "today"
    articles = _cached_fetch(f"articles_{start}_{end}", fetch_all_data, start, end)

    total_views = sum(a["pageViews"] for a in articles)
    total_users = sum(a["users"] for a in articles)
    total_clicks = sum(a["clicks"] for a in articles)
    total_impressions = sum(a["impressions"] for a in articles)
    avg_position_articles = [a for a in articles if a["avgPosition"] > 0]
    avg_pos = round(sum(a["avgPosition"] for a in avg_position_articles) / max(len(avg_position_articles), 1), 1)

    return {
        "totalPageViews": total_views,
        "totalUsers": total_users,
        "totalClicks": total_clicks,
        "totalImpressions": total_impressions,
        "avgPosition": avg_pos,
        "totalArticles": len(articles),
    }


@app.get("/api/channels")
def get_channels():
    return _cached_fetch("channels", fetch_sessions_by_channel)


@app.get("/api/timeline")
def get_timeline():
    return _cached_fetch("timeline", fetch_user_activity_timeline)


@app.get("/api/gsc/queries")
def get_gsc_queries():
    return _cached_fetch("gsc_queries", fetch_gsc_queries)


@app.get("/api/cache/clear")
def clear_cache():
    _cache.clear()
    return {"status": "cleared"}
