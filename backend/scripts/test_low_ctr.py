import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services.ga4_service import fetch_gsc_low_ctr_keywords

try:
    data = fetch_gsc_low_ctr_keywords("all")
    print("Success. Found:", len(data))
except Exception as e:
    import traceback
    traceback.print_exc()
