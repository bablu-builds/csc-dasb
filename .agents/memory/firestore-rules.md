---
name: Firestore rules deployment
description: How to apply the Firestore security rules in this project
---

## Rule
Security rules live in `firestore.rules` at the project root. `firebase.json` references them for CLI deployment.

**Why:** The app was originally set up to paste rules manually into the Firebase Console (see SETUP.md). The rules file was added during the role/RBAC feature build to make them version-controlled and deployable via CLI.

**How to apply:**
- Via Firebase CLI: `firebase deploy --only firestore:rules` (requires `firebase login` and the project set in `.firebaserc`)
- Or: copy the contents of `firestore.rules` and paste into Firebase Console → Firestore → Rules → Publish.

## What the rules protect
- `workEntries`: any authenticated user (owner or staff) can read/write
- `categories`, `settings`: any authenticated user can read; only owner can write
- `users`: any authenticated user can read; owner can create/update/delete; unauthenticated-but-first-time can create own doc (bootstrap)
