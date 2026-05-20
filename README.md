# Tasks Dashboard

Next.js dashboard for the Homeland Group ASAP project-management database. Shows all tasks across projects with KPIs, charts, a filterable table, and a project → tower → area → sub-area drill-down.

## Environment variables (optional)
- `POSTGREST_URL` — defaults to `https://asap.homelandgroup.org/api/db`
- `POSTGREST_TOKEN` — readonly bearer. A baked-in fallback exists; override in Vercel if you rotate.

## Run locally
```
npm install
npm run dev
```
