import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services.ga4_service import fetch_all_data

articles = fetch_all_data("7daysAgo", "today", "Adda Exams")
print(f"Fetched {len(articles)} articles for Adda Exams")

matched = 0
for a in articles:
    if a["clicks"] > 0:
        matched += 1
        print(f"Matched: {a['title']} - Clicks: {a['clicks']} - URL: {a['url']}")

print(f"Total matched with >0 clicks: {matched}")

if matched == 0:
    print("NO MATCHES! Printing top 5 GA4 URLs:")
    for a in articles[:5]:
        print(f"GA4 URL: {a['url']}")

