---
name: Financial services modules
description: How AEPS/Recharge/Money Transfer access control and data are wired up
---

## Rule
Three financial modules (AEPS Withdrawal, Electric Recharge, Money Transfer) are gated by `canAccessFinancialServices` on the `UserProfile` Firestore document. Owners always have access; staff only get it when the owner explicitly grants it.

**Why:** These modules handle sensitive financial transactions. Not all staff should see them — the owner grants per-staff access from Settings → Staff Management.

**How to apply:**
- `AuthContext` exposes `canAccessFinancialServices: boolean` — true if `role === 'owner'` OR `userProfile.canAccessFinancialServices === true`.
- Each page checks this after all hooks and returns an `<AccessDenied />` screen if false.
- `Layout.tsx` hides the nav links using `financialOnly: true` flag on those nav items.
- Firestore rules use `canAccessFinancial()` helper that checks both role and the flag.
- `updateStaffPermissions(uid, bool)` in firestore.ts writes the flag.
- `createStaffAccount` accepts `canAccessFinancialServices = false` as the 5th param.

## Collections
- `aepsWithdrawals` — fields: customerName, bankName, mobile (optional), amount, createdAt, addedBy
- `electricRecharges` — fields: rechargeAmount, profitMargin, transferredToName, transferredToNumber, transferredAmount, createdAt, addedBy
- `moneyTransfers` — fields: senderName, senderMobile, recipientName, recipientNumber, transferAmount, commission, createdAt, addedBy

## Firestore rules reminder
Rules are in `firestore.rules`. Must be deployed via Firebase CLI or copy-pasted into Firebase Console → Firestore → Rules → Publish.
