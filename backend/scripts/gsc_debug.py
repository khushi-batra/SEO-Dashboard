import os
from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import date, timedelta
from urllib.parse import urlparse

load_dotenv(override=True, dotenv_path='backend/.env')

def get_gsc_site_urls():
    urls = []
    for k, v in os.environ.items():
        if k.startswith("GSC_SITE_URL") and v.strip():
            urls.append(v.strip())
    return urls

credentials = service_account.Credentials.from_service_account_info(
    {
        "type": os.getenv("GOOGLE_SERVICE_ACCOUNT_TYPE"),
        "project_id": os.getenv("GOOGLE_PROJECT_ID"),
        "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("GOOGLE_PRIVATE_KEY").replace("\\n", "\n"),
        "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "auth_uri": os.getenv("GOOGLE_AUTH_URI"),
        "token_uri": os.getenv("GOOGLE_TOKEN_URI"),
        "auth_provider_x509_cert_url": os.getenv("GOOGLE_AUTH_PROVIDER_CERT_URL"),
        "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_CERT_URL"),
    },
    scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
)

service = build("searchconsole", "v1", credentials=credentials)
end_dt = (date.today() - timedelta(days=3)).isoformat()
start_dt = (date.today() - timedelta(days=31)).isoformat()

site_urls = get_gsc_site_urls()
print(f"Testing GSC for URLs: {site_urls}")

for site_url in site_urls:
    try:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={
                "startDate": start_dt,
                "endDate": end_dt,
                "dimensions": ["page"],
                "rowLimit": 5,
            },
        ).execute()
        rows = response.get("rows", [])
        print(f"\nSuccess for {site_url}! Got {len(rows)} rows.")
        for r in rows:
            print(f"  URL: {r['keys'][0]} | Clicks: {r['clicks']}")
    except Exception as e:
        print(f"\nError for {site_url}: {e}")

