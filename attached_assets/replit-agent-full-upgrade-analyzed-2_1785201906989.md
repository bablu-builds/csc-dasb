I want several upgrades across my CSC shop management app (AZAAN CSC Management). I've reviewed the current codebase — here is exactly what exists today and what needs to change. Please implement all of the following carefully, without breaking existing data.

## Current State (For Your Reference)
- Firestore collections: `users`, `workEntries`, `categories`, `aepsWithdrawals`, `electricRecharges`, `moneyTransfers`.
- `workEntries` currently has: `totalAmount`, `paidAmount`, `dueAmount` (calculated), `refundAmount` (for rejected status), `status`, `category`, `createdAt`, `completedAt`, `addedBy`, etc.
- `aepsWithdrawals` currently has: `customerName`, `bankName`, `mobile` (optional), `amount`, `createdAt`, `addedBy` — it does NOT have a profit margin field yet.
- `electricRecharges` currently has: `customerName`, `consumerNumber`, `mobile` (optional), `rechargeAmount`, `profitMargin`, `createdAt`, `addedBy`.
- `moneyTransfers` currently has: `name`, `mobileOrAccount`, `amount`, `profitMargin`, `createdAt`, `addedBy`.
- Role system already exists: `users` collection has `role: 'owner' | 'staff'` and `canAccessFinancialServices` (boolean) which gates access to AEPS/Recharge/Money Transfer pages.

## 1. Add Profit Margin to AEPS Withdrawal

1. Add a new field `profitMargin` (number, ₹, required) to the "Add New Withdrawal" form on the AEPS Withdrawal page — this is the commission/profit earned by the shop on that withdrawal, same pattern as the `profitMargin` field already used in Electric Recharge and Money Transfer.
2. Add this field to the `aepsWithdrawals` Firestore documents going forward, and display it as a new column in the AEPS list/table.
3. Add a new summary card on the AEPS page: "Today's Total Profit Margin" and update/add a "This Month's Profit Margin" card as well, consistent with how Recharge and Money Transfer already show profit margin summaries.
4. Existing AEPS entries without this field should simply be treated as `profitMargin: 0` for reporting purposes — do not break old data.

## 2. Work Entry — Add Challan Amount + Payment History (Multiple Payments)

### 2a. Challan Amount Field
1. Add a new field `challanAmount` (number, ₹, optional, default 0) to the work entry form — this represents the government fee/challan amount paid for that specific service (e.g., the fee submitted to the government portal for a certificate), which is a cost to the shop, separate from what the customer pays.
2. Show `challanAmount` in the work entry detail view and in the customer history view. It should be editable (unlike `addedBy`).

### 2b. Payment History (Support Multiple/Partial Payments)
Currently a work entry only stores a single `paidAmount` number. Change this to support multiple payments over time (since customers sometimes pay in installments):

1. Add a `payments` array field on each work entry document, where each payment record contains:
   - `amount` (number, ₹)
   - `paidAt` (timestamp, automatically recorded at the moment the payment is added — not manually editable)
   - `addedBy` (the name/email of the staff member or owner who recorded that specific payment, automatically set based on who is logged in when they add it — not manually editable)
2. When a work entry is first created, whatever amount is entered in the initial "Paid Amount" field should become the first entry in this `payments` array automatically.
3. On the work entry detail/expanded view, add an **"Add Payment"** button that opens a small form to record an additional payment (just an amount field — date/time and staff are automatic). This should be usable at any time after creation, for both Owner and Staff.
4. Display the full Payment History as a list on the work entry detail view, showing each payment's amount, date & time, and which staff member/owner recorded it.
5. The work entry's overall `paidAmount` should now be automatically calculated as the sum of all entries in the `payments` array (keep this field in sync/updated whenever a payment is added, so existing dues/reports logic that reads `paidAmount` continues to work without needing to be rewritten everywhere).
6. `dueAmount` continues to be calculated as `totalAmount - paidAmount` (sum of payments), unchanged from current logic.
7. For backward compatibility: existing work entries that only have the old single `paidAmount` number (no `payments` array yet) should be treated as having one legacy payment entry equal to that `paidAmount` value with no specific timestamp/staff recorded (label it as "Initial payment" with the entry's original `createdAt` date if no better data is available) — do not lose or corrupt any existing due-amount calculations.

## 3. Reports Page — Major Upgrade

Expand the Reports page significantly to include multiple report types, organized as tabs or sections:

### 3a. Profit Report
- Show overall shop profit combining: (work entries' collected amount minus challan amounts spent) + AEPS profit margins + Electric Recharge profit margins + Money Transfer profit margins, for a selected time period (today / this month / custom date range).
- Break this down visually so it's clear how much profit came from each source (Work/Certificates, AEPS, Recharge, Money Transfer).

### 3b. Challan Report
- Show total challan amount spent across work entries for a selected time period, broken down by work category (e.g., "PAN Card — ₹450 in challans this month").
- Show a simple table listing individual entries with challan amounts, sortable/filterable by date range and category.

### 3c. Section-wise (Category-wise) Report
- Show a breakdown of all work entries grouped by Work Category, showing for each category: number of entries, total amount collected, total challan spent, and net profit for that category — for a selected time period.

### 3d. AEPS Report
- Total withdrawals processed, total withdrawal amount, and total profit margin earned from AEPS, for a selected time period, with a simple trend view (e.g., daily totals over the selected range).

### 3e. Money Transfer Report
- Total transfers processed, total transfer amount, and total profit margin earned from Money Transfer, for a selected time period.

### 3f. Recharge Report
- Total recharges processed, total recharge amount, and total profit margin earned from Electric Recharge, for a selected time period.

### 3g. Profit Margins Summary Section
- A consolidated section (could be at the top of the Reports page) showing total profit margin earned across ALL sources (Work challan-based profit + AEPS + Recharge + Money Transfer combined) for today, this month, and a custom date range — this is the single most important "how much did we actually profit" number for the Owner.

### General Reports Requirements
- All reports should support filtering by a custom date range (in addition to quick "Today" / "This Month" presets).
- All reports remain Owner-only, exactly like the existing Reports page access restriction (Staff cannot see this page, consistent with the existing role system).
- Keep the visual design consistent with the rest of the app (cards, charts, tables matching the existing style).
- Add a CSV export option for each report type if feasible, so the Owner can download the data.

## 4. Owner Dashboard — Upgrade

Upgrade the Owner's Dashboard to incorporate all these new revenue streams, not just CSC work income:

1. Add new summary cards (alongside the existing Today's Earning, Monthly Earning, Pending Work, Due Amount, Rejected/Refund cards) for:
   - Today's Total Profit Margin (combined from Work challan-profit + AEPS + Recharge + Money Transfer)
   - This Month's Total Profit Margin (same combined calculation)
2. Add a small breakdown widget showing today's activity across all modules at a glance: e.g., "X Work Entries, Y AEPS Withdrawals, Z Recharges, W Transfers" with their respective amounts.
3. Update the existing earnings trend chart (or add a new one) to optionally show combined profit trend across all sources over the last 7-30 days, not just CSC work earnings.
4. Ensure all of this remains visible only to the Owner — Staff should continue to see only the "Today's Pending Reminders" and their permitted work management tools, not these financial summaries, consistent with the existing role restrictions already in place.

## Important Notes
- Do not break any existing functionality — the app currently has working role-based access (Owner/Staff), AEPS/Recharge/Money Transfer pages, timestamp tracking, rejected/refund status, and deleted items recovery. All of this must continue to work.
- Make sure Firestore Security Rules are updated if needed so that the new fields (`profitMargin` on AEPS, `challanAmount` and `payments` on work entries) follow the same access rules as their parent documents.
- Test thoroughly: add a work entry with an initial payment, then add a second partial payment later, and confirm the payment history displays correctly and the due amount updates correctly. Also add an AEPS withdrawal with a profit margin, and confirm it now appears correctly in the new Reports and Dashboard profit totals.
