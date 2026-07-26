# AZAAN COMMUNICATION TOUR AND TRAVEL

A staff portal dashboard for managing customer work orders, tracking earnings, and handling pending/completed tasks for a travel and communication services agency.

## Run & Operate

- Frontend (`azaan-csc`) and API server start automatically via Replit workflows
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required secrets: `VITE_FIREBASE_API_KEY` — Firebase API key (already set)
- Other Firebase config (project ID, auth domain, etc.) are set as shared env vars in `.replit`

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS (shadcn/ui components)
- Auth & DB: Firebase Authentication + Firestore
- API: Express 5 (separate artifact at `/api`)
- Build: esbuild

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
