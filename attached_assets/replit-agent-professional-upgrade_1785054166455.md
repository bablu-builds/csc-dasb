# Replit Agent Prompt — Professional Upgrade

Copy everything below and paste it into Replit Agent:

---

I want to upgrade my CSC shop management app (AZAAN CSC Management) to a professional, polished, production-quality level. Please review the entire app and make the following improvements:

## 1. Visual Design & Branding
- Apply a consistent, professional color palette throughout (currently blue/orange theme) — make sure every page, button, and card follows the same design language, not just some pages.
- Use consistent spacing, padding, and alignment across all pages — no cramped or uneven layouts.
- Add subtle shadows, rounded corners, and hover/active states on buttons and cards for a modern feel.
- Ensure typography is consistent — clear hierarchy between headings, labels, and body text.
- Add smooth transitions/animations for things like opening modals, switching tabs, and status changes (keep them subtle, not flashy).
- Make sure the app looks good and functions properly on both mobile phones and desktop screens (fully responsive).

## 2. Navigation & Usability
- Add a clear, persistent navigation bar/sidebar so users can easily move between Dashboard, All Work, Pending Work, Reports, and Settings without confusion.
- Highlight the currently active page/tab in the navigation.
- Add loading indicators (spinners/skeletons) whenever data is being fetched from Firestore, instead of a blank screen.
- Add empty-state messages with helpful guidance when there's no data yet (e.g., "No customers yet — click 'Add New Entry' to get started") instead of just blank tables.
- Add confirmation dialogs before destructive actions (like deleting an entry) to prevent accidental data loss.
- Add success/error toast notifications for actions like saving, updating, and deleting, so users get clear feedback.

## 3. Data & Functionality Improvements
- Add form validation with clear error messages (e.g., mobile number must be 10 digits, required fields can't be empty) shown inline near the relevant field.
- Ensure the search and filter functions on the "All Work" page work smoothly together (search + category + status + date range all combinable).
- Add sorting options to tables (e.g., sort by date, amount, or status) by clicking column headers.
- Make sure numbers (amounts) are formatted consistently with the ₹ symbol and proper comma separators (e.g., ₹1,250).
- Ensure all dates are displayed in a consistent, readable format throughout the app.

## 4. Dashboard Improvements
- Add a simple chart/graph on the Dashboard showing earnings trend over the last 7-30 days (bar or line chart).
- Make the summary cards (Total Customers, Today's Earning, Pending Work, Due Amount, Rejected/Refunded) visually distinct with icons and color coding.
- Show a "Recent Activity" section with the last 5-10 work entries added or updated.

## 5. Performance & Reliability
- Make sure Firestore queries are efficient (avoid fetching unnecessary data repeatedly).
- Add proper error handling everywhere data is fetched or saved, so the app never shows a blank white screen on failure — show a friendly error message instead.
- Test that the app works correctly after a page refresh (data reloads properly, user stays logged in).

## 6. Security & Access
- Double check that Firestore security rules only allow access to authenticated (logged-in) users, and that no sensitive data can be read without login.
- Make sure the logout function works correctly and clears the session properly.

## 7. Polish Details
- Update the page title and favicon to consistently show "AZAAN CSC Management" (if not already done).
- Add a simple, clean login page design if it isn't already polished (centered card, clear branding, no clutter).
- Make sure all buttons have clear, consistent labels (avoid ambiguous text like just an icon with no label where clarity matters).

## Important Notes
- Please make these improvements incrementally and test after each major change to ensure nothing breaks.
- Do not change the underlying Firestore data structure in a way that breaks existing customer records — only add to it if needed.
- Keep the app simple enough for non-technical shop staff to use comfortably — professional polish should not mean added complexity for the end user.

---

**After implementation, ask Replit to:** "Show me a summary of all the changes made, and confirm the app builds and runs without errors before I deploy it."
