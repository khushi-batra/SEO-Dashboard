"""
ga4_service.py — Unified Data Service
=======================================
GA4 = traffic data  |  GSC = search insights

Architecture:
- ONE shared GA4 client + ONE shared GSC service (built once, reused)
- ONE shared ThreadPoolExecutor (no nested pools — avoids GIL contention)
- All per-property and per-site calls fired simultaneously via the shared pool
- GA4 articles fetch + GSC fetch run in parallel inside fetch_all_data
"""

import os
import hashlib
import logging
import threading
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
from dotenv import load_dotenv
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest,
    RunRealtimeReportRequest,
    Dimension,
    Metric,
    DateRange,
    OrderBy,
)
from googleapiclient.discovery import build

load_dotenv(override=True)

SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
logger = logging.getLogger(__name__)

# ─── Shared singletons ────────────────────────────────────────────────────────
_ga4_client: BetaAnalyticsDataClient = None
_client_lock = threading.Lock()

# Thread-local GSC service — googleapiclient is NOT thread-safe for concurrent
# requests; sharing one instance across threads corrupts SSL state (bad record MAC).
# Each worker thread gets its own service + HTTP connection pool.
_thread_local = threading.local()

# Single shared pool — no nested pools anywhere in this module
SHARED_POOL = ThreadPoolExecutor(max_workers=24)


def _build_credentials(scopes=None):
    private_key = os.getenv("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")
    return service_account.Credentials.from_service_account_info({
        "type": os.getenv("GOOGLE_SERVICE_ACCOUNT_TYPE", "service_account"),
        "project_id": os.getenv("GOOGLE_PROJECT_ID"),
        "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
        "private_key": private_key,
        "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "auth_uri": os.getenv("GOOGLE_AUTH_URI"),
        "token_uri": os.getenv("GOOGLE_TOKEN_URI"),
        "auth_provider_x509_cert_url": os.getenv("GOOGLE_AUTH_PROVIDER_CERT_URL"),
        "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_CERT_URL"),
        "universe_domain": os.getenv("GOOGLE_UNIVERSE_DOMAIN", "googleapis.com"),
    }, scopes=scopes or SCOPES)


def _get_ga4_client() -> BetaAnalyticsDataClient:
    global _ga4_client
    if _ga4_client is not None:
        return _ga4_client
    with _client_lock:
        if _ga4_client is None:
            _ga4_client = BetaAnalyticsDataClient(credentials=_build_credentials())
    return _ga4_client


def _get_gsc_service():
    if not hasattr(_thread_local, "gsc_service"):
        creds = _build_credentials(scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
        _thread_local.gsc_service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
    return _thread_local.gsc_service


# ─── Config maps ──────────────────────────────────────────────────────────────

PROPERTY_BRANDS = {
    "431779823": "Adda Exams",
    "355422738": "Adda Jobs",
    "355756107": "Teaching Adda",
    "355414070": "Engineering Adda",
    "209760965": "Current Affairs",
    "314016871": "Adda Store",
    "352396958": "Career Power HTML",
    "332111738": "Career Power Blog",
    "355432122": "BankersAdda",
    "355756324": "Hindi Bankers Adda",
    "292607808": "StudyIQ Mains Site",
    "384799357": "StudyIQ Articles",
}

PROPERTY_DOMAINS = {
    "431779823": "https://www.adda247.com",
    "355422738": "https://www.adda247jobs.com",
    "355756107": "https://www.teachersadda.com",
    "355414070": "https://www.adda247.com",
    "209760965": "https://www.adda247.com",
    "314016871": "https://store.adda247.com",
    "352396958": "https://www.careerpower.in",
    "332111738": "https://www.careerpower.in",
    "355432122": "https://www.bankersadda.com",
    "355756324": "https://www.bankersadda.com",
    "292607808": "https://www.studyiq.com",
    "384799357": "https://www.studyiq.com",
}

GSC_DOMAIN_BRAND_MAP = {
    "https://www.careerpower.in/": ["career power html", "career power blog"],
    "https://www.studyiq.com/": ["studyiq main site", "studyiq articles"],
    "https://www.teachersadda.com/": ["teaching adda"],
    "https://www.adda247jobs.com/": ["adda jobs"],
    "https://www.bankersadda.com/": ["bankersadda", "hindi bankers adda"],
    "https://www.adda247.com/": ["adda exams", "current affairs", "engineering adda"],
}


def get_gsc_site_urls(brand_filter: str = None) -> list:
    urls = []
    for k, v in os.environ.items():
        if k.startswith("GSC_SITE_URL") and v.strip():
            url = v.strip()
            if brand_filter and brand_filter.lower() != "all":
                brands_for_url = GSC_DOMAIN_BRAND_MAP.get(url, [])
                if brand_filter.lower() in brands_for_url:
                    urls.append(url)
            else:
                if "studyiq.com" not in url:
                    urls.append(url)
    return urls


def _get_property_ids(brand_filter: str = None) -> list:
    raw = os.getenv("GA4_PROPERTY_ID", "")
    all_props = [p.strip() for p in raw.split(",") if p.strip()]
    if not brand_filter or brand_filter.lower() == "all":
        return [p for p in all_props if p not in ("314016871", "292607808")]
    matched = [p for p in all_props if PROPERTY_BRANDS.get(p, "").lower() == brand_filter.lower()]
    return matched if matched else all_props


def _generate_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:10]


def _path_to_title(path: str) -> str:
    clean = path.strip("/")
    for prefix in ("blog/", "articles/", "article/"):
        if clean.startswith(prefix):
            clean = clean[len(prefix):]
    words = clean.replace("-", " ").replace("_", " ").split()
    acronyms = {"rrb", "ntpc", "ssc", "cgl", "ibps", "upsc", "ctet", "tet",
                "kvs", "prt", "reet", "dsssb", "fci", "sbi", "ug", "pdf",
                "mcq", "mcqs", "cbt", "chsl", "pcs", "wbpsc", "alp", "bpsc",
                "uppsc", "rpsc", "mpsc", "aibe", "nda", "cds", "lic", "gic"}
    return " ".join(w.upper() if w.lower() in acronyms else w.capitalize() for w in words) or path


def _parse_gsc_date(d_str, default_days_ago):
    if not d_str:
        return (date.today() - timedelta(days=default_days_ago)).isoformat()
    if d_str == "today":
        return date.today().isoformat()
    if d_str.endswith("daysAgo"):
        try:
            return (date.today() - timedelta(days=int(d_str.replace("daysAgo", "")))).isoformat()
        except Exception:
            pass
    return d_str


# ─── Realtime ─────────────────────────────────────────────────────────────────

_GLOBAL_URL_MAP: dict = {}
_url_map_lock = threading.Lock()
_URL_MAP_MAX = 50_000


def _url_map_update(entries: dict):
    """Thread-safe bulk update with insertion-order eviction when over cap."""
    with _url_map_lock:
        _GLOBAL_URL_MAP.update(entries)
        if len(_GLOBAL_URL_MAP) > _URL_MAP_MAX:
            overflow = len(_GLOBAL_URL_MAP) - _URL_MAP_MAX
            for key in list(_GLOBAL_URL_MAP.keys())[:overflow]:
                del _GLOBAL_URL_MAP[key]


def _fetch_realtime_total(prop_id: str) -> int:
    """Fetch just the total active user count for one property."""
    client = _get_ga4_client()
    try:
        resp = client.run_realtime_report(RunRealtimeReportRequest(
            property=f"properties/{prop_id}",
            metrics=[Metric(name="activeUsers")],
            limit=1,
        ))
        return int(resp.rows[0].metric_values[0].value) if resp.rows else 0
    except Exception as e:
        logger.error("Realtime total error for %s: %s", prop_id, e)
        return 0


def _fetch_realtime_pages(prop_id: str) -> list:
    """Fetch per-page active users for one property, with URL resolution."""
    brand = PROPERTY_BRANDS.get(prop_id, "Unknown")
    domain = PROPERTY_DOMAINS.get(prop_id, "")
    client = _get_ga4_client()
    pages = []
    unresolved = []
    try:
        resp = client.run_realtime_report(RunRealtimeReportRequest(
            property=f"properties/{prop_id}",
            dimensions=[Dimension(name="unifiedScreenName")],
            metrics=[Metric(name="activeUsers")],
            limit=30,
        ))
        for row in resp.rows:
            page_name = row.dimension_values[0].value
            users = int(row.metric_values[0].value)
            if page_name in ("(not set)", "", "/", "(other)"):
                continue
            mapped_url = _GLOBAL_URL_MAP.get(page_name.strip().lower(), "")
            if not mapped_url:
                clean = page_name.split("-")[0].split("|")[0].strip().lower()
                mapped_url = _GLOBAL_URL_MAP.get(clean, "")
            pages.append({"title": page_name, "url": mapped_url, "activeUsers": users, "brand": brand})
            if not mapped_url:
                unresolved.append(page_name)

        if unresolved:
            url_resp = client.run_report(RunReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="pageTitle"), Dimension(name="pagePath")],
                metrics=[Metric(name="screenPageViews")],
                date_ranges=[DateRange(start_date="7daysAgo", end_date="today")],
                limit=1000,
            ))
            local_map = {}
            for r in url_resp.rows:
                t = r.dimension_values[0].value
                path = r.dimension_values[1].value
                if t and t != "(not set)":
                    full_url = f"{domain}{path}"
                    local_map[t.strip().lower()] = full_url
                    clean = t.split("-")[0].split("|")[0].strip().lower()
                    if clean:
                        local_map[clean] = full_url
            _url_map_update(local_map)
            extra = {}
            for p in pages:
                if not p["url"]:
                    key = p["title"].strip().lower()
                    p["url"] = local_map.get(key, "")
                    if not p["url"]:
                        clean = p["title"].split("-")[0].split("|")[0].strip().lower()
                        p["url"] = local_map.get(clean, "")
                    if p["url"]:
                        extra[key] = p["url"]
            if extra:
                _url_map_update(extra)
    except Exception as e:
        logger.error("Realtime pages error for %s: %s", prop_id, e)
    return pages


def fetch_realtime_data(brand_filter: str = None) -> dict:
    """All properties in parallel — total and pages fetched simultaneously per property."""
    prop_ids = _get_property_ids(brand_filter)
    total_active = 0
    all_pages = []

    # Submit total + pages as separate futures for every property at once —
    # 2N futures instead of N sequential-pair calls, cutting wall-clock ~in half.
    all_futures = {}
    for pid in prop_ids:
        all_futures[SHARED_POOL.submit(_fetch_realtime_total, pid)] = ("total", pid)
        all_futures[SHARED_POOL.submit(_fetch_realtime_pages, pid)] = ("pages", pid)

    for future in as_completed(all_futures):
        kind, pid = all_futures[future]
        try:
            result = future.result()
            if kind == "total":
                total_active += result
            else:
                all_pages.extend(result)
        except Exception as e:
            logger.error("Realtime future failed (%s, %s): %s", kind, pid, e)

    all_pages.sort(key=lambda x: x["activeUsers"], reverse=True)
    return {"totalActive": total_active, "pages": all_pages[:30]}


def _fetch_realtime_minute_for_property(prop_id: str) -> dict:
    client = _get_ga4_client()
    minute_totals = {}
    try:
        resp = client.run_realtime_report(RunRealtimeReportRequest(
            property=f"properties/{prop_id}",
            dimensions=[Dimension(name="minutesAgo")],
            metrics=[Metric(name="activeUsers")],
            limit=30,
        ))
        for row in resp.rows:
            m = int(row.dimension_values[0].value)
            u = int(row.metric_values[0].value)
            minute_totals[m] = minute_totals.get(m, 0) + u
    except Exception as e:
        logger.error("Realtime per-minute error for %s: %s", prop_id, e)
    return minute_totals


def fetch_realtime_per_minute(brand_filter: str = None) -> list:
    """All properties in parallel — per-minute active users."""
    prop_ids = _get_property_ids(brand_filter)
    combined = {}

    futures = {SHARED_POOL.submit(_fetch_realtime_minute_for_property, pid): pid for pid in prop_ids}
    for future in as_completed(futures):
        try:
            for minute, users in future.result().items():
                combined[minute] = combined.get(minute, 0) + users
        except Exception as e:
            logger.error("Realtime per-minute future failed: %s", e)

    return [{"minute": m, "users": combined.get(m, 0)} for m in range(29, -1, -1)]


# ─── Articles (GA4 historical) ────────────────────────────────────────────────

def _fetch_articles_for_property(prop_id: str, start_date: str, end_date: str) -> list:
    brand = PROPERTY_BRANDS.get(prop_id, "Unknown")
    domain = PROPERTY_DOMAINS.get(prop_id, "")
    client = _get_ga4_client()
    results = []
    offset = 0
    page_size = 10000
    try:
        while True:
            response = client.run_report(RunReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="pagePath"), Dimension(name="pageTitle")],
                metrics=[
                    Metric(name="screenPageViews"),
                    Metric(name="activeUsers"),
                    Metric(name="averageSessionDuration"),
                    Metric(name="sessions"),
                    Metric(name="newUsers"),
                ],
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
                limit=page_size,
                offset=offset,
            ))
            for row in response.rows:
                page_path = row.dimension_values[0].value
                page_title = row.dimension_values[1].value
                if page_path in ("/", "/blog/", "/blog", "/articles/", "/articles"):
                    continue
                url = f"{domain}{page_path}"
                title = page_title if page_title and page_title != "(not set)" else _path_to_title(page_path)
                results.append({
                    "brand": brand, "domain": domain, "url": url, "title": title,
                    "pageViews": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                    "avgDuration": float(row.metric_values[2].value),
                    "sessions": int(row.metric_values[3].value),
                    "newUsers": int(row.metric_values[4].value),
                })
            offset += len(response.rows)
            if not response.rows or offset >= response.row_count:
                break
    except Exception as e:
        logger.error("GA4 fetch error for %s: %s", prop_id, e)
    return results


# ─── GSC Enrichment ───────────────────────────────────────────────────────────

def _fetch_gsc_site(site_url: str, start_dt: str, end_dt: str) -> list:
    service = _get_gsc_service()
    all_rows = []
    start_row = 0
    try:
        while True:
            response = service.searchanalytics().query(
                siteUrl=site_url,
                body={
                    "startDate": start_dt,
                    "endDate": end_dt,
                    "dimensions": ["page"],
                    "rowLimit": 1000,
                    "startRow": start_row,
                },
            ).execute()
            rows = response.get("rows", [])
            if not rows:
                break
            all_rows.extend(rows)
            start_row += len(rows)
            if len(rows) < 1000:
                break
        return all_rows
    except Exception as e:
        logger.error("GSC fetch error for %s: %s", site_url, e)
        return []


def _fetch_gsc_site_queries(site_url: str, start_dt: str, end_dt: str, row_limit: int) -> list:
    service = _get_gsc_service()
    try:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={"startDate": start_dt, "endDate": end_dt, "dimensions": ["query"], "rowLimit": row_limit},
        ).execute()
        return response.get("rows", [])
    except Exception as e:
        logger.error("GSC queries error for %s: %s", site_url, e)
        return []


def _build_gsc_map(site_urls: list, start_dt: str, end_dt: str) -> dict:
    """Fetch all GSC sites in parallel and merge into one url→metrics map."""
    gsc_map = {}
    futures = {SHARED_POOL.submit(_fetch_gsc_site, su, start_dt, end_dt): su for su in site_urls}
    for future in as_completed(futures):
        for row in future.result():
            url = row["keys"][0]
            parsed = urlparse(url)
            rel = parsed.path + (f"?{parsed.query}" if parsed.query else "")
            if rel not in gsc_map:
                gsc_map[rel] = {
                    "full_url": url, "clicks": int(row["clicks"]),
                    "impressions": int(row["impressions"]), "avgPosition": float(row["position"]),
                    "ctr": float(row["ctr"]), "count": 1,
                }
            else:
                gsc_map[rel]["clicks"] += int(row["clicks"])
                gsc_map[rel]["impressions"] += int(row["impressions"])
                gsc_map[rel]["avgPosition"] += float(row["position"])
                gsc_map[rel]["ctr"] += float(row["ctr"])
                gsc_map[rel]["count"] += 1
    return gsc_map


def _apply_gsc_map(articles: list, gsc_map: dict) -> list:
    """Enrich GA4 articles with GSC metrics. Does NOT append GSC-only rows —
    pages with 0 GA4 traffic are not useful for Top Pages or Opportunities."""
    if not gsc_map:
        return articles
    matched = 0
    for article in articles:
        parsed = urlparse(article["url"])
        rel = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        key = article["url"] if article["url"] in gsc_map else (rel if rel in gsc_map else None)
        if key:
            d = gsc_map[key]
            article.update({
                "clicks": d["clicks"],
                "impressions": d["impressions"],
                "avgPosition": round(d["avgPosition"] / d["count"], 1),
                "ctr": round((d["ctr"] / d["count"]) * 100, 2),
            })
            matched += 1
    logger.info("GSC: enriched %d/%d articles", matched, len(articles))
    return articles


def enrich_with_gsc(articles: list, start_date: str = None, end_date: str = None, brand_filter: str = None) -> list:
    site_urls = get_gsc_site_urls(brand_filter)
    if not site_urls:
        return articles
    start_dt = _parse_gsc_date(start_date, 31)
    end_dt = _parse_gsc_date(end_date, 3)
    gsc_map = _build_gsc_map(site_urls, start_dt, end_dt)
    return _apply_gsc_map(articles, gsc_map)  # no GSC-only rows appended


# ─── Sessions by Channel ──────────────────────────────────────────────────────

def fetch_sessions_by_channel(start_date="28daysAgo", end_date="today", brand_filter: str = None) -> list:
    prop_ids = _get_property_ids(brand_filter)
    channels = {}

    def _fetch_one(prop_id):
        client = _get_ga4_client()
        rows = []
        try:
            response = client.run_report(RunReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="sessionDefaultChannelGroup")],
                metrics=[Metric(name="sessions"), Metric(name="activeUsers")],
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=10,
            ))
            for row in response.rows:
                rows.append((row.dimension_values[0].value, int(row.metric_values[0].value), int(row.metric_values[1].value)))
        except Exception as e:
            logger.error("Channel fetch error for %s: %s", prop_id, e)
        return rows

    futures = {SHARED_POOL.submit(_fetch_one, pid): pid for pid in prop_ids}
    for future in as_completed(futures):
        for ch, sessions, users in future.result():
            if ch not in channels:
                channels[ch] = {"channel": ch, "sessions": 0, "users": 0}
            channels[ch]["sessions"] += sessions
            channels[ch]["users"] += users

    return sorted(channels.values(), key=lambda x: x["sessions"], reverse=True)


# ─── User Activity Timeline ───────────────────────────────────────────────────

def fetch_user_activity_timeline(start_date="28daysAgo", end_date="today", brand_filter: str = None) -> list:
    prop_ids = _get_property_ids(brand_filter)
    daily = {}

    def _fetch_one(prop_id):
        client = _get_ga4_client()
        rows = []
        try:
            response = client.run_report(RunReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="date")],
                metrics=[Metric(name="activeUsers"), Metric(name="sessions"), Metric(name="screenPageViews")],
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
            ))
            for row in response.rows:
                d = row.dimension_values[0].value
                rows.append((f"{d[:4]}-{d[4:6]}-{d[6:8]}", int(row.metric_values[0].value),
                              int(row.metric_values[1].value), int(row.metric_values[2].value)))
        except Exception as e:
            logger.error("Timeline fetch error for %s: %s", prop_id, e)
        return rows

    futures = {SHARED_POOL.submit(_fetch_one, pid): pid for pid in prop_ids}
    for future in as_completed(futures):
        for fmt, users, sessions, pv in future.result():
            if fmt not in daily:
                daily[fmt] = {"date": fmt, "users": 0, "sessions": 0, "pageViews": 0}
            daily[fmt]["users"] += users
            daily[fmt]["sessions"] += sessions
            daily[fmt]["pageViews"] += pv

    return sorted(daily.values(), key=lambda x: x["date"])


# ─── GSC Queries & Low CTR ────────────────────────────────────────────────────

def _aggregate_query_rows(rows_list: list) -> dict:
    agg = {}
    for rows in rows_list:
        for r in rows:
            q = r["keys"][0]
            if q not in agg:
                agg[q] = {"query": q, "clicks": 0, "impressions": 0, "position": 0.0, "count": 0}
            agg[q]["clicks"] += int(r["clicks"])
            agg[q]["impressions"] += int(r["impressions"])
            agg[q]["position"] += float(r["position"])
            agg[q]["count"] += 1
    return agg


def fetch_gsc_queries(brand_filter: str = None, start_date: str = None, end_date: str = None) -> list:
    site_urls = get_gsc_site_urls(brand_filter)
    if not site_urls:
        return []
    start_dt = _parse_gsc_date(start_date, 31)
    end_dt = _parse_gsc_date(end_date, 3)

    futures = {SHARED_POOL.submit(_fetch_gsc_site_queries, su, start_dt, end_dt, 30): su for su in site_urls}
    all_rows = [f.result() for f in as_completed(futures)]
    agg = _aggregate_query_rows(all_rows)

    for q in agg.values():
        q["position"] = round(q["position"] / q["count"], 1)
    return sorted(agg.values(), key=lambda x: x["clicks"], reverse=True)[:20]


def fetch_gsc_low_ctr_keywords(brand_filter: str = None, start_date: str = None, end_date: str = None) -> list:
    site_urls = get_gsc_site_urls(brand_filter)
    if not site_urls:
        return []
    start_dt = _parse_gsc_date(start_date, 31)
    end_dt = _parse_gsc_date(end_date, 3)

    futures = {SHARED_POOL.submit(_fetch_gsc_site_queries, su, start_dt, end_dt, 100): su for su in site_urls}
    all_rows = [f.result() for f in as_completed(futures)]
    agg = _aggregate_query_rows(all_rows)

    results = []
    for q in agg.values():
        impressions = q["impressions"]
        clicks = q["clicks"]
        q["ctr"] = round((clicks / impressions) * 100, 2) if impressions > 0 else 0.0
        q["position"] = round(q["position"] / q["count"], 1)
        results.append(q)

    return sorted(
        [q for q in results if q["ctr"] < 5.0 and q["impressions"] > 50],
        key=lambda x: x["impressions"], reverse=True
    )[:50]


# ─── Main Combined Fetch ──────────────────────────────────────────────────────

def fetch_all_data(start_date="30daysAgo", end_date="today", brand_filter: str = None) -> list:
    """
    GA4 articles + GSC data fetched in TRUE PARALLEL using the shared pool.
    No nested ThreadPoolExecutors — one pool does everything.
    """
    logger.info("Fetch: %s → %s | brand=%s", start_date, end_date, brand_filter)

    site_urls = get_gsc_site_urls(brand_filter)
    start_dt = _parse_gsc_date(start_date, 31)
    end_dt = _parse_gsc_date(end_date, 3)

    # Submit GA4 and all GSC site fetches simultaneously to the shared pool
    prop_ids = _get_property_ids(brand_filter)
    ga4_futures = {SHARED_POOL.submit(_fetch_articles_for_property, pid, start_date, end_date): ("ga4", pid)
                   for pid in prop_ids}
    gsc_futures = {SHARED_POOL.submit(_fetch_gsc_site, su, start_dt, end_dt): ("gsc", su)
                   for su in site_urls}
    all_futures = {**ga4_futures, **gsc_futures}

    # Collect results as they complete
    ga4_rows = []
    gsc_rows_by_site = []
    for future in as_completed(all_futures):
        kind, _ = all_futures[future]
        if kind == "ga4":
            ga4_rows.extend(future.result())
        else:
            gsc_rows_by_site.append(future.result())

    # Assemble articles from GA4 rows
    seen_urls = {}
    url_entries = {}
    for row in ga4_rows:
        url, title, domain, views = row["url"], row["title"], row["domain"], row["pageViews"]
        url_entries[title.strip().lower()] = url
        url_entries[_path_to_title(url.replace(domain, "")).strip().lower()] = url
        clean_t = title.split("-")[0].split("|")[0].strip().lower()
        if clean_t:
            url_entries[clean_t] = url
        if url in seen_urls:
            if views > seen_urls[url]["pageViews"]:
                seen_urls[url].update({
                    "pageViews": views, "users": row["users"], "avgDuration": row["avgDuration"],
                    "sessions": row["sessions"], "newUsers": row["newUsers"], "brand": row["brand"],
                })
            continue
        seen_urls[url] = {
            "id": _generate_id(url), "title": title, "url": url, "brand": row["brand"],
            "pageViews": views, "users": row["users"], "newUsers": row["newUsers"],
            "sessions": row["sessions"], "avgDuration": row["avgDuration"],
            "clicks": 0, "impressions": 0, "avgPosition": 0, "ctr": 0,
        }
    _url_map_update(url_entries)
    articles = sorted(seen_urls.values(), key=lambda a: a["pageViews"], reverse=True)
    logger.info("GA4: %d articles from %d properties", len(articles), len(prop_ids))

    # Build GSC map from collected rows
    gsc_map = {}
    for rows in gsc_rows_by_site:
        for row in rows:
            url = row["keys"][0]
            parsed = urlparse(url)
            rel = parsed.path + (f"?{parsed.query}" if parsed.query else "")
            if rel not in gsc_map:
                gsc_map[rel] = {
                    "full_url": url, "clicks": int(row["clicks"]),
                    "impressions": int(row["impressions"]), "avgPosition": float(row["position"]),
                    "ctr": float(row["ctr"]), "count": 1,
                }
            else:
                gsc_map[rel]["clicks"] += int(row["clicks"])
                gsc_map[rel]["impressions"] += int(row["impressions"])
                gsc_map[rel]["avgPosition"] += float(row["position"])
                gsc_map[rel]["ctr"] += float(row["ctr"])
                gsc_map[rel]["count"] += 1

    # Enrich GA4 articles only — no GSC-only rows (keeps response lean)
    return _apply_gsc_map(articles, gsc_map)
