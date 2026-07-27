# AZAAN COMMUNICATION TOUR AND TRAVEL

A staff portal dashboard for managing customer work orders, tracking earnings, and handling pending/completed tasks for a travel and communication services agency.

## Run & Operate

- **Frontend** — workflow: `AZAAN CSC Frontend` → `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/azaan-csc run dev` (port 5173)
- **API Server** — workflow: `API Server` → `PORT=8080 pnpm --filter @workspace/api-server run dev` (port 8080)
- Both workflows start automatically; restart them after code changes
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required secrets: `VITE_FIREBASE_API_KEY` — Firebase API key (set as Replit Secret)
- Other Firebase config (project ID, auth domain, etc.) are set as shared env vars in `.replit`

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS (shadcn/ui components)
- Auth & DB: Firebase Authentication + Firestore
- API: Express 5 (separate artifact at `/api`)
- Build: esbuild

## Where things live

- `artifacts/azaan-csc/src/lib/firebase.ts` — Firebase init + exports `firebaseConfig` (needed for secondary app)
- `artifacts/azaan-csc/src/lib/firestore.ts` — All Firestore CRUD; UserProfile type; staff management functions
- `artifacts/azaan-csc/src/contexts/AuthContext.tsx` — Auth state + role (`owner`/`staff`) + userProfile
- `artifacts/azaan-csc/src/pages/SettingsPage.tsx` — Shop info, categories, and Staff Management (owner-only)
- `artifacts/azaan-csc/src/pages/DashboardPage.tsx` — Full view for owner; staff see pending + activity only (no income data)
- `artifacts/azaan-csc/src/pages/ReportsPage.tsx` — Owner-only; staff see a permission-denied screen
- `firestore.rules` — Firestore security rules (deploy via Firebase CLI: `firebase deploy --only firestore:rules`)

## Architecture decisions

- **Role system via Firestore `users` collection**: Each authenticated user has a `users/{uid}` doc with `role: 'owner' | 'staff'`. The very first user to log in is auto-created as owner (bootstrapUserProfile). All subsequent staff are created by the owner from Settings → Staff Management.
- **Secondary Firebase app for staff creation**: `createStaffAccount` in firestore.ts spins up a temporary named Firebase app instance to call `createUserWithEmailAndPassword` without interrupting the owner's session (standard client-side Firebase behavior would otherwise sign in as the new user).
- **`addedBy` field on work entries**: Set at creation time from the logged-in user's `displayName` in their Firestore profile. Excluded from `updateWorkEntry` type so it can never be overwritten. Displayed read-only in the edit page header and customer history modal.
- **Client-side role enforcement + Firestore rules**: UI hides restricted pages/sections, but Firestore security rules (`firestore.rules`) also enforce owner-only writes to `users` and `settings` collections as a backend safety net.
- **Staff revocation**: Deleting the `users/{uid}` Firestore doc. The Firebase Auth account remains but the app detects the missing profile on login and signs the user out immediately.

## Product

**AZAAN CSC** is a staff portal for a travel/communication services agency. Features:
- **Work entries**: create, edit, soft-delete, restore. Each entry tracks customer name, mobile, category, amounts (total/paid/due), status (Pending/Completed/Rejected), and who added it (`addedBy`).
- **Dashboard**: Pending reminders, urgent work tracker, recent activity. Owner also sees income summary cards (today/month earnings, due amount, customer count) and a 7-day earnings chart. Staff see the operational view only.
- **Reports**: Owner-only income analytics with daily/weekly/monthly tabs, category breakdown charts, and CSV export.
- **Role-based access**: Owner has full access. Staff can manage work entries but cannot see income data (Dashboard financial cards, Reports page) or Staff Management settings.
- **Staff Management** (Settings → Staff): Owner creates staff accounts directly (sets email + password, uses secondary Firebase app to preserve own session). Owner can revoke access or send password reset emails.
- **Role badge** in sidebar shows "Owner" or "Staff" next to the logged-in user's name.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
