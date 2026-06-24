"""
ga4_service.py — Unified Data Service
=======================================
GA4 = traffic data (what happens on the site)
GSC = search insights (how Google sees the same pages)

These are TWO VIEWS of the SAME article list, not additive datasets.
GA4 provides the article inventory. GSC enriches those articles with
search ranking data.

Supports:
- Realtime (live users right now)
- Historical reports with date range selection
- Sessions by channel
- User activity timeline
- GSC enrichment (clicks, impressions, position, queries)
"""

import os
import hashlib
from datetime import date, timedelta
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

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]

PROPERTY_BRANDS = {
    "332111738": "Career Power",
    "431779823": "Adda247 Exams",
    "352396958": "Career Power GA4",
}

PROPERTY_DOMAINS = {
    "332111738": "https://www.careerpower.in",
    "431779823": "https://www.adda247.com",
    "352396958": "https://www.careerpower.in",
}


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


def _get_ga4_client():
    return BetaAnalyticsDataClient(credentials=_build_credentials())


def _get_property_ids():
    raw = os.getenv("GA4_PROPERTY_ID", "")
    return [p.strip() for p in raw.split(",") if p.strip()]


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


# ─── Realtime (Today's Live Data) ─────────────────────────────────────────────

def fetch_realtime_data() -> dict:
    """
    Fetch current realtime stats: total active users + per-page breakdown.
    This is what shows on the landing page as "live now" data.
    """
    client = _get_ga4_client()
    total_active = 0
    pages = []

    for prop_id in _get_property_ids():
        brand = PROPERTY_BRANDS.get(prop_id, "Unknown")
        domain = PROPERTY_DOMAINS.get(prop_id, "")
        try:
            # Get total active users
            req = RunRealtimeReportRequest(
                property=f"properties/{prop_id}",
                metrics=[Metric(name="activeUsers")],
                limit=1,
            )
            resp = client.run_realtime_report(req)
            if resp.rows:
                total_active += int(resp.rows[0].metric_values[0].value)

            # Get per-page breakdown
            req2 = RunRealtimeReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="unifiedScreenName")],
                metrics=[Metric(name="activeUsers")],
                limit=25,
            )
            resp2 = client.run_realtime_report(req2)
            for row in resp2.rows:
                page_name = row.dimension_values[0].value
                users = int(row.metric_values[0].value)
                if page_name in ("(not set)", "", "/"):
                    continue
                pages.append({
                    "title": page_name,
                    "activeUsers": users,
                    "brand": brand,
                })
        except Exception as e:
            print(f"[Realtime Error] {prop_id}: {e}")

    pages.sort(key=lambda x: x["activeUsers"], reverse=True)
    return {"totalActive": total_active, "pages": pages[:30]}


def fetch_realtime_per_minute() -> list[dict]:
    """
    Fetch active users per minute for the last 30 minutes.
    Uses the 'minutesAgo' dimension from GA4 Realtime API.
    Returns: [{"minute": 0, "users": 120}, {"minute": 1, "users": 115}, ...]
    Sorted from oldest (29 min ago) to newest (0 = now).
    """
    client = _get_ga4_client()
    minute_totals = {}  # minute -> total users across all properties

    for prop_id in _get_property_ids():
        try:
            req = RunRealtimeReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="minutesAgo")],
                metrics=[Metric(name="activeUsers")],
                limit=30,
            )
            resp = client.run_realtime_report(req)
            for row in resp.rows:
                minute = int(row.dimension_values[0].value)
                users = int(row.metric_values[0].value)
                minute_totals[minute] = minute_totals.get(minute, 0) + users
        except Exception as e:
            print(f"[Realtime PerMinute Error] {prop_id}: {e}")

    # Build sorted list from 29 (oldest) to 0 (now)
    result = []
    for m in range(29, -1, -1):
        result.append({"minute": m, "users": minute_totals.get(m, 0)})

    return result


# ─── Historical Report (Configurable Date Range) ──────────────────────────────

def fetch_articles(start_date: str = "30daysAgo", end_date: str = "today") -> list[dict]:
    """
    Fetch article list from GA4 with traffic metrics.
    This is the PRIMARY data source — the article inventory.
    
    Each article = one unique page path with its GA4 metrics.
    """
    client = _get_ga4_client()
    seen_urls = {}  # Deduplicate across properties

    for prop_id in _get_property_ids():
        brand = PROPERTY_BRANDS.get(prop_id, "Unknown")
        domain = PROPERTY_DOMAINS.get(prop_id, "")
        try:
            request = RunReportRequest(
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
                limit=50,
            )
            response = client.run_report(request)
            for row in response.rows:
                page_path = row.dimension_values[0].value
                page_title = row.dimension_values[1].value
                views = int(row.metric_values[0].value)
                users = int(row.metric_values[1].value)
                avg_duration = float(row.metric_values[2].value)
                sessions = int(row.metric_values[3].value)
                new_users = int(row.metric_values[4].value)

                if page_path in ("/", "/blog/", "/blog", "/articles/", "/articles"):
                    continue

                url = f"{domain}{page_path}"
                title = page_title if page_title and page_title != "(not set)" else _path_to_title(page_path)

                # Deduplicate: if same URL from different property, keep the one with more views
                if url in seen_urls:
                    if views > seen_urls[url]["pageViews"]:
                        seen_urls[url].update({
                            "pageViews": views, "users": users,
                            "avgDuration": avg_duration, "sessions": sessions,
                            "newUsers": new_users, "brand": brand,
                        })
                    continue

                seen_urls[url] = {
                    "id": _generate_id(url),
                    "title": title,
                    "url": url,
                    "brand": brand,
                    "pageViews": views,
                    "users": users,
                    "newUsers": new_users,
                    "sessions": sessions,
                    "avgDuration": avg_duration,
                    # GSC fields (will be enriched later)
                    "clicks": 0,
                    "impressions": 0,
                    "avgPosition": 0,
                    "ctr": 0,
                }
        except Exception as e:
            print(f"[GA4 Error] {prop_id}: {e}")

    articles = list(seen_urls.values())
    articles.sort(key=lambda a: a["pageViews"], reverse=True)
    print(f"[GA4] {len(articles)} unique articles from {len(_get_property_ids())} properties")
    return articles


# ─── GSC Enrichment ────────────────────────────────────────────────────────────

def enrich_with_gsc(articles: list[dict], start_date: str = None, end_date: str = None) -> list[dict]:
    """
    Takes the GA4 article list and ENRICHES it with GSC search data.
    Same articles, additional perspective (how they perform in Google Search).
    """
    site_url = os.getenv("GSC_SITE_URL", "")
    if not site_url:
        return articles

    credentials = _build_credentials(scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    service = build("searchconsole", "v1", credentials=credentials)

    end_dt = end_date or (date.today() - timedelta(days=3)).isoformat()
    start_dt = start_date or (date.today() - timedelta(days=31)).isoformat()

    try:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={
                "startDate": start_dt,
                "endDate": end_dt,
                "dimensions": ["page"],
                "rowLimit": 200,
            },
        ).execute()
    except Exception as e:
        print(f"[GSC Error]: {e}")
        return articles

    # Build GSC lookup by URL
    gsc_map = {}
    for row in response.get("rows", []):
        url = row["keys"][0]
        gsc_map[url] = {
            "clicks": int(row["clicks"]),
            "impressions": int(row["impressions"]),
            "avgPosition": round(row["position"], 1),
            "ctr": round(row["ctr"] * 100, 2),  # percentage
        }

    # Enrich articles that have a GSC match
    matched = 0
    for article in articles:
        if article["url"] in gsc_map:
            article.update(gsc_map[article["url"]])
            matched += 1

    print(f"[GSC] Enriched {matched}/{len(articles)} articles with search data")
    return articles


# ─── Sessions by Channel ───────────────────────────────────────────────────────

def fetch_sessions_by_channel(start_date="28daysAgo", end_date="today") -> list[dict]:
    client = _get_ga4_client()
    channels = {}
    for prop_id in _get_property_ids():
        try:
            request = RunReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="sessionDefaultChannelGroup")],
                metrics=[Metric(name="sessions"), Metric(name="activeUsers")],
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=10,
            )
            response = client.run_report(request)
            for row in response.rows:
                ch = row.dimension_values[0].value
                if ch not in channels:
                    channels[ch] = {"channel": ch, "sessions": 0, "users": 0}
                channels[ch]["sessions"] += int(row.metric_values[0].value)
                channels[ch]["users"] += int(row.metric_values[1].value)
        except Exception as e:
            print(f"[Channel Error] {prop_id}: {e}")
    return sorted(channels.values(), key=lambda x: x["sessions"], reverse=True)


# ─── User Activity Timeline ───────────────────────────────────────────────────

def fetch_user_activity_timeline(start_date="28daysAgo", end_date="today") -> list[dict]:
    client = _get_ga4_client()
    daily = {}
    for prop_id in _get_property_ids():
        try:
            request = RunReportRequest(
                property=f"properties/{prop_id}",
                dimensions=[Dimension(name="date")],
                metrics=[Metric(name="activeUsers"), Metric(name="sessions"), Metric(name="screenPageViews")],
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
            )
            response = client.run_report(request)
            for row in response.rows:
                d = row.dimension_values[0].value
                formatted = f"{d[0:4]}-{d[4:6]}-{d[6:8]}"
                if formatted not in daily:
                    daily[formatted] = {"date": formatted, "users": 0, "sessions": 0, "pageViews": 0}
                daily[formatted]["users"] += int(row.metric_values[0].value)
                daily[formatted]["sessions"] += int(row.metric_values[1].value)
                daily[formatted]["pageViews"] += int(row.metric_values[2].value)
        except Exception as e:
            print(f"[Timeline Error] {prop_id}: {e}")
    return sorted(daily.values(), key=lambda x: x["date"])


# ─── GSC Queries ──────────────────────────────────────────────────────────────

def fetch_gsc_queries() -> list[dict]:
    site_url = os.getenv("GSC_SITE_URL", "")
    if not site_url:
        return []
    credentials = _build_credentials(scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    service = build("searchconsole", "v1", credentials=credentials)
    end_dt = (date.today() - timedelta(days=3)).isoformat()
    start_dt = (date.today() - timedelta(days=31)).isoformat()
    try:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={"startDate": start_dt, "endDate": end_dt, "dimensions": ["query"], "rowLimit": 20},
        ).execute()
    except Exception as e:
        print(f"[GSC Queries Error]: {e}")
        return []
    return [
        {"query": r["keys"][0], "clicks": int(r["clicks"]),
         "impressions": int(r["impressions"]), "position": round(r["position"], 1)}
        for r in response.get("rows", [])
    ]


# ─── Main Combined Fetch ──────────────────────────────────────────────────────

def fetch_all_data(start_date="30daysAgo", end_date="today") -> list[dict]:
    """
    1. Get article list from GA4 (the inventory)
    2. Enrich with GSC data (search insights for the same articles)
    Returns a single unified list — NOT additive.
    """
    print(f"[Fetch] Date range: {start_date} to {end_date}")
    articles = fetch_articles(start_date, end_date)
    articles = enrich_with_gsc(articles)
    return articles
