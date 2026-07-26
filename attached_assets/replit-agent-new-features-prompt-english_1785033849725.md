# Replit Agent Prompt — Add New Features

Copy everything below and paste it into Replit Agent:

---

Please add the following two features to my existing CSC shop management app (AZAAN CSC Management):

## Feature 1: Timestamp Tracking (Created At / Completed At)

For every work/customer entry:

1. When a new work entry is created, automatically record the exact date and time it was created (e.g., "25 July 2026, 2:30 PM") and save it as a `createdAt` field. This should not be manually editable — it's set automatically.
2. When the status of a work entry changes from "Pending" to "Completed", automatically record the exact date and time of that change and save it as a `completedAt` field.
3. Show both `createdAt` and `completedAt` (if available) in:
   - The work entry detail/expanded view
   - The customer history view (so you can see when each of their past works was created and completed)
4. If a work item is still pending, only show `createdAt` and indicate "Still pending" instead of a completed timestamp.
5. Optionally show how long a task took to complete (difference between createdAt and completedAt) as a small label like "Completed in 2 days".

## Feature 2: Rejected / Refund Status

1. Add a third status option alongside the existing "Pending" and "Completed": **"Rejected"**.
2. When a user selects "Rejected" as the status for a work entry, show two additional optional fields that appear only when this status is selected:
   - **Rejection Reason** (short text field, optional) — e.g., "Wrong documents", "Customer cancelled"
   - **Refund Amount** (number field, ₹) — the amount being refunded to the customer
3. When a refund amount is entered, automatically adjust that customer's outstanding due amount to reflect the refund (reduce what they owe, or if they had already paid in full, track the refunded amount separately so it's clear money was returned).
4. Record a `rejectedAt` timestamp automatically when the status is changed to "Rejected", similar to how `completedAt` is tracked.
5. Rejected entries should remain visible in the main work/customer list (do not hide or delete them) — just show them with a distinct visual style, for example a red/grey badge saying "Rejected" instead of the green "Completed" or orange "Pending" badges.
6. On the Dashboard, add a new summary card: **"Rejected/Refunded Work"** showing the count of rejected entries and the total refund amount given.
7. On the Reports page, add a breakdown section showing total number of rejected entries and total refund amount, separate from the completed/earnings totals (so earnings reports aren't skewed by refunded work).

## General Notes
- Keep the existing labels consistent with the rest of the app's style and language.
- Make sure these changes work with the existing Firestore data structure — add new fields to documents rather than restructuring existing data, so existing customer records aren't broken.
- Keep the UI simple and clear for non-technical shop staff to use.

---

**To test after implementation, tell Replit:** "Add a test entry, mark it completed, then add another test entry and mark it as rejected with a refund amount, to confirm both new features work correctly."
