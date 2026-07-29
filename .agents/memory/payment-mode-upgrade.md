---
name: Payment Mode Upgrade
description: 4-option payment mode system (Cash/Online/Due/None) across all 5 entry types — implementation decisions and patterns
---

## What was built
All 5 entry types (WorkEntry, AepsWithdrawal, ElectricRecharge, MoneyTransfer, QuickActionEntry) now support 4 payment modes: Cash / Online / Due / None.

## Key types (src/lib/payments.ts)
- `PaymentMode` = 'Cash' | 'Online' | 'Due' | 'None'
- `SettlementMode` = 'Cash' | 'Online'  (subset — used for receiving payment)
- `PaymentStatus` = 'paid' | 'pending'
- `deriveStatus(mode)` → 'pending' for Due, 'paid' for all others
- `resolveStatus(status?)` → defaults missing/undefined to 'paid' (legacy-safe)

## Shared components
- `PaymentModeBadge` — 4-mode badge + settled indicator
- `PaymentModeSelector` — 4-button toggle with optional hints
- `MarkAsPaidDialog` — Cash/Online settlement dialog; calls `onConfirm(mode: SettlementMode)`

## WorkEntry specifics
- `paymentMode` is **intent-only** — existing `payments[]`/`paidAmount`/`dueAmount` logic untouched
- WorkEntryForm: Due → force paidAmount=0; None → ₹0 total+paid+challan, auto-Completed
- Edit mode: PaymentModeSelector hidden; paidAmount input hidden; due = totalAmount − Firestore paidAmount
- createWorkEntry: only creates initial PaymentRecord for Cash/Online (not Due/None)

## Simple entries (AEPS/Recharge/MoneyTransfer/QuickWork)
- `paymentStatus` auto-derived via `deriveStatus()` on create
- `settledVia / settledAt / settledBy` set by `settlePendingEntry()`
- "Mark Paid" button appears in list rows when `resolveStatus(paymentStatus) === 'pending'`

## settlePendingEntry (firestore.ts)
- Atomically: updateDoc(entry, {paymentStatus:'paid', settledVia, settledAt, settledBy}) + addDoc(paymentHistory)
- Works in both real Firestore and in-memory mock
- `paymentHistory` collection: entryType, entryId, amount, mode (SettlementMode), originalMode:'Due', settledAt, settledBy

## Dashboard
- "Total Pending Dues" card aggregates all 5 sources
- Earnings/profit exclude pending (Due) and free (None) entries — uses resolveStatus() filter

## Reports
- 4-way mode breakdown + pie chart per section
- "Due Settlements" table from subscribeToPaymentHistory()
- Settled dues counted under settlement mode (Cash/Online), NOT counted as Due again

**Why:** Legacy entries without paymentStatus default to 'paid' so old data shows correctly without migration.
