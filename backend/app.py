"""
Adda247 SEO Matrix — Backend API
==================================
Serves unified GA4 + GSC data.

GA4 = article inventory + traffic metrics (what happens on site)
GSC = search enrichment (how Google sees those same pages)

To run:
    python3 app.py
"""

import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from services.ga4_service import (
    fetch_all_data,
    fetch_realtime_data,
    fetch_realtime_per_minute,
    fetch_sessions_by_channel,
    fetch_user_activity_timeline,
    fetch_gsc_queries,
    fetch_gsc_low_ctr_keywords,
)

app = FastAPI(title="Adda247 SEO Matrix API", version="3.0.0")

# Thread pool for running blocking GA4/GSC calls without blocking the event loop
_thread_pool = ThreadPoolExecutor(max_workers=20)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Cache ────────────────────────────────────────────────────────────────────
_cache: dict = {}
_cache_in_flight: dict = {}   # key → asyncio.Event, prevents duplicate fetches
CACHE_TTL = 3600


async def _async_cached_fetch(key: str, fetcher, *args):
    """
    Non-blocking cached fetch. If two requests come in simultaneously for the
    same uncached key, only one runs the fetcher — the other waits for the event.
    """
    now = time.time()
    if key in _cache and (now - _cache[key]["ts"]) < CACHE_TTL:
        return _cache[key]["data"]

    # If another coroutine is already fetching this key, wait for it
    if key in _cache_in_flight:
        await _cache_in_flight[key].wait()
        # After waiting, the cache should be populated
        if key in _cache:
            return _cache[key]["data"]

    # We are the one doing the fetch — set an event so others wait
    event = asyncio.Event()
    _cache_in_flight[key] = event
    try:
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(_thread_pool, fetcher, *args)
        _cache[key] = {"data": data, "ts": time.time()}
        return data
    except Exception as e:
        print(f"[Cache fetch error] {key}: {e}")
        raise
    finally:
        # Always signal waiters and clean up, even on error
        event.set()
        _cache_in_flight.pop(key, None)


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "Adda247 SEO Matrix API", "version": "3.0"}


@app.on_event("startup")
async def warm_up_cache():
    async def _warm(cache_key, fetcher, *args):
        try:
            print(f"[Startup] Warming cache: {cache_key}")
            await _async_cached_fetch(cache_key, fetcher, *args)
            print(f"[Startup] Done: {cache_key}")
        except Exception as e:
            print(f"[Startup] Warm-up failed for {cache_key} (non-fatal): {e}")

    asyncio.create_task(_warm("articles_28daysAgo_today_all", fetch_all_data, "28daysAgo", "today", None))
    asyncio.create_task(_warm("articles_today_today_all", fetch_all_data, "today", "today", None))
    asyncio.create_task(_warm("articles_7daysAgo_today_all", fetch_all_data, "7daysAgo", "today", None))
    asyncio.create_task(_warm("channels_28daysAgo_today_all", fetch_sessions_by_channel, "28daysAgo", "today", None))
    asyncio.create_task(_warm("timeline_28daysAgo_today_all", fetch_user_activity_timeline, "28daysAgo", "today", None))
    asyncio.create_task(_warm("gsc_queries_all", fetch_gsc_queries, None))
    asyncio.create_task(_warm("gsc_low_ctr_all", fetch_gsc_low_ctr_keywords, None))


@app.get("/api/realtime")
async def get_realtime(brand: Optional[str] = Query(None)):
    """Live data — active users RIGHT NOW. Non-blocking."""
    now = time.time()
    cache_key = f"realtime_data_{brand or 'all'}"
    if cache_key in _cache and (now - _cache[cache_key]["ts"]) < 50:
        return _cache[cache_key]["data"]
    data = await _async_cached_fetch(cache_key, fetch_realtime_data, brand)
    return data


@app.get("/api/realtime/history")
async def get_realtime_history(brand: Optional[str] = Query(None)):
    """Per-minute active user data from GA4 (last 30 minutes). Non-blocking."""
    cache_key = f"realtime_history_{brand or 'all'}"
    now = time.time()
    if cache_key in _cache and (now - _cache[cache_key]["ts"]) < 50:
        return {"history": _cache[cache_key]["data"]}
    data = await _async_cached_fetch(cache_key, fetch_realtime_per_minute, brand)
    return {"history": data}


@app.get("/api/articles")
async def get_articles(
    date: Optional[str] = Query(None),
    range: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),  # custom range start YYYY-MM-DD
    endDate: Optional[str] = Query(None),    # custom range end YYYY-MM-DD
    brand: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    from datetime import date as dt_date
    if startDate and endDate:
        # Custom date range from the frontend range picker
        start, end = startDate, endDate
    elif range:
        range_map = {"7days": "7daysAgo", "14days": "14daysAgo", "28days": "28daysAgo", "30days": "30daysAgo"}
        start = range_map.get(range, "28daysAgo")
        end = "today"
    elif date:
        today_str = dt_date.today().isoformat()
        start, end = ("today", "today") if date == today_str else (date, date)
    else:
        start, end = "28daysAgo", "today"

    cache_key = f"articles_{start}_{end}_{brand or 'all'}"
    articles = await _async_cached_fetch(cache_key, fetch_all_data, start, end, brand)

    if search:
        q = search.lower()
        articles = [a for a in articles if q in a["title"].lower() or q in a["url"].lower()]

    return {"count": len(articles), "articles": articles}


@app.get("/api/metrics/summary")
async def get_summary(date: Optional[str] = Query(None), range: Optional[str] = Query(None), brand: Optional[str] = Query(None)):
    from datetime import date as dt_date
    if range:
        range_map = {"7days": "7daysAgo", "14days": "14daysAgo", "28days": "28daysAgo", "30days": "30daysAgo"}
        start = range_map.get(range, "28daysAgo")
        end = "today"
    elif date:
        today_str = dt_date.today().isoformat()
        start, end = ("today", "today") if date == today_str else (date, date)
    else:
        start, end = "today", "today"

    cache_key = f"articles_{start}_{end}_{brand or 'all'}"
    articles = await _async_cached_fetch(cache_key, fetch_all_data, start, end, brand)

    total_views = sum(a["pageViews"] for a in articles)
    total_users = sum(a["users"] for a in articles)
    total_clicks = sum(a["clicks"] for a in articles)
    total_impressions = sum(a["impressions"] for a in articles)
    avg_position_articles = [a for a in articles if a["avgPosition"] > 0]
    avg_pos = round(sum(a["avgPosition"] for a in avg_position_articles) / max(len(avg_position_articles), 1), 1)

    return {
        "totalPageViews": total_views, "totalUsers": total_users,
        "totalClicks": total_clicks, "totalImpressions": total_impressions,
        "avgPosition": avg_pos, "totalArticles": len(articles),
    }


@app.get("/api/channels")
async def get_channels(date: Optional[str] = Query(None), range: Optional[str] = Query(None), startDate: Optional[str] = Query(None), endDate: Optional[str] = Query(None), brand: Optional[str] = Query(None)):
    from datetime import date as dt_date
    if startDate and endDate:
        start, end = startDate, endDate
    elif range:
        range_map = {"7days": "7daysAgo", "14days": "14daysAgo", "28days": "28daysAgo", "30days": "30daysAgo"}
        start = range_map.get(range, "28daysAgo")
        end = "today"
    elif date:
        today_str = dt_date.today().isoformat()
        start, end = ("today", "today") if date == today_str else (date, date)
    else:
        start, end = "28daysAgo", "today"

    cache_key = f"channels_{start}_{end}_{brand or 'all'}"
    return await _async_cached_fetch(cache_key, fetch_sessions_by_channel, start, end, brand)


@app.get("/api/timeline")
async def get_timeline(date: Optional[str] = Query(None), range: Optional[str] = Query(None), startDate: Optional[str] = Query(None), endDate: Optional[str] = Query(None), brand: Optional[str] = Query(None)):
    from datetime import date as dt_date
    if startDate and endDate:
        start, end = startDate, endDate
    elif range:
        range_map = {"7days": "7daysAgo", "14days": "14daysAgo", "28days": "28daysAgo", "30days": "30daysAgo"}
        start = range_map.get(range, "28daysAgo")
        end = "today"
    elif date:
        today_str = dt_date.today().isoformat()
        start, end = ("today", "today") if date == today_str else (date, date)
    else:
        start, end = "28daysAgo", "today"

    cache_key = f"timeline_{start}_{end}_{brand or 'all'}"
    return await _async_cached_fetch(cache_key, fetch_user_activity_timeline, start, end, brand)


@app.get("/api/gsc/queries")
async def get_gsc_queries(
    brand: Optional[str] = Query(None),
    range: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
):
    if startDate and endDate:
        start, end = startDate, endDate
    elif range:
        range_map = {"7days": "7daysAgo", "14days": "14daysAgo", "28days": "28daysAgo", "30days": "30daysAgo"}
        start, end = range_map.get(range, "28daysAgo"), "today"
    else:
        start, end = "28daysAgo", "today"
    cache_key = f"gsc_queries_{start}_{end}_{brand or 'all'}"
    return await _async_cached_fetch(cache_key, fetch_gsc_queries, brand, start, end)


@app.get("/api/gsc/low-ctr-keywords")
async def get_gsc_low_ctr_keywords(
    brand: Optional[str] = Query(None),
    range: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
):
    if startDate and endDate:
        start, end = startDate, endDate
    elif range:
        range_map = {"7days": "7daysAgo", "14days": "14daysAgo", "28days": "28daysAgo", "30days": "30daysAgo"}
        start, end = range_map.get(range, "28daysAgo"), "today"
    else:
        start, end = "28daysAgo", "today"
    cache_key = f"gsc_low_ctr_{start}_{end}_{brand or 'all'}"
    return await _async_cached_fetch(cache_key, fetch_gsc_low_ctr_keywords, brand, start, end)


@app.get("/api/cache/clear")
def clear_cache():
    _cache.clear()
    return {"status": "cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
