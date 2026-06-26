import sys
import os
sys.path.append("/Users/adda247/Documents/GitHub/SEO-Dashboard/backend")
from ga4_service import fetch_gsc_low_ctr_keywords

try:
    data = fetch_gsc_low_ctr_keywords("all")
    print("Success. Found:", len(data))
except Exception as e:
    import traceback
    traceback.print_exc()
