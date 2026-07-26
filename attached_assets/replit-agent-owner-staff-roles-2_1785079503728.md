Please add a role-based access control system to my CSC shop management app (AZAAN CSC Management), with two roles: "Owner" and "Staff". Also fix/replace the current broken OTP-based staff registration flow with a simple direct email + password system, where the Owner sets each staff member's login credentials directly (no OTP, no email link, no self-signup).

## 1. User Roles Structure

1. Create a Firestore collection called `users` (if it doesn't already exist) where each document represents a logged-in account, with fields:
   - `email`
   - `role` — either `"owner"` or `"staff"`
   - `createdAt`
   - `invitedBy` (the owner's email who created this staff account, for staff accounts)
2. The very first account (the shop owner, currently used to set up the app) should be assigned the `"owner"` role. If there's an existing single account already in use, set that one as `"owner"` by default.
3. All new accounts created afterward through the "Add Staff" flow should default to `"role": "staff"`.

## 2. What Owner Can See/Do (Full Access)
- Full access to everything: Dashboard, All Work, Pending Work, Deleted Items, Reports, Settings.
- Dashboard shows all summary cards: Today's Earning, Monthly Earning, Total Due Amount, Rejected/Refund summary, and the earnings trend chart.
- Reports page fully accessible, including custom date range reports.
- A new section in Settings called **"Staff Management"** where the owner can:
  - See a list of all staff accounts (email, date added, status)
  - Add a new staff member by entering their Name, Email, and a Password, then clicking "Create Staff Account"
  - Remove/revoke a staff member's access (this should disable their account or delete their `users` document so they can no longer log in)

## 3. What Staff Can See/Do (Restricted Access)
- Staff CAN see and access: All Work list (all customers, not just their own), Pending Work, Add/Edit work entries (including entering Total Amount, Paid Amount, and Due Amount per job — this is necessary for their daily work), Deleted Items (view/restore only).
- Staff CANNOT see: The Dashboard's aggregate income summary cards (Today's Earning, Monthly Earning, Total Due Amount trends, earnings chart) and the Reports page (with custom date range income reports). Hide these sections entirely from staff, or redirect them to a simplified view.
- Staff also cannot access "Staff Management" in Settings (only Owner can add/remove staff).
- If a staff member tries to directly navigate to a restricted page/URL, show a friendly "You don't have permission to view this page" message instead of the data.

## 4. Staff Account Creation Flow (Email + Password — Owner Sets Credentials Directly)

Replace the current broken OTP-based staff registration with a simple, direct email + password system. Both Owner and Staff log in using email and password (no link, no OTP, no email verification step required).

1. In "Staff Management" (Settings), the Owner fills a form with: Staff's Name, Email, and a Password (the Owner sets this password directly and can share it with the staff member however they prefer — verbally, on paper, etc.).
2. When the Owner clicks "Create Staff Account", create the new Firebase Authentication user with that email/password AND create a corresponding `users` Firestore document with `role: "staff"`.
3. IMPORTANT TECHNICAL DETAIL: Creating a new user via Firebase's client-side `createUserWithEmailAndPassword` automatically signs out the currently logged-in Owner and signs in as the newly created staff account — this is a known Firebase behavior that must be avoided. Implement this using a **secondary, temporary Firebase app instance** (initialize a second named Firebase app in code just for this user-creation operation, create the user through that secondary instance, then immediately sign out and delete that secondary instance) so the Owner's own session is never interrupted and they remain logged in as Owner throughout.
4. After creating a staff account, show the Owner a confirmation with the staff member's login email and a reminder that they should securely share the password with that staff member.
5. Allow the Owner to reset/change a staff member's password later from the Staff Management page if needed (e.g., using Firebase Admin capabilities or requiring the staff member to use "Forgot Password" if that's simpler to implement reliably).
6. Staff members log in on the same login page as the Owner, using their email and password — the app then checks their `role` in Firestore and routes them to the appropriate restricted view.

## 5. Security — Enforce This on the Backend, Not Just the UI

This is critical: role restrictions must be enforced in Firestore Security Rules, not just hidden in the frontend UI (since a technical user could otherwise bypass UI restrictions and access data directly).

1. Update Firestore security rules so that:
   - Only users with `role: "owner"` (checked via their `users` document) can read/write to any aggregated reports data or access certain report-only collections/fields if they exist separately.
   - Both `owner` and `staff` roles can read/write to the main `workEntries` collection (since staff need to manage work).
   - Only `owner` role can create, update, or delete documents in the `users` collection (so staff cannot promote themselves or add other staff).
2. Write these rules carefully and test them so legitimate staff actions still work, while restricted actions are blocked.

## 6. Track Who Added Each Work Entry (Non-Editable)

1. Whenever any logged-in user (Owner or Staff) creates a new work entry, automatically record who created it:
   - Save the creator's name (or email, whichever is more readable) as a field called `addedBy` on that work entry document, based on the currently logged-in user's account (not manually typed).
   - This should be set automatically at the moment of creation and must NOT be editable afterward by anyone — remove/hide this field from all edit forms so it can never be changed once set.
2. Display `addedBy` clearly in:
   - The work entry detail/expanded view (e.g., "Added by: Rahul")
   - The customer history view
   - Optionally as a small label/column in the All Work list (e.g., a subtle tag showing which staff member added it)
3. Both Owner and Staff should be able to see this "Added by" information for any entry (it is not restricted like the income reports are) — everyone can see who is responsible for adding each piece of work, but only the Owner sees the aggregate income summaries as described above.
4. This field is purely informational/accountability tracking — it should never block anyone (Owner or other Staff) from viewing, editing, or updating the actual work details (status, amount, etc.) of that entry. Only the "who added it" record itself is locked from editing.

## Important Notes
- Do not break the existing owner's login — make sure whoever is currently using the app can still log in normally and is treated as "owner".
- Keep the UI simple and clearly indicate which role is logged in (e.g., a small badge showing "Owner" or "Staff" near the logged-in user's name).
- Test the full flow: owner creates a staff account with email/password, owner remains logged in throughout (session not interrupted), staff can then log in separately using those credentials, staff can manage work entries but cannot see the Dashboard income summary or Reports page.
- Also test: staff adds a new work entry, confirm it shows "Added by: [staff name]" automatically, and confirm this field cannot be edited by anyone afterward, while all other fields on that entry remain fully editable by both Owner and Staff.
