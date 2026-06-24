# SEO Dashboard — Frontend

React frontend for the Adda247 SEO Matrix dashboard.

## Setup

```bash
npm install
npm run dev      # starts on http://localhost:5174
npm run build    # production build
```

## Stack

- React 19 + Vite 8
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)
- react-datepicker (calendar)

## Structure

```
src/
├── components/    → DashboardLayout, MetricCard, ArticleTable, RealtimeAreaChart
├── views/         → OverviewCharts, RealtimeView, TopPages, OpportunityPages, etc.
├── hooks/         → useArticles, useRealtime
├── context/       → ThemeContext (dark/light mode)
└── data/          → mockSEOData (fallback only)
```

## Notes

- Fetches data from the Python backend at `http://localhost:8000`
- Fixed to port 5174 (`vite.config.js` → `strictPort: true`)
- Theme preference persists in localStorage
