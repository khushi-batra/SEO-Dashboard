"""
Check which GA4 accounts/properties the service account has access to.
Loads credentials securely from .env — no hardcoded file paths.

Usage:
    cd backend
    python check_ga4_access.py
"""
import os
import sys
from dotenv import load_dotenv
from google.oauth2 import service_account
from google.analytics.admin import AnalyticsAdminServiceClient

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics",
]


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
    credentials = build_credentials()

    client = AnalyticsAdminServiceClient(credentials=credentials)

    print("=" * 60)
    print("Checking GA4 Account Access for:")
    print(f"  Service Account: {credentials.service_account_email}")
    print("=" * 60)

    # List all account summaries (accounts + properties)
    print("\n--- Account Summaries ---\n")

    found = False
    try:
        for summary in client.list_account_summaries():
            found = True
            print(f"Account: {summary.display_name}")
            print(f"  Account ID: {summary.account} (resource name)")
            print(f"  Properties:")
            for prop in summary.property_summaries:
                print(f"    - {prop.display_name}")
                print(f"      Property ID: {prop.property}")
            print()
    except Exception as e:
        print(f"Error listing account summaries: {e}")
        return

    if not found:
        print("No GA4 accounts/properties found for this service account.")
        print("\nMake sure you've added the service account email as a user")
        print("in GA4 Admin → Account Access Management or Property Access Management.")
        print(f"\nEmail to add: {credentials.service_account_email}")


if __name__ == "__main__":
    main()
