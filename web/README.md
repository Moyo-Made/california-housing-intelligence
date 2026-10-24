# Web: Next.js frontend

The interface for exploring the model. Built with Next.js 16 (App Router), TypeScript,
Tailwind CSS v4 and shadcn/ui (Radix).

## Setup

Requires Node 24 or later.

```bash
npm ci
cp .env.example .env.local   # BACKEND_URL points at the FastAPI service
npm run dev                  # http://localhost:3000
```

The API must be running for predictions (see `../api/README.md`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates Next route types, then runs `tsc --noEmit` |
| `npm test` | Unit and component tests (Vitest, React Testing Library, jsdom) |
| `npm run test:contract` | Contract tests against the real API (start it first; uses `BACKEND_URL`, default `http://127.0.0.1:8000`) |
| `npm run test:e2e` | End-to-end tests (Playwright) against a production build on port 3100 |

Playwright uses the installed Google Chrome (`channel: "chrome"`), because its bundled
Chromium doesn't support macOS 13. Elsewhere, install Chrome with
`npx playwright install chrome`.

## How predictions flow

`Browser → POST /api/predict (this app) → POST {BACKEND_URL}/predict (FastAPI)`

The route handler (`app/api/predict/route.ts`):
- validates the input and forwards only the eight features;
- keeps the API's address on the server;
- turns every failure into an `{ error: { kind, message, fields? } }` body with a safe message.

| Status | `kind` | Meaning |
|---|---|---|
| 200 | — | `{ "predicted_value_usd": number }`, unchanged from the API |
| 400 / 422 | `validation` | Body isn't JSON, or inputs are missing or out of range (`fields` says which) |
| 502 | `bad_response` | The API answered with something unexpected |
| 503 | `unavailable` | The API couldn't be reached or returned an error |
| 504 | `timeout` | The API took longer than 8 seconds |

Feature names, limits and training-data ranges live in `lib/housing/features.ts`. The
ranges come from `notebook/feature_stats.py`.

## Map data

`lib/geo/california-outline.json` is the California outline from the US Census Bureau's
cartographic boundary file (2023, 1:20m, public domain), simplified to about 1 km. Rebuild it
with `scripts/build_california_outline.py` (standard-library Python; usage is in the file).
A point counts as outside California only beyond 10 km from the outline: every location in
the training data is within 9.9 km, because the outline is simplified and the data rounds
coordinates.
