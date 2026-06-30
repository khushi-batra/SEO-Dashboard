# Adda247 SEO Matrix

A centralized multi-blog SEO Dashboard that connects to GA4 and Google Search Console to provide real-time and historical performance data across Adda247's educational blog network.

## Architecture

```
SEO-Dashboard/
├── backend/     → Python (FastAPI) — serves GA4 + GSC data via REST API
├── frontend/    → React (Vite + Tailwind) — frontend dashboard
├── .gitignore
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Recharts, Lucide Icons |
| Backend | Python 3, FastAPI, Uvicorn |
| Data Sources | Google Analytics 4 (Data API), Google Search Console (API) |
| Auth | Service Account (credentials in `.env`, never committed) |

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python3 app.py
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5174

## Environment Variables

All credentials are stored in `backend/.env` (gitignored). Required variables:

- `GOOGLE_PROJECT_ID`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CLIENT_EMAIL`
- `GA4_PROPERTY_ID` — comma-separated property IDs
- `GSC_SITE_URL` — Google Search Console site URL

## Blog Network

The dashboard supports data from these blogs:

- Adda Store (Main Site)
- Adda Exams
- Adda247 Jobs
- BankersAdda
- Career Power
- Current Affairs
- Engineering Adda
- Study IQ Main
- StudyIQ Articles
- Teaching Adda

## Dashboard Tabs

| Tab | Purpose |
|-----|---------|
| Realtime | Live active users, per-minute streaming chart, today's traffic |
| Overview | Last 28 days aggregated metrics, timeline, channels, top pages, queries |
| Top Pages | All articles sorted by page views with GSC enrichment |
| Opportunities | Pages in striking distance (position 5-20) |
| Low CTR | High impressions but low click-through rate |
| Monetization Gaps | High traffic but low engagement (bounce signal) |
| Brands | Filter by GA4 property/brand |
| Editor Queue | Action items based on engagement + CTR signals |

## Data Flow

```
GA4 Realtime API  ─┐
GA4 Data API      ─┼──→ FastAPI (Python) ──→ React Dashboard
GSC Search API    ─┘
```

- GA4 provides the article inventory + traffic metrics
- GSC enriches those same articles with search performance data
- No duplication — same articles viewed from two angles

## License

Internal tool — Adda247.
