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
| `npm run test:e2e` | End-to-end tests (Playwright) against a production build on port 3100 |

Playwright uses the installed Google Chrome (`channel: "chrome"`), because its bundled
Chromium doesn't support macOS 13. Elsewhere, install Chrome with
`npx playwright install chrome`.
