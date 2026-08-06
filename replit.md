# AZAAN CSC Management

A business management dashboard for AZAAN COMMUNICATION TOUR AND TRAVEL — tracks work entries, staff, payments, and financial services (AEPS withdrawals, electric recharges, money transfers).

## Stack

- **Frontend**: React + Vite + Tailwind CSS (shadcn/ui components)
- **Backend**: Express API server (admin operations) + Firebase (Firestore + Auth)
- **Workspace**: pnpm monorepo

## How to run

Two workflows run in parallel:

| Workflow | Command | Port |
|----------|---------|------|
| `artifacts/azaan-csc: web` | `pnpm --filter @workspace/azaan-csc run dev` | 5173 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

Both start automatically. The frontend proxies `/api` requests to the Express server.

## Required secrets

| Secret | Used by | Description |
|--------|---------|-------------|
| `VITE_FIREBASE_API_KEY` | Frontend | Firebase API key (Project Settings → Your apps → Web app → firebaseConfig → `apiKey`) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | API server | Firebase Admin SDK JSON key (Project Settings → Service accounts → Generate new private key). Required for staff password reset (`/api/admin/reset-staff-password`). |

The following Firebase config values are already set as env vars in `.replit`:
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Architecture

- `artifacts/azaan-csc/` — React/Vite frontend (port 5173)
- `artifacts/api-server/` — Express API server (port 8080); handles admin operations that require Firebase Admin SDK (e.g. staff password reset)
- Firebase Firestore — primary data store
- Firebase Auth — email/password authentication

## Role system

3-tier roles: **owner** / **manager** / **staff**. Managers auto-get financial access. See `.agents/memory/role-system.md` for details.

## User preferences
