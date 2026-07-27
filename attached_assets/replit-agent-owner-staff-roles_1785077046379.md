Please add a role-based access control system to my CSC shop management app (AZAAN CSC Management), with two roles: "Owner" and "Staff". Also fix/replace the current staff registration flow to use Firebase's passwordless email-link sign-in instead of the current broken OTP system.

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
  - Add a new staff member by entering their email address and clicking "Send Invite"
  - Remove/revoke a staff member's access (this should disable their account or delete their `users` document so they can no longer log in)

## 3. What Staff Can See/Do (Restricted Access)
- Staff CAN see and access: All Work list (all customers, not just their own), Pending Work, Add/Edit work entries (including entering Total Amount, Paid Amount, and Due Amount per job — this is necessary for their daily work), Deleted Items (view/restore only).
- Staff CANNOT see: The Dashboard's aggregate income summary cards (Today's Earning, Monthly Earning, Total Due Amount trends, earnings chart) and the Reports page (with custom date range income reports). Hide these sections entirely from staff, or redirect them to a simplified view.
- Staff also cannot access "Staff Management" in Settings (only Owner can add/remove staff).
- If a staff member tries to directly navigate to a restricted page/URL, show a friendly "You don't have permission to view this page" message instead of the data.

## 4. Staff Invite Flow (Using Firebase Email Link Sign-In — Passwordless)

Replace the current broken OTP-based staff registration with Firebase's built-in passwordless email link authentication:

1. When the Owner adds a new staff member by email in "Staff Management", trigger Firebase's `sendSignInLinkToEmail` function to send that email address a secure sign-in link.
2. The staff member receives an email with a "Click here to access your account" link (this is Firebase's own reliable email delivery — no third-party email service needed).
3. When the staff member clicks the link, they should be signed in automatically and land on their staff dashboard. Handle the `isSignInWithEmailLink` and `signInWithEmailLink` flow correctly, including verifying the email matches what was stored, so this works even if opened on a different device.
4. Create a corresponding `users` document with `role: "staff"` for this account as soon as the sign-in completes for the first time.
5. Make sure this whole flow works reliably and test that the email link actually arrives (check Firebase Authentication settings for email link sign-in are enabled, and the authorized domain is correctly configured for the deployed URL: csc-dashboard-b132b.web.app).

## 5. Security — Enforce This on the Backend, Not Just the UI

This is critical: role restrictions must be enforced in Firestore Security Rules, not just hidden in the frontend UI (since a technical user could otherwise bypass UI restrictions and access data directly).

1. Update Firestore security rules so that:
   - Only users with `role: "owner"` (checked via their `users` document) can read/write to any aggregated reports data or access certain report-only collections/fields if they exist separately.
   - Both `owner` and `staff` roles can read/write to the main `workEntries` collection (since staff need to manage work).
   - Only `owner` role can create, update, or delete documents in the `users` collection (so staff cannot promote themselves or add other staff).
2. Write these rules carefully and test them so legitimate staff actions still work, while restricted actions are blocked.

## Important Notes
- Do not break the existing owner's login — make sure whoever is currently using the app can still log in normally and is treated as "owner".
- Keep the UI simple and clearly indicate which role is logged in (e.g., a small badge showing "Owner" or "Staff" near the logged-in user's name).
- Test the full flow: owner adds a staff email, staff receives the link, staff logs in successfully, staff can manage work entries but cannot see the Dashboard income summary or Reports page.
