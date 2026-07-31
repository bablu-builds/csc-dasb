# AZAAN CSC Management

A CSC (Common Service Centre) shop management dashboard for Azaan Communication Tour and Travel. Tracks work entries, manages staff, handles financial services (AEPS withdrawals, electricity recharges, money transfers), and generates reports.

## Stack

- **Frontend**: React + Vite + Tailwind CSS (shadcn/ui components), Wouter for routing
- **Backend**: Express API server (Node.js, used for admin operations like staff password reset)
- **Database**: Firebase Firestore (real-time data), Firebase Auth (authentication)
- **Monorepo**: pnpm workspace with artifacts in `artifacts/`

## Running the project

Both workflows must be running:

- **`artifacts/azaan-csc: web`** — Vite dev server for the frontend (`pnpm --filter @workspace/azaan-csc run dev`)
- **`artifacts/api-server: API Server`** — Express API server (`pnpm --filter @workspace/api-server run dev`)

## Environment variables / secrets

All Firebase config values are set in `.replit` under `[userenv.shared]` except:

| Key | Type | Notes |
|-----|------|-------|
| `VITE_FIREBASE_API_KEY` | Secret | Firebase web API key |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Secret | Firebase Admin SDK JSON — needed for the API server (staff password reset) |
| `SESSION_SECRET` | Secret | Express session secret |

## Key directories

- `artifacts/azaan-csc/src/` — React frontend source
  - `pages/` — route-level page components
  - `contexts/` — AuthContext (role system: owner / manager / staff)
  - `lib/` — Firebase client, services, utilities
- `artifacts/api-server/` — Express API server
- `lib/` — shared workspace libraries (api-spec, api-zod, db)
- `firestore.rules` — Firestore security rules (deploy via Firebase CLI or Firebase Console)

## User preferences

- Keep the existing project structure and stack — do not restructure or migrate.
