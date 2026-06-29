import os
from dotenv import load_dotenv
load_dotenv(override=True)
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, Dimension, Metric, DateRange, OrderBy

def _build_credentials():
    return service_account.Credentials.from_service_account_info({
        "type": os.getenv("GOOGLE_SERVICE_ACCOUNT_TYPE", "service_account"),
        "project_id": os.getenv("GOOGLE_PROJECT_ID"),
        "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n"),
        "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "token_uri": os.getenv("GOOGLE_TOKEN_URI"),
    }, scopes=["https://www.googleapis.com/auth/analytics.readonly"])

client = BetaAnalyticsDataClient(credentials=_build_credentials())

req = RunReportRequest(
    property="properties/431779823",
    dimensions=[Dimension(name="pagePath"), Dimension(name="pageTitle")],
    metrics=[Metric(name="screenPageViews")],
    date_ranges=[DateRange(start_date="today", end_date="today")],
    order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
    limit=5,
)
resp = client.run_report(req)
for row in resp.rows:
    print(row.dimension_values[1].value, "->", row.dimension_values[0].value)
