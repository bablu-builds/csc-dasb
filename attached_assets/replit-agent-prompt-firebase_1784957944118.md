# Replit Agent 4 Prompt (GitHub + Firebase, Free Hosting) — Copy-Paste Karo

Neeche di gayi cheez pura copy karke Replit Agent 4 ko de dena:

---

Build a full-stack customer & work management web application for my CSC (Common Service Center) shop named **"AZAAN COMMUNICATION TOUR AND TRAVEL"**. It should work well on both desktop and mobile browsers, and must be deployable completely FREE using GitHub Pages for hosting and Google Firebase (free Spark plan) for the database and authentication — no paid hosting or paid services.

## 1. Login System
- Simple username/password login page for staff/owner access, using **Firebase Authentication** (email/password sign-in).
- Only logged-in users can access the dashboard and data.
- Support creating multiple staff logins from Settings.

## 2. Dashboard (Home Page)
Show summary cards at the top:
- Today's total earning
- This month's total earning
- Total customers
- Total pending work count
- Total due amount (sum of all unpaid balances across customers)

Below that, show a list of "Today's scheduled / pending work" sorted by date, with the most urgent (overdue or due soon) highlighted in red/orange.

## 3. Work Categories (manageable list)
Pre-load these categories, and allow the owner to add/edit/delete categories anytime from a Settings > Categories page:
- PAN Card
- Aadhar Card
- Voter ID Card
- Driving Licence (DL)
- Ration Card
- Jati Praman Patra (Caste Certificate)
- Aay Praman Patra (Income Certificate)
- Niwas Praman Patra (Residence Certificate)
- Bijli Bill Payment
- Pani Bill Payment
- Bank Related Work
- Insurance
- Railway/Bus Ticket Booking
- Photocopy / Print / Photo
- Other

## 4. Customer / Work Entry
Create an "Add New Work" form with these fields:
- Customer Name (text, required)
- Mobile Number (text, required, 10-digit validation)
- Work Category (dropdown from the categories list above)
- Work Detail / Description (short text, optional notes about the specific task)
- Date (the date the work is scheduled/was done — default today)
- Total Amount (number, ₹)
- Paid Amount (number, ₹)
- Due Amount — auto-calculated as Total Amount minus Paid Amount, shown read-only, updates live as user types
- Status — dropdown: "Pending" or "Completed"
- Address (optional text)

Save this as a document in **Firestore** (Firebase's database) so data is never lost and stays synced across devices.

## 5. Customer/Work List Page
- Table/card list of all entries, most recent first.
- Search bar: search by customer name, mobile number, or category.
- Filters: filter by category, by status (Pending/Completed), by date range.
- Each row: Edit and Delete buttons.
- Clicking a customer shows their full history (every work entry linked to their mobile number).

## 6. Pending Work Section (separate tab/page)
- Shows only entries where status = "Pending".
- Group or filter by category.
- Show "days pending" (calculated from the work date to today) next to each entry.
- Entries with Due Amount > 0 should be visually flagged (e.g., red badge showing due amount).
- This page is the main place staff check every morning to know what work still needs to be done and who still owes money.

## 7. Alerts / Reminders
- On the dashboard and pending page, visually highlight (color-coded) entries that are:
  - Pending for more than 3 days (orange)
  - Pending for more than 7 days (red)
  - Have a due amount greater than 0 (a separate due-amount badge)
- No SMS/WhatsApp sending needed for now — just in-app visual alerts. (This will be added later.)

## 8. Reports Page
- Daily, weekly, and monthly earnings summary (based on Paid Amount).
- Total due amount outstanding across all customers.
- Category-wise breakdown of how many work items and how much earned per category.
- Export all data to CSV/Excel.

## 9. Settings Page
- Edit shop name, address, phone number (shown in the top header — default "AZAAN COMMUNICATION TOUR AND TRAVEL").
- Manage staff logins (Firebase Authentication users).
- Manage work categories (add/edit/delete).

## Tech & Hosting Requirements (IMPORTANT — must be free)
- Frontend: React (plain React app, no server-side rendering needed), built as a static site.
- Database: **Google Firebase Firestore** (free Spark plan) for storing all customer/work records.
- Authentication: **Firebase Authentication** (free) for login system.
- Hosting: Set up the project so it can be pushed to **GitHub** and deployed for free using **GitHub Pages** (static hosting for the React build). Do NOT use any paid hosting service (no Vercel Pro, no Netlify paid tier, no AWS, etc.) — GitHub Pages only.
- Provide clear step-by-step instructions on:
  1. How to create a free Firebase project and get the Firebase config keys.
  2. Where to paste those config keys in the code.
  3. How to push the code to a new GitHub repository.
  4. How to enable GitHub Pages for that repository so the site goes live at a free github.io URL.
- Keep Firebase usage efficient (minimize unnecessary reads/writes) so the app comfortably stays within the free Spark plan limits for a small shop's daily usage.

## Design Guidelines
- Clean, simple, and easy to use for non-technical shop staff — large readable text, clear buttons, minimal clutter.
- Use a trustworthy color scheme (blues, with a warm accent color) similar to government/digital-service portals.
- All text/labels can be in Hindi or Hinglish where natural (e.g., "पूर्ण" for Completed, "लंबित" for Pending), but keep it simple to understand.
- Fully responsive — must work well on a shop desktop computer and on staff mobile phones.

---

**Note (mujhe replit mein bolna hai agar test karna ho):** "Add a demo entry to test the pending work and due amount alert features, and confirm the Firebase free-tier setup is working end to end before I connect my real Firebase project."
