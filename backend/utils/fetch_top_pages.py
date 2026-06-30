"""
Fetch top pages from GA4 property (last 30 days).
Loads credentials securely from .env — no hardcoded file paths.

Usage:
    cd backend
    python fetch_top_pages.py
"""
import os
import sys
from dotenv import load_dotenv
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest,
    Dimension,
    Metric,
    DateRange,
    OrderBy,
)

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]


def build_credentials():
    """Build credentials from .env variables (no JSON file needed)."""
    private_key = os.getenv("GOOGLE_PRIVATE_KEY", "")
    private_key = private_key.replace("\\n", "\n")

    if not private_key:
        print("❌ ERROR: GOOGLE_PRIVATE_KEY not found in .env")
        sys.exit(1)

    credentials_info = {
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
    }

    return service_account.Credentials.from_service_account_info(
        credentials_info, scopes=SCOPES
    )


def main():
    # Read property ID from .env
    property_id = os.getenv("GA4_PROPERTY_ID", "").replace("P", "")
    if not property_id:
        print("❌ ERROR: GA4_PROPERTY_ID not found in .env")
        sys.exit(1)

    credentials = build_credentials()
    client = BetaAnalyticsDataClient(credentials=credentials)

    print(f"\n🔄 Fetching top pages for GA4 property: {property_id}")
    print(f"   Service Account: {credentials.service_account_email}\n")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[
            Dimension(name="pagePath"),
            Dimension(name="pageTitle"),
        ],
        metrics=[
            Metric(name="screenPageViews"),
            Metric(name="activeUsers"),
            Metric(name="averageSessionDuration"),
        ],
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
        order_bys=[
            OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)
        ],
        limit=30,
    )

    try:
        response = client.run_report(request)
    except Exception as e:
        print(f"❌ GA4 API Error: {e}")
        sys.exit(1)

    print("=" * 100)
    print(f"TOP 30 PAGES (Last 30 Days) — Property ID: {property_id}")
    print("=" * 100)
    print(f"\n{'#':<4} {'Page Views':<12} {'Users':<10} {'Avg Duration':<14} {'Page Path'}")
    print("-" * 100)

    for i, row in enumerate(response.rows, 1):
        page_path = row.dimension_values[0].value
        page_title = row.dimension_values[1].value
        views = row.metric_values[0].value
        users = row.metric_values[1].value
        avg_duration = float(row.metric_values[2].value)

        minutes = int(avg_duration // 60)
        seconds = int(avg_duration % 60)
        duration_str = f"{minutes}m {seconds}s"

        print(f"{i:<4} {views:<12} {users:<10} {duration_str:<14} {page_path}")

    print(f"\n{'=' * 100}")
    print(f"Total rows returned: {response.row_count}")


if __name__ == "__main__":
    main()
