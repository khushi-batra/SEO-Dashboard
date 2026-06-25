import os
from dotenv import load_dotenv
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunRealtimeReportRequest, Dimension, Metric

load_dotenv(override=True, dotenv_path='backend/.env')

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
    scopes=["https://www.googleapis.com/auth/analytics.readonly"]
)

client = BetaAnalyticsDataClient(credentials=credentials)

for pid in ["355432122", "355756324", "209760965"]:
    print(f"Testing {pid}...")
    try:
        req = RunRealtimeReportRequest(
            property=f"properties/{pid}",
            dimensions=[Dimension(name="unifiedScreenName")],
            metrics=[Metric(name="activeUsers")]
        )
        response = client.run_realtime_report(req)
        print(f"Success for {pid}! Rows: {len(response.rows)}")
    except Exception as e:
        print(f"Error for {pid}: {e}")

