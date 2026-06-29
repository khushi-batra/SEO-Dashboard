# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Python / FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React / Vite)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5174
npm run build
npm run lint       # eslint
npm run preview    # preview production build
```

There are no automated tests. Debug/validation scripts live in `backend/test_*.py` and root-level `gsc_debug.py` / `debug_gsc_enrich.py` — run them directly with `python <file>`.

## Architecture

### Monorepo structure
```
backend/     Python FastAPI — serves all data via REST
frontend/    React + Vite — consumes backend at localhost:8000
```

Frontend API base is hardcoded to `http://localhost:8000` in `frontend/src/hooks/useArticles.js`.

### Data pipeline
All data originates from two Google APIs:
- **GA4** — article inventory, page views, users, session duration, channels, realtime active users
- **GSC** — clicks, impressions, position, CTR for the same articles

`ga4_service.py` is the entire data engine. `main.py` is thin routing + caching on top of it.

**Article enrichment flow:**
1. `fetch_all_data(start, end, brand)` — called for every `/api/articles` request
2. Fires all 12 GA4 property fetches in parallel via `SHARED_POOL` (ThreadPoolExecutor, 24 workers)
3. Deduplicates articles by URL across properties (same path can appear in multiple brands)
4. Fires all 6 GSC site fetches in parallel via the same `SHARED_POOL`
5. Merges GSC metrics into GA4 articles by URL path matching
6. GSC-only rows are excluded — only articles that already have GA4 traffic are returned

### Caching (main.py)
All expensive fetches go through `_async_cached_fetch(key, fetcher, *args)`:
- In-memory dict `_cache` with 1-hour TTL
- `_cache_in_flight` (key → `asyncio.Event`) prevents concurrent duplicate fetches
- Cache keys follow the pattern `{endpoint}_{startDate}_{endDate}_{brand|all}`
- On startup, 7 common cache keys are warmed via `asyncio.create_task` (28d, 7d, today articles + channels + timeline + GSC queries + low CTR)
- `/api/realtime` uses a 50-second TTL (short-lived, polled every 55s from frontend)
- Cache can be cleared via `GET /api/cache/clear`

### Thread safety
Two clients exist with different threading strategies:
- **GA4 client** (`_ga4_client`): shared singleton, thread-safe, protected by `_client_lock` at init time only
- **GSC service** (`_thread_local.gsc_service`): per-thread instance via `threading.local()` — `googleapiclient` is **not** thread-safe; sharing one instance across threads corrupts SSL state

Never nest thread pools — all parallelism goes through the single `SHARED_POOL` in `ga4_service.py`. The `main.py` thread pool (`_thread_pool`, 20 workers) is only for running blocking service calls from the async event loop via `loop.run_in_executor`.

### Brand / property mapping
Defined in `ga4_service.py`:
- `PROPERTY_BRANDS` — GA4 property ID → brand display name
- `PROPERTY_DOMAINS` — GA4 property ID → canonical domain (for URL construction)
- `GSC_DOMAIN_BRAND_MAP` — GSC site URL → list of brand names it covers

Brand filtering (`?brand=<name>`) is applied at the property/site selection level in `_get_property_ids()` and `get_gsc_site_urls()`. `studyiq.com` is excluded from unfiltered (all-brand) GSC fetches by default.

### Frontend data flow
Four hooks in `frontend/src/hooks/useArticles.js` cover all data needs:
- `useArticles(dateOrRange, brand)` — GA4+GSC articles; supports preset ranges (`28days`, `7days`, etc.) and `{startDate, endDate}` custom ranges
- `useRealtime(brand, isActive)` — polls every 55s when the Realtime tab is active; supports manual refresh
- `useOverviewData(brand, range, isActive)` — fetches `/api/channels`, `/api/timeline`, `/api/gsc/queries` in parallel; only when Overview tab is active
- `useLowCTRData(brand, isActive)` — fetches `/api/gsc/low-ctr-keywords`; only when Low CTR tab is active

Tab-level lazy loading: `DashboardLayout.jsx` only renders a view (and thus triggers its hook) when that tab has been visited at least once.

### URL/path matching (GSC ↔ GA4)
GSC returns full URLs; GA4 returns page paths. Matching is done by path only (strips domain), handles `?query` params, and falls back to a fuzzy title-to-path conversion (`_path_to_title`) for realtime page names. The `_GLOBAL_URL_MAP` (title → URL) is populated during article fetches and reused for realtime resolution.

### Realtime page name resolution
GA4 Realtime API returns `unifiedScreenName` (page title, not path). These are resolved to full URLs by:
1. Exact lookup in `_GLOBAL_URL_MAP` (built from recent historical data)
2. Prefix/partial match fallback
3. If still unresolved: fires a live `run_report` for that property over the last 7 days to populate the map

### Theme system
Dark/light mode uses CSS custom properties on `:root` / `.dark` (toggled on `document.documentElement`). All color references in components use `var(--bg-primary)`, `var(--text-primary)`, etc. — never hardcoded Tailwind color classes for theme-sensitive colors. State persists in `localStorage` via `ThemeContext.jsx`.

## Environment setup

`backend/.env` (gitignored) must contain:
```
# Google service account fields
GOOGLE_SERVICE_ACCOUNT_TYPE=service_account
GOOGLE_PROJECT_ID=...
GOOGLE_PRIVATE_KEY_ID=...
GOOGLE_PRIVATE_KEY=...   # newline-escaped: \n not actual newlines
GOOGLE_CLIENT_EMAIL=...
GOOGLE_CLIENT_ID=...
GOOGLE_AUTH_URI=...
GOOGLE_TOKEN_URI=...
GOOGLE_AUTH_PROVIDER_CERT_URL=...
GOOGLE_CLIENT_CERT_URL=...
GOOGLE_UNIVERSE_DOMAIN=googleapis.com

# Comma-separated GA4 property IDs
GA4_PROPERTY_ID=431779823,355422738,...

# GSC site URLs (one per variable)
GSC_SITE_URL_1=https://www.careerpower.in/
GSC_SITE_URL_2=https://www.studyiq.com/
...
```

`GOOGLE_PRIVATE_KEY` must use `\n` literal (not real newlines). `ga4_service.py` calls `.replace("\\n", "\n")` at runtime.
