import sys
import os
from urllib.parse import urlparse

gsc_urls = [
    "https://www.careerpower.in/blog/rrb-ntpc-graduate-result-2026-out",
    "https://www.careerpower.in/rrb-ntpc-city-intimation-slip.html",
    "https://www.bankersadda.com/sbi-po-previous-years-papers-download-pdfs/"
]

ga4_urls = [
    "https://www.careerpower.in/blog/rrb-ntpc-graduate-result-2026-out",
    "https://www.careerpower.in/rrb-ntpc-city-intimation-slip.html",
    "/sbi-po-previous-years-papers-download-pdfs/",
    "https://www.adda247.com/exams/ssc/ssc-gd-answer-key-2026-out/",
    "/exams/ssc/ssc-gd-answer-key-2026-out/"
]

gsc_map = {}
for url in gsc_urls:
    parsed = urlparse(url)
    relative_url = parsed.path
    if parsed.query:
        relative_url += "?" + parsed.query
    gsc_map[relative_url] = {"clicks": 100}
    print(f"GSC stored: {relative_url}")

print("\n--- MATCHING ---")
for article_url in ga4_urls:
    parsed = urlparse(article_url)
    rel_url = parsed.path
    if parsed.query:
        rel_url += "?" + parsed.query
    
    match_key = None
    if article_url in gsc_map:
        match_key = article_url
    elif rel_url in gsc_map:
        match_key = rel_url
    
    if match_key:
        print(f"Matched {article_url} with GSC {match_key}")
    else:
        print(f"FAILED to match {article_url} (tried {rel_url})")

