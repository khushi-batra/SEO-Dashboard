import os, sys
from dotenv import load_dotenv
load_dotenv(override=True)

sys.path.insert(0, "/Users/adda247/Documents/GitHub/SEO-Dashboard/backend")
from ga4_service import _get_property_ids, PROPERTY_BRANDS

all_ids = _get_property_ids("all")
print("=== Properties included in 'all' realtime ===")
for pid in all_ids:
    print(f"  {pid} -> {PROPERTY_BRANDS.get(pid, 'Unknown')}")

print()
excluded_ids = [p for p in PROPERTY_BRANDS if p not in all_ids]
print("=== Properties EXCLUDED from 'all' ===")
for pid in excluded_ids:
    print(f"  {pid} -> {PROPERTY_BRANDS.get(pid, 'Unknown')}")
