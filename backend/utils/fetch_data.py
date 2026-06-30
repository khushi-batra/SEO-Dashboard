"""
fetch_data.py — GA4 & Google Search Console Data Fetcher
==========================================================
Securely fetches real-time data from GA4 and performance data from GSC.

Credentials are loaded from .env — no hardcoded secrets, no physical
service.json file written to disk.

Usage:
    cd backend
    python fetch_data.py

Requirements:
    pip install google-analytics-data google-api-python-client google-auth python-dotenv
"""

import os
import sys
from datetime import date, timedelta

from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunRealtimeReportRequest,
    Dimension,
    Metric,
)
from googleapiclient.discovery import build


# ─── STEP 1: Load environment variables ───────────────────────────────────────

load_dotenv()  # Reads from .env in the same directory


def get_env_or_fail(key: str) -> str:
    """Retrieve an env variable or exit with a clear error message."""
    value = os.getenv(key)
    if not value:
        print(f"❌ ERROR: Missing required environment variable: {key}")
        print("   Please check your .env file.")
        sys.exit(1)
    return value


# ─── STEP 2: Build credentials in memory (no file on disk) ────────────────────

def build_credentials(scopes: list[str]) -> Credentials:
    """
    Constructs a google.oauth2 Credentials object directly from
    environment variables. No service.json file touches the disk.
    """
    private_key = get_env_or_fail("GOOGLE_PRIVATE_KEY")
    # .env stores \n as literal two chars; we need actual newlines
    private_key = private_key.replace("\\n", "\n")

    credentials_info = {
        "type": get_env_or_fail("GOOGLE_SERVICE_ACCOUNT_TYPE"),
        "project_id": get_env_or_fail("GOOGLE_PROJECT_ID"),
        "private_key_id": get_env_or_fail("GOOGLE_PRIVATE_KEY_ID"),
        "private_key": private_key,
        "client_email": get_env_or_fail("GOOGLE_CLIENT_EMAIL"),
        "client_id": get_env_or_fail("GOOGLE_CLIENT_ID"),
        "auth_uri": get_env_or_fail("GOOGLE_AUTH_URI"),
        "token_uri": get_env_or_fail("GOOGLE_TOKEN_URI"),
        "auth_provider_x509_cert_url": get_env_or_fail("GOOGLE_AUTH_PROVIDER_CERT_URL"),
        "client_x509_cert_url": get_env_or_fail("GOOGLE_CLIENT_CERT_URL"),
        "universe_domain": os.getenv("GOOGLE_UNIVERSE_DOMAIN", "googleapis.com"),
    }

    credentials = Credentials.from_service_account_info(
        credentials_info, scopes=scopes
    )
    return credentials


# ─── STEP 3: GA4 Realtime Data Fetcher ────────────────────────────────────────

def fetch_ga4_realtime():
    """
    Connects to GA4 and fetches real-time active users per page path.
    Returns a list of dicts: [{"pagePath": "/...", "activeUsers": N}, ...]
    """
    print("\n" + "=" * 60)
    print("📊 GA4 REALTIME REPORT")
    print("=" * 60)

    property_id = get_env_or_fail("GA4_PROPERTY_ID")

    # GA4 Data API requires this specific scope
    scopes = ["https://www.googleapis.com/auth/analytics.readonly"]
    credentials = build_credentials(scopes)

    # Create the GA4 client
    client = BetaAnalyticsDataClient(credentials=credentials)

    # Build the realtime report request
    request = RunRealtimeReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="unifiedPagePathScreen")],
        metrics=[Metric(name="activeUsers")],
        limit=20,  # Top 20 pages by active users
    )

    try:
        response = client.run_realtime_report(request)
    except Exception as e:
        print(f"❌ GA4 API Error: {e}")
        return []

    # Parse the response
    results = []
    print(f"\n{'Page Path':<60} {'Active Users':>12}")
    print("-" * 74)

    for row in response.rows:
        page_path = row.dimension_values[0].value
        active_users = int(row.metric_values[0].value)
        results.append({"pagePath": page_path, "activeUsers": active_users})
        print(f"{page_path:<60} {active_users:>12}")

    if not results:
        print("   (No realtime data available)")

    print(f"\n✅ Total pages with active users: {len(results)}")
    return results


# ─── STEP 4: Google Search Console Data Fetcher ───────────────────────────────

def fetch_gsc_performance():
    """
    Connects to Google Search Console and fetches page-level performance
    data (impressions, clicks, position) for the last 7 days.
    Returns a list of dicts.
    """
    print("\n" + "=" * 60)
    print("🔍 GOOGLE SEARCH CONSOLE PERFORMANCE REPORT")
    print("=" * 60)

    site_url = get_env_or_fail("GSC_SITE_URL")

    # GSC uses the webmasters scope
    scopes = ["https://www.googleapis.com/auth/webmasters.readonly"]
    credentials = build_credentials(scopes)

    # Build the Search Console service
    service = build("searchconsole", "v1", credentials=credentials)

    # Date range: last 7 days (GSC data has ~3 day lag)
    end_date = date.today() - timedelta(days=3)
    start_date = end_date - timedelta(days=7)

    request_body = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "dimensions": ["page"],
        "rowLimit": 25,  # Top 25 pages
        "dimensionFilterGroups": [],
    }

    try:
        response = (
            service.searchanalytics()
            .query(siteUrl=site_url, body=request_body)
            .execute()
        )
    except Exception as e:
        print(f"❌ GSC API Error: {e}")
        return []

    # Parse the response
    results = []
    rows = response.get("rows", [])

    print(f"\nDate range: {start_date} to {end_date}")
    print(f"\n{'Page URL':<55} {'Clicks':>7} {'Impr':>8} {'Pos':>6}")
    print("-" * 80)

    for row in rows:
        page_url = row["keys"][0]
        clicks = int(row["clicks"])
        impressions = int(row["impressions"])
        position = round(row["position"], 1)

        results.append({
            "page": page_url,
            "clicks": clicks,
            "impressions": impressions,
            "position": position,
        })

        # Truncate long URLs for display
        display_url = page_url[:53] + ".." if len(page_url) > 55 else page_url
        print(f"{display_url:<55} {clicks:>7} {impressions:>8} {position:>6}")

    if not rows:
        print("   (No GSC data available for this date range)")

    print(f"\n✅ Total pages returned: {len(results)}")
    return results


# ─── STEP 5: Main execution ───────────────────────────────────────────────────

def main():
    """Run both data fetchers and display results."""
    print("\n🚀 Adda247 SEO Matrix — Data Fetch Script")
    print("   Loading credentials from .env (no secrets on disk)")
    print("   " + "-" * 45)

    # Verify critical env vars exist before making API calls
    get_env_or_fail("GOOGLE_CLIENT_EMAIL")
    get_env_or_fail("GOOGLE_PRIVATE_KEY")
    print("   ✅ Credentials loaded successfully")
    print(f"   📧 Service Account: {os.getenv('GOOGLE_CLIENT_EMAIL')}")
    print(f"   🏗️  Project: {os.getenv('GOOGLE_PROJECT_ID')}")

    # Fetch GA4 realtime data
    ga4_data = fetch_ga4_realtime()

    # Fetch GSC performance data
    gsc_data = fetch_gsc_performance()

    # Summary
    print("\n" + "=" * 60)
    print("📋 FETCH SUMMARY")
    print("=" * 60)
    print(f"   GA4 Realtime pages:  {len(ga4_data)}")
    print(f"   GSC Performance pages: {len(gsc_data)}")
    print(f"   Status: {'✅ All good' if ga4_data or gsc_data else '⚠️  No data returned'}")
    print()


if __name__ == "__main__":
    main()
