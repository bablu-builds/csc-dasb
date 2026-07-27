---
name: Financial Services
description: AEPS, Recharge, Money Transfer — new Firestore collections and pages
---

# Financial Services

## Collections
- `aepsWithdrawals` — fields: customerName, bankName, mobile?, amount, profitMargin, createdAt, addedBy
- `electricRecharges` — fields: customerName, consumerNumber, mobile?, rechargeAmount, profitMargin, createdAt, addedBy
- `moneyTransfers` — fields: name, mobileOrAccount, amount, profitMargin, createdAt, addedBy

## Pages
- `/aeps` → `AepsPage.tsx`
- `/recharge` → `RechargePage.tsx`
- `/money-transfer` → `MoneyTransferPage.tsx`

## Access Gating
Navigation items are shown when `isOwner || canAccessFinancialServices`. Pages themselves do not have a ProtectedRoute guard — rely on the nav gate. If stricter protection is needed, add a redirect check in each page.

## Profit Calculation in Reports/Dashboard
Total profit = workProfit (earned - challan) + aepsProfit + rechargeProfit + transferProfit

**Why:** All three services use same pattern (form → Firestore → list + summary cards) for consistency.
