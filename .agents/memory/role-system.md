---
name: Role system & staff creation
description: How owner/staff roles work and how staff accounts are created without kicking out the owner
---

## Rule
Staff accounts are created via a temporary secondary Firebase app instance (`initializeApp(firebaseConfig, uniqueName)`), not the primary app. This prevents `createUserWithEmailAndPassword` from signing out the currently-logged-in owner.

**Why:** Firebase client SDK automatically signs in the newly created user after `createUserWithEmailAndPassword`. Using a named secondary app isolates this side effect. The secondary app is always deleted in a `finally` block.

**How to apply:** Any time you need to create a Firebase Auth user from an already-authenticated session (e.g., admin creating accounts), use the secondary app pattern in `createStaffAccount` in `firestore.ts` as the reference.

## Role detection
- On login, `AuthContext` fetches `users/{uid}` from Firestore.
- If document is missing AND no users collection exists → bootstrap as owner (first-time setup).
- If document is missing AND users collection exists → access revoked; sign out.
- Role is exposed as `role: 'owner' | 'staff' | null` via `useAuth()`.

## Revocation
Deleting the `users/{uid}` Firestore document. Firebase Auth account remains but the next login attempt detects a missing profile and signs the user out. No Firebase Admin SDK required.
