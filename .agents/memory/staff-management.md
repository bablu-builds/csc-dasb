---
name: Staff Management
description: Architecture of the staff management system — IDs, permissions, deactivation, and password reset
---

## staffId generation
`generateNextStaffId()` in `src/lib/firestore.ts` queries all users/{uid} docs with a staffId, finds the highest number, and returns the next (STAFF001, STAFF002, …). `backfillStaffIds()` patches existing staff/manager docs that lack one. Called on SettingsPage mount.

## Deactivation (isActive flag)
- `deactivateStaff(uid)` sets `isActive: false` + `deactivatedAt` timestamp on the Firestore doc.
- `reactivateStaff(uid)` sets `isActive: true` and deletes `deactivatedAt`.
- AuthContext's `onSnapshot` on `users/{uid}` detects `isActive === false` and calls `signOut()` + sets `sessionStorage.setItem('azaan_deactivated', '1')`.
- `consumeDeactivatedFlag()` (exported from AuthContext) reads and clears that flag.
- LoginPage calls `consumeDeactivatedFlag()` on mount to show the red banner.

## 4 granular permission booleans
Stored on the Firestore user doc:
- `canManageWork` — defaults true when absent (backward compat)
- `canAccessFinancialServices` — defaults false (opt-in)
- `canAccessQuickWork` — defaults false (opt-in, added this session)
- `canViewDeletedItems` — defaults true when absent (backward compat)

Managers (role === 'manager') automatically get all four as true, computed in AuthContext.
PermissionRoute in App.tsx gates /work/new, /work/:id/edit, /quick-work, /deleted, /aeps, /electric-recharge, /money-transfer.

## Password reset via API server
`POST /api/admin/reset-staff-password` — requires owner Firebase ID token + target uid + newPassword.
API server lazily inits Firebase Admin SDK from `FIREBASE_SERVICE_ACCOUNT_KEY` env var.
Returns 503 with a clear message if the secret is not configured.

**Why:** Firebase client SDK cannot change another user's password. Admin SDK is required. Service account JSON must be added as a single-line JSON string in Replit Secrets.

## File locations
- `src/lib/firestore.ts` — all Firestore helpers + UserProfile interface
- `src/contexts/AuthContext.tsx` — isActive detection, permission booleans, consumeDeactivatedFlag
- `src/components/ProtectedRoute.tsx` — PermissionRoute component
- `src/pages/SettingsPage.tsx` — full Staff tab (list, add form, edit dialog, reset password dialog, work stats)
- `artifacts/api-server/src/routes/admin.ts` — reset-staff-password endpoint
