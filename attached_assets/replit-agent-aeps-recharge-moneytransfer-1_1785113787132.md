IMPORTANT FIX NEEDED: Currently, the "Electric Recharge" page has incorrectly merged fields from a Money Transfer feature into it (fields like "Transferred To — Name" and "Transferred To — Mobile/Account Number" are showing up inside the Recharge form, and there is no separate Money Transfer page at all). Please fix this by completely separating them into two distinct, independent pages as described below — Electric Recharge and Money Transfer must NOT share a form, list, or Firestore collection.

Please add three new modules to my CSC shop management app (AZAAN CSC Management): "AEPS Withdrawal", "Electric Recharge", and "Money Transfer", each as separate pages. Access to these modules should be restricted to the Owner plus only specific Staff members who are explicitly granted permission (not all staff automatically).

## 1. Granular Staff Permissions (Building on Existing Owner/Staff Roles)

1. On each staff member's `users` Firestore document, add a new field: `canAccessFinancialServices` (boolean, default `false` for all staff).
2. In the "Staff Management" page (Settings), when the Owner creates or edits a staff account, add a toggle/checkbox: **"Allow access to AEPS, Recharge & Money Transfer"**. When enabled, set `canAccessFinancialServices: true` for that staff member.
3. The Owner always has access to these modules regardless of this flag (Owner has full access to everything).
4. Only staff members with `canAccessFinancialServices: true` should see the "AEPS Withdrawal", "Electric Recharge", and "Money Transfer" options in the navigation menu. Staff without this permission should not see these links at all, and should be blocked (with a friendly "You don't have permission" message) if they try to access the URLs directly.
5. Enforce this at the Firestore Security Rules level too, not just in the UI — only Owner and staff with `canAccessFinancialServices: true` can read/write to the collections described below.

## 2. AEPS Withdrawal Page

Create a new page called "AEPS Withdrawal" with:

1. An "Add New Withdrawal" form with these fields:
   - Customer Name (text, required)
   - Bank Name (text, required) — the bank the customer withdrew money from (e.g., SBI, PNB, etc.)
   - Customer Mobile Number (text, optional — no required validation, can be left blank)
   - Withdrawal Amount (number, ₹, required)
   - Date & Time — automatically recorded at the moment of entry (not manually editable), similar to the existing `createdAt` timestamp pattern already used elsewhere in the app
   - Automatically record which staff member/owner added this entry (`addedBy` field, same non-editable pattern as used for work entries)
2. A list/table below showing all AEPS withdrawal entries, most recent first, with columns: Date & Time, Customer Name, Bank Name, Mobile Number, Withdrawal Amount, Added By.
3. Add a search bar (search by customer name, bank name, or mobile number) and a date range filter.
4. At the top of the page, show summary cards:
   - Today's Total Withdrawal Amount
   - This Month's Total Withdrawal Amount
   - Total number of withdrawal transactions today
5. Store this data in a new Firestore collection called `aepsWithdrawals`.

## 3. Electric Recharge Page

Create a new page called "Electric Recharge" with ONLY these fields — do NOT include any "Transferred To" or money-transfer-related fields here, that belongs in the separate Money Transfer module below:

1. An "Add New Recharge" form with these fields:
   - Customer Name (text, required)
   - Consumer Number (text, required) — the electricity consumer/account number being recharged
   - Mobile Number (text, optional — no required validation, can be left blank)
   - Recharge Amount (number, ₹, required) — the amount the customer paid for their electricity recharge
   - Profit Margin (number, ₹, required) — how much commission/profit was earned on this recharge
   - Date & Time — automatically recorded at the moment of entry (not manually editable)
   - Automatically record which staff member/owner added this entry (`addedBy` field, same non-editable pattern)
2. A list/table below showing all recharge entries, most recent first, with columns: Date & Time, Customer Name, Consumer Number, Mobile Number, Recharge Amount, Profit Margin, Added By.
3. Add a search bar (search by customer name, consumer number, or mobile number) and a date range filter.
4. At the top of the page, show summary cards:
   - Today's Total Recharge Amount
   - Today's Total Profit Margin Earned
   - This Month's Total Profit Margin Earned
5. Store this data in a new Firestore collection called `electricRecharges`.

## 4. Money Transfer Page — COMPLETELY SEPARATE PAGE, DO NOT MERGE WITH RECHARGE

Create a new page called "Money Transfer" as its own independent page (separate navigation link, separate form, separate list, separate Firestore collection) — this must NOT share a form or page with Electric Recharge. It has its own simple set of fields:

1. An "Add New Transfer" form with ONLY these fields:
   - Name (text, required) — the customer's name
   - Mobile Number / Account Number (text, required) — either the mobile number or account number used for the transfer
   - Amount (number, ₹, required) — the amount transferred
   - Profit Margin (number, ₹, required) — the commission/profit earned on this transfer
   - Date & Time — automatically recorded at the moment of entry (not manually editable)
   - Automatically record which staff member/owner added this entry (`addedBy` field, same non-editable pattern)
2. A list/table below showing all money transfer entries, most recent first, with columns: Date & Time, Name, Mobile/Account Number, Amount, Profit Margin, Added By.
3. Add a search bar (search by name or mobile/account number) and a date range filter.
4. At the top of the page, show summary cards:
   - Today's Total Transfer Amount
   - Today's Total Profit Margin Earned
   - This Month's Total Profit Margin Earned
5. Store this data in a new Firestore collection called `moneyTransfers`.

## 5. General Notes
- All three pages should follow the same visual design system already used throughout the rest of the app (consistent colors, spacing, card styles) so they feel like a natural part of the same product.
- Make sure amounts are formatted with the ₹ symbol and proper comma separators (e.g., ₹1,250).
- The `addedBy` field on all three modules (AEPS, Recharge, Money Transfer) should never be editable after creation, exactly like the existing work entry tracking — this is for accountability.
- These pages and their summary cards are only about AEPS/Recharge/Money Transfer activity — they should NOT be mixed into the main CSC work Dashboard or Reports (which track the regular Aadhar/PAN/certificate type work). Keep these as completely separate, independent modules with their own data and their own summaries.

## Important Notes
- Do not break any existing functionality (roles, work entries, reports) while adding this.
- Test the full flow: Owner grants "AEPS, Recharge & Money Transfer" access to a specific staff member, that staff member can now see and use all three new pages, while a different staff member without this permission cannot see or access them at all.
