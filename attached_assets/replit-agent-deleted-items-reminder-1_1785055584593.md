Please add the following two features to my CSC shop management app (AZAAN CSC Management):

## 1. Deleted Items List (Soft Delete / Recycle Bin)

Currently, when a work entry is deleted, it is permanently removed. Please change this to a "soft delete" system instead:

1. When a user clicks delete on a work entry, do not permanently remove it from Firestore. Instead:
   - Set a field `isDeleted: true` on the document
   - Record a `deletedAt` timestamp (date and time of deletion)
2. Update all existing queries (Dashboard, All Work list, Pending Work, Reports, etc.) to exclude documents where `isDeleted` is true, so deleted items don't show up in normal views.
3. Add a new page/section called **"Deleted Items"** (accessible from Settings or the main navigation) that shows all entries where `isDeleted` is true, displaying:
   - Customer name, mobile number, category, amount, and the date it was deleted
   - Sorted with most recently deleted first
4. On the Deleted Items page, add one action for each entry:
   - **"Restore"** — sets `isDeleted` back to false and removes the `deletedAt` field, so the entry reappears in normal lists
   - Do NOT add a permanent delete option — all deleted entries should remain recoverable indefinitely on this page.
5. Keep this page simple and clearly labeled so shop staff understand these are recoverable deleted items.

## 2. In-App Daily Pending Work Reminder

Add a prominent reminder section that appears automatically when the app/dashboard is opened, showing today's pending work that needs attention:

1. On the Dashboard, add a section at the top called **"Today's Pending Reminders"** (or similar) that automatically shows:
   - All work entries with status "Pending" that are 3+ days old (highlighted in orange)
   - All work entries with status "Pending" that are 7+ days old (highlighted in red as urgent)
   - Any pending entries where the due amount is greater than 0
2. Sort this list with the oldest/most urgent pending items at the top.
3. For each item in this list, show: customer name, mobile number, category, how many days it's been pending, and due amount (if any).
4. Add a quick "Mark as Completed" button directly in this reminder list so staff can update status without navigating elsewhere.
5. If there are no urgent pending items, show a positive message like "No urgent pending work today — great job staying on top of things!"
6. This reminder section should always be the first thing visible on the Dashboard, above the summary stat cards.

## 3. Category-wise Pending Work Summary List

Add a section (on the Dashboard or Pending Work page — whichever fits better) that shows a breakdown of how much pending work remains in each work category:

1. Group all entries with status "Pending" by their Work Category (e.g., PAN Card, Aadhar Card, Voter ID, DL, Ration Card, etc.).
2. For each category, show a simple count: e.g., "PAN Card — 5 pending", "Voter ID Card — 3 pending", "Ration Card — 2 pending".
3. Sort this list from the category with the most pending work to the least.
4. Make each category row clickable — clicking it should filter/navigate to the Pending Work list already filtered to show only that category.
5. Display this as a clean list or small bar chart, whichever is simpler to implement well, so shop staff can see at a glance which type of work is piling up the most.

## Important Notes
- Do not change the underlying Firestore data structure in a way that breaks existing customer records — only add new fields as needed (`isDeleted`, `deletedAt`).
- Make sure existing entries without the `isDeleted` field are still treated as "not deleted" (so old data doesn't disappear after this update).
- Keep the UI clean and simple for non-technical shop staff.
